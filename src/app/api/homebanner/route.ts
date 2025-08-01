import { NextResponse } from 'next/server';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      console.error('UserId missing in GET /api/homebanner');
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const params = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'BANNER#',
      },
    };
    console.log('Fetching homepage banner with params:', params);

    const data = await dynamoDb.send(new QueryCommand(params));
    const bannerItem = data.Items?.[0];
    console.log('DynamoDB GET result:', bannerItem);

    return NextResponse.json({
      homepageBanner: bannerItem?.homepageBanner || null,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching homepage banner:', err);
    return NextResponse.json(
      { error: 'Failed to fetch homepage banner', details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, homepageBanner }: { userId: string; homepageBanner: string | null } = body;
    console.log('PUT /api/homebanner, received:', { userId, homepageBanner });

    if (!userId) {
      console.error('Invalid input: userId is required');
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    // Validate homepageBanner if provided
    if (homepageBanner && !homepageBanner.startsWith('/banner/')) {
      console.error('Invalid homepage banner path:', homepageBanner);
      return NextResponse.json({ error: 'Homepage banner must be from /banner folder' }, { status: 400 });
    }

    const partitionKey = `USER#${userId}`;
    const params = {
      TableName: 'betterkid_v2',
      Item: {
        partitionKey: partitionKey,
        sortKey: 'HOMEPAGE#banner',
        homepageBanner: homepageBanner || null,
      },
    };
    console.log('DynamoDB PUT params:', params);

    await dynamoDb.send(new PutCommand(params));
    console.log('Homepage banner updated successfully for userId:', userId);

    return NextResponse.json({ message: 'Homepage banner updated successfully' });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating homepage banner:', err);
    return NextResponse.json(
      { error: 'Failed to update homepage banner', details: err.message },
      { status: 500 }
    );
  }
}