import { NextResponse } from 'next/server';
import { DeleteCommand, QueryCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

// Helper function to handle activity denial - just reset to false
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
      // Reset pending_quantity to 0 and completed to 'false'
      const updateParams = {
        TableName: 'betterkid_v2',
        Key: {
          partitionKey: activity.partitionKey,
          sortKey: activity.sortKey,
        },
        UpdateExpression: 'SET pending_quantity = :pending_quantity, completed = :completed',
        ExpressionAttributeValues: {
          ':pending_quantity': 0,
          ':completed': 'false',
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

// Helper function to handle activity approval based on repeat type
async function handleActivityApproval(activityId) {
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
      const repeatType = activity.repeat || 'none';

      if (repeatType === 'once') {
        // Delete the activity if repeat is 'once'
        const deleteParams = {
          TableName: 'betterkid_v2',
          Key: {
            partitionKey: activity.partitionKey,
            sortKey: activity.sortKey,
          },
          ConditionExpression: 'attribute_exists(partitionKey)',
        };

        await dynamoDb.send(new DeleteCommand(deleteParams));
        console.log(`Deleted 'once' activity: ${activity.activityName}`);
      } else if (['daily', 'weekly', 'monthly'].includes(repeatType)) {
        // Update repeating activity: reset pending_quantity and set completed to 'true'
        const updateParams = {
          TableName: 'betterkid_v2',
          Key: {
            partitionKey: activity.partitionKey,
            sortKey: activity.sortKey,
          },
          UpdateExpression: 'SET pending_quantity = :pending_quantity, completed = :completed',
          ExpressionAttributeValues: {
            ':pending_quantity': 0,
            ':completed': 'true',
          },
          ConditionExpression: 'attribute_exists(partitionKey)',
        };

        await dynamoDb.send(new UpdateCommand(updateParams));
        console.log(`Approved repeating activity: ${activity.activityName} (${repeatType})`);
      } else {
        // For 'none' or other types, just reset pending_quantity
        const updateParams = {
          TableName: 'betterkid_v2',
          Key: {
            partitionKey: activity.partitionKey,
            sortKey: activity.sortKey,
          },
          UpdateExpression: 'SET pending_quantity = :pending_quantity, completed = :completed',
          ExpressionAttributeValues: {
            ':pending_quantity': 0,
            ':completed': 'false',
          },
          ConditionExpression: 'attribute_exists(partitionKey)',
        };

        await dynamoDb.send(new UpdateCommand(updateParams));
        console.log(`Reset activity: ${activity.activityName} (${repeatType})`);
      }
    }
  } catch (error) {
    console.error(`Failed to handle activity approval for ${activityId}:`, error);
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
      
      // Get current balance before processing approvals
      const currentBalanceData = await dynamoDb.send(new QueryCommand({
        TableName: 'betterkid_v2',
        KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'ACCOUNT#balance',
        },
      }));
      let runningBalance = currentBalanceData.Items?.[0]?.balance || 0;
      
      for (const item of pendingItems) {
        const itemAmount = item.amount || 0;
        totalAmount += itemAmount;
        
        // If this is an activity item, reset the pending quantity and log it
        if (item.type === 'activity' && item.referenceId) {
          await handleActivityApproval(item.referenceId);
          
          // Add to balance log with proper balance tracking
          const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const balanceBefore = runningBalance;
          const balanceAfter = runningBalance + itemAmount;
          
          const logParams = {
            TableName: 'betterkid_v2',
            Item: {
              partitionKey: `USER#${userId}`,
              sortKey: `BALANCELOG#${logId}`,
              logId,
              userId,
              amount: itemAmount,
              balanceBefore: balanceBefore,
              balanceAfter: balanceAfter,
              reason: item.reason,
              timestamp: new Date().toISOString(),
            },
          };
          
          try {
            await dynamoDb.send(new PutCommand(logParams));
            console.log(`Logged activity approval: ${item.reason} (${itemAmount >= 0 ? '+' : ''}${itemAmount})`);
            logEntries.push(`${item.reason} (${itemAmount >= 0 ? '+' : ''}$${Math.abs(itemAmount)})`);
            runningBalance = balanceAfter; // Update running balance
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
            
            // Add to balance log with proper balance tracking
            const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const balanceBefore = runningBalance;
            const balanceAfter = runningBalance + itemAmount;
            
            const logParams = {
              TableName: 'betterkid_v2',
              Item: {
                partitionKey: `USER#${userId}`,
                sortKey: `BALANCELOG#${logId}`,
                logId,
                userId,
                amount: itemAmount,
                balanceBefore: balanceBefore,
                balanceAfter: balanceAfter,
                reason: item.reason,
                timestamp: new Date().toISOString(),
              },
            };
            await dynamoDb.send(new PutCommand(logParams));
            logEntries.push(`${item.reason} (+$${itemAmount})`);
            runningBalance = balanceAfter; // Update running balance
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

        // Add to user balance
        const balanceParams = {
          TableName: 'betterkid_v2',
          Key: {
            partitionKey: `USER#${userId}`,
            sortKey: 'ACCOUNT#balance',
          },
        };
        
        // Use the updated running balance from our calculations above
        const newBalance = runningBalance;
        
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
      
      // Get current balance for proper logging
      const currentBalanceData = await dynamoDb.send(new QueryCommand({
        TableName: 'betterkid_v2',
        KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'ACCOUNT#balance',
        },
      }));
      let runningBalance = currentBalanceData.Items?.[0]?.balance || 0;
      
      // If this is an activity item, reset the pending quantity and log it
      if (pending.type === 'activity' && pending.referenceId) {
        await handleActivityApproval(pending.referenceId);
        
        // Add to balance log with proper balance tracking
        const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const balanceBefore = runningBalance;
        const balanceAfter = runningBalance + amount;
        runningBalance = balanceAfter; // Update running balance
        
        const logParams = {
          TableName: 'betterkid_v2',
          Item: {
            partitionKey: `USER#${userId}`,
            sortKey: `BALANCELOG#${logId}`,
            logId,
            userId,
            amount: amount,
            balanceBefore: balanceBefore,
            balanceAfter: balanceAfter,
            reason: pending.reason,
            timestamp: new Date().toISOString(),
          },
        };
        
        try {
          await dynamoDb.send(new PutCommand(logParams));
          console.log(`Logged activity approval: ${pending.reason} (${amount >= 0 ? '+' : ''}${amount})`);
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
          
          // Add to balance log with proper balance tracking
          const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const balanceBefore = runningBalance;
          const balanceAfter = runningBalance + amount;
          runningBalance = balanceAfter; // Update running balance
          
          const logParams = {
            TableName: 'betterkid_v2',
            Item: {
              partitionKey: `USER#${userId}`,
              sortKey: `BALANCELOG#${logId}`,
              logId,
              userId,
              amount: amount,
              balanceBefore: balanceBefore,
              balanceAfter: balanceAfter,
              reason: pending.reason,
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
      
      
      // Use the running balance that has been updated through the approval process
      const newBalance = runningBalance;
      
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