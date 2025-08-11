import { NextResponse } from 'next/server';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const params = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'BALANCELOG#',
      },
    };

    const result = await dynamoDb.send(new ScanCommand(params));
    const logs = result.Items || [];

    logs.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return NextResponse.json(logs);
  } catch (err) {
    console.error('Failed to fetch balance logs:', err);
    const errorMessage = (err instanceof Error) ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to fetch logs', details: errorMessage }, { status: 500 });
  }
}
