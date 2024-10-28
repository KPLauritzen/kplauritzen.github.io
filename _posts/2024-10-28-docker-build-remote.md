---
layout: post
title: "Build docker images on remote Linux VM"
---

`TL;DR`: Create a Linux VM in the cloud, then create a docker context for it with

```bash
docker context create linux-builder --docker "host=ssh://username@remote-ip"
```

then build your image with

```bash
docker buildx build --context linux-builder --platform linux/amd64 -t my-image .
```

## Problem: Building some Docker images on a modern Mac fails

At work, I'm using an M3 Macbook. It's a great machine, but it's not perfect.
One issue is that I can't always build Docker images target to `linux/amd64` on it.

Recently, I had an issue where I needed to package a Python application in Docker, and one of the dependencies was `pytorch`.
I suspect that is where my issue was coming from.

Building the image on Mac works fine when running it on the same machine, but when I try to run it on a Linux machine, it fails with the following error:

```text
exec /app/.venv/bin/python: exec format error
```

This indicated that the Python binary was built for the wrong architecture. Luckily, you can specify the target architecture using
the `--platform` flag when building the image.

```bash
docker buildx build --platform linux/amd64 -t my-image .
```

Unfortunately, this didn't work for me. I suspect that the `pytorch` dependency was causing the issue. I got the following error:

```text
Cannot install nvidia-cublas-cu12.
```

## Solution: Build the image on a remote Linux VM

To solve this issue, I decided to build the image on a remote x86_64 Linux VM. This way, I can ensure that the image is built for the correct architecture.

I used an Azure Virtual Machine with an Ubuntu 24.04 image. I enabled "Auto-shutdown" at midnight every day to save costs.

After ssh-ing into the VM, I installed docker and ensured the user was added to the docker group.

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker azureuser
```

Check that the docker daemon is running:

```bash
sudo systemctl status docker
```

Now, back on my local machine, I created a docker context for the remote VM:

```bash
docker context create linux-builder --docker "host=ssh://azureuser@remote-ip"
```

Now, I can build the image using the context:

```bash
docker buildx build --context linux-builder --platform linux/amd64 -t my-image .
```

I can also enable the context for all future commands:

```bash
docker context use linux-builder
```
