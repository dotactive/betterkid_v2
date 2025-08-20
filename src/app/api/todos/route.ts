import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';
import { v4 as uuidv4 } from 'uuid';

interface Todo {
  todoId: string;
  userId: string;
  text: string;
  completed: 'false' | 'pending' | 'true';
  money: number;
  repeat: 'daily' | 'weekly' | 'monthly' | 'once';
  createdAt: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      console.error('UserId missing in GET /api/todos');
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const params = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'TODO#',
      },
    };
    console.log('Fetching todos with params:', params);

    const data = await dynamoDb.send(new ScanCommand(params));
    console.log('DynamoDB GET result:', data);

    const todos = (data.Items || []).filter(
      (item) => item.todoId && item.text
    ).map((item) => ({
      todoId: item.todoId,
      userId: item.userId,
      text: item.text,
      completed: item.completed || 'false',
      money: item.money || 0,
      repeat: item.repeat || 'once',
      createdAt: item.createdAt || new Date().toISOString(),
    }));

    return NextResponse.json(todos);
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching todos:', err);
    return NextResponse.json(
      { error: 'Failed to fetch todos', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, text, completed = 'false', money = 0, repeat = 'once' }: {
      userId: string;
      text: string;
      completed?: 'false' | 'pending' | 'true';
      money?: number;
      repeat?: 'daily' | 'weekly' | 'monthly' | 'once';
    } = body;
    console.log('POST /api/todos, received:', { userId, text, completed, money, repeat });

    if (!userId || !text || typeof text !== 'string' || text.trim() === '') {
      console.error('Invalid input:', { userId, text });
      return NextResponse.json({ error: 'UserId and non-empty text are required' }, { status: 400 });
    }

    const todoId = uuidv4();
    const partitionKey = `USER#${userId}`;
    const createdAt = new Date().toISOString();
    
    const params = {
      TableName: 'betterkid_v2',
      Item: {
        partitionKey: partitionKey,
        sortKey: `TODO#${todoId}`,
        todoId,
        userId,
        text: text.trim(),
        completed,
        money,
        repeat,
        createdAt,
      },
      ConditionExpression: 'attribute_not_exists(partitionKey) AND attribute_not_exists(sortKey)',
    };
    console.log('DynamoDB PUT params:', { params });

    await dynamoDb.send(new PutCommand(params));
    console.log('Todo created successfully:', todoId);

    return NextResponse.json({ message: 'Todo created successfully', todoId });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating todo:', err);
    return NextResponse.json(
      { error: 'Failed to create todo', details: err.message },
      { status: 500 }
    );
  }
}