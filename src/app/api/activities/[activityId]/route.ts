import { NextResponse } from 'next/server';
import { DeleteCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function PUT(request: Request, { params }: { params: Promise<{ activityId: string }> }) {
  try {
    const { activityId } = await params;
    console.log('Attempting to update activity:', activityId);

    if (!activityId || typeof activityId !== 'string') {
      console.error('Missing or invalid activityId for update:', activityId);
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { activityName, money, positive } = body;

    if (!activityName || activityName.trim() === '') {
      return NextResponse.json({ error: 'Activity name is required' }, { status: 400 });
    }
    
    if (typeof money !== 'number' || isNaN(money)) {
      return NextResponse.json({ error: 'Valid money amount is required' }, { status: 400 });
    }
    
    if (typeof positive !== 'boolean') {
      return NextResponse.json({ error: 'Positive flag must be true or false' }, { status: 400 });
    }

    // Find the activity to get its partition key and sort key
    const scanParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'activityId = :activityId',
      ExpressionAttributeValues: {
        ':activityId': activityId,
      },
    };

    const scanResult = await dynamoDb.send(new ScanCommand(scanParams));
    const activity = scanResult.Items?.[0];

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const updateParams = {
      TableName: 'betterkid_v2',
      Key: {
        partitionKey: activity.partitionKey,
        sortKey: activity.sortKey,
      },
      UpdateExpression: 'SET activityName = :name, money = :money, positive = :positive',
      ExpressionAttributeValues: {
        ':name': activityName.trim(),
        ':money': money,
        ':positive': positive,
      },
      ConditionExpression: 'attribute_exists(partitionKey)',
    };

    const result = await dynamoDb.send(new UpdateCommand(updateParams));
    console.log('DynamoDB PUT result:', result);

    return NextResponse.json({ message: 'Activity updated successfully' });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating activity:', err);
    return NextResponse.json(
      { error: 'Failed to update activity', details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ activityId: string }> }) {
  try {
    const { activityId } = await params;
    console.log('Attempting to delete activity:', activityId);

    if (!activityId || typeof activityId !== 'string') {
      console.error('Missing or invalid activityId for deletion:', activityId);
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Find the activity to get its partition key and sort key
    const scanParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'activityId = :activityId',
      ExpressionAttributeValues: {
        ':activityId': activityId,
      },
    };

    const scanResult = await dynamoDb.send(new ScanCommand(scanParams));
    const activity = scanResult.Items?.[0];

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const deleteParams = {
      TableName: 'betterkid_v2',
      Key: {
        partitionKey: activity.partitionKey,
        sortKey: activity.sortKey,
      },
      ConditionExpression: 'attribute_exists(partitionKey)',
    };

    const result = await dynamoDb.send(new DeleteCommand(deleteParams));
    console.log('DynamoDB DELETE result:', result);

    return NextResponse.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    const err = error as Error;
    console.error('Error deleting activity:', err);
    return NextResponse.json(
      { error: 'Failed to delete activity', details: err.message },
      { status: 500 }
    );
  }
}