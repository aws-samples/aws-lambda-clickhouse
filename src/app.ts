// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import {
  Context,
  APIGatewayProxyResultV2,
  APIGatewayProxyEventV2,
} from "aws-lambda";
import { ClickHouseRunner, LogLevel } from "./clickhouse_runner";
import { streamifyResponse, ResponseStream } from "lambda-stream";
import { pipeline } from "stream";
import { promisify } from "util";
const pipelineAsync = promisify(pipeline);

const region = process.env.REGION ?? "us-east-1";
const bucketName = process.env.BUCKET_NAME ?? "clickhouse-bucket";
const binaryPath = process.env.BINARY_PATH ?? "./clickhouse";
const logLevel: LogLevel = (process.env.LOG_LEVEL ??
  ("INFO" as LogLevel)) as LogLevel;

const clickHouseHandler = async (
  event: APIGatewayProxyEventV2,
  responseStream: ResponseStream
): Promise<void> => {
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
  await pipeline(clickhouseRunner.run().stdout, responseStream);
};

export const handler = streamifyResponse(clickHouseHandler);
