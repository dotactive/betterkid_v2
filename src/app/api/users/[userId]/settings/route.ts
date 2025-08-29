import { NextResponse } from 'next/server';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function GET(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await context.params;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('GET /api/users/[userId]/settings, userId:', userId);

    // Get user data including settings
    const params = {
      TableName: 'betterkid_v2',
      KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'METADATA',
      },
    };

    const data = await dynamoDb.send(new QueryCommand(params));
    const user = data.Items?.[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return user settings (excluding sensitive password)
    const settings = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      parentCode: user.parentCode || '',
      resetTime: '22:00', // Fixed reset time at 10:00 PM for all users
      completeAward: user.completeAward !== undefined ? user.completeAward : 1.0,
      uncompleteFine: user.uncompleteFine !== undefined ? user.uncompleteFine : 0.5,
      autoReset: user.autoReset || false,
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user settings', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await context.params;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { username, password, parentCode, completeAward, uncompleteFine, autoReset } = body;

    console.log('PUT /api/users/[userId]/settings, userId:', userId, 'body:', body);

    // Get existing user data
    const getParams = {
      TableName: 'betterkid_v2',
      KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'METADATA',
      },
    };

    const userData = await dynamoDb.send(new QueryCommand(getParams));
    const existingUser = userData.Items?.[0];

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build updated user object
    const updatedUser = {
      ...existingUser,
    };

    // Update only provided fields
    if (username !== undefined && username.trim() !== '') {
      updatedUser.username = username.trim();
    }

    if (password !== undefined && password.trim() !== '') {
      updatedUser.password = password.trim();
    }

    if (parentCode !== undefined) {
      updatedUser.parentCode = parentCode.trim();
    }

    // Reset time is now fixed at 22:00 for all users
    updatedUser.resetTime = '22:00';

    if (completeAward !== undefined && typeof completeAward === 'number') {
      updatedUser.completeAward = Math.max(0, completeAward);
    }

    if (uncompleteFine !== undefined && typeof uncompleteFine === 'number') {
      updatedUser.uncompleteFine = Math.max(0, uncompleteFine);
    }

    if (autoReset !== undefined && typeof autoReset === 'boolean') {
      updatedUser.autoReset = autoReset;
    }

    // Update user in database
    const updateParams = {
      TableName: 'betterkid_v2',
      Item: updatedUser,
      ConditionExpression: 'attribute_exists(partitionKey) AND attribute_exists(sortKey)',
    };

    await dynamoDb.send(new PutCommand(updateParams));

    // Return updated settings (excluding password)
    const updatedSettings = {
      userId: updatedUser.userId,
      username: updatedUser.username,
      email: updatedUser.email,
      parentCode: updatedUser.parentCode || '',
      resetTime: '22:00', // Fixed reset time at 10:00 PM for all users
      completeAward: updatedUser.completeAward !== undefined ? updatedUser.completeAward : 1.0,
      uncompleteFine: updatedUser.uncompleteFine !== undefined ? updatedUser.uncompleteFine : 0.5,
      autoReset: updatedUser.autoReset || false,
    };

    return NextResponse.json({ 
      message: 'Settings updated successfully',
      settings: updatedSettings 
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update user settings', details: (error as Error).message },
      { status: 500 }
    );
  }
}