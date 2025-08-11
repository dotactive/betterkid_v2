import { NextResponse } from 'next/server';
import { DeleteCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function GET(_request, context) {
  try {
    const { userId } = context.params;
    console.log('Fetching user info for userId:', userId);

    if (!userId || typeof userId !== 'string') {
      console.error('Missing or invalid userId:', userId);
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const getParams = {
      TableName: 'betterkid_v2',
      Key: {
        partitionKey: `USER#${userId}`,
        sortKey: 'METADATA',
      },
    };

    const result = await dynamoDb.send(new GetCommand(getParams));
    
    if (!result.Item) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = {
      userId: result.Item.userId,
      username: result.Item.username,
      email: result.Item.email,
      parentCode: result.Item.parentCode,
    };

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, context) {
  try {
    const { userId } = context.params;
    console.log('Received params:', context.params);
    console.log('Attempting to delete user and all related data:', userId);

    if (!userId || typeof userId !== 'string') {
      console.error('Missing or invalid userId for deletion:', userId);
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    // First, find all items for this user
    const scanParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'partitionKey = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
      },
    };

    console.log('Scanning for all user data...');
    const scanResult = await dynamoDb.send(new ScanCommand(scanParams));
    const itemsToDelete = scanResult.Items || [];
    
    console.log(`Found ${itemsToDelete.length} items to delete for user ${userId}`);

    // Delete all items for this user
    const deletePromises = itemsToDelete.map(item => {
      const deleteParams = {
        TableName: 'betterkid_v2',
        Key: {
          partitionKey: item.partitionKey,
          sortKey: item.sortKey,
        },
      };
      console.log(`Deleting item: ${item.partitionKey} | ${item.sortKey}`);
      return dynamoDb.send(new DeleteCommand(deleteParams));
    });

    // Execute all deletes in parallel
    await Promise.all(deletePromises);

    console.log(`Successfully deleted all ${itemsToDelete.length} items for user ${userId}`);
    return NextResponse.json({ 
      message: 'User and all related data deleted successfully',
      deletedItems: itemsToDelete.length
    });
  } catch (error) {
    console.error('Error during cascading delete:', error);
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    );
  }
} 