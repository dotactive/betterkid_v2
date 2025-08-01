import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';
import { randomUUID } from 'crypto';

interface User {
  userId: string;
  username: string;
  email: string;
  password: string;
  parentCode: string;
}

// GET: Return all users
export async function GET() {
  try {
    const params = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(partitionKey, :pk) AND sortKey = :sk',
      ExpressionAttributeValues: {
        ':pk': 'USER#',
        ':sk': 'METADATA',
      },
    };
    const data = await dynamoDb.send(new ScanCommand(params));
    const users = data.Items?.map((item) => ({
      userId: item.userId,
      username: item.username,
      email: item.email,
      password: item.password,
      parentCode: item.parentCode,
    })) || [];

    return NextResponse.json(users);
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching users:', err);
    return NextResponse.json({ error: 'Failed to fetch users', details: err.message }, { status: 500 });
  }
}

// POST: Create a new user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password, parentCode } = body;

    if (!username || !email || !password || !parentCode) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const userId = randomUUID();

    const params = {
      TableName: 'betterkid_v2',
      Item: {
        partitionKey: `USER#${userId}`,
        sortKey: 'METADATA',
        userId,
        username,
        email,
        password,
        parentCode,
      },
    };

    await dynamoDb.send(new PutCommand(params));
    return NextResponse.json({ message: 'User created successfully', userId });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating user:', err);
    return NextResponse.json({ error: 'Failed to create user', details: err.message }, { status: 500 });
  }
}
