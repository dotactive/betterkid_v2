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

// POST: Register a new user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password, parentCode } = body;

    if (!username || !email || !password || !parentCode) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if email already exists
    const checkEmailParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    };

    const existingUser = await dynamoDb.send(new ScanCommand(checkEmailParams));
    if (existingUser.Items && existingUser.Items.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
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
        balance: 0, // Initialize with 0 balance
        createdAt: new Date().toISOString(),
      },
    };

    await dynamoDb.send(new PutCommand(params));

    // Create initial balance record
    const balanceParams = {
      TableName: 'betterkid_v2',
      Item: {
        partitionKey: `USER#${userId}`,
        sortKey: 'ACCOUNT#balance',
        balance: 0
      },
    };
    await dynamoDb.send(new PutCommand(balanceParams));

    console.log('User registered successfully:', { userId, username, email });
    
    return NextResponse.json({ 
      message: 'User registered successfully', 
      userId,
      success: true 
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error registering user:', err);
    return NextResponse.json({ error: 'Failed to register user', details: err.message }, { status: 500 });
  }
}