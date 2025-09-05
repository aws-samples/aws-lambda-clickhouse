# AWS IAM Policy Setup for ClickHouse Lambda

This document explains how to set up IAM policies to allow users to query the ClickHouse Lambda function.

## Overview

The ClickHouse Lambda function uses AWS_IAM authentication, which means all requests must be signed with AWS Signature Version 4. Users need specific IAM permissions to invoke the Lambda function URL.

## IAM Policies

### 1. Basic Lambda Policy (`iam-policy.json`)

This policy provides the minimum permissions needed to invoke the ClickHouse Lambda function:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ClickHouseLambdaInvokePermission",
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunctionUrl"
      ],
      "Resource": [
        "arn:aws:lambda:*:*:function:ClickhouseLambdaStack-ClickhouseLambda*"
      ]
    },
    {
      "Sid": "ClickHouseLambdaDescribePermission",
      "Effect": "Allow",
      "Action": [
        "lambda:GetFunctionUrlConfig",
        "lambda:GetFunction"
      ],
      "Resource": [
        "arn:aws:lambda:*:*:function:ClickhouseLambdaStack-ClickhouseLambda*"
      ]
    }
  ]
}
```

### 2. Comprehensive Policy (`iam-policy-comprehensive.json`)

This policy includes both Lambda and S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ClickHouseLambdaInvokePermission",
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunctionUrl"
      ],
      "Resource": [
        "arn:aws:lambda:*:*:function:ClickhouseLambdaStack-ClickhouseLambda*"
      ]
    },
    {
      "Sid": "ClickHouseLambdaDescribePermission",
      "Effect": "Allow",
      "Action": [
        "lambda:GetFunctionUrlConfig",
        "lambda:GetFunction"
      ],
      "Resource": [
        "arn:aws:lambda:*:*:function:ClickhouseLambdaStack-ClickhouseLambda*"
      ]
    },
    {
      "Sid": "S3BucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::clickhouselambdastack-clickhousebucket*",
        "arn:aws:s3:::clickhouselambdastack-clickhousebucket*/*"
      ]
    }
  ]
}
```

## Setup Instructions

### Option 1: Using AWS CLI

1. **Create the IAM policy:**
   ```bash
   aws iam create-policy \
     --policy-name ClickHouseLambdaQueryPolicy \
     --policy-document file://iam-policy.json
   ```

2. **Attach the policy to a user:**
   ```bash
   aws iam attach-user-policy \
     --user-name YOUR_USERNAME \
     --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/ClickHouseLambdaQueryPolicy
   ```

### Option 2: Using AWS Console

1. **Navigate to IAM Console:**
   - Go to AWS IAM Console
   - Click "Policies" in the left sidebar
   - Click "Create policy"

2. **Create the policy:**
   - Choose "JSON" tab
   - Copy and paste the contents of `iam-policy.json`
   - Click "Next: Tags" (optional)
   - Click "Next: Review"
   - Name: `ClickHouseLambdaQueryPolicy`
   - Click "Create policy"

3. **Attach to user:**
   - Go to "Users" in IAM Console
   - Select your user
   - Click "Add permissions" → "Attach policies directly"
   - Search for and select `ClickHouseLambdaQueryPolicy`
   - Click "Next: Review" → "Add permissions"

## Policy Explanation

### Required Permissions

1. **`lambda:InvokeFunctionUrl`**: Allows the user to invoke the Lambda function URL
2. **`lambda:GetFunctionUrlConfig`**: Allows the user to get function URL configuration
3. **`lambda:GetFunction`**: Allows the user to get function details

### Resource ARNs

- **Lambda Function**: `arn:aws:lambda:*:*:function:ClickhouseLambdaStack-ClickhouseLambda*`
  - Uses wildcard to match any region and account
  - Matches the CDK-generated function name pattern

- **S3 Bucket** (comprehensive policy only): `arn:aws:s3:::clickhouselambdastack-clickhousebucket*`
  - Matches the CDK-generated bucket name pattern

## Security Considerations

1. **Principle of Least Privilege**: The basic policy only grants the minimum permissions needed
2. **Resource Restrictions**: Policies are scoped to specific Lambda functions and S3 buckets
3. **No S3 Direct Access**: Users don't need direct S3 permissions when using the Lambda function
4. **Authentication Required**: All requests must be signed with AWS Signature Version 4

## Testing the Policy

After attaching the policy, test it with curl:

```bash
curl 'https://YOUR_LAMBDA_URL/test.csv' \
  --aws-sigv4 "aws:amz:us-east-1:lambda" \
  -u 'YOUR_ACCESS_KEY:YOUR_SECRET_KEY' \
  -d 'SELECT count(*) FROM table;'
```

## Troubleshooting

### Common Issues

1. **Access Denied**: Check that the policy is attached to the correct user
2. **Function Not Found**: Verify the Lambda function name matches the policy resource ARN
3. **Region Mismatch**: Ensure the region in the curl command matches your Lambda deployment

### Debugging Steps

1. Check IAM policy attachment:
   ```bash
   aws iam list-attached-user-policies --user-name YOUR_USERNAME
   ```

2. Test Lambda function access:
   ```bash
   aws lambda get-function --function-name ClickhouseLambdaStack-ClickhouseLambda*
   ```

3. Check CloudWatch logs for detailed error messages

## Customization

### For Different Function Names

If your Lambda function has a different name, update the resource ARN in the policy:

```json
"Resource": [
  "arn:aws:lambda:*:*:function:YOUR_FUNCTION_NAME"
]
```

### For Different S3 Buckets

If you're using a different S3 bucket, update the resource ARN:

```json
"Resource": [
  "arn:aws:s3:::YOUR_BUCKET_NAME",
  "arn:aws:s3:::YOUR_BUCKET_NAME/*"
]
```

### For Multiple Users

To grant access to multiple users, attach the same policy to each user, or create an IAM group and attach the policy to the group.
