import { NextResponse } from 'next/server';
import { ScanCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
    const { userId, penaltyAmount = 0.5 } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    console.log(`Checking for penalty on uncompleted daily todos for user ${userId}...`);

    // Get all daily todos that are still 'false' (uncompleted)
    const uncompletedTodosParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk) AND #repeat = :repeat AND completed = :completed',
      ExpressionAttributeNames: {
        '#repeat': 'repeat',
      },
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'TODO#',
        ':repeat': 'daily',
        ':completed': 'false',
      },
    };

    const uncompletedData = await dynamoDb.send(new ScanCommand(uncompletedTodosParams));
    const uncompletedTodos = uncompletedData.Items || [];

    console.log(`Found ${uncompletedTodos.length} uncompleted daily todos for user ${userId}`);

    if (uncompletedTodos.length === 0) {
      return NextResponse.json({ 
        message: `No penalty applied - all daily todos completed`,
        penaltyApplied: false,
        uncompletedCount: 0,
        penaltyAmount: 0
      });
    }

    // Check user settings to see if incomplete fines are enabled
    const userSettingsData = await dynamoDb.send(new QueryCommand({
      TableName: 'betterkid_v2',
      KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'METADATA',
      },
    }));
    
    const userSettings = userSettingsData.Items?.[0];
    const uncompleteFineEnabled = userSettings?.uncompleteFineEnabled || false;

    if (!uncompleteFineEnabled) {
      return NextResponse.json({ 
        message: `No penalty applied - incomplete fines are disabled`,
        penaltyApplied: false,
        uncompletedCount: uncompletedTodos.length,
        penaltyAmount: 0
      });
    }

    // Apply penalty: deduct money from user balance
    const penalty = penaltyAmount;
    
    // Get current balance
    const balanceData = await dynamoDb.send(new QueryCommand({
      TableName: 'betterkid_v2',
      KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'ACCOUNT#balance',
      },
    }));
    
    const currentBalance = balanceData.Items?.[0]?.balance || 0;
    const newBalance = Math.max(0, currentBalance - penalty); // Don't let balance go negative
    
    // Update balance
    await dynamoDb.send(new PutCommand({
      TableName: 'betterkid_v2',
      Item: {
        partitionKey: `USER#${userId}`,
        sortKey: 'ACCOUNT#balance',
        balance: newBalance,
      },
    }));

    // Add to balance log
    const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await dynamoDb.send(new PutCommand({
      TableName: 'betterkid_v2',
      Item: {
        partitionKey: `USER#${userId}`,
        sortKey: `BALANCELOG#${logId}`,
        logId,
        userId,
        amount: -penalty,
        reason: `Penalty for ${uncompletedTodos.length} uncompleted daily todo${uncompletedTodos.length !== 1 ? 's' : ''}`,
        timestamp: new Date().toISOString(),
      },
    }));

    console.log(`Applied penalty: $${penalty} for ${uncompletedTodos.length} uncompleted todos. New balance: $${newBalance}`);

    return NextResponse.json({ 
      message: `Penalty applied: -$${penalty} for ${uncompletedTodos.length} uncompleted daily todo${uncompletedTodos.length !== 1 ? 's' : ''}`,
      penaltyApplied: true,
      uncompletedCount: uncompletedTodos.length,
      penaltyAmount: penalty,
      previousBalance: currentBalance,
      newBalance: newBalance
    });
  } catch (error) {
    const err = error as Error;
    console.error(`Error applying penalty for user ${body?.userId || 'unknown'}:`, err);
    return NextResponse.json(
      { error: 'Failed to apply penalty', details: err.message },
      { status: 500 }
    );
  }
}