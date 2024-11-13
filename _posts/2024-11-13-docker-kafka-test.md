---
layout: post
title: "Test kafka clients with Docker"
---


`TL;DR`: Use `pytest-docker` to create a test fixture that starts a Kafka container. 

## Problem: I want to test my Kafka client, but I don't have a Kafka cluster

At work, we need to consume and produce messages to some queue. And one of the tools available already is Kafka.

Before integrating with the existing Kafka cluster, I want to test my client code. I want to ensure that it can consume and produce messages correctly.

I have an existing `BaseQueueService` class like this:

```python
class BaseQueueService(ABC):
    @abstractmethod
    def publish(self, message: str) -> None:
        pass

    @abstractmethod
    def consume(self) -> str | None:
        pass
```

with existing implementations for Azure Service Bus and an InMemoryQueue for testing business logic.

So I want to create a `KafkaQueueService` class that implements this interface. And I want to test it, but I don't have a Kafka cluster available.

## Solution: Use docker to start a Kafka container for testing

I can use `pytest-docker` to create a test fixture that starts a Kafka container. This way, I can test my `KafkaQueueService` class without needing a Kafka cluster.

This is how I did it:

A `docker-compose.yml` file to start a Kafka container:

```yaml
services:
  zookeeper:
    image: 'confluentinc/cp-zookeeper:latest'
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: 'confluentinc/cp-kafka:latest'
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
    ports:
      - "9092:9092"
    expose:
      - "29092"

  init-kafka:
    image: 'confluentinc/cp-kafka:latest'
    depends_on:
      - kafka
    entrypoint: [ '/bin/sh', '-c' ]
    command: |
      "
      # blocks until kafka is reachable
      kafka-topics --bootstrap-server kafka:29092 --list

      echo -e 'Creating kafka topics'
      kafka-topics --bootstrap-server kafka:29092 --create --if-not-exists --topic testtopic --replication-factor 1 --partitions 1
      kafka-topics --bootstrap-server kafka:29092 --create --if-not-exists --topic input_test_topic --replication-factor 1 --partitions 1
      kafka-topics --bootstrap-server kafka:29092 --create --if-not-exists --topic output_test_topic --replication-factor 1 --partitions 1

      echo -e 'Successfully created the following topics:'
      kafka-topics --bootstrap-server kafka:29092 --list
      "
```

A `conftest.py` file to create a test fixture that starts the Kafka container:

```python
def check_kafka_ready(required_topics, host="localhost", port=9092):
    from confluent_kafka import KafkaException
    from confluent_kafka.admin import AdminClient

    try:
        admin = AdminClient({"bootstrap.servers": f"{host}:{port}"})
        topics = admin.list_topics(timeout=5)
        # Check if all required topics are present
        if all(topic in topics.topics for topic in required_topics):
            return True
        else:
            return False
    except KafkaException:
        return False


@pytest.fixture(scope="session")
def kafka_url(docker_services):
    """Start kafka service and return the url."""
    port = docker_services.port_for("kafka", 9092)
    required_topics = ["testtopic", "input_test_topic", "output_test_topic"]
    docker_services.wait_until_responsive(
        check=lambda: check_kafka_ready(port=port, required_topics=required_topics),
        timeout=30.0,
        pause=0.1,
    )
    return f"localhost:{port}"
```

And finally, a test file to test the `KafkaQueueService` class:

```python
@pytest.mark.kafka
def test_kafka_queue_can_publish_and_consume(kafka_url):
    kafka_queue_service = KafkaQueueService(
        broker=kafka_url,
        topic="testtopic",
        group_id="testgroup",
    )
    clear_messages_from_queue(kafka_queue_service)

    unique_message = "hello" + str(uuid.uuid4())
    kafka_queue_service.publish(unique_message)

    received_message = kafka_queue_service.consume()
    assert received_message == unique_message
```

Now I can test my `KafkaQueueService` class without needing a Kafka cluster. This even works on my CI/CD pipeline in Azure DevOps.

NOTE: The `docker-services` fixture starts ALL the docker services in the `docker-compose.yml` file. 

## Bonus: The passing implementation of `KafkaQueueService`

This passes the test above (and a few other tests I wrote):

```python
class KafkaQueueService(BaseQueueService):
    def __init__(self, broker: str, topic: str, group_id: str):
        # Configuration for the producer and consumer
        self.topic = topic
        self.producer: Producer = Producer({"bootstrap.servers": broker})
        self.consumer: Consumer = Consumer(
            {
                "bootstrap.servers": broker,
                "group.id": group_id,
                "auto.offset.reset": "earliest",
                "enable.partition.eof": "true",
            }
        )
        self.consumer.subscribe([self.topic])

    def publish(self, message: str) -> None:
        """Publish a message to the Kafka topic."""
        logger.debug(f"Publishing message to topic {self.topic}: {message}")

        self.producer.produce(self.topic, message.encode("utf-8"))
        self.producer.flush()

    def consume(self) -> str | None:
        """Consume a single message from the Kafka topic."""
        logger.debug(f"Consuming message from topic {self.topic}")

        # Get the next message
        message = self.consumer.poll(timeout=20)
        if message is None:
            logger.debug("Consumer poll timeout")
            return None
        # No new message
        if message.error() is not None and message.error().code() == KafkaError._PARTITION_EOF:
            logger.debug("No new messages in topic")
            return None
        # Check for errors
        if message.error() is not None:
            raise Exception(f"Consumer error: {message.error()}")
        self.consumer.commit(message, asynchronous=False)
        return message.value().decode("utf-8")

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(topic={self.topic})"
```