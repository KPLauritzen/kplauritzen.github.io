---
date: 2023-02-26
---

# Caching Docker images in Azure DevOps Pipelines

`TL;DR`: Go to the [bottom of the post](#the-pipeline-template) to see the full Pipeline template.

## The problem

In the Data Science team at DFDS, we are using Azure DevOps Pipelines to build and deploy our models.
We are using Docker containers to package our models, and we are using Azure Pipelines for our CI/CD.

For most projects we will build the docker images in:

1. The pull request: To make sure the docker image can be built and sometimes also to run some tests in the new container.
1. After merging to main: To build the final image that will be deployed to production.

Step 1 usually happens more than once, as issues with a PR will often require multiple iterations of reviews and fixes.
For this reason, it is important that the build time is as short as possible. Long feedback loops are not good for productivity.

So the solution is to cache the docker images between builds. Azure Pipelines even has a [Cache task](https://learn.microsoft.com/en-us/azure/devops/pipelines/release/caching?view=azure-devops#docker-images) that claims to help with caching docker builds.
But the commands listed on that documentation page have never worked for me.

## The solution

My brilliant friend [Morten Hels](https://www.linkedin.com/in/morten-hels/) came up with a solution that works.
I'm taking the liberty of writing it down here, but he is the one who deserves the credit.

Instead of using `docker save` and `docker load` for (attempting to) make cached docker layers available, we use [`docker buildx`](https://docs.docker.com/engine/reference/commandline/buildx/) to build the image from, and save to, a cache.

The commend to run is:

```bash
docker buildx create --name builder --driver docker-container --use #1
docker buildx build \                                               
    --cache-from=type=local,src=docker_cache \                      #2
    --cache-to=type=local,dest=docker_cache,mode=max \              #3
    --file Dockerfile \                                             
    --output=type=docker,name=myimage \                             #4
    .
```

1. Create a new builder, and use it. This is needed to make the `--cache-from` and `--cache-to` options available. I'm using the `docker-container` driver, but there are other options available. This one is just the easiest to set up, both locally and in a pipeline.
1. Use the local cache as a source for the build. This will make the build use the cached layers if they are available.
1. Save the layers that were used in the build to the local cache. This will make the layers available for the next build.
1. Set the [output](https://docs.docker.com/engine/reference/commandline/buildx_build/#output) to be a docker image. This is needed to make the image available for the next step in the pipeline, e.g. pushing it to a registry.

## The pipeline template

Here is a complete [pipeline template](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/templates?view=azure-devops) that you can use in your own pipelines.

```yaml title="templates.yaml"
parameters:
  - name: docker_image_name
    type: string
    displayName: 'The name of the Docker image to build. Example: klaur-testing.'
  - name: additional_docker_build_args
    type: string
    default: ''
    displayName: 'Additional arguments to pass to the docker build command. Example: --build-arg SOME_ARG=some_value.'
  - name: dockerfile_path
    type: string
    default: 'Dockerfile'
    displayName: 'The path to the Dockerfile to use. Example: Dockerfile.'
  - name: docker_build_context
    type: string
    default: '.'
    displayName: 'The path to the directory to use as the build context. Example: .'

steps:
  - task: Cache@2
    displayName: Cache Docker layers
    inputs:
      key: '"docker" | "$(Agent.OS)" | "${{ parameters.docker_image_name }}" | ${{ parameters.dockerfile_path }}'
      restoreKeys: |
        "docker" | "$(Agent.OS)" | "${{ parameters.docker_image_name }}"
      path: $(Pipeline.Workspace)/docker_cache

  - script: |
      docker buildx create --name builder --driver docker-container --use
      docker buildx build \
        --cache-from=type=local,src=$(Pipeline.Workspace)/docker_cache \
        --cache-to=type=local,dest=$(Pipeline.Workspace)/docker_cache,mode=max \
        --file ${{ parameters.dockerfile_path }} \
        --output=type=docker,name=${{ parameters.docker_image_name }} \
        ${{ parameters.additional_docker_build_args }} ${{ parameters.docker_build_context }}
    displayName: Build Docker image
    env:
      DOCKER_BUILDKIT: 1
```

If the above yaml is saved in a `templates.yaml` file, you can use it in your pipeline like this:

```yaml title="azure-pipelines.yml"
jobs:
  - job: BuildDockerImage
    steps:
      - template: templates.yaml
        parameters:
          docker_image_name: 'my-image'
          additional_docker_build_args: '--build-arg SOME_ARG=some_value'
          dockerfile_path: 'Dockerfile'
          docker_build_context: '.'
```

## References

- [Morten Hels](https://www.linkedin.com/in/morten-hels/) - Great data scientist moonlighting as an excellent data engineer.
- [Stack Overflow post](https://stackoverflow.com/a/69198252) that Morten claims got him on the right track.
- Docker documentation on [`docker buildx`](https://docs.docker.com/engine/reference/commandline/buildx/).
