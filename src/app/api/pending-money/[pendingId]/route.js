import { NextResponse } from 'next/server';
import { DeleteCommand, QueryCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

// Helper function to reset activity pending quantity
async function resetActivityPendingQuantity(activityId) {
  try {
    // Find the activity by activityId
    const scanParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'activityId = :activityId',
      ExpressionAttributeValues: {
        ':activityId': activityId,
      },
    };

    const scanResult = await dynamoDb.send(new ScanCommand(scanParams));
    const activity = scanResult.Items?.[0];

    if (activity) {
      // Update the activity's pending_quantity to 0
      const updateParams = {
        TableName: 'betterkid_v2',
        Key: {
          partitionKey: activity.partitionKey,
          sortKey: activity.sortKey,
        },
        UpdateExpression: 'SET pending_quantity = :pending_quantity',
        ExpressionAttributeValues: {
          ':pending_quantity': 0,
        },
        ConditionExpression: 'attribute_exists(partitionKey)',
      };

      await dynamoDb.send(new UpdateCommand(updateParams));
      console.log(`Reset pending_quantity for activity ${activityId}`);
    }
  } catch (error) {
    console.error(`Failed to reset pending_quantity for activity ${activityId}:`, error);
    // Don't throw - continue with the main operation even if this fails
  }
}

export async function DELETE(request, context) {
  try {
    const { pendingId } = context.params;

    if (!pendingId || typeof pendingId !== 'string') {
      return NextResponse.json({ error: 'Pending ID is required' }, { status: 400 });
    }

    const userId = request.headers.get('x-userid') || '';

    // Fetch pending money to get partitionKey
    const pendingParams = {
      TableName: 'betterkid_v2',
      KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `PENDING#${pendingId}`,
      },
    };
    const pendingData = await dynamoDb.send(new QueryCommand(pendingParams));
    const pending = pendingData.Items?.[0];

    if (!pending) {
      return NextResponse.json({ error: 'Pending money not found' }, { status: 404 });
    }

    // If this is an activity-type pending money, reset the activity's pending quantity
    if (pending.type === 'activity' && pending.referenceId) {
      await resetActivityPendingQuantity(pending.referenceId);
    }

    const deleteParams = {
      TableName: 'betterkid_v2',
      Key: {
        partitionKey: pending.partitionKey,
        sortKey: `PENDING#${pendingId}`,
      },
      ConditionExpression: 'attribute_exists(partitionKey) AND attribute_exists(sortKey)',
    };

    await dynamoDb.send(new DeleteCommand(deleteParams));
    return NextResponse.json({ message: 'Pending money deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete pending money', details: error.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const { pendingId } = context.params;
    const body = await request.json();
    const { userId, approveAll = false } = body;

    if (!pendingId || typeof pendingId !== 'string') {
      return NextResponse.json({ error: 'Pending ID is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    if (approveAll) {
      // Approve all pending money for the user
      const pendingParams = {
        TableName: 'betterkid_v2',
        FilterExpression: 'begins_with(partitionKey, :pk) AND begins_with(sortKey, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'PENDING#',
        },
      };
      
      const pendingData = await dynamoDb.send(new ScanCommand(pendingParams));
      const pendingItems = pendingData.Items || [];
      
      let totalAmount = 0;
      const logEntries = [];
      
      for (const item of pendingItems) {
        totalAmount += item.amount || 0;
        
        // If this is an activity item, reset the pending quantity and log it
        if (item.type === 'activity' && item.referenceId) {
          await resetActivityPendingQuantity(item.referenceId);
          
          // Add to balance log
          const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const logParams = {
            TableName: 'betterkid_v2',
            Item: {
              partitionKey: `USER#${userId}`,
              sortKey: `BALANCELOG#${logId}`,
              logId,
              userId,
              amount: item.amount,
              reason: item.reason,
              type: item.amount >= 0 ? 'earn' : 'lose',
              source: 'completed_activity',
              timestamp: new Date().toISOString(),
            },
          };
          
          try {
            await dynamoDb.send(new PutCommand(logParams));
            console.log(`Logged activity approval: ${item.reason} (${item.amount >= 0 ? '+' : ''}${item.amount})`);
            logEntries.push(`${item.reason} (${item.amount >= 0 ? '+' : ''}$${Math.abs(item.amount)})`);
          } catch (error) {
            console.error(`Failed to log activity approval ${item.referenceId}:`, error);
            // Continue with approval even if logging fails
          }
        }
        
        // If this is a todo item, update the todo status to 'true' and log it
        if (item.type === 'todo' && item.referenceId) {
          // First get the existing todo
          const todoQueryParams = {
            TableName: 'betterkid_v2',
            KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
            ExpressionAttributeValues: {
              ':pk': `USER#${userId}`,
              ':sk': `TODO#${item.referenceId}`,
            },
          };
          
          try {
            const todoData = await dynamoDb.send(new QueryCommand(todoQueryParams));
            const existingTodo = todoData.Items?.[0];
            
            if (existingTodo) {
              // Check if this is a 'once' todo - if so, delete it; otherwise update to 'true'
              if (existingTodo.repeat === 'once') {
                // Delete the 'once' todo since it won't repeat
                const todoDeleteParams = {
                  TableName: 'betterkid_v2',
                  Key: {
                    partitionKey: existingTodo.partitionKey,
                    sortKey: existingTodo.sortKey,
                  },
                };
                await dynamoDb.send(new DeleteCommand(todoDeleteParams));
                console.log(`Deleted 'once' todo: ${existingTodo.text}`);
              } else {
                // Update recurring todo status to 'true' (approved)
                const todoUpdateParams = {
                  TableName: 'betterkid_v2',
                  Item: {
                    ...existingTodo,
                    completed: 'true',
                    approvedAt: new Date().toISOString(),
                  },
                };
                await dynamoDb.send(new PutCommand(todoUpdateParams));
                console.log(`Approved recurring todo: ${existingTodo.text}`);
              }
            }
            
            // Add to balance log
            const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const logParams = {
              TableName: 'betterkid_v2',
              Item: {
                partitionKey: `USER#${userId}`,
                sortKey: `BALANCELOG#${logId}`,
                logId,
                userId,
                amount: item.amount,
                reason: item.reason,
                type: 'earn',
                source: 'completed_todo',
                timestamp: new Date().toISOString(),
              },
            };
            await dynamoDb.send(new PutCommand(logParams));
            logEntries.push(`${item.reason} (+$${item.amount})`);
          } catch (error) {
            console.error(`Failed to update todo ${item.referenceId}:`, error);
            // Continue with other items even if one fails
          }
        }
        
        // Delete the pending item
        const deleteParams = {
          TableName: 'betterkid_v2',
          Key: {
            partitionKey: item.partitionKey,
            sortKey: item.sortKey,
          },
        };
        await dynamoDb.send(new DeleteCommand(deleteParams));
      }
      
      if (totalAmount > 0) {
        // Check user settings to see if complete awards are enabled
        const userSettingsData = await dynamoDb.send(new QueryCommand({
          TableName: 'betterkid_v2',
          KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': 'METADATA',
          },
        }));
        
        const userSettings = userSettingsData.Items?.[0];
        const completeAwardEnabled = userSettings?.completeAwardEnabled || false;
        
        if (!completeAwardEnabled) {
          return NextResponse.json({ 
            message: 'Complete awards are disabled. No money was added to balance.',
            totalAmount: 0,
            logEntries: logEntries
          });
        }

        // Add to user balance
        const balanceParams = {
          TableName: 'betterkid_v2',
          Key: {
            partitionKey: `USER#${userId}`,
            sortKey: 'ACCOUNT#balance',
          },
        };
        
        // Get current balance
        const balanceData = await dynamoDb.send(new QueryCommand({
          TableName: 'betterkid_v2',
          KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': 'ACCOUNT#balance',
          },
        }));
        
        const currentBalance = balanceData.Items?.[0]?.balance || 0;
        const newBalance = currentBalance + totalAmount;
        
        // Update balance
        const updateParams = {
          TableName: 'betterkid_v2',
          Item: {
            partitionKey: `USER#${userId}`,
            sortKey: 'ACCOUNT#balance',
            balance: newBalance,
          },
        };
        
        await dynamoDb.send(new PutCommand(updateParams));
      }
      
      return NextResponse.json({ 
        message: `Approved all pending money totaling $${totalAmount.toFixed(2)}`,
        amount: totalAmount 
      });
    } else {
      // Approve single pending money item
      const pendingParams = {
        TableName: 'betterkid_v2',
        KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `PENDING#${pendingId}`,
        },
      };
      
      const pendingData = await dynamoDb.send(new QueryCommand(pendingParams));
      const pending = pendingData.Items?.[0];
      
      if (!pending) {
        return NextResponse.json({ error: 'Pending money not found' }, { status: 404 });
      }
      
      const amount = pending.amount || 0;
      
      // If this is an activity item, reset the pending quantity and log it
      if (pending.type === 'activity' && pending.referenceId) {
        await resetActivityPendingQuantity(pending.referenceId);
        
        // Add to balance log
        const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const logParams = {
          TableName: 'betterkid_v2',
          Item: {
            partitionKey: `USER#${userId}`,
            sortKey: `BALANCELOG#${logId}`,
            logId,
            userId,
            amount: pending.amount,
            reason: pending.reason,
            type: pending.amount >= 0 ? 'earn' : 'lose',
            source: 'completed_activity',
            timestamp: new Date().toISOString(),
          },
        };
        
        try {
          await dynamoDb.send(new PutCommand(logParams));
          console.log(`Logged activity approval: ${pending.reason} (${pending.amount >= 0 ? '+' : ''}${pending.amount})`);
        } catch (error) {
          console.error(`Failed to log activity approval ${pending.referenceId}:`, error);
          // Continue with approval even if logging fails
        }
      }
      
      // If this is a todo item, update the todo status to 'true' and log it
      if (pending.type === 'todo' && pending.referenceId) {
        // First get the existing todo
        const todoQueryParams = {
          TableName: 'betterkid_v2',
          KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': `TODO#${pending.referenceId}`,
          },
        };
        
        try {
          const todoData = await dynamoDb.send(new QueryCommand(todoQueryParams));
          const existingTodo = todoData.Items?.[0];
          
          if (existingTodo) {
            // Check if this is a 'once' todo - if so, delete it; otherwise update to 'true'
            if (existingTodo.repeat === 'once') {
              // Delete the 'once' todo since it won't repeat
              const todoDeleteParams = {
                TableName: 'betterkid_v2',
                Key: {
                  partitionKey: existingTodo.partitionKey,
                  sortKey: existingTodo.sortKey,
                },
              };
              await dynamoDb.send(new DeleteCommand(todoDeleteParams));
              console.log(`Deleted 'once' todo: ${existingTodo.text}`);
            } else {
              // Update recurring todo status to 'true' (approved)
              const todoUpdateParams = {
                TableName: 'betterkid_v2',
                Item: {
                  ...existingTodo,
                  completed: 'true',
                  approvedAt: new Date().toISOString(),
                },
              };
              await dynamoDb.send(new PutCommand(todoUpdateParams));
              console.log(`Approved recurring todo: ${existingTodo.text}`);
            }
          }
          
          // Add to balance log
          const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const logParams = {
            TableName: 'betterkid_v2',
            Item: {
              partitionKey: `USER#${userId}`,
              sortKey: `BALANCELOG#${logId}`,
              logId,
              userId,
              amount: pending.amount,
              reason: pending.reason,
              type: 'earn',
              source: 'completed_todo',
              timestamp: new Date().toISOString(),
            },
          };
          await dynamoDb.send(new PutCommand(logParams));
        } catch (error) {
          console.error(`Failed to update todo ${pending.referenceId}:`, error);
          // Continue with approval even if todo update fails
        }
      }
      
      // Delete the pending item
      const deleteParams = {
        TableName: 'betterkid_v2',
        Key: {
          partitionKey: pending.partitionKey,
          sortKey: pending.sortKey,
        },
      };
      await dynamoDb.send(new DeleteCommand(deleteParams));
      
      // Check user settings to see if complete awards are enabled
      const userSettingsData = await dynamoDb.send(new QueryCommand({
        TableName: 'betterkid_v2',
        KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'METADATA',
        },
      }));
      
      const userSettings = userSettingsData.Items?.[0];
      const completeAwardEnabled = userSettings?.completeAwardEnabled || false;
      
      if (!completeAwardEnabled) {
        return NextResponse.json({ 
          message: 'Complete awards are disabled. No money was added to balance.',
          amount: 0
        });
      }
      
      // Add to user balance
      const balanceData = await dynamoDb.send(new QueryCommand({
        TableName: 'betterkid_v2',
        KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'ACCOUNT#balance',
        },
      }));
      
      const currentBalance = balanceData.Items?.[0]?.balance || 0;
      const newBalance = currentBalance + amount;
      
      const updateParams = {
        TableName: 'betterkid_v2',
        Item: {
          partitionKey: `USER#${userId}`,
          sortKey: 'ACCOUNT#balance',
          balance: newBalance,
        },
      };
      
      await dynamoDb.send(new PutCommand(updateParams));
      
      return NextResponse.json({ 
        message: `Approved pending money of $${amount.toFixed(2)}`,
        amount: amount 
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to approve pending money', details: error.message }, { status: 500 });
  }
}