---
tags:
  - blog
  - terraform
  - azure-devops
  - date/20205/02/04
date: 2025-02-04
---
# Warn about destructive Terraform changes in pull requests

## The problem

When automating infrastructure changes through CI/CD pipelines, it can be VERY scary to merge a pull request that changes something in your infrastructure that you are not very familiar with.

Sure, you have tested the change in a test environment. Did you try to make a plan against a dev environment too? Have you tested against all the relevant targets of this change?

Maybe you are reviewing someone else's infrastructure changes. How can you be sure you have caught if this is actually destroying and recreating all the databases?

I've dealt with too much of this anxiety! AUTOMATE IT AWAY!

With some inspiration from my friend, [Lasse Hels](https://dk.linkedin.com/in/lasse-hels), I created this bash script for Azure DevOps Pipelines.

## The script

```shell
#!/bin/bash
set -euo pipefail

# Somehow create your plan as tfplan
PLAN_TEXT=$(terraform show tfplan)
PLAN_JSON=$(terraform show -json tfplan)
HAS_DESTRUCTIVE_CHANGES=$(echo "$PLAN_JSON" | jq -r '.resource_changes[] | select(.change.actions[] | contains("delete"))')

# Conditional alert
DANGER_MESSAGE=""
if [ ! -z "$HAS_DESTRUCTIVE_CHANGES" ]; then
 DANGER_MESSAGE="**DANGER! YOU ARE ABOUT TO DESTROY RESOURCES**"
fi

# Actual comment to be posted
CODE_BLOCK_FENCE='```'
COMMENT=$(cat << EOF
${DANGER_MESSAGE}
<details><summary>Click to expand</summary>

${CODE_BLOCK_FENCE}
${PLAN_TEXT}
${CODE_BLOCK_FENCE}
</details>
EOF
)

# Set comment status to Active for destructive changes, Resolved otherwise
COMMENT_STATUS=2 # Resolved
if [ ! -z "$HAS_DESTRUCTIVE_CHANGES" ]; then
 COMMENT_STATUS=1 # Active
fi

# Build payload for ADO API
JSON_PAYLOAD=$(jq -n \
 --arg content "$COMMENT" \
 --arg status "$COMMENT_STATUS" \
 '{comments: [{content: $content}], status: ($status|tonumber)}'
)

# Call ADO API to make the comment
curl -X POST \
 "$(SYSTEM_COLLECTIONURI)/$(SYSTEM_TEAMPROJECT)/_apis/git/repositories/$(BUILD_REPOSITORY_NAME)/pullrequests/$(SYSTEM_PULLREQUEST_PULLREQUESTID)/threads?api-version=6.0" \
 -H "Authorization: Bearer $(SYSTEM_ACCESSTOKEN)" \
 -H "Content-Type: application/json" \
 -d "$JSON_PAYLOAD"
```

## What it does

- It is assumed to be running as part of a pull request validation pipeline
- Assuming there is a terraform plan created in the file `tfplan`, it parses the plan as plaintext and json
- No matter what, the plaintext plan is posted as a comment in the pull request. The comment will be collapsed by default.
- If it finds any destructive changes in the plan, the comment will have a big scary warning and be marked as "Active". This means someone will have to look at it and resolve it before the pull request can be merged.

## References

- [Azure DevOps REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops/?view=azure-devops-rest-7.2&viewFallbackFrom=azure-devops-rest-6.0)
- [Azure pipelines variables](https://learn.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml)
- [jq](https://jqlang.org/)
