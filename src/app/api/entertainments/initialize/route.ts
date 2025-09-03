import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log('Initializing entertainments for userId:', userId);

    const defaultEntertainments = [
      {
        userId,
        SK: 'ENTERTAINMENT#iphone',
        name: 'iPhone Time',
        image: '/thumb/Gemini_Generated_Image_8axrnr8axrnr8axr.png',
        minutesPerCoin: 5,
        costPerCoin: 1.00,
        visible: true,
        description: 'Each coin adds 5 minutes of iPhone time.'
      },
      {
        userId,
        SK: 'ENTERTAINMENT#ipad',
        name: 'iPad Time',
        image: '/thumb/Gemini_Generated_Image_cgonz7cgonz7cgon.png',
        minutesPerCoin: 5,
        costPerCoin: 1.00,
        visible: true,
        description: 'Each coin adds 5 minutes of iPad time.'
      },
      {
        userId,
        SK: 'ENTERTAINMENT#gaming',
        name: 'Gaming Time',
        image: '/thumb/Gemini_Generated_Image_4yopjs4yopjs4yop.png',
        minutesPerCoin: 5,
        costPerCoin: 1.00,
        visible: true,
        description: 'Each coin adds 5 minutes of gaming time.'
      },
      {
        userId,
        SK: 'ENTERTAINMENT#tv',
        name: 'TV Time',
        image: '/thumb/Gemini_Generated_Image_nvo5wnnvo5wnnvo5.png',
        minutesPerCoin: 5,
        costPerCoin: 1.00,
        visible: true,
        description: 'Each coin adds 5 minutes of TV time.'
      }
    ];

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

    await docClient.send(batchCommand);
    console.log('Default entertainments initialized successfully for user:', userId);

    return NextResponse.json({ 
      success: true, 
      message: 'Entertainments initialized successfully',
      entertainments: defaultEntertainments 
    });
  } catch (error) {
    console.error('Error initializing entertainments:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize entertainments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get all users and create entertainments for those who don't have them
    const usersCommand = new ScanCommand({
      TableName: 'betterkid_v2',
      FilterExpression: 'attribute_exists(username)'
    });

    const usersResult = await docClient.send(usersCommand);
    const users = usersResult.Items || [];
    
    const results = [];

    for (const user of users) {
      const userId = user.userId;
      
      // Check if user already has entertainments
      const entertainmentsCommand = new ScanCommand({
        TableName: 'betterkid_v2',
        FilterExpression: 'userId = :userId AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':sk': 'ENTERTAINMENT#'
        }
      });

      const entertainmentsResult = await docClient.send(entertainmentsCommand);
      
      if (!entertainmentsResult.Items || entertainmentsResult.Items.length === 0) {
        // Create default entertainments for this user
        const defaultEntertainments = [
          {
            userId,
            SK: 'ENTERTAINMENT#iphone',
            name: 'iPhone Time',
            image: '/thumb/Gemini_Generated_Image_8axrnr8axrnr8axr.png',
            minutesPerCoin: 5,
            costPerCoin: 1.00,
            visible: true,
            description: 'Each coin adds 5 minutes of iPhone time.'
          },
          {
            userId,
            SK: 'ENTERTAINMENT#ipad',
            name: 'iPad Time',
            image: '/thumb/Gemini_Generated_Image_cgonz7cgonz7cgon.png',
            minutesPerCoin: 5,
            costPerCoin: 1.00,
            visible: true,
            description: 'Each coin adds 5 minutes of iPad time.'
          },
          {
            userId,
            SK: 'ENTERTAINMENT#gaming',
            name: 'Gaming Time',
            image: '/thumb/Gemini_Generated_Image_4yopjs4yopjs4yop.png',
            minutesPerCoin: 5,
            costPerCoin: 1.00,
            visible: true,
            description: 'Each coin adds 5 minutes of gaming time.'
          },
          {
            userId,
            SK: 'ENTERTAINMENT#tv',
            name: 'TV Time',
            image: '/thumb/Gemini_Generated_Image_nvo5wnnvo5wnnvo5.png',
            minutesPerCoin: 5,
            costPerCoin: 1.00,
            visible: true,
            description: 'Each coin adds 5 minutes of TV time.'
          }
        ];

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

        await docClient.send(batchCommand);
        results.push({ userId, status: 'created', count: 4 });
      } else {
        results.push({ userId, status: 'exists', count: entertainmentsResult.Items.length });
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Bulk initialization completed',
      results
    });
  } catch (error) {
    console.error('Error in bulk initialization:', error);
    return NextResponse.json({ 
      error: 'Failed to bulk initialize entertainments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}