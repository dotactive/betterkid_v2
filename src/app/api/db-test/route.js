import { NextResponse } from 'next/server';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function GET() {
  try {
    const data = await dynamoDb.send(new ScanCommand({
      TableName: 'betterkid_v2',
      Limit: 1
    }));

    return NextResponse.json({
      success: true,
      items: data.Items || [],
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack,            // Optional: helpful if allowed
      type: err.name || 'UnknownError'
    }, { status: 500 });
  }
}
