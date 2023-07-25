// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import axios from "axios";
import { aws4Interceptor } from "aws4-axios";
import * as fs from "fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const uploadFile = async (
  fileName: string,
  bucketName: string,
  region: string
) => {
  const file = fs.createReadStream(`${__dirname}/${fileName}`);
  const s3 = new S3Client({ region: region });
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: file,
  });
  try {
    const data = await s3.send(command);
    console.log("Success. File uploaded to S3.");
  } catch (err) {
    console.log("Error", err);
  }
};

describe("App integration test", () => {
  let baseApiUrl: string;
  let s3BucketName: string;
  let region: string;
  let accessKeyId: string;
  let secretAccessKey: string;
  const fileName = "test.csv";
  const client = axios.create();
  beforeAll(async () => {
    baseApiUrl = process.env.BASE_API_URL ?? "";
    s3BucketName = process.env.BUCKET_NAME ?? "";
    region = process.env.AWS_REGION ?? "us-east-1";
    accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? "";
    secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? "";
    if (baseApiUrl === "") {
      throw new Error("BASE_API_URL is not defined");
    }
    if (s3BucketName === "") {
      throw new Error("BUCKET_NAME is not defined");
    }
    if (accessKeyId === "") {
      throw new Error("AWS_ACCESS_KEY_ID is not defined");
    }
    if (secretAccessKey === "") {
      throw new Error("AWS_SECRET_ACCESS_KEY is not defined");
    }
    const interceptor = aws4Interceptor({
      options: { region: region, service: "lambda" },
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
    client.interceptors.request.use(interceptor);
    await uploadFile(fileName, s3BucketName, region);
  });

  it("should return 200 and result for get request with query", async () => {
    const path = fileName;
    const statement = "select count(*) from table";
    const url = `${baseApiUrl}/${path}?statement=${statement}`;
    const config = {
      method: "get",
      url: url,
      headers: {},
    };
    const response = await client(config);
    expect(response.status).toBe(200);
    expect(response.data.message).toContain("100");
  }, 10000);

  it("should return 200 and result for post request with query", async () => {
    const path = fileName;
    const statement = "select count(*) from table";
    const url = `${baseApiUrl}/${path}`;
    const config = {
      method: "post",
      url: url,
      headers: {
        "Content-Type": "text/plain",
      },
      data: statement,
    };
    const response = await client(config);
    expect(response.status).toBe(200);
    expect(response.data.message).toContain("100");
  }, 10000);
});
