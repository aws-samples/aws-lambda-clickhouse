// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { APIGatewayProxyEventV2 } from "aws-lambda";
import { handler } from "../../src/app";
import { ClickHouseRunner, LogLevel } from "../../src/clickhouse_runner";

// Mock the ClickHouseRunner class
jest.mock("../../src/clickhouse_runner", () => ({
  ClickHouseRunner: jest.fn().mockImplementation(() => ({
    run: jest.fn(),
  })),
}));

describe("handler", () => {
  const mockClickHouseRunner = ClickHouseRunner as jest.Mock;
  const bucketName = process.env.BUCKET_NAME ?? "clickhouse-bucket";
  beforeEach(() => {
    mockClickHouseRunner.mockClear();
  });

  it("should handle GET request and return a successful response", async () => {
    const runMock = jest.fn().mockResolvedValue("Result from ClickHouse");
    mockClickHouseRunner.mockImplementation(() => ({
      run: runMock,
    }));

    const event: APIGatewayProxyEventV2 = {
      requestContext: {
        http: {
          path: "/test",
          method: "GET",
          protocol: "http",
          userAgent: "test-user-agent",
          sourceIp: "0.0.0.0",
        },
        accountId: "123456789012",
        requestId: "test-request-id",
        routeKey: "test-route-key",
        stage: "test-stage",
        time: "test-time",
        timeEpoch: 1234567890,
        apiId: "test-api-id",
        domainName: "test-domain-name",
        domainPrefix: "test-domain-prefix",
      },
      headers: {
        "Content-Type": "application/json",
      },
      isBase64Encoded: false,
      rawPath: "/test",
      rawQueryString: "statement=SELECT%20*%20FROM%20table",
      routeKey: "test-route-key",
      version: "2.0",
      body: "",
      cookies: ["test-cookie"],
      pathParameters: {},
      queryStringParameters: {
        statement: "SELECT * FROM table",
      },
    };
    const context = {} as any;

    const result = await handler(event, context);

    expect(mockClickHouseRunner).toHaveBeenCalledWith({
      bucketName: bucketName,
      bucketRegion: "us-east-1",
      objectKey: "/test",
      queryStatement: "SELECT * FROM table",
      logLevel: "INFO",
      binaryPath: "./clickhouse",
    });
    expect(runMock).toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 200,
      body: "Result from ClickHouse",
    });
  });

  it("should handle POST request and return a successful response", async () => {
    const runMock = jest.fn().mockResolvedValue("Result from ClickHouse");
    mockClickHouseRunner.mockImplementation(() => ({
      run: runMock,
    }));

    const event: APIGatewayProxyEventV2 = {
      requestContext: {
        http: {
          path: "/test",
          method: "POST",
          protocol: "http",
          userAgent: "test-user-agent",
          sourceIp: "0.0.0.0",
        },
        accountId: "123456789012",
        requestId: "test-request-id",
        routeKey: "test-route-key",
        stage: "test-stage",
        time: "test-time",
        timeEpoch: 1234567890,
        apiId: "test-api-id",
        domainName: "test-domain-name",
        domainPrefix: "test-domain-prefix",
      },
      headers: {
        "Content-Type": "application/json",
      },
      isBase64Encoded: false,
      rawPath: "/test",
      rawQueryString: "statement=SELECT%20*%20FROM%20table",
      routeKey: "test-route-key",
      version: "2.0",
      body: "SELECT * FROM table",
      cookies: ["test-cookie"],
      pathParameters: {},
      queryStringParameters: {},
    };

    const context = {} as any;

    const result = await handler(event, context);

    expect(mockClickHouseRunner).toHaveBeenCalledWith({
      bucketName: bucketName,
      bucketRegion: "us-east-1",
      objectKey: "/test",
      queryStatement: "SELECT * FROM table",
      logLevel: "INFO",
      binaryPath: "./clickhouse",
    });
    expect(runMock).toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 200,
      body: "Result from ClickHouse",
    });
  });

  it("should handle request and return an error response when ClickHouse execution fails", async () => {
    const error = new Error("ClickHouse execution failed");
    const runMock = jest.fn().mockRejectedValue(error);
    mockClickHouseRunner.mockImplementation(() => ({
      run: runMock,
    }));

    const event: APIGatewayProxyEventV2 = {
      requestContext: {
        http: {
          path: "/test",
          method: "GET",
          protocol: "http",
          userAgent: "test-user-agent",
          sourceIp: "0.0.0.0",
        },
        accountId: "123456789012",
        requestId: "test-request-id",
        routeKey: "test-route-key",
        stage: "test-stage",
        time: "test-time",
        timeEpoch: 1234567890,
        apiId: "test-api-id",
        domainName: "test-domain-name",
        domainPrefix: "test-domain-prefix",
      },
      headers: {
        "Content-Type": "application/json",
      },
      isBase64Encoded: false,
      rawPath: "/test",
      rawQueryString: "statement=SELECT%20*%20FROM%20table",
      routeKey: "test-route-key",
      version: "2.0",
      body: "",
      cookies: ["test-cookie"],
      pathParameters: {},
      queryStringParameters: {
        statement: "SELECT * FROM table",
      },
    };
    const context = {} as any;

    const result = await handler(event, context);

    expect(mockClickHouseRunner).toHaveBeenCalledWith({
      bucketName: bucketName,
      bucketRegion: "us-east-1",
      objectKey: "/test",
      queryStatement: "SELECT * FROM table",
      logLevel: "INFO",
      binaryPath: "./clickhouse",
    });
    expect(runMock).toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 500,
      body: "Error: ClickHouse execution failed",
    });
  });
});
