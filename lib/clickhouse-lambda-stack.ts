// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import path = require("path");
import { RetentionDays } from "aws-cdk-lib/aws-logs";

export class ClickhouseLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userArn = process.env.USER_ARN ?? "";
    const createBucket = process.env.CREATE_BUCKET ?? "true";
    const bucketName = process.env.BUCKET_NAME ?? "clickhouse-bucket";
    let clickhouseBucket;
    // if (userArn === "") {
    //   console.error(
    //     "USER_ARN is required!\nPlease set USER_ARN env variable to your IAM user ARN"
    //   );
    //   process.exit(1);
    // }

    // const user = iam.User.fromUserArn(this, "User", userArn);
    // const user = iam.Role.fromRoleArn(this, "Role", userArn);
    if (createBucket === "true") {
      clickhouseBucket = new s3.Bucket(this, "ClickhouseBucket");
    } else {
      clickhouseBucket = s3.Bucket.fromBucketName(
        this,
        "ClickhouseBucket",
        bucketName
      );
    }

    new s3deploy.BucketDeployment(this, "DeploySampleData", {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "../test", "testdata.zip")),
      ],
      destinationBucket: clickhouseBucket,
    });

    const clickhouseLambda = new lambda.DockerImageFunction(
      this,
      "ClickhouseLambda",
      {
        code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, "..")),
        environment: {
          BUCKET_NAME: clickhouseBucket.bucketName,
          REGION: this.region,
          BINARY_PATH: "./clickhouse",
          LOG_LEVEL: "INFO",
          TZ: "UTC",
        },
        timeout: cdk.Duration.seconds(300),
        memorySize: 2048,
        architecture: lambda.Architecture.X86_64,
        logRetention: RetentionDays.ONE_WEEK,
      }
    );
    const clickhouseLambdaUrl = clickhouseLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });
    // clickhouseLambdaUrl.grantInvokeUrl(user);
    clickhouseBucket.grantReadWrite(clickhouseLambda);

    new cdk.CfnOutput(this, "ClickhouseLambdaUrl", {
      value: clickhouseLambdaUrl.url,
    });

    new cdk.CfnOutput(this, "ClickhouseBucketName", {
      value: clickhouseBucket.bucketName,
    });

    new cdk.CfnOutput(this, "TestUrl", {
      value: `${clickhouseLambdaUrl.url}/${clickhouseBucket.bucketName}/test.csv`,
    });
  }
}
