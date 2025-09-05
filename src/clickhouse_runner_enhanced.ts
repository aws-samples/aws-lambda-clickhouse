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

// Enhanced Runner Class for ClickHouse local with HTTPS support
export class ClickHouseRunnerEnhanced {
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
    return command;
  }

  // Enhanced Build ClickHouse query with HTTPS support
  private buildQuery(): string {
    const dataUri = this.buildDataUri();
    const query = `CREATE TABLE table AS ${this.getTableFunction(dataUri)}; ${this.queryStatement}`;
    return query;
  }

  // Build data URI - supports both S3 and HTTPS URLs
  private buildDataUri(): string {
    // Check if objectKey is a full HTTPS URL (encoded or not)
    const decodedKey = decodeURIComponent(this.objectKey);
    
    if (decodedKey.startsWith('https://') || decodedKey.startsWith('http://')) {
      // Direct HTTPS URL
      return decodedKey;
    } else if (this.objectKey.includes('raw.githubusercontent.com') || 
               this.objectKey.includes('archive.ics.uci.edu') ||
               this.objectKey.includes('data.gov') ||
               this.objectKey.includes('kaggle.com')) {
      // Looks like an HTTPS URL without the protocol, add https://
      return `https://${this.objectKey}`;
    } else {
      // Traditional S3 URL
      return `https://${this.bucketName}.s3.${this.bucketRegion}.amazonaws.com/${this.objectKey}`;
    }
  }

  // Determine the appropriate ClickHouse table function based on URI
  private getTableFunction(uri: string): string {
    // Check if this is an S3 URL (contains .s3. and .amazonaws.com)
    if (uri.includes('.s3.') && uri.includes('.amazonaws.com')) {
      // For S3 URLs, use s3() function
      return `s3('${uri}')`;
    } else if (uri.startsWith('https://') || uri.startsWith('http://')) {
      // For HTTPS URLs, use url() function with format detection
      if (uri.includes('.csv')) {
        return `url('${uri}', 'CSVWithNames')`;
      } else if (uri.includes('.tsv')) {
        return `url('${uri}', 'TSVWithNames')`;
      } else if (uri.includes('.json')) {
        return `url('${uri}', 'JSONEachRow')`;
      } else {
        // Default to CSV for unknown formats
        return `url('${uri}', 'CSV')`;
      }
    } else {
      // Fallback to s3() function
      return `s3('${uri}')`;
    }
  }
}

// Legacy wrapper for backward compatibility
export class ClickHouseRunner extends ClickHouseRunnerEnhanced {}
