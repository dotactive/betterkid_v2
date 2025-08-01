import { NextResponse } from 'next/server';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function DELETE(_request, context) {
  try {
    const { userId } = context.params;
    console.log('Received params:', context.params);
    console.log('Attempting to delete user:', userId);

    if (!userId || typeof userId !== 'string') {
      console.error('Missing or invalid userId for deletion:', userId);
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const deleteParams = {
      TableName: 'betterkid_v2',
      Key: {
        partitionKey: `USER#${userId}`,
        sortKey: 'METADATA',
      },
      ConditionExpression: 'attribute_exists(partitionKey)',
    };

    const result = await dynamoDb.send(new DeleteCommand(deleteParams));
    console.log('DynamoDB DELETE result:', result);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    );
  }
} 