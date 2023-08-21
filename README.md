# ClickHouse in AWS Lambda

This sample shows how to run the open-source online analytics database [ClickHouse](https://github.com/ClickHouse/ClickHouse) in an AWS Lambda function.

It enables ad-hoc querying of existing data in Amazon S3 buckets with ClickHouse SQL using a simple HTTP client, without the need to run clickhouse-local on your computer or to deploy a ClickHouse cluster.

The sample can also help to build other serverless solutions around ClickHouse query engine.

![postman-example](./postman.gif)

# Quick start
1. Have docker and [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed and configured.
1. Clone the repo.
1. Install and bootstrap AWS Cloud Development Kit (AWS CDK) - more details [here](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_install).
    ```
    npm install -g aws-cdk
    cdk bootstrap aws://<AWS_ACCOUNT_ID>/<AWS_REGION>
    ```
1. Install dependencies.
    ```
    npm install
    ```
1. Set the USER_ARN environmental variable to an ARN of the AWS IAM user that will be granted permission to run queries. To set it to your default AWS CLI user:
    ```
    export USER_ARN=`aws sts get-caller-identity | jq -r .Arn`
    ```
1. Deploy the stack to your AWS account.
    ```
    cdk deploy
    ```

1. See the TestUrl output in AWS CDK console output. It references a test file in the S3 bucket created during deployment. E.g. 
    ```
    https://<...>.lambda-url.eu-central-1.on.aws/clickhouselambdastack-clickhousebucket<...>/test.csv
    ```
1. Issue an HTTP POST request signed with AWS [Signature Version 4](#q-what-is-aws-signature-version-4-and-how-to-sign-requests-with-it) to this URL.
Pass your SQL statement as a plain text in the request body.  Use a pre-defined name `table` in all SQL statemetns.  For example, with curl:
    ```
    curl 'https://<...>.lambda-url.eu-central-1.on.aws/clickhouselambdastack-clickhousebucket<...>/test.csv'
        -X POST
        --aws-sigv4 "aws:amz:eu-central-1:lambda"
        -u '<AWS_ACCESS_KEY>:<AWS_SECRET_KEY>'
        -d 'SELECT * FROM table LIMIT 5;'
    ```
    Or use Postman for graphical UI.
1. Get your query execution results in the HTTP response body

Check the [guide](#issue-queries) for more querying options. 

# Architecture

![clickhouse-lambda architecture](./clickhouse-lambda.png)

The sample includes a Lambda Function with the Lambda Function URL enabled, an IAM user identity policy, a Lambda function execution role, and an S3 bucket.

**The Lambda function** processes HTTP requests and runs ClickHouse binary. It has 2048MB memory by default. The memory size can be increased up to 10240 MB. More memory can improve query performance, but also increases cost. The Lambda code is deployed using container image, because of clickhouse binary size. We use a standard clickhouse binary, see [the docs](#q-how-to-make-clickhouse-binary-run-better-in-aws-lambda) for ideas how to optimize it for the AWS Lambda environment.

Data resides in the **S3 bucket**. You can upload any additional data in formats, supported by ClickHouse (parquet, json, csv and [many others](https://clickhouse.com/docs/en/interfaces/formats)).

**The Lambda function URL** provides an easy way to invoke Lambda function without Amazon API Gateway. It uses AWS_IAM auth type, so all requests need to be signed with AWS Signature Version 4. You could change it to NONE to disable auth on the Lambda function URL side completely (this might impose a security risk!) or implement authentication of your choice in the Lambda code, through Amazon API Gateway or Amazon CloudFront.

Permissions to invoke the Lambda function URL are granted through the **IAM user identity policy**. The sample grants access to only one user specified during deployment through the IAM_USER environmental variable. Another way to grant access is through the Lambda function's resource policy.

**Lambda execution role** provides the Lambda function with access to S3 data. This sample allows read access to one bucket only (specified during deployment). You can modify role's policies to allow more buckets. Note, that access to S3 is controlled completely by this role. Any IAM user that is allowed to make requests to the Lambda function URL will be able to query data regardless of their S3 permissions. You can build a solution around [Amazon S3 Object Lambda](https://aws.amazon.com/s3/features/object-lambda/) instead of the regular Lambda if you need to control access based on users' existing S3 permissions.

# User guide

## Query existing S3 bucket
To query your real data you can either upload it to the sample S3 bucket or connect your existing S3 bucket during deployment .

To connect an existing S3 bucket instead of creating a new one set `CREATE_BUCKET` environmental variable to `false`, and `BUCKET_NAME` to your bucket name (just a name, without s3:// or https://) during the CDK stack deployment. The bucket must be in the same AWS region where the sample is deployed.

Alternatively, you can simply upload your own data in json, parquet, csv or [another supported format](https://clickhouse.com/docs/en/interfaces/formats) to the sample bucket. Get the bucket name from `ClickhouseBucketName` AWS CDK output.

## Change authentication method
You may want your function URL to be public, for example to make queries directly from the web browser without signing requests with AWS Signature Version 4. For that you can leverage the `NONE` auth type. See the guide [here](https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html). This imposes a security risk and allows access to the data in the bucket through ClickHouse queries to all users.

## Issue queries
The URL format is:
```
https://<your Lambda endpoint>/<your s3 bucket>/<object key>
```
You can also omit the bucket name, then the bucket created or specified during the deployment will be used:
```
https://<your Lambda endpoint>/<object key>
```
Requests need to be signed with AWS [Signature Version 4](#q-what-is-aws-signature-version-4-and-how-to-sign-requests-with-it) for security.

You can pass a query SQL statement either as a query parameter of HTTP GET requests (with URL encoding, e.g. spaces should be replaced with `%20`, and so on) or just as raw text in the body of HTTP POST requests.

Pre-defined table name `table` should be used in all queries. Under the hood a temporary table named `table` is created before each query run. This way you can issue complex queries with predicates.

## Logging
ClickHouse stdout and stderr are passed to Amazon CloudWatch Logs. You can find the log group in the AWS Console on the monitoring tab of your Lambda function's properties page.

## Limitations
This version has the following limitations that we plan to address in future:
- There is no plain CloudFormation template, only CDK is supported for deployment. You will need CDK, AWS CLI and docker installed to deploy the sample.
- Only IAM users are supported for querying, not IAM roles.
- Permissions to invoke Lambda function URL are granted through IAM user identity policies. This means the user or role you use to deploy the CDK stack requires permissions to grant `lambda:InvokeFunctionUrl` to the IAM user, that will be used for querying.


# FAQ

## Q: Why use this instead of [clickhouse-local](https://clickhouse.com/docs/en/operations/utilities/clickhouse-local)?
The main difference from clickhouse-local is that the sample does not run clickhouse query engine on the client device and does not transfer raw data from the S3 bucket to the client. That's why some interesting use-cases for the sample are:
- Slow client devices. AWS Lambda [supports](https://aws.amazon.com/about-aws/whats-new/2020/12/aws-lambda-supports-10gb-memory-6-vcpu-cores-lambda-functions/) up to 10 GB of memory and 6 vCPU, which is more than an entry-level laptop might have.
- Mobile devices. You can query massive data in S3 from mobile devices using HTTPS client applications or web clients like postman.
- Slow network connection. AWS Lambda runs close to you data stored in S3. Only query results will be transferred to the client. That's why it can run queries faster than clickhouse-local and saves traffic. 
- Advanced authentication scenarios, when users shouldn't have AWS credentials and IAM permissions to access S3 data.
- No-effort data lake :-)

## Q: What is AWS Signature Version 4 and how to sign requests with it?
AWS Signature Version 4 is a protocol for authenticating incoming API requests to AWS services.

AWS SDKs and tools such as curl, Postman, and [AWS SigV4 Proxy](https://github.com/awslabs/aws-sigv4-proxy) offer built-in ways to sign your requests with AWS Signature V4.

Find more details [here](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html).

## Q: How much does it cost to run the sample?
You pay for:
1. Lambda [invocation and execution time](https://aws.amazon.com/lambda/pricing/)
1. [S3 GET requests](https://aws.amazon.com/s3/pricing/). Data transfer between a Lambda function and Amazon Simple Storage Service (S3) within the same AWS Region is free.
1. [Data Transfer Out](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer) from AWS Lambda to the client. This includes only query execution results, but not the source data.

The overall price depends on the volume of data, the number and type of queries. What's important, there are no other costs besides S3 storage when no queries are run.

The cost to deploy the sample and run several queries on provided test data should be under 1$ per month.

## Q: How to make clickhouse binary run (better) in AWS Lambda?
To reduce Lambda container image size and Lambda function cold start times, you can build a custom ClickHouse binary with only neccessary components (basically, -DENABLE_CLICKHOUSE_LOCAL=ON).

# Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

# License

This sample is licensed under the MIT-0 License. See [LICENSE](LICENSE) .
