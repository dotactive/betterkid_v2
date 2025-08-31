import { NextResponse } from 'next/server';
import { ScanCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
    const { resetType } = body; // 'daily', 'weekly', or 'monthly'
    
    if (!resetType || !['daily', 'weekly', 'monthly'].includes(resetType)) {
      return NextResponse.json({ error: 'Valid resetType is required (daily, weekly, monthly)' }, { status: 400 });
    }

    console.log(`Starting auto-approval for ${resetType} todos...`);

    // Step 1: Get all pending todos of the specified type
    const pendingTodosParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(sortKey, :sk) AND #repeat = :repeat AND completed = :completed',
      ExpressionAttributeNames: {
        '#repeat': 'repeat',
      },
      ExpressionAttributeValues: {
        ':sk': 'TODO#',
        ':repeat': resetType,
        ':completed': 'pending',
      },
    };

    const pendingTodosData = await dynamoDb.send(new ScanCommand(pendingTodosParams));
    const pendingTodos = pendingTodosData.Items || [];

    console.log(`Found ${pendingTodos.length} pending ${resetType} todos to auto-approve`);

    let approvedCount = 0;
    let totalAmount = 0;

    // Step 2: For each pending todo, approve it and add money to user balance
    for (const todo of pendingTodos) {
      try {
        const userId = todo.userId;
        const todoId = todo.todoId;
        const amount = todo.money || 0;

        // Update todo status based on repeat type
        if (todo.repeat === 'once') {
          // Delete 'once' todos since they won't repeat
          const deleteParams = {
            TableName: 'betterkid_v2',
            Key: {
              partitionKey: todo.partitionKey,
              sortKey: todo.sortKey,
            },
          };
          await dynamoDb.send(new DeleteCommand(deleteParams));
          console.log(`Deleted 'once' todo: ${todo.text} for user ${userId}`);
        } else {
          // Update recurring todos to 'true' (approved)
          const updateParams = {
            TableName: 'betterkid_v2',
            Item: {
              ...todo,
              completed: 'true',
              autoApprovedAt: new Date().toISOString(),
            },
          };
          await dynamoDb.send(new PutCommand(updateParams));
          console.log(`Auto-approved recurring todo: ${todo.text} for user ${userId}`);
        }

        // Check user settings to see if complete awards are enabled
        const userSettingsData = await dynamoDb.send(new QueryCommand({
          TableName: 'betterkid_v2',
          KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': 'METADATA',
          },
        }));
        
        const userSettings = userSettingsData.Items?.[0];
        const completeAwardEnabled = userSettings?.completeAwardEnabled || false;

        // Add money to user balance if todo has money value and awards are enabled
        if (amount > 0 && completeAwardEnabled) {
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
          const newBalance = currentBalance + amount;
          
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
              amount: amount,
              reason: `Auto-approved todo: ${todo.text}`,
              timestamp: new Date().toISOString(),
            },
          }));

          totalAmount += amount;
        }

        // Remove any pending money entries for this todo
        const pendingMoneyParams = {
          TableName: 'betterkid_v2',
          FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk) AND referenceId = :refId',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': 'PENDING#',
            ':refId': todoId,
          },
        };
        
        const pendingMoneyData = await dynamoDb.send(new ScanCommand(pendingMoneyParams));
        const pendingItems = pendingMoneyData.Items || [];
        
        // Delete pending money items for this todo
        for (const item of pendingItems) {
          await dynamoDb.send(new DeleteCommand({
            TableName: 'betterkid_v2',
            Key: {
              partitionKey: item.partitionKey,
              sortKey: item.sortKey,
            },
          }));
        }

        approvedCount++;
      } catch (error) {
        console.error(`Failed to auto-approve todo ${todo.todoId}:`, error);
      }
    }

    return NextResponse.json({ 
      message: `Successfully auto-approved ${approvedCount} ${resetType} todos, total coins awarded: ${totalAmount}`,
      approvedCount,
      totalAmount,
      resetType 
    });
  } catch (error) {
    const err = error as Error;
    console.error(`Error auto-approving ${body?.resetType || 'unknown'} todos:`, err);
    return NextResponse.json(
      { error: 'Failed to auto-approve todos', details: err.message },
      { status: 500 }
    );
  }
}