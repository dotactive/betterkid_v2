import { NextResponse } from 'next/server';
import { ScanCommand, UpdateCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function GET(request: Request) {
  try {
    console.log('🕙 Daily reset cron job started at', new Date().toISOString());
    
    // Verify this is actually a cron job request (Vercel adds specific headers)
    const authHeader = request.headers.get('authorization');
    const userAgent = request.headers.get('user-agent');
    
    if (!authHeader?.includes('Bearer') && !userAgent?.includes('vercel')) {
      console.warn('Unauthorized cron job request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let approvedCount = 0;
    let resetCount = 0;
    let errorCount = 0;
    let usersProcessed = 0;
    let usersSkipped = 0;

    // Step 1: Get all users with auto_reset enabled
    console.log('👥 Step 1: Fetching users with auto_reset enabled...');
    
    const scanUsersParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'sortKey = :metadata AND autoReset = :true',
      ExpressionAttributeValues: {
        ':metadata': 'METADATA',
        ':true': true,
      },
    };

    const usersResult = await dynamoDb.send(new ScanCommand(scanUsersParams));
    const usersWithAutoReset = usersResult.Items || [];
    
    console.log(`👥 Found ${usersWithAutoReset.length} users with auto_reset enabled`);

    // Step 2: Get all pending activities for users with auto_reset enabled
    console.log('📋 Step 2: Fetching pending activities for auto_reset users...');
    
    const userPartitionKeys = usersWithAutoReset.map(user => user.partitionKey);
    
    if (userPartitionKeys.length === 0) {
      console.log('⏭️ No users have auto_reset enabled, skipping reset');
      return NextResponse.json({
        success: true,
        message: 'No users have auto_reset enabled',
        summary: {
          timestamp: new Date().toISOString(),
          usersWithAutoReset: 0,
          approvedActivities: 0,
          resetDailyActivities: 0,
          cleanedPendingRecords: 0,
          errors: 0,
        },
      });
    }

    const scanPendingParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(sortKey, :activityPrefix) AND pending_quantity > :zero',
      ExpressionAttributeValues: {
        ':activityPrefix': 'BEHAVIOR#',
        ':zero': 0,
      },
    };

    const pendingActivitiesResult = await dynamoDb.send(new ScanCommand(scanPendingParams));
    const allPendingActivities = pendingActivitiesResult.Items || [];
    
    // Filter activities to only include those belonging to users with auto_reset enabled
    const pendingActivities = allPendingActivities.filter(activity => 
      userPartitionKeys.includes(activity.partitionKey)
    );
    
    console.log(`📋 Found ${pendingActivities.length} pending activities from auto_reset enabled users (${allPendingActivities.length} total pending activities)`);

    usersProcessed = usersWithAutoReset.length;
    const totalUsers = usersResult.Items?.length || 0;
    usersSkipped = totalUsers - usersProcessed;

    // Step 3: Process each pending activity
    for (const activity of pendingActivities) {
      try {
        console.log(`🔄 Processing activity: ${activity.activityName} (${activity.activityId})`);
        
        // Approve the pending activity
        const pendingQuantity = activity.pending_quantity || 0;
        const moneyPerActivity = activity.money || 0;
        const totalPendingMoney = pendingQuantity * moneyPerActivity * (activity.positive ? 1 : -1);
        
        if (pendingQuantity > 0 && totalPendingMoney !== 0) {
          // Get user info for balance update
          const userScanParams = {
            TableName: 'betterkid_v2',
            KeyConditionExpression: 'partitionKey = :pk AND sortKey = :sk',
            ExpressionAttributeValues: {
              ':pk': activity.partitionKey,
              ':sk': 'METADATA',
            },
          };
          
          const userResult = await dynamoDb.send(new ScanCommand({
            TableName: 'betterkid_v2',
            FilterExpression: 'partitionKey = :pk AND sortKey = :sk',
            ExpressionAttributeValues: userScanParams.ExpressionAttributeValues,
          }));
          
          const user = userResult.Items?.[0];
          if (user) {
            // Update user balance
            const currentBalance = user.balance || 0;
            const newBalance = currentBalance + totalPendingMoney;
            
            const updateUserParams = {
              TableName: 'betterkid_v2',
              Key: {
                partitionKey: user.partitionKey,
                sortKey: user.sortKey,
              },
              UpdateExpression: 'SET balance = :balance',
              ExpressionAttributeValues: {
                ':balance': newBalance,
              },
            };
            
            await dynamoDb.send(new UpdateCommand(updateUserParams));
            console.log(`💰 Updated user balance: ${currentBalance} → ${newBalance}`);
          }

          // Log the approval
          const logId = `LOG#${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const logItem = {
            partitionKey: activity.partitionKey,
            sortKey: logId,
            logId: logId,
            activityId: activity.activityId,
            activityName: activity.activityName,
            type: 'activity',
            action: 'cron_approve',
            amount: totalPendingMoney,
            quantity: pendingQuantity,
            timestamp: new Date().toISOString(),
            note: `Auto-approved ${pendingQuantity} × $${moneyPerActivity} = $${totalPendingMoney} via daily cron job`,
          };

          await dynamoDb.send(new PutCommand({
            TableName: 'betterkid_v2',
            Item: logItem,
          }));
          
          console.log(`📝 Created approval log: ${logId}`);
        }

        // Determine what to do based on repeat type
        const repeatType = activity.repeat || 'none';
        
        if (repeatType === 'once') {
          // Delete 'once' activities
          const deleteParams = {
            TableName: 'betterkid_v2',
            Key: {
              partitionKey: activity.partitionKey,
              sortKey: activity.sortKey,
            },
          };
          
          await dynamoDb.send(new DeleteCommand(deleteParams));
          console.log(`🗑️ Deleted 'once' activity: ${activity.activityName}`);
          
        } else if (repeatType === 'daily') {
          // Reset daily activities to completed = 'false' and pending_quantity = 0
          const updateParams = {
            TableName: 'betterkid_v2',
            Key: {
              partitionKey: activity.partitionKey,
              sortKey: activity.sortKey,
            },
            UpdateExpression: 'SET completed = :completed, pending_quantity = :pending_quantity',
            ExpressionAttributeValues: {
              ':completed': 'false',
              ':pending_quantity': 0,
            },
          };
          
          await dynamoDb.send(new UpdateCommand(updateParams));
          console.log(`🔄 Reset daily activity: ${activity.activityName}`);
          resetCount++;
          
        } else if (['weekly', 'monthly'].includes(repeatType)) {
          // Mark weekly/monthly as completed = 'true' and reset pending_quantity = 0
          const updateParams = {
            TableName: 'betterkid_v2',
            Key: {
              partitionKey: activity.partitionKey,
              sortKey: activity.sortKey,
            },
            UpdateExpression: 'SET completed = :completed, pending_quantity = :pending_quantity',
            ExpressionAttributeValues: {
              ':completed': 'true',
              ':pending_quantity': 0,
            },
          };
          
          await dynamoDb.send(new UpdateCommand(updateParams));
          console.log(`✅ Completed ${repeatType} activity: ${activity.activityName}`);
        } else {
          // For other repeat types, just reset pending_quantity to 0
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
          };
          
          await dynamoDb.send(new UpdateCommand(updateParams));
          console.log(`🔄 Reset pending quantity for: ${activity.activityName}`);
        }
        
        approvedCount++;
        
      } catch (activityError) {
        console.error(`❌ Error processing activity ${activity.activityId}:`, activityError);
        errorCount++;
      }
    }

    // Step 4: Clean up any pending money records for auto_reset users
    console.log('💰 Step 4: Cleaning up pending money records for auto_reset users...');
    
    const pendingMoneyScanParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(sortKey, :pendingPrefix)',
      ExpressionAttributeValues: {
        ':pendingPrefix': 'PENDING_MONEY#',
      },
    };

    const pendingMoneyResult = await dynamoDb.send(new ScanCommand(pendingMoneyScanParams));
    const allPendingMoneyRecords = pendingMoneyResult.Items || [];
    
    // Filter pending money records to only include those belonging to users with auto_reset enabled
    const pendingMoneyRecords = allPendingMoneyRecords.filter(record => 
      userPartitionKeys.includes(record.partitionKey)
    );
    
    for (const record of pendingMoneyRecords) {
      try {
        const deleteParams = {
          TableName: 'betterkid_v2',
          Key: {
            partitionKey: record.partitionKey,
            sortKey: record.sortKey,
          },
        };
        
        await dynamoDb.send(new DeleteCommand(deleteParams));
        console.log(`🗑️ Deleted pending money record: ${record.sortKey}`);
      } catch (deleteError) {
        console.error(`❌ Error deleting pending money record:`, deleteError);
        errorCount++;
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      usersWithAutoReset: usersWithAutoReset.length,
      usersProcessed: usersProcessed,
      approvedActivities: approvedCount,
      resetDailyActivities: resetCount,
      cleanedPendingRecords: pendingMoneyRecords.length,
      errors: errorCount,
      totalProcessed: pendingActivities.length,
    };

    console.log('✅ Daily reset cron job completed:', summary);

    return NextResponse.json({
      success: true,
      message: 'Daily reset completed successfully',
      summary,
    });

  } catch (error) {
    console.error('❌ Daily reset cron job failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Daily reset failed', 
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}