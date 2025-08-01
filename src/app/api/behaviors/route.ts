import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';
import { v4 as uuidv4 } from 'uuid';

interface Behavior {
  behaviorId: string;
  behaviorName: string;
  bannerImage?: string; // e.g., '/banner/banner1.jpg'
  thumbImage?: string; // e.g., '/thumb/thumb1.jpg'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      console.error('UserId missing in GET /api/behaviors');
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const params = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'BEHAVIOR#',
      },
    };
    console.log('Fetching behaviors with params:', params);

    const data = await dynamoDb.send(new ScanCommand(params));
    console.log('DynamoDB GET result:', data);

    const behaviors = (data.Items || []).filter(
      (item) => item.behaviorId && item.behaviorName
    ).map((item) => ({
      behaviorId: item.behaviorId,
      behaviorName: item.behaviorName,
      bannerImage: item.bannerImage || null,
      thumbImage: item.thumbImage || null,
    }));

    return NextResponse.json(behaviors);
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching behaviors:', err);
    return NextResponse.json(
      { error: 'Failed to fetch behaviors', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, behaviorName, bannerImage, thumbImage }: {
      userId: string;
      behaviorName: string;
      bannerImage?: string;
      thumbImage?: string;
    } = body;
    console.log('POST /api/behaviors, received:', { userId, behaviorName, bannerImage, thumbImage });

    if (!userId || !behaviorName || typeof behaviorName !== 'string' || behaviorName.trim() === '') {
      console.error('Invalid input:', { userId, behaviorName });
      return NextResponse.json({ error: 'UserId and non-empty behavior name are required' }, { status: 400 });
    }

    const behaviorId = uuidv4();
    const partitionKey = `USER#${userId}`;
    const params = {
      TableName: 'betterkid_v2',
      Item: {
        partitionKey: partitionKey,
        sortKey: `BEHAVIOR#${behaviorId}`,
        behaviorId,
        behaviorName: behaviorName.trim(),
        bannerImage: bannerImage || null,
        thumbImage: thumbImage || null,
      },
      ConditionExpression: 'attribute_not_exists(partitionKey) AND attribute_not_exists(sortKey)',
    };
    console.log('DynamoDB PUT params:', { params });

    await dynamoDb.send(new PutCommand(params));
    console.log('Behavior created successfully:', behaviorId);

    return NextResponse.json({ message: 'Behavior created successfully' });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating behavior:', err);
    return NextResponse.json(
      { error: 'Failed to create behavior', details: err.message },
      { status: 500 }
    );
  }
}