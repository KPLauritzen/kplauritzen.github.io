---
tags:
- homelab
- metrics
- grafana
date: 2025-11-22
---
# Monitoring usage metrics on the homelab

I have a very small and underpowered kubernetes cluster at home (see [Homelab #1](./2025-01-18-homelab-1.md) and [Homelab #2](./2025-01-24-homelab-2.md)), and I'm always concerned that I'm overutilizing its resources when I want to add another service to it. 

For example, sometimes my FreshRSS site is not responding. Is that because there is a network problem, or am I running out of memory, or something completely different. 

One option could be to run Prometheus and Grafana, scraping metrics from each service at regular intervals. The problem with that is that I'm already running on a low-power system, so spending a significant chunk of the total resources only on MONITORING how many resources I'm using seems like a bad idea. 

Instead, partly inspired by [Markus' love for SQLite](https://www.maragu.dev/blog/go-and-sqlite-in-the-cloud), I'm doing a much simpler thing: 

1. Run `kubectl top nodes` and `kubectl top pods` every 5 minutes with an entry in `crontab`. 
2. Do a very simple parsing of the output
3. Insert it into a SQLite database with a timestamp. 

The database is a local file, stored on the same computer running `k3s`. When I want to look at how my system has been behaving recently, I can copy the whole database to my desktop and start digging into it. 

No fuss, minimal overhead, no fancy dashboard. It's weird to do YAGNI on my homelab, because I don't NEED any of it. 

## Appendix: 

The script I use to collect metrics:
```bash
#!/bin/bash
set -euo pipefail

# Database location
DB_PATH="${DB_PATH:-/var/lib/k8s-metrics/metrics.db}"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S")

# Full path to kubectl (k3s)
KUBECTL="${KUBECTL:-/usr/local/bin/kubectl}"

# Ensure database directory exists
mkdir -p "$(dirname "$DB_PATH")"

# Initialize database if it doesn't exist
sqlite3 "$DB_PATH" <<EOF
CREATE TABLE IF NOT EXISTS node_metrics (
    timestamp TEXT NOT NULL,
    node_name TEXT NOT NULL,
    cpu_cores TEXT NOT NULL,
    cpu_percent TEXT NOT NULL,
    memory_bytes TEXT NOT NULL,
    memory_percent TEXT NOT NULL,
    PRIMARY KEY (timestamp, node_name)
);

CREATE TABLE IF NOT EXISTS pod_metrics (
    timestamp TEXT NOT NULL,
    namespace TEXT NOT NULL,
    pod_name TEXT NOT NULL,
    cpu_cores TEXT NOT NULL,
    memory_bytes TEXT NOT NULL,
    PRIMARY KEY (timestamp, namespace, pod_name)
);

CREATE INDEX IF NOT EXISTS idx_node_timestamp ON node_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_pod_timestamp ON pod_metrics(timestamp);
EOF

# Collect node metrics
$KUBECTL top nodes --no-headers | while read -r name cpu cpu_pct memory memory_pct; do
    sqlite3 "$DB_PATH" <<EOF
INSERT INTO node_metrics (timestamp, node_name, cpu_cores, cpu_percent, memory_bytes, memory_percent)
VALUES ('$TIMESTAMP', '$name', '$cpu', '$cpu_pct', '$memory', '$memory_pct');
EOF
done

# Collect pod metrics
$KUBECTL top pods -A --no-headers | while read -r namespace name cpu memory; do
    sqlite3 "$DB_PATH" <<EOF
INSERT INTO pod_metrics (timestamp, namespace, pod_name, cpu_cores, memory_bytes)
VALUES ('$TIMESTAMP', '$namespace', '$name', '$cpu', '$memory');
EOF
done

echo "Metrics collected at $TIMESTAMP"
```

The crontab entry
```text
*/5 * * * * KUBECONFIG=/home/kasper/.kube/config DB_PATH=/home/kasper/k8s-metrics/metrics.db /home/kasper/k8s-metrics/collect-metrics.sh >> /home/kasper/k8s-metrics/collect.log 2>&1
```
