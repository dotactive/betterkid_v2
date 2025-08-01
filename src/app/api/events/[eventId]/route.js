import { NextResponse } from 'next/server';
import { PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

// Update an event
export async function PUT(request, context) {
  try {
    const { eventId } = context.params;
    const { userId, title, description, image, amount, type } = await request.json();

    if (!userId || !eventId || !title || !type || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // Find partitionKey via scan (assumes eventId is unique)
    const scanRes = await dynamoDb.send(new ScanCommand({
      TableName: 'betterkid_v2',
      FilterExpression: 'eventId = :eventId',
      ExpressionAttributeValues: {
        ':eventId': eventId,
      },
    }));

    const existing = scanRes.Items?.[0];
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const paramsToPut = {
      TableName: 'betterkid_v2',
      Item: {
        partitionKey: existing.partitionKey,
        sortKey: existing.sortKey,
        eventId,
        title,
        description,
        image,
        amount,
        type,
      },
    };

    await dynamoDb.send(new PutCommand(paramsToPut));
    return NextResponse.json({ message: 'Event updated successfully' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update event', details: err.message }, { status: 500 });
  }
}

// Delete an event
export async function DELETE(_request, context) {
  try {
    const { eventId } = context.params;

    const scanRes = await dynamoDb.send(new ScanCommand({
      TableName: 'betterkid_v2',
      FilterExpression: 'eventId = :eventId',
      ExpressionAttributeValues: {
        ':eventId': eventId,
      },
    }));

    const item = scanRes.Items?.[0];
    if (!item) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const deleteParams = {
      TableName: 'betterkid_v2',
      Key: {
        partitionKey: item.partitionKey,
        sortKey: item.sortKey,
      },
      ConditionExpression: 'attribute_exists(partitionKey) AND attribute_exists(sortKey)',
    };

    await dynamoDb.send(new DeleteCommand(deleteParams));
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete event', details: err.message }, { status: 500 });
  }
}
