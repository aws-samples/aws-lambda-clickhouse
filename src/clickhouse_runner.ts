// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { exec } from "child_process";

// Log Levels for ClickHouseRunner
export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

// Type with parameters for ClickHouseRunner
export interface ClickHouseRunnerParams {
  bucketName: string;
  bucketRegion: string;
  objectKey: string;
  queryStatement: string;
  logLevel: LogLevel;
  binaryPath: string;
}

// Runner Class for ClickHouse loacal
export class ClickHouseRunner {
  private readonly bucketName: string;
  private readonly objectKey: string;
  private readonly bucketRegion: string;
  private readonly queryStatement: string;
  private readonly logLevel: LogLevel;
  private readonly binaryPath: string;

  constructor(params: ClickHouseRunnerParams) {
    this.bucketName = params.bucketName;
    this.bucketRegion = params.bucketRegion;
    this.objectKey = params.objectKey;
    this.queryStatement = params.queryStatement;
    this.logLevel = params.logLevel;
    this.binaryPath = params.binaryPath;
  }

  // Run ClickHouse
  // TODO:  implement with spawn to work with large data and stream
  public async run(): Promise<string> {
    const command = this.buildCommand();
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          reject(error);
        }
        // do not reject on stderr need to configure ClickHouse to log to stdout
        if (stderr) {
          console.log(`stderr: ${stderr}`);
          //reject(stderr);
        }
        console.log(`stdout: ${stdout}`);
        resolve(stdout);
      });
    });
  }

  // Build ClickHouse command
  private buildCommand(): string {
    const query = this.buildQuery();
    const command = `${this.binaryPath} local --query="${query}" --logger.level="${this.logLevel}" --logger.console`;
    //const command = `${this.binaryPath} local --query="${query}"`;
    return command;
  }

  // Build ClickHouse query
  private buildQuery(): string {
    const s3Uri = this.buildS3Uri();
    const query = `CREATE TABLE table AS s3('${s3Uri}'); ${this.queryStatement}`;
    return query;
  }

  // Build S3 URI
  private buildS3Uri(): string {
    const s3Uri = `https://${this.bucketName}.s3.${this.bucketRegion}.amazonaws.com/${this.objectKey}`;
    return s3Uri;
  }
}
