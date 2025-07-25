import { NextResponse } from 'next/server';
import { PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

// PUT handler
export async function PUT(request, { params }) {
  try {
    const { activityId } = params;

    if (!activityId || typeof activityId !== 'string') {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { activityName, money, positive } = body;

    if (!activityName || typeof activityName !== 'string' || typeof money !== 'number' || typeof positive !== 'boolean') {
      return NextResponse.json({ error: 'Activity name, money, and positive are required' }, { status: 400 });
    }
    
    const dynamoParams = {
      TableName: 'BetterKidData',
      Item: {
        partitionKey: `ACTIVITY#${activityId}`,
        sortKey: 'DETAILS',
        activityId,
        activityName,
        money,
        positive,
      },
      ConditionExpression: 'attribute_exists(partitionKey) AND attribute_exists(sortKey)',
    };

    await dynamoDb.send(new PutCommand(dynamoParams));
    return NextResponse.json({ message: 'Activity updated successfully' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update activity', details: err.message }, { status: 500 });
  }
}

// DELETE handler
export async function DELETE(_request, { params }) {
  try {
    const { activityId } = params;

    if (!activityId || typeof activityId !== 'string') {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const activityData = await dynamoDb.send(new ScanCommand({
      TableName: 'BetterKidData',
      FilterExpression: 'activityId = :id',
      ExpressionAttributeValues: { ':id': activityId },
    }));

    const activity = activityData.Items?.[0];
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const deleteParams = {
      TableName: 'BetterKidData',
      Key: {
        partitionKey: activity.partitionKey,
        sortKey: activity.sortKey,
      },
      ConditionExpression: 'attribute_exists(partitionKey) AND attribute_exists(sortKey)',
    };

    await dynamoDb.send(new DeleteCommand(deleteParams));
    return NextResponse.json({ message: 'Activity deleted successfully' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete activity', details: err.message }, { status: 500 });
  }
}
