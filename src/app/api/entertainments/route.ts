import { NextRequest, NextResponse } from 'next/server';
import { ScanCommand, PutCommand, UpdateCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log('Fetching entertainments for userId:', userId);

    // Use Scan with filter expression to find entertainment items for this user
    const params = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'ENTERTAINMENT#'
      }
    };

    const result = await dynamoDb.send(new ScanCommand(params));
    console.log('Scan result:', result);
    
    if (!result.Items || result.Items.length === 0) {
      console.log('No entertainments found, creating defaults for user:', userId);
      
      const defaultEntertainments = [
        {
          partitionKey: `USER#${userId}`,
          sortKey: 'ENTERTAINMENT#iphone',
          userId,
          entertainmentId: 'iphone',
          name: 'iPhone Time',
          image: '/thumb/Gemini_Generated_Image_8axrnr8axrnr8axr.png',
          minutesPerCoin: 5,
          costPerCoin: 1.00,
          visible: true,
          description: 'Each coin adds 5 minutes of iPhone time.'
        },
        {
          partitionKey: `USER#${userId}`,
          sortKey: 'ENTERTAINMENT#ipad',
          userId,
          entertainmentId: 'ipad',
          name: 'iPad Time',
          image: '/thumb/Gemini_Generated_Image_cgonz7cgonz7cgon.png',
          minutesPerCoin: 5,
          costPerCoin: 1.00,
          visible: true,
          description: 'Each coin adds 5 minutes of iPad time.'
        },
        {
          partitionKey: `USER#${userId}`,
          sortKey: 'ENTERTAINMENT#gaming',
          userId,
          entertainmentId: 'gaming',
          name: 'Gaming Time',
          image: '/thumb/Gemini_Generated_Image_4yopjs4yopjs4yop.png',
          minutesPerCoin: 5,
          costPerCoin: 1.00,
          visible: true,
          description: 'Each coin adds 5 minutes of gaming time.'
        },
        {
          partitionKey: `USER#${userId}`,
          sortKey: 'ENTERTAINMENT#tv',
          userId,
          entertainmentId: 'tv',
          name: 'TV Time',
          image: '/thumb/Gemini_Generated_Image_nvo5wnnvo5wnnvo5.png',
          minutesPerCoin: 5,
          costPerCoin: 1.00,
          visible: true,
          description: 'Each coin adds 5 minutes of TV time.'
        }
      ];

      // Use BatchWrite for better performance
      const batchItems = defaultEntertainments.map(entertainment => ({
        PutRequest: {
          Item: entertainment
        }
      }));

      const batchCommand = new BatchWriteCommand({
        RequestItems: {
          'betterkid_v2': batchItems
        }
      });

      await dynamoDb.send(batchCommand);
      console.log('Default entertainments created successfully');

      return NextResponse.json(defaultEntertainments);
    }

    console.log('Returning existing entertainments:', result.Items.length);
    return NextResponse.json(result.Items);
  } catch (error) {
    console.error('Error fetching entertainments:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch entertainments', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, entertainmentId, updates } = await request.json();

    if (!userId || !entertainmentId || !updates) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updateExpressions: string[] = [];
    const expressionAttributeValues: any = {};
    const expressionAttributeNames: any = {};

    Object.keys(updates).forEach((key, index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = updates[key];
    });

    const command = new UpdateCommand({
      TableName: 'betterkid_v2',
      Key: {
        partitionKey: `USER#${userId}`,
        sortKey: `ENTERTAINMENT#${entertainmentId}`
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const result = await dynamoDb.send(command);
    return NextResponse.json(result.Attributes);
  } catch (error) {
    console.error('Error updating entertainment:', error);
    return NextResponse.json({ error: 'Failed to update entertainment' }, { status: 500 });
  }
}