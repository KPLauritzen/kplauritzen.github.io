---
date: 2024-11-15
---

# Use databricks profiles to emulate service principals

`TL;DR`: Edit your `~/.databrickscfg` file to create a profile for your service principals.

## Problem: The feedback loop when developing a CI/CD pipeline is too slow

I have a CI/CD pipeline that interacts with a Databricks workspace through the Databricks CLI.
I usually develop the pipeline locally, testing it against a sandbox Databricks workspace, authenticated as myself.

But when I deploy the pipeline to the CI/CD environment, it runs as a service principal, first against a dev workspace, then against a prod workspace.

There can be some issues that only appear when running as a service principal, like permissions errors or workspace configurations. And the feedback loop is too slow: I have to commit, push, wait for the pipeline to run, check the logs, and repeat.

I want to test the pipeline locally, authenticated as a service principal, to catch these issues earlier.

## Solution: Use databricks profiles to emulate service principals

Reading about the one million ways to authenticate to an Azure Databricks workspace is enough to give me a headache (Seriously, [there are too many options](https://learn.microsoft.com/en-us/azure/databricks/dev-tools/auth/)).
I have previously used environment variables to authenticate as a service principal, the various secrets in an `.env` file, and commenting and un-commenting as needed.
It is a mess, and I'm guaranteed to forget to switch back to my user account at some point.

Instead, I can use databricks profiles to store the different authentication configurations.
In `~/.databrickscfg`, I can create a profile for each service principal, and switch between them with the `--profile` flag.

Here is an example of a `~/.databrickscfg` file with two Service principal profiles:

```ini title=".databrickscfg"
[DEFAULT]
host  = <SOME_HOST>
token = <SOME_TOKEN>

[project-prod-sp]
host                = 
azure_client_id     = 
azure_client_secret = 
azure_tenant_id     = 

[project-dev-sp]
<same setup as above>
```

Of course, you should replace the placeholders with the actual values.

To test what workspace and user your profile is using, you can try the following command:

```bash
databricks auth describe --profile project-prod-sp
```

This will also show you where the authentication is coming from (because, as I mentioned above, there are too many ways to authenticate).

Finally, you can run your pipeline locally, using the `--profile` flag to specify that you want to use the service principal profile:

```bash
databricks bundle deploy --profile project-dev-sp
```

## Alternative to using `--profile` flag

If you still want to use environment variables, you can set the `DATABRICKS_CONFIG_PROFILE` variable to the profile name you want to use, e.g.:

```ini
DATABRICKS_CONFIG_PROFILE=DEFAULT
```
