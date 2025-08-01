import { NextResponse } from 'next/server';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

interface User {
  userId: string;
  email: string;
  password: string;
}

export async function POST(request: Request) {
  try {
    const { email, password }: { email: string; password: string } = await request.json();

    if (!email || !password) {
      console.log('Missing email or password in request body');
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const params = {
      TableName: 'betterkid_v2',
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    };
    const data = await dynamoDb.send(new ScanCommand(params));

    if (!data.Items || data.Items.length === 0) {
      console.log('No user found in DynamoDB for email:', email);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = data.Items[0] as User;
    if (user.password !== password) {
      console.log('Password mismatch for email:', email);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    console.log('Login successful for email:', email);
    return NextResponse.json({ success: true, userId: user.userId, email: user.email });
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
