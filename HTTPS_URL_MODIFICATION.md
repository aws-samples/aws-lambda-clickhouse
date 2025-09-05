# Enable Direct HTTPS URL Support in ClickHouse Lambda

## Current Limitation

Your ClickHouse Lambda currently only supports S3 URLs. To enable direct HTTPS URL support, you need to modify the `buildS3Uri()` method in `src/clickhouse_runner.ts`.

## Simple Modification

Replace the `buildS3Uri()` method in your `clickhouse_runner.ts` file:

### Current Code (line 72-76):
```typescript
// Build S3 URI
private buildS3Uri(): string {
  const s3Uri = `https://${this.bucketName}.s3.${this.bucketRegion}.amazonaws.com/${this.objectKey}`;
  return s3Uri;
}
```

### New Enhanced Code:
```typescript
// Build S3 URI - Enhanced with HTTPS URL support
private buildS3Uri(): string {
  // Check if objectKey contains a full HTTPS URL (encoded or not)
  const decodedKey = decodeURIComponent(this.objectKey);
  
  if (decodedKey.startsWith('https://') || decodedKey.startsWith('http://')) {
    // Direct HTTPS URL - return as-is
    return decodedKey;
  } else if (this.objectKey.includes('raw.githubusercontent.com') || 
             this.objectKey.includes('archive.ics.uci.edu') ||
             this.objectKey.includes('data.gov')) {
    // HTTPS URL without protocol - add https://
    return `https://${this.objectKey}`;
  } else {
    // Traditional S3 URL
    const s3Uri = `https://${this.bucketName}.s3.${this.bucketRegion}.amazonaws.com/${this.objectKey}`;
    return s3Uri;
  }
}
```

### Enhanced Query Building (Optional):

Also update the `buildQuery()` method to use the appropriate ClickHouse function:

```typescript
// Build ClickHouse query - Enhanced
private buildQuery(): string {
  const uri = this.buildS3Uri();
  let tableFunction;
  
  if (uri.includes('.s3.') || uri.startsWith('s3://')) {
    // S3 URLs use s3() function
    tableFunction = `s3('${uri}')`;
  } else if (uri.startsWith('https://') || uri.startsWith('http://')) {
    // HTTPS URLs use url() function with format detection
    if (uri.includes('.csv')) {
      tableFunction = `url('${uri}', 'CSVWithNames')`;
    } else {
      tableFunction = `url('${uri}', 'CSV')`;
    }
  } else {
    // Fallback to s3()
    tableFunction = `s3('${uri}')`;
  }
  
  const query = `CREATE TABLE table AS ${tableFunction}; ${this.queryStatement}`;
  return query;
}
```

## After Modification

Once you deploy this change, you can use HTTPS URLs directly in your DSN:

```go
// Direct HTTPS URL (URL encoded)
dsn := "clickhouse-lambda://function@region/bucket/https%3A%2F%2Fraw.githubusercontent.com%2Fdatasciencedojo%2Fdatasets%2Fmaster%2Ftitanic.csv"

// HTTPS URL without protocol (cleaner)  
dsn := "clickhouse-lambda://function@region/bucket/raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv"
```

## Benefits

1. **Direct public data access** - No need to download and upload to S3
2. **Real-time data** - Query live data sources
3. **Cost savings** - No S3 storage costs for public data
4. **Flexibility** - Mix S3 and HTTPS data sources in the same application

## Testing

After deployment, test with:

```go
dsn := "clickhouse-lambda://your-function@us-east-1/dummy-bucket/raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv"
db, _ := sql.Open("clickhouse-lambda", dsn)
count, _ := db.QueryRow("SELECT count(*) FROM table").Scan(&count)
// Should return 891 rows instead of your S3 test data
```
