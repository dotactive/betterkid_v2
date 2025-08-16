import { NextResponse } from 'next/server';
import { DeleteCommand, QueryCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function DELETE(request, context) {
  try {
    const { pendingId } = context.params;

    if (!pendingId || typeof pendingId !== 'string') {
      return NextResponse.json({ error: 'Pending ID is required' }, { status: 400 });
    }

    const userId = request.headers.get('x-userid') || '';

    // Fetch pending money to get partitionKey
    const pendingParams = {
      TableName: 'betterkid_v2',
      KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `PENDING#${pendingId}`,
      },
    };
    const pendingData = await dynamoDb.send(new QueryCommand(pendingParams));
    const pending = pendingData.Items?.[0];

    if (!pending) {
      return NextResponse.json({ error: 'Pending money not found' }, { status: 404 });
    }

    const deleteParams = {
      TableName: 'betterkid_v2',
      Key: {
        partitionKey: pending.partitionKey,
        sortKey: `PENDING#${pendingId}`,
      },
      ConditionExpression: 'attribute_exists(partitionKey) AND attribute_exists(sortKey)',
    };

    await dynamoDb.send(new DeleteCommand(deleteParams));
    return NextResponse.json({ message: 'Pending money deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete pending money', details: error.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const { pendingId } = context.params;
    const body = await request.json();
    const { userId, approveAll = false } = body;

    if (!pendingId || typeof pendingId !== 'string') {
      return NextResponse.json({ error: 'Pending ID is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    if (approveAll) {
      // Approve all pending money for the user
      const pendingParams = {
        TableName: 'betterkid_v2',
        FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'PENDING#',
        },
      };
      
      const pendingData = await dynamoDb.send(new ScanCommand(pendingParams));
      const pendingItems = pendingData.Items || [];
      
      let totalAmount = 0;
      for (const item of pendingItems) {
        totalAmount += item.amount || 0;
        
        // Delete the pending item
        const deleteParams = {
          TableName: 'betterkid_v2',
          Key: {
            partitionKey: item.partitionKey,
            sortKey: item.sortKey,
          },
        };
        await dynamoDb.send(new DeleteCommand(deleteParams));
      }
      
      if (totalAmount > 0) {
        // Add to user balance
        const balanceParams = {
          TableName: 'betterkid_v2',
          Key: {
            partitionKey: `USER#${userId}`,
            sortKey: 'ACCOUNT#balance',
          },
        };
        
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
        const newBalance = currentBalance + totalAmount;
        
        // Update balance
        const updateParams = {
          TableName: 'betterkid_v2',
          Item: {
            partitionKey: `USER#${userId}`,
            sortKey: 'ACCOUNT#balance',
            balance: newBalance,
          },
        };
        
        await dynamoDb.send(new PutCommand(updateParams));
      }
      
      return NextResponse.json({ 
        message: `Approved all pending money totaling $${totalAmount.toFixed(2)}`,
        amount: totalAmount 
      });
    } else {
      // Approve single pending money item
      const pendingParams = {
        TableName: 'betterkid_v2',
        KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `PENDING#${pendingId}`,
        },
      };
      
      const pendingData = await dynamoDb.send(new QueryCommand(pendingParams));
      const pending = pendingData.Items?.[0];
      
      if (!pending) {
        return NextResponse.json({ error: 'Pending money not found' }, { status: 404 });
      }
      
      const amount = pending.amount || 0;
      
      // Delete the pending item
      const deleteParams = {
        TableName: 'betterkid_v2',
        Key: {
          partitionKey: pending.partitionKey,
          sortKey: pending.sortKey,
        },
      };
      await dynamoDb.send(new DeleteCommand(deleteParams));
      
      // Add to user balance
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
      
      const updateParams = {
        TableName: 'betterkid_v2',
        Item: {
          partitionKey: `USER#${userId}`,
          sortKey: 'ACCOUNT#balance',
          balance: newBalance,
        },
      };
      
      await dynamoDb.send(new PutCommand(updateParams));
      
      return NextResponse.json({ 
        message: `Approved pending money of $${amount.toFixed(2)}`,
        amount: amount 
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to approve pending money', details: error.message }, { status: 500 });
  }
}