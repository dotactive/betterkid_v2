import { NextResponse } from 'next/server';
import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
    const { resetType } = body; // 'daily', 'weekly', or 'monthly'
    
    if (!resetType || !['daily', 'weekly', 'monthly'].includes(resetType)) {
      return NextResponse.json({ error: 'Valid resetType is required (daily, weekly, monthly)' }, { status: 400 });
    }

    console.log(`Starting ${resetType} todo reset...`);

    // Get all completed todos (both 'pending' and 'true') of the specified type
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
    const todosToReset = data.Items || [];

    console.log(`Found ${todosToReset.length} completed ${resetType} todos to reset`);

    let resetCount = 0;
    
    // Reset each todo by setting completed to 'false'
    for (const todo of todosToReset) {
      try {
        const updateParams = {
          TableName: 'betterkid_v2',
          Item: {
            ...todo,
            completed: 'false',
            lastResetAt: new Date().toISOString(),
          },
        };

        await dynamoDb.send(new PutCommand(updateParams));
        resetCount++;
        console.log(`Reset todo: ${todo.text} for user ${todo.userId}`);
      } catch (error) {
        console.error(`Failed to reset todo ${todo.todoId}:`, error);
      }
    }

    return NextResponse.json({ 
      message: `Successfully reset ${resetCount} ${resetType} todos`,
      resetCount,
      resetType 
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