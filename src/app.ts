// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import {
  Context,
  APIGatewayProxyResultV2,
  APIGatewayProxyEventV2,
} from "aws-lambda";
import { ClickHouseRunner, LogLevel } from "./clickhouse_runner";

const region = process.env.REGION ?? "us-east-1";
const bucketName = process.env.BUCKET_NAME ?? "clickhouse-bucket";
const binaryPath = process.env.BINARY_PATH ?? "./clickhouse";
const logLevel: LogLevel = (process.env.LOG_LEVEL ??
  ("INFO" as LogLevel)) as LogLevel;

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> => {
  const path = event.requestContext.http.path ?? "/test.csv";
  // if bucketname is already part of the URL, remove it
  let objectPath = "";
  if (path.startsWith("/" + bucketName)) {
    objectPath = path.replace("/" + bucketName, "");
  } else {
    objectPath = path;
  }
  const method = event.requestContext.http.method ?? "GET";
  let statement = "";
  if (method === "GET") {
    statement =
      event.queryStringParameters?.statement ?? "SELECT * FROM table LIMIT 5";
  }
  if (method === "POST") {
    statement = event.body ?? "SELECT * FROM table LIMIT 5";
  }

  const clickhouseRunnerParams = {
    bucketName,
    bucketRegion: region,
    objectKey: objectPath,
    queryStatement: statement,
    logLevel: logLevel,
    binaryPath,
  };
  const clickhouseRunner = new ClickHouseRunner(clickhouseRunnerParams);
  console.log(event.requestContext);
  try {
    const result = await clickhouseRunner.run();
    return {
      statusCode: 200,
      body: String(result),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: String(error),
    };
  }
};
