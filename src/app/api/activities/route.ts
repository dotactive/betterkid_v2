import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';
import { v4 as uuidv4 } from 'uuid';

interface Activity {
  activityId: string;
  activityName: string;
  money: number;
  positive: boolean;
  top?: boolean;
  pending_quantity?: number;
  completed?: 'false' | 'pending' | 'true';
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'once';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const behaviorId = searchParams.get('behaviorId');
    const userId = searchParams.get('userId');
    const standalone = searchParams.get('standalone');

    let params;

    if (standalone === 'true' && userId) {
      // Fetch standalone activities (not associated with any behavior)
      params = {
        TableName: 'betterkid_v2',
        FilterExpression: 'partitionKey = :pk AND begins_with(sortKey, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'ACTIVITY#',
        },
      };
    } else if (behaviorId) {
      // Fetch activities for a specific behavior
      params = {
        TableName: 'betterkid_v2',
        FilterExpression: 'begins_with(sortKey, :sk)',
        ExpressionAttributeValues: {
          ':sk': `BEHAVIOR#${behaviorId}#ACTIVITY#`,
        },
      };
    } else {
      return NextResponse.json({ error: 'Either behaviorId or userId with standalone=true is required' }, { status: 400 });
    }

    console.log('Fetching activities with params:', params);

    const data = await dynamoDb.send(new ScanCommand(params));
    console.log('DynamoDB GET result:', data);

    const activities = data.Items?.map((item) => ({
      activityId: item.activityId,
      activityName: item.activityName,
      money: item.money,
      positive: item.positive,
      top: item.top || false,
      pending_quantity: item.pending_quantity || 0,
      completed: item.completed || 'false',
      repeat: item.repeat || 'none',
      behaviorId: item.behaviorId || null,
    })) || [];

    return NextResponse.json(activities);
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching activities:', err);
    return NextResponse.json(
      { error: 'Failed to fetch activities', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { behaviorId, activityName, money, positive, top, completed = 'false', repeat = 'none', userId }: { 
      behaviorId?: string; 
      activityName: string; 
      money: number; 
      positive: boolean; 
      top?: boolean;
      completed?: 'false' | 'pending' | 'true';
      repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'once';
      userId?: string;
    } = body;
    console.log('Attempting to create activity:', { behaviorId, activityName, money, positive });

    if (!activityName || typeof activityName !== 'string' || typeof money !== 'number' || typeof positive !== 'boolean') {
      console.error('Missing or invalid fields:', { behaviorId, activityName, money, positive });
      return NextResponse.json({ error: 'Activity name, money, and positive are required' }, { status: 400 });
    }

    const activityId = uuidv4();
    let partitionKey = userId ? `USER#${userId}` : 'USER#unknown';
    let sortKey;
    
    if (behaviorId && behaviorId.trim() !== '') {
      // Fetch behavior to get partition key
      const behaviorData = await dynamoDb.send(new ScanCommand({
        TableName: 'betterkid_v2',
        FilterExpression: 'sortKey = :sk',
        ExpressionAttributeValues: { ':sk': `BEHAVIOR#${behaviorId}` },
      }));
      const behavior = behaviorData.Items?.[0];
      if (!behavior) {
        return NextResponse.json({ error: 'Behavior not found' }, { status: 404 });
      }
      partitionKey = behavior.partitionKey;
      sortKey = `BEHAVIOR#${behaviorId}#ACTIVITY#${activityId}`;
    } else {
      // Create standalone activity without behavior association
      sortKey = `ACTIVITY#${activityId}`;
    }
    const params = {
      TableName: 'betterkid_v2',
      Item: {
        partitionKey,
        sortKey,
        activityId,
        activityName,
        money,
        positive,
        top: top || false,
        pending_quantity: 0,
        completed,
        repeat,
        behaviorId: behaviorId && behaviorId.trim() !== '' ? behaviorId.trim() : null,
      },
      ConditionExpression: 'attribute_not_exists(partitionKey) AND attribute_not_exists(sortKey)',
    };
    console.log('DynamoDB PUT params:', params);

    const result = await dynamoDb.send(new PutCommand(params));
    console.log('DynamoDB PUT result:', result);

    return NextResponse.json({ message: 'Activity created successfully' });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating activity:', err);
    return NextResponse.json(
      { error: 'Failed to create activity', details: err.message },
      { status: 500 }
    );
  }
}