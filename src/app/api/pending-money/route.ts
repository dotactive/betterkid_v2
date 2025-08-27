import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';
import { v4 as uuidv4 } from 'uuid';

interface PendingMoney {
  pendingId: string;
  userId: string;
  amount: number;
  reason: string;
  type: 'todo' | 'activity' | 'behavior';
  referenceId: string;
  createdAt: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      console.error('UserId missing in GET /api/pending-money');
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const params = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'PENDING#',
      },
    };
    console.log('Fetching pending money with params:', params);

    const data = await dynamoDb.send(new ScanCommand(params));
    console.log('DynamoDB GET result:', data);

    const pendingMoney = (data.Items || []).filter(
      (item) => item.pendingId && item.amount
    ).map((item) => ({
      pendingId: item.pendingId,
      userId: item.userId,
      amount: item.amount,
      reason: item.reason || '',
      type: item.type || 'todo',
      referenceId: item.referenceId || '',
      createdAt: item.createdAt || new Date().toISOString(),
    }));

    return NextResponse.json(pendingMoney);
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching pending money:', err);
    return NextResponse.json(
      { error: 'Failed to fetch pending money', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, amount, reason, type = 'todo', referenceId }: {
      userId: string;
      amount: number;
      reason: string;
      type?: 'todo' | 'activity' | 'behavior';
      referenceId: string;
    } = body;
    console.log('POST /api/pending-money, received:', { userId, amount, reason, type, referenceId });

    if (!userId || !amount || !reason || !referenceId) {
      console.error('Invalid input:', { userId, amount, reason, referenceId });
      return NextResponse.json({ error: 'UserId, amount, reason, and referenceId are required' }, { status: 400 });
    }

    const pendingId = uuidv4();
    const partitionKey = `USER#${userId}`;
    const createdAt = new Date().toISOString();
    
    const params = {
      TableName: 'betterkid_v2',
      Item: {
        partitionKey: partitionKey,
        sortKey: `PENDING#${pendingId}`,
        pendingId,
        userId,
        amount,
        reason,
        type,
        referenceId,
        createdAt,
      },
      ConditionExpression: 'attribute_not_exists(partitionKey) AND attribute_not_exists(sortKey)',
    };
    console.log('DynamoDB PUT params:', { params });

    await dynamoDb.send(new PutCommand(params));
    console.log('Pending money created successfully:', pendingId);

    return NextResponse.json({ message: 'Pending money created successfully', pendingId });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating pending money:', err);
    return NextResponse.json(
      { error: 'Failed to create pending money', details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pendingId = searchParams.get('pendingId');
    
    if (!pendingId) {
      return NextResponse.json({ error: 'Pending ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { amount, reason }: { amount: number; reason: string } = body;
    
    if (typeof amount !== 'number' || !reason) {
      return NextResponse.json({ error: 'Amount and reason are required' }, { status: 400 });
    }

    // Find the pending money record
    const scanParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'pendingId = :pendingId',
      ExpressionAttributeValues: {
        ':pendingId': pendingId,
      },
    };

    const scanResult = await dynamoDb.send(new ScanCommand(scanParams));
    const pendingRecord = scanResult.Items?.[0];

    if (!pendingRecord) {
      return NextResponse.json({ error: 'Pending money not found' }, { status: 404 });
    }

    // Update the pending money record
    const updateParams = {
      TableName: 'betterkid_v2',
      Item: {
        ...pendingRecord,
        amount,
        reason,
        updatedAt: new Date().toISOString(),
      },
    };

    await dynamoDb.send(new PutCommand(updateParams));
    console.log('Pending money updated successfully:', pendingId);

    return NextResponse.json({ message: 'Pending money updated successfully' });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating pending money:', err);
    return NextResponse.json(
      { error: 'Failed to update pending money', details: err.message },
      { status: 500 }
    );
  }
}