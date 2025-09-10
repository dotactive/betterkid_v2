import { NextResponse } from 'next/server';
import { ScanCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function POST(request: Request) {
  try {
    const { userId, logId, targetBalance }: { 
      userId: string; 
      logId: string; 
      targetBalance: number; 
    } = await request.json();

    if (!userId || !logId || targetBalance == null) {
      return NextResponse.json({ error: 'UserId, logId, and targetBalance are required' }, { status: 400 });
    }

    console.log(`Starting backup for user ${userId} to log ${logId} with balance ${targetBalance}`);

    // Step 1: Get all logs for the user
    const scanParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'BALANCELOG#',
      },
    };

    const result = await dynamoDb.send(new ScanCommand(scanParams));
    const allLogs = result.Items || [];

    console.log(`Found ${allLogs.length} total logs`);

    // Step 2: Find the target log and determine which logs to delete
    const targetLog = allLogs.find(log => log.logId === logId);
    
    if (!targetLog) {
      return NextResponse.json({ error: 'Target log not found' }, { status: 404 });
    }

    // Sort logs by timestamp to determine which are "after" the target log
    allLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const targetLogIndex = allLogs.findIndex(log => log.logId === logId);
    const logsToDelete = allLogs.slice(targetLogIndex + 1); // Get all logs after the target log

    console.log(`Target log found at index ${targetLogIndex}. Will delete ${logsToDelete.length} logs after it.`);

    // Step 3: Delete all logs after the target log
    let deletedCount = 0;
    let errorCount = 0;

    for (const log of logsToDelete) {
      try {
        const deleteParams = {
          TableName: 'betterkid_v2',
          Key: {
            partitionKey: log.partitionKey,
            sortKey: log.sortKey,
          },
        };

        await dynamoDb.send(new DeleteCommand(deleteParams));
        deletedCount++;
        console.log(`Deleted log: ${log.logId}`);
      } catch (error) {
        console.error(`Failed to delete log ${log.logId}:`, error);
        errorCount++;
      }
    }

    // Step 4: Update the user's current balance
    const balanceKey = {
      partitionKey: `USER#${userId}`,
      sortKey: 'ACCOUNT#balance'
    };

    // Get current balance first
    const getBalanceParams = {
      TableName: 'betterkid_v2',
      Key: marshall(balanceKey)
    };

    const { Item } = await dynamoDb.send(new GetItemCommand(getBalanceParams));
    const currentBalance = Item ? unmarshall(Item).balance || 0 : 0;

    // Update to target balance
    const updateBalanceParams = {
      TableName: 'betterkid_v2',
      Item: marshall({
        ...balanceKey,
        balance: targetBalance
      })
    };

    await dynamoDb.send(new PutItemCommand(updateBalanceParams));

    // Step 5: Create a log entry for the backup operation
    const backupLogId = `${Date.now()}_backup_${Math.random().toString(36).substr(2, 9)}`;
    const backupLogParams = {
      TableName: 'betterkid_v2',
      Item: marshall({
        partitionKey: `USER#${userId}`,
        sortKey: `BALANCELOG#${backupLogId}`,
        logId: backupLogId,
        balanceBefore: currentBalance,
        balanceAfter: targetBalance,
        reason: `Backup operation: Restored balance to $${targetBalance.toFixed(2)} and removed ${deletedCount} logs`,
        timestamp: new Date().toISOString(),
      }),
    };

    await dynamoDb.send(new PutItemCommand(backupLogParams));

    console.log(`Backup completed successfully. Deleted ${deletedCount} logs, updated balance from ${currentBalance} to ${targetBalance}. Errors: ${errorCount}`);

    return NextResponse.json({
      message: `Backup completed successfully. Removed ${deletedCount} logs and set balance to $${targetBalance.toFixed(2)}`,
      deletedCount,
      errorCount,
      balanceBefore: currentBalance,
      balanceAfter: targetBalance,
      targetLogId: logId
    });

  } catch (err) {
    console.error('Backup operation failed:', err);
    const errorMessage = (err instanceof Error) ? err.message : String(err);
    return NextResponse.json({ 
      error: 'Backup operation failed', 
      details: errorMessage 
    }, { status: 500 });
  }
}