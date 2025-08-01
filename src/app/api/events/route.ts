import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import dynamoDb from '@/lib/aws-config';

interface EventItem {
  partitionKey: string;
  sortKey: string;
  eventId: string;
  title: string;
  description?: string;
  image?: string;
  amount: number;
  type: string;
}

interface GetRequest extends Request {
  url: string;
}

interface GetResponse {
  Items?: EventItem[];
}

export async function GET(request: GetRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    const params = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'EVENT#',
      },
    };

    const result = await dynamoDb.send(new ScanCommand(params));
    const items: EventItem[] = (result.Items || []).map((item: Record<string, any>) => ({
      partitionKey: item.partitionKey,
      sortKey: item.sortKey,
      eventId: item.eventId,
      title: item.title,
      description: item.description,
      image: item.image,
      amount: item.amount,
      type: item.type,
    }));
    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch events', details: err.message }, { status: 500 });
  }
}

interface PostRequestBody {
  userId: string;
  title: string;
  description?: string;
  image?: string;
  amount: number;
  type: string;
}

interface PostRequest extends Request {
  json(): Promise<PostRequestBody>;
}

interface PostResponse {
  message?: string;
  error?: string;
  details?: string;
}

export async function POST(request: PostRequest): Promise<Response> {
  try {
    const { userId, title, description, image, amount, type } = await request.json();
    if (!userId || !title || !type || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const eventId = uuidv4();
    const partitionKey = `USER#${userId}`;
    const params = {
      TableName: 'betterkid_v2',
      Item: {
        partitionKey,
        sortKey: `EVENT#${eventId}`,
        eventId,
        title,
        description,
        image,
        amount,
        type,
      },
    };

    await dynamoDb.send(new PutCommand(params));
    return NextResponse.json({ message: 'Event added successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to add event', details: err.message }, { status: 500 });
  }
}
