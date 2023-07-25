// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { exec } from "child_process";
import {
  ClickHouseRunner,
  ClickHouseRunnerParams,
  LogLevel,
} from "../../src/clickhouse_runner";

// Mock the child_process.exec function
jest.mock("child_process", () => ({
  exec: jest.fn(),
}));

describe("ClickHouseRunner", () => {
  const mockExec = exec as unknown as jest.Mock;

  afterEach(() => {
    mockExec.mockReset();
  });

  describe("run", () => {
    it("should execute the command and resolve with stdout", async () => {
      const stdout = "Output from ClickHouse";
      mockExec.mockImplementation((command: string, callback: any) => {
        callback(null, stdout, "");
      });

      const params: ClickHouseRunnerParams = {
        bucketName: "test-bucket",
        bucketRegion: "us-west-1",
        objectKey: "test-object-key",
        queryStatement: "SELECT * FROM table",
        logLevel: "DEBUG",
        binaryPath: "/path/to/clickhouse",
      };
      const runner = new ClickHouseRunner(params);

      const result = await runner.run();

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining(params.binaryPath),
        expect.any(Function)
      );
      expect(result).toBe(stdout);
    });

    it("should reject with an error when execution fails", async () => {
      const error = new Error("Execution failed");
      mockExec.mockImplementation((command: string, callback: any) => {
        callback(error, "", "");
      });

      const params: ClickHouseRunnerParams = {
        bucketName: "test-bucket",
        bucketRegion: "us-east-1",
        objectKey: "test-object-key",
        queryStatement: "SELECT * FROM table",
        logLevel: "DEBUG",
        binaryPath: "/path/to/clickhouse",
      };
      const runner = new ClickHouseRunner(params);

      await expect(runner.run()).rejects.toThrow(error);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining(params.binaryPath),
        expect.any(Function)
      );
    });
  });

  describe("buildCommand", () => {
    it("should build the ClickHouse command with the provided parameters", () => {
      const params: ClickHouseRunnerParams = {
        bucketName: "test-bucket",
        bucketRegion: "us-east-1",
        objectKey: "test-object-key",
        queryStatement: "SELECT * FROM table",
        logLevel: "DEBUG",
        binaryPath: "/path/to/clickhouse",
      };
      const runner = new ClickHouseRunner(params);

      const command = runner["buildCommand"]();

      expect(command).toContain(params.binaryPath);
      expect(command).toContain(`--query="${runner["buildQuery"]()}"`);
      expect(command).toContain(`--logger.level="${params.logLevel}"`);
      expect(command).toContain("--logger.console");
    });
  });

  describe("buildQuery", () => {
    it("should build the ClickHouse query with the provided parameters", () => {
      const params: ClickHouseRunnerParams = {
        bucketName: "test-bucket",
        bucketRegion: "us-east-1",
        objectKey: "test-object-key",
        queryStatement: "SELECT * FROM table",
        logLevel: "DEBUG",
        binaryPath: "/path/to/clickhouse",
      };
      const runner = new ClickHouseRunner(params);

      const query = runner["buildQuery"]();

      expect(query).toContain(runner["buildS3Uri"]());
      expect(query).toContain(params.queryStatement);
    });
  });

  describe("buildS3Uri", () => {
    it("should build the S3 URI with the provided parameters", () => {
      const params: ClickHouseRunnerParams = {
        bucketName: "test-bucket",
        bucketRegion: "us-west-1",
        objectKey: "test-object-key",
        queryStatement: "SELECT * FROM table",
        logLevel: "DEBUG",
        binaryPath: "/path/to/clickhouse",
      };
      const runner = new ClickHouseRunner(params);

      const s3Uri = runner["buildS3Uri"]();

      expect(s3Uri).toContain(params.bucketName);
      expect(s3Uri).toContain(params.bucketRegion);
      expect(s3Uri).toContain(params.objectKey);
    });
  });
});
