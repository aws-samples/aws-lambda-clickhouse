// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { spawn, ChildProcessWithoutNullStreams } from "child_process";

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
  // public async run(): Promise<string> {
  //   const command = this.buildCommand();
  //   console.log(`COMMAND ${command[0]} ${command.slice(1).join(" ")}`);
  //   return new Promise((resolve, reject) => {
  //     exec(command.join(" "), (error, stdout, stderr) => {
  //       if (error) {
  //         console.error(`exec error: ${error}`);
  //         reject(error);
  //       }
  //       // do not reject on stderr need to configure ClickHouse to log to stdout
  //       if (stderr) {
  //         console.log(`stderr: ${stderr}`);
  //         //reject(stderr);
  //       }
  //       console.log(`stdout: ${stdout}`);
  //       resolve(stdout);
  //     });
  //   });
  // }
  // public async run(): Promise<string> {
  //   const command = this.buildCommand();
  //   console.log(`COMMAND ${command[0]} ${command.slice(1).join(" ")}`);
  //   return new Promise((resolve, reject) => {
  //     const child = spawn(command[0], command.slice(1), { shell: true });
  //     let stdout = "";
  //     let stderr = "";
  //     child.stdout.on("data", (data: Buffer) => {
  //       stdout += data.toString();
  //     });
  //     child.stderr.on("data", (data: Buffer) => {
  //       stderr += data.toString();
  //     });
  //     child.on("close", (code: number) => {
  //       if (code === 0) {
  //         resolve(stdout);
  //       } else {
  //         reject(new Error(stderr || "spawnAsync error without stderr output"));
  //       }
  //     });
  //     child.on("error", (error: Error) => {
  //       reject(error);
  //     });
  //   });
  // }
  public run(): ChildProcessWithoutNullStreams {
    const command = this.buildCommand();
    console.log(`COMMAND ${command[0]} ${command.slice(1).join(" ")}`);
    const child = spawn(command[0], command.slice(1), {
      shell: true,
      stdio: "pipe",
    });
    return child;
  }

  // Build ClickHouse command
  private buildCommand(): string[] {
    const query = this.buildQuery();
    const command = [
      `${this.binaryPath}`,
      "local",
      `--query="${query}"`,
      `--logger.level="${this.logLevel}"`,
      "--logger.console",
    ];
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
