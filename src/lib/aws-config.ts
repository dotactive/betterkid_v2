// src/lib/aws-config.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: 'ap-southeast-2', // ✅ Hardcoded to match your table region
  // ❌ DO NOT include manual credentials in Amplify
});

const dynamoDb = DynamoDBDocumentClient.from(client);

export default dynamoDb;
