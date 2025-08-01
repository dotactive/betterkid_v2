import { NextResponse } from 'next/server';
import { PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function PUT(request, context) {
  try {
    const { behaviorId } = context.params;
    console.log('PUT /api/behaviors/[behaviorId], received behaviorId:', behaviorId);

    if (!behaviorId || typeof behaviorId !== 'string') {
      return NextResponse.json({ error: 'Behavior ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { userId, behaviorName, bannerImage, thumbImage } = body;

    if (!userId || !behaviorName || typeof behaviorName !== 'string' || behaviorName.trim() === '') {
      return NextResponse.json({ error: 'UserId and non-empty behavior name are required' }, { status: 400 });
    }

    const params = {
      TableName: 'betterkid_v2',
      Item: {
        partitionKey: `USER#${userId}`,
        sortKey: `BEHAVIOR#${behaviorId}`,
        behaviorId,
        behaviorName: behaviorName.trim(),
        bannerImage: bannerImage || null,
        thumbImage: thumbImage || null,
      },
      ConditionExpression: 'attribute_exists(partitionKey) AND attribute_exists(sortKey)',
    };

    await dynamoDb.send(new PutCommand(params));
    return NextResponse.json({ message: 'Behavior updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update behavior', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const { behaviorId } = context.params;

    if (!behaviorId || typeof behaviorId !== 'string') {
      return NextResponse.json({ error: 'Behavior ID is required' }, { status: 400 });
    }

    const userId = request.headers.get('x-userid') || '';

    // Fetch associated activities
    const activitiesParams = {
      TableName: 'betterkid_v2',
      KeyConditionExpression: 'partitionKey = :pk AND begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `BEHAVIOR#${behaviorId}#ACTIVITY#`,
      },
    };
    const activitiesData = await dynamoDb.send(new QueryCommand(activitiesParams));
    const activities = activitiesData.Items || [];

    for (const activity of activities) {
      const deleteParams = {
        TableName: 'betterkid_v2',
        Key: {
          partitionKey: activity.partitionKey,
          sortKey: activity.sortKey,
        },
      };
      await dynamoDb.send(new DeleteCommand(deleteParams));
    }

    // Fetch behavior to get partitionKey
    const behaviorParams = {
      TableName: 'betterkid_v2',
      KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `BEHAVIOR#${behaviorId}`,
      },
    };
    const behaviorData = await dynamoDb.send(new QueryCommand(behaviorParams));
    const behavior = behaviorData.Items?.[0];

    if (!behavior) {
      return NextResponse.json({ error: 'Behavior not found' }, { status: 404 });
    }

    const deleteParams = {
      TableName: 'betterkid_v2',
      Key: {
        partitionKey: behavior.partitionKey,
        sortKey: `BEHAVIOR#${behaviorId}`,
      },
      ConditionExpression: 'attribute_exists(partitionKey) AND attribute_exists(sortKey)',
    };

    await dynamoDb.send(new DeleteCommand(deleteParams));
    return NextResponse.json({ message: 'Behavior deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete behavior', details: error.message }, { status: 500 });
  }
}
