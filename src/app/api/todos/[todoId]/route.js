import { NextResponse } from 'next/server';
import { PutCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function PUT(request, context) {
  try {
    const { todoId } = context.params;
    console.log('PUT /api/todos/[todoId], received todoId:', todoId);

    if (!todoId || typeof todoId !== 'string') {
      return NextResponse.json({ error: 'Todo ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { userId, text, completed, money, repeat } = body;

    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    // First, fetch the existing todo to preserve all fields
    const todoParams = {
      TableName: 'betterkid_v2',
      KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `TODO#${todoId}`,
      },
    };
    const todoData = await dynamoDb.send(new QueryCommand(todoParams));
    const existingTodo = todoData.Items?.[0];

    if (!existingTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Build update item by merging existing data with new data
    const updateItem = {
      partitionKey: existingTodo.partitionKey,
      sortKey: existingTodo.sortKey,
      todoId: existingTodo.todoId,
      userId: existingTodo.userId,
      text: text !== undefined && typeof text === 'string' && text.trim() !== '' ? text.trim() : existingTodo.text,
      completed: completed !== undefined ? completed : existingTodo.completed,
      money: money !== undefined ? money : existingTodo.money,
      repeat: repeat !== undefined && ['daily', 'weekly', 'monthly', 'once'].includes(repeat) ? repeat : existingTodo.repeat,
      createdAt: existingTodo.createdAt,
    };

    const params = {
      TableName: 'betterkid_v2',
      Item: updateItem,
      ConditionExpression: 'attribute_exists(partitionKey) AND attribute_exists(sortKey)',
    };

    await dynamoDb.send(new PutCommand(params));
    
    // Handle pending money based on completion status changes
    if (completed !== undefined) {
      // If todo is being marked as pending (false -> pending) and has money value, add to pending money
      if (completed === 'pending' && existingTodo.completed === 'false' && updateItem.money > 0) {
        const pendingParams = {
          TableName: 'betterkid_v2',
          Item: {
            partitionKey: `USER#${userId}`,
            sortKey: `PENDING#${todoId}_${Date.now()}`,
            pendingId: `${todoId}_${Date.now()}`,
            userId,
            amount: updateItem.money,
            reason: `Completed todo: ${updateItem.text}`,
            type: 'todo',
            referenceId: todoId,
            createdAt: new Date().toISOString(),
          },
        };
        
        await dynamoDb.send(new PutCommand(pendingParams));
        console.log(`Added $${updateItem.money} to pending money for todo pending approval: ${updateItem.text}`);
      }
      
      // If todo is being marked as false from pending/true, remove pending money
      if (completed === 'false' && (existingTodo.completed === 'pending' || existingTodo.completed === 'true') && updateItem.money > 0) {
        // Find and remove pending money entries for this todo
        const pendingParams = {
          TableName: 'betterkid_v2',
          FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk) AND referenceId = :refId',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': 'PENDING#',
            ':refId': todoId,
          },
        };
        
        const pendingData = await dynamoDb.send(new ScanCommand(pendingParams));
        const pendingItems = pendingData.Items || [];
        
        // Delete all pending items for this todo
        for (const item of pendingItems) {
          const deleteParams = {
            TableName: 'betterkid_v2',
            Key: {
              partitionKey: item.partitionKey,
              sortKey: item.sortKey,
            },
          };
          await dynamoDb.send(new DeleteCommand(deleteParams));
          console.log(`Removed pending money for reset todo: ${updateItem.text}`);
        }
      }
      
      // If todo is being approved (pending -> true), the pending money stays in place
      // It will be handled by the approve-pending page
    }
    
    return NextResponse.json({ message: 'Todo updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update todo', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const { todoId } = context.params;

    if (!todoId || typeof todoId !== 'string') {
      return NextResponse.json({ error: 'Todo ID is required' }, { status: 400 });
    }

    const userId = request.headers.get('x-userid') || '';

    // Fetch todo to get partitionKey
    const todoParams = {
      TableName: 'betterkid_v2',
      KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `TODO#${todoId}`,
      },
    };
    const todoData = await dynamoDb.send(new QueryCommand(todoParams));
    const todo = todoData.Items?.[0];

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const deleteParams = {
      TableName: 'betterkid_v2',
      Key: {
        partitionKey: todo.partitionKey,
        sortKey: `TODO#${todoId}`,
      },
      ConditionExpression: 'attribute_exists(partitionKey) AND attribute_exists(sortKey)',
    };

    await dynamoDb.send(new DeleteCommand(deleteParams));
    return NextResponse.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete todo', details: error.message }, { status: 500 });
  }
}