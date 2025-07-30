import { NextResponse } from 'next/server';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

interface User {
  username: string;
  password: string;
}

export async function POST(request: Request) {
  try {
    const { username, password }: { username: string; password: string } = await request.json();

    if (!username || !password) {
      console.log('Missing username or password in request body');
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const params = {
      TableName: 'betterkid_v2',
      KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${username}`,
        ':sk': 'METADATA',
      },
    };

    console.log('Sending DynamoDB query with params:', params);
    const data = await dynamoDb.send(new QueryCommand(params));
    console.log('Received DynamoDB response:', data);

    if (!data.Items || data.Items.length === 0) {
      console.log('No user found in DynamoDB for username:', username);
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const user = data.Items[0] as User;
    if (user.password !== password) {
      console.log('Password mismatch for user:', username);
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    console.log('Login successful for user:', username);
    return NextResponse.json({ success: true, username: user.username });
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
