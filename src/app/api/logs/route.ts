import { NextResponse } from 'next/server';
import { ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    console.log(`Deleting all logs for user: ${userId}`);

    // First, get all log entries for the user
    const scanParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'BALANCELOG#',
      },
    };

    const result = await dynamoDb.send(new ScanCommand(scanParams));
    const logs = result.Items || [];

    console.log(`Found ${logs.length} log entries to delete`);

    let deleteCount = 0;
    let errorCount = 0;

    // Delete each log entry
    for (const log of logs) {
      try {
        const deleteParams = {
          TableName: 'betterkid_v2',
          Key: {
            partitionKey: log.partitionKey,
            sortKey: log.sortKey,
          },
        };

        await dynamoDb.send(new DeleteCommand(deleteParams));
        deleteCount++;
      } catch (err) {
        console.error(`Failed to delete log ${log.sortKey}:`, err);
        errorCount++;
      }
    }

    console.log(`Deleted ${deleteCount} logs for user ${userId}. Errors: ${errorCount}`);

    return NextResponse.json({ 
      message: `Successfully deleted ${deleteCount} log entries`,
      deletedCount: deleteCount,
      errorCount: errorCount,
      totalFound: logs.length
    });
  } catch (err) {
    console.error('Failed to delete logs:', err);
    const errorMessage = (err instanceof Error) ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to delete logs', details: errorMessage }, { status: 500 });
  }
}
