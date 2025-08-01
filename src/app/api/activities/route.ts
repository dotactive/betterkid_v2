import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';
import { v4 as uuidv4 } from 'uuid';

interface Activity {
  activityId: string;
  activityName: string;
  money: number;
  positive: boolean;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const behaviorId = searchParams.get('behaviorId');
    if (!behaviorId) {
      return NextResponse.json({ error: 'Behavior ID is required' }, { status: 400 });
    }

    const params = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':sk': `BEHAVIOR#${behaviorId}#ACTIVITY#`,
      },
    };
    console.log('Fetching activities with params:', params);

    const data = await dynamoDb.send(new ScanCommand(params));
    console.log('DynamoDB GET result:', data);

    const activities = data.Items?.map((item) => ({
      activityId: item.activityId,
      activityName: item.activityName,
      money: item.money,
      positive: item.positive,
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
    const { behaviorId, activityName, money, positive }: { behaviorId: string; activityName: string; money: number; positive: boolean } = body;
    console.log('Attempting to create activity:', { behaviorId, activityName, money, positive });

    if (!behaviorId || !activityName || typeof activityName !== 'string' || typeof money !== 'number' || typeof positive !== 'boolean') {
      console.error('Missing or invalid fields:', { behaviorId, activityName, money, positive });
      return NextResponse.json({ error: 'Behavior ID, activity name, money, and positive are required' }, { status: 400 });
    }

    // Fetch behavior to get partition key
    const behaviorParams = {
      TableName: 'betterkid_v2',
      Key: {
        partitionKey: `USER#unknown`, // Will be updated
        sortKey: `BEHAVIOR#${behaviorId}`,
      },
    };
    const behaviorData = await dynamoDb.send(new ScanCommand({
      TableName: 'betterkid_v2',
      FilterExpression: 'sortKey = :sk',
      ExpressionAttributeValues: { ':sk': `BEHAVIOR#${behaviorId}` },
    }));
    const behavior = behaviorData.Items?.[0];
    if (!behavior) {
      return NextResponse.json({ error: 'Behavior not found' }, { status: 404 });
    }

    const activityId = uuidv4();
    const params = {
      TableName: 'betterkid_v2',
      Item: {
        partitionKey: behavior.partitionKey,
        sortKey: `BEHAVIOR#${behaviorId}#ACTIVITY#${activityId}`,
        activityId,
        activityName,
        money,
        positive,
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