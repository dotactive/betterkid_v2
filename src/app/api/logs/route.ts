import { NextResponse } from 'next/server';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const params = {
      TableName: 'betterkid_v2',
      KeyConditionExpression: 'partitionKey = :pk AND begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${username}`,
        ':sk': 'BALANCELOG#',
      },
    };

    const result = await dynamoDb.send(new QueryCommand(params));
    const logs = result.Items || [];

    logs.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return NextResponse.json(logs);
  } catch (err) {
    console.error('Failed to fetch balance logs:', err);
    const errorMessage = (err instanceof Error) ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to fetch logs', details: errorMessage }, { status: 500 });
  }
}
