# Introduction

The ichi-api-updater is responsible for updating various fields on the ICHI token.

- [Introduction](#introduction)
  - [Design](#design)
  - [Setup](#setup)
  - [Configuration](#configuration)
  - [Running Locally](#running-locally)
  - [Contributing](#contributing)

## Design

There are three environments, `dev`, `stage`, and `prod` so three lambda functions:

- ichi-api-updater-dev
- ichi-api-updater-stage
- ichi-api-updater-prod

Each shares the same codebase of course.  To test the code you can run `npm run dev` which primarily just invokes [updateToken.ts](./src/updateToken.ts)

The function will update the DynamoDB table corresponding to it's env name:

- token-dev
- token-stage
- token-prod

There are three Github actions corresponding to the dev as well:

- [ichi-api-updater-dev.yml](../../.github/workflows/ichi-api-updater-dev.yml)
  - This is invoked whenever a PR is created and updated and deploys to the `ichi-api-updater-dev` function
- [ichi-api-updater-stage.yml](../../.github/workflows/ichi-api-updater-stage.yml)
  - This is invoked whenever a PR is merged and updated and deploys to the `ichi-api-updater-stage` function
- [ichi-api-updater-prod.yml](../../.github/workflows/ichi-api-updater-prod.yml)
  - You must [manually invoke](https://github.com/ichifarm/ichi-api/actions/workflows/ichi-api-updater-prod.yml) this and it deploys to `ichi-api-updater-prod`

[Cron triggers](https://console.aws.amazon.com/events/home?region=us-east-1#/rules):

- `ichi-api-updater-dev` has no triggers considering it will be updated automatically on prs, we can always add one if we want, but I figured we'd just manually invoke it.
- `ichi-api-updater-stage` updates every 30 minutes
- `ichi-api-updater-prod` updates every 5 minutes

Important Notes:

- There is currently no gated approval for going from stage -> prod as the free edition of Github doesn't allow for that.
- Before manually deploying to prod you should [manually invoke](https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/ichi-api-updater-stage?tab=testing) the `ichi-api-updater-stage` to ensure it's working properly.

## Setup

(Note that setup is a one time thing)

In the IAM section of the AWS console find the Role for this function and ensure it has access to the relevent DynamoDB table.

For example for dev the role is `ichi-api-updater-dev-role-***` and since that is the dev version it needs access to the `token-dev` DynamoDB table.

This should be setup accordingly for stage and prod as well.

Steps to attach Policy:

- Find the role for the lambda
- Click Attach Policy
- Search for DynamoDBToken{Env}FullAccess
- Attach

If you need to create the policy:

- Service: DynamoDB
- Full Access
- For each Resource change the table/* to the table/{tableName}

Ensure the `tokens-layer` is added which contains the `ethers` npm lib.

To call the ichi-api-updater-prod every 5 minutes go to Amazon EventBridge -> Events -> Rules and create a rule that invokes this lambda function every 5 minutes.

## Configuration

aws lambda update-function-configuration --function-name ichi-api-updater-dev --environment "Variables={TABLE_NAME=token-dev}"
aws lambda update-function-configuration --function-name ichi-api-updater-stage --environment "Variables={TABLE_NAME=token-stage}"
aws lambda update-function-configuration --function-name ichi-api-updater-prod --environment "Variables={TABLE_NAME=token-prod}"

## Running Locally

```text
export INFRA_ID=***
export AWS_ACCESS_KEY_ID=AKIASLAZW7IBK3S3Z6K5
export AWS_SECRET_ACCESS_KEY=***
npm i
npm run dev
```

## Contributing

```text
npm i
npm run build
cd dist && zip -r function.zip * && cd ..
aws lambda update-function-code --function-name ichi-api-updater-dev --zip-file fileb://dist/function.zip
aws lambda update-function-code --function-name ichi-api-updater-stage --zip-file fileb://dist/function.zip
# Make sure you test stage before pushing to prod
aws lambda update-function-code --function-name ichi-api-updater-prod --zip-file fileb://dist/function.zip
```

## Updating ICHI per block for external farms

```text
npm run ichi-per-block -- farm1_Id:value1 farm2_Id:value2 ...
```
