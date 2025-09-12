import { NextResponse } from 'next/server';
import { DeleteCommand, ScanCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
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
    const { activityName, money, positive, top, pending_quantity, completed, repeat, behaviorId } = body;

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

    // Check if behavior is changing (requires recreating the record with new sortKey)
    const currentSortKey = activity.sortKey;
    const isCurrentlyStandalone = currentSortKey.startsWith('ACTIVITY#');
    const isCurrentlyBehaviorAssociated = currentSortKey.includes('BEHAVIOR#') && currentSortKey.includes('#ACTIVITY#');
    
    let newSortKey;
    let newPartitionKey = activity.partitionKey;
    
    if (behaviorId && behaviorId.trim() !== '') {
      // Moving to or changing behavior
      // First, get the behavior to find the correct partition key
      const behaviorScanParams = {
        TableName: 'betterkid_v2',
        FilterExpression: 'sortKey = :sk',
        ExpressionAttributeValues: { ':sk': `BEHAVIOR#${behaviorId}` },
      };
      const behaviorData = await dynamoDb.send(new ScanCommand(behaviorScanParams));
      const behavior = behaviorData.Items?.[0];
      if (!behavior) {
        return NextResponse.json({ error: 'Behavior not found' }, { status: 404 });
      }
      newPartitionKey = behavior.partitionKey;
      newSortKey = `BEHAVIOR#${behaviorId}#ACTIVITY#${activityId}`;
    } else {
      // Moving to standalone
      newSortKey = `ACTIVITY#${activityId}`;
      // Keep the same partition key for standalone activities
    }
    
    const behaviorChanged = currentSortKey !== newSortKey || activity.partitionKey !== newPartitionKey;
    
    if (behaviorChanged) {
      // Delete old record and create new one with correct sortKey
      await dynamoDb.send(new DeleteCommand({
        TableName: 'betterkid_v2',
        Key: {
          partitionKey: activity.partitionKey,
          sortKey: activity.sortKey,
        },
      }));
      
      // Create new record
      const result = await dynamoDb.send(new PutCommand({
        TableName: 'betterkid_v2',
        Item: {
          partitionKey: newPartitionKey,
          sortKey: newSortKey,
          activityId: activityId,
          activityName: activityName.trim(),
          money: money,
          positive: positive,
          top: top || false,
          pending_quantity: pending_quantity !== undefined ? pending_quantity : activity.pending_quantity || 0,
          completed: completed || 'false',
          repeat: repeat || 'none',
          behaviorId: behaviorId && behaviorId.trim() !== '' ? behaviorId.trim() : null,
        },
      }));
      console.log('DynamoDB PUT (recreate) result:', result);
    } else {
      // Just update existing record
      const updateParams = {
        TableName: 'betterkid_v2',
        Key: {
          partitionKey: activity.partitionKey,
          sortKey: activity.sortKey,
        },
        UpdateExpression: 'SET activityName = :name, money = :money, positive = :positive, #top = :top, pending_quantity = :pending_quantity, completed = :completed, #repeat = :repeat, behaviorId = :behaviorId',
        ExpressionAttributeNames: {
          '#top': 'top',
          '#repeat': 'repeat'
        },
        ExpressionAttributeValues: {
          ':name': activityName.trim(),
          ':money': money,
          ':positive': positive,
          ':top': top || false,
          ':pending_quantity': pending_quantity !== undefined ? pending_quantity : activity.pending_quantity || 0,
          ':completed': completed || 'false',
          ':repeat': repeat || 'none',
          ':behaviorId': behaviorId && behaviorId.trim() !== '' ? behaviorId.trim() : null,
        },
        ConditionExpression: 'attribute_exists(partitionKey)',
      };

      const result = await dynamoDb.send(new UpdateCommand(updateParams));
      console.log('DynamoDB PUT (update) result:', result);
    }

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