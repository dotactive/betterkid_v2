import { NextResponse } from 'next/server';
import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      console.error('UserId missing in GET /api/user-balance');
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const params = {
      TableName: 'betterkid_v2',
      Key: marshall({
        partitionKey: `USER#${userId}`,
        sortKey: 'ACCOUNT#balance',
      }),
    };
    console.log('Fetching balance with params:', params);

    const { Item } = await dynamoDb.send(new GetItemCommand(params));
    const balance = Item ? unmarshall(Item).balance || 0 : 0;
    console.log(`Fetched balance for ${userId}: $${balance.toFixed(2)}`);

    return NextResponse.json({ balance });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching balance:', err);
    return NextResponse.json(
      { error: 'Failed to fetch balance', details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, balance, reason }: { userId: string; balance: number; reason?: string } = body;
    console.log('PUT /api/user-balance, received:', { userId, balance, reason });

    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }
    if (typeof balance !== 'number' || isNaN(balance)) {
      return NextResponse.json({ error: 'Balance must be a number' }, { status: 400 });
    }

    const partitionKey = `USER#${userId}`;
    const sortKey = 'ACCOUNT#balance';

    // Step 1: Fetch existing balance
    const getParams = {
      TableName: 'betterkid_v2',
      Key: marshall({ partitionKey, sortKey }),
    };
    const { Item } = await dynamoDb.send(new GetItemCommand(getParams));
    const currentBalance = Item ? unmarshall(Item).balance || 0 : 0;

    // Step 2: Update balance
    const updatedBalance = parseFloat(balance.toFixed(2));
    const balanceChange = updatedBalance - currentBalance;
    console.log(`Balance update for ${userId}: ${currentBalance} -> ${updatedBalance} (change: ${balanceChange > 0 ? '+' : ''}${balanceChange})`);
    
    const putParams = {
      TableName: 'betterkid_v2',
      Item: marshall({ partitionKey, sortKey, balance: updatedBalance }),
    };
    await dynamoDb.send(new PutItemCommand(putParams));

    // Step 3: Insert log entry
    const timestamp = new Date().toISOString();
    const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // More unique ID
    const logParams = {
      TableName: 'betterkid_v2',
      Item: marshall({
        partitionKey,
        sortKey: `BALANCELOG#${logId}`,
        logId,
        balanceBefore: currentBalance,
        balanceAfter: updatedBalance,
        reason: reason || null,
        timestamp,
      }),
    };
    await dynamoDb.send(new PutItemCommand(logParams));
    console.log(`Logged balance change for ${userId}: ${currentBalance} -> ${updatedBalance}, reason: "${reason || 'No reason'}"`);
    console.log(`Log entry created with ID: ${logId}`);

    return NextResponse.json({ message: 'Balance updated successfully', balance: updatedBalance });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating balance:', err);
    return NextResponse.json(
      { error: 'Failed to update balance', details: err.message },
      { status: 500 }
    );
  }
}
