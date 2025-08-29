import { NextResponse } from 'next/server';
import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
    const { resetType, userId } = body; // 'daily', 'weekly', or 'monthly' and optional userId
    
    if (!resetType || !['daily', 'weekly', 'monthly'].includes(resetType)) {
      return NextResponse.json({ error: 'Valid resetType is required (daily, weekly, monthly)' }, { status: 400 });
    }

    console.log(`Starting ${resetType} activity reset${userId ? ` for user ${userId}` : ' (all users)'}...`);

    // Build filter expression - check both TODO# and BEHAVIOR# prefixes for activities
    let filterExpression = '(begins_with(sortKey, :todoSk) OR begins_with(sortKey, :behaviorSk)) AND #repeat = :repeat';
    const expressionAttributeValues: any = {
      ':todoSk': 'TODO#',
      ':behaviorSk': 'BEHAVIOR#',
      ':repeat': resetType,
    };

    // If userId is provided, filter by user
    if (userId) {
      filterExpression += ' AND partitionKey = :userId';
      expressionAttributeValues[':userId'] = `USER#${userId}`;
    }

    const params = {
      TableName: 'betterkid_v2',
      FilterExpression: filterExpression,
      ExpressionAttributeNames: {
        '#repeat': 'repeat',
      },
      ExpressionAttributeValues: expressionAttributeValues,
    };

    const data = await dynamoDb.send(new ScanCommand(params));
    const itemsToReset = data.Items || [];

    console.log(`Found ${itemsToReset.length} ${resetType} activities/todos to reset`);

    let resetCount = 0;
    
    // Reset each item by setting completed to 'false' and clearing pending quantities
    for (const item of itemsToReset) {
      try {
        const updatedItem: any = {
          ...item,
          completed: 'false',
          lastResetAt: new Date().toISOString(),
        };

        // For activities (BEHAVIOR# prefix), also reset pending_quantity
        if (item.sortKey?.startsWith('BEHAVIOR#')) {
          updatedItem.pending_quantity = 0;
        }

        const updateParams = {
          TableName: 'betterkid_v2',
          Item: updatedItem,
        };

        await dynamoDb.send(new PutCommand(updateParams));
        resetCount++;
        
        const itemName = item.activityName || item.text || item.sortKey;
        const itemType = item.sortKey?.startsWith('BEHAVIOR#') ? 'activity' : 'todo';
        console.log(`Reset ${itemType}: ${itemName} for user ${userId || 'unknown'}`);
      } catch (error) {
        console.error(`Failed to reset item ${item.activityId || item.todoId}:`, error);
      }
    }

    return NextResponse.json({ 
      message: `Successfully reset ${resetCount} ${resetType} activities`,
      resetCount,
      resetType,
      userId: userId || null
    });
  } catch (error) {
    const err = error as Error;
    console.error(`Error resetting ${body?.resetType || 'unknown'} todos:`, err);
    return NextResponse.json(
      { error: 'Failed to reset todos', details: err.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  let resetType: string | null = null;
  try {
    const { searchParams } = new URL(request.url);
    resetType = searchParams.get('resetType');
    
    if (!resetType || !['daily', 'weekly', 'monthly'].includes(resetType)) {
      return NextResponse.json({ error: 'Valid resetType is required (daily, weekly, monthly)' }, { status: 400 });
    }

    // Get all completed todos (both 'pending' and 'true') of the specified type to show what would be reset
    const params = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(sortKey, :sk) AND #repeat = :repeat AND (completed = :completedTrue OR completed = :completedPending)',
      ExpressionAttributeNames: {
        '#repeat': 'repeat',
      },
      ExpressionAttributeValues: {
        ':sk': 'TODO#',
        ':repeat': resetType,
        ':completedTrue': 'true',
        ':completedPending': 'pending',
      },
    };

    const data = await dynamoDb.send(new ScanCommand(params));
    const todosToReset = (data.Items || []).map(item => ({
      todoId: item.todoId,
      userId: item.userId,
      text: item.text,
      money: item.money,
      lastResetAt: item.lastResetAt,
    }));

    return NextResponse.json({ 
      todosToReset,
      count: todosToReset.length,
      resetType 
    });
  } catch (error) {
    const err = error as Error;
    console.error(`Error fetching ${resetType} todos for reset preview:`, err);
    return NextResponse.json(
      { error: 'Failed to fetch todos for reset', details: err.message },
      { status: 500 }
    );
  }
}