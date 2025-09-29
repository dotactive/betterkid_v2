import { NextResponse } from 'next/server';
import { ScanCommand, UpdateCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';
import axios from 'axios';

export async function GET(request: Request) {
  try {
    const now = new Date();
    const nowUTC = now.toISOString();
    const nowLocal = now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
    console.log('🕙 Daily reset cron job started at', nowUTC, '(UTC)');
    console.log('🕙 Local time (Australia/Sydney):', nowLocal);
    
    // Check if this is a cron job request or a manual request
    const authHeader = request.headers.get('authorization');
    const userAgent = request.headers.get('user-agent');
    const referer = request.headers.get('referer');
    
    // Allow if it's a legitimate cron job OR a manual request from the app
    const isCronJob = authHeader?.includes('Bearer') || userAgent?.includes('vercel');
    const isManualRequest = referer?.includes(request.headers.get('host') || '');
    
    // if (!isCronJob && !isManualRequest) {
    //   console.warn('Unauthorized daily reset request');
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    const requestType = isCronJob ? 'cron job' : 'manual request';
    console.log(`🔄 Daily reset started via ${requestType}`);

    let approvedCount = 0;
    let resetCount = 0;
    let errorCount = 0;
    let usersProcessed = 0;
    let usersSkipped = 0;
    let completionBonusCount = 0;
    let incompleteFineCount = 0;

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

    // Step 2: Get all repeatable activities for users with auto_reset enabled (like manual reset does)
    console.log('📋 Step 2: Fetching repeatable activities for auto_reset users...');

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
          completionBonuses: 0,
          incompleteFines: 0,
          errors: 0,
        },
      });
    }

    // Get all activities with repeat schedules for auto_reset enabled users (includes behavior-based AND standalone)

    // Scan for behavior-based activities
    const scanBehaviorActivitiesParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(sortKey, :behaviorPrefix) AND #repeat <> :none',
      ExpressionAttributeNames: {
        '#repeat': 'repeat',
      },
      ExpressionAttributeValues: {
        ':behaviorPrefix': 'BEHAVIOR#',
        ':none': 'none',
      },
    };

    const behaviorActivitiesResult = await dynamoDb.send(new ScanCommand(scanBehaviorActivitiesParams));
    const allBehaviorActivities = behaviorActivitiesResult.Items || [];

    // Scan for standalone activities
    const scanStandaloneActivitiesParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'begins_with(sortKey, :activityPrefix) AND #repeat <> :none',
      ExpressionAttributeNames: {
        '#repeat': 'repeat',
      },
      ExpressionAttributeValues: {
        ':activityPrefix': 'ACTIVITY#',
        ':none': 'none',
      },
    };

    const standaloneActivitiesResult = await dynamoDb.send(new ScanCommand(scanStandaloneActivitiesParams));
    const allStandaloneActivities = standaloneActivitiesResult.Items || [];

    // Combine both types of activities
    const allRepeatableActivities = [...allBehaviorActivities, ...allStandaloneActivities];

    // Filter activities to only include those belonging to users with auto_reset enabled
    const repeatableActivities = allRepeatableActivities.filter(activity =>
      userPartitionKeys.includes(activity.partitionKey)
    );

    console.log(`📋 Found ${repeatableActivities.length} repeatable activities from auto_reset enabled users (${allBehaviorActivities.length} behavior-based + ${allStandaloneActivities.length} standalone = ${allRepeatableActivities.length} total)`);

    usersProcessed = usersWithAutoReset.length;
    const totalUsers = usersResult.Items?.length || 0;
    usersSkipped = totalUsers - usersProcessed;

    // Step 3: Process each user individually like the manual reset does
    for (const user of usersWithAutoReset) {
      try {
        console.log(`👤 Processing user: ${user.partitionKey}`);

        // Extract userId from partitionKey (USER#userId -> userId)
        const userId = user.partitionKey.replace('USER#', '');

        // Step 3a: Approve pending money records using the user-balance API like manual reset does
        console.log(`💰 Step 3a: Approving pending money for user: ${userId}`);

        // Get all activity IDs for activities with repeat schedules (like manual reset does)
        const userActivities = repeatableActivities.filter(activity =>
          activity.partitionKey === user.partitionKey
        );

        try {
          // Get pending money records via API (like manual reset)
          const baseUrl = request.headers.get('host') ? `http://${request.headers.get('host')}` : 'http://localhost:3000';
          const pendingResponse = await axios.get(`${baseUrl}/api/pending-money?userId=${encodeURIComponent(userId)}`);
          const pendingItems = pendingResponse.data || [];

          const todoPageActivityIds = userActivities.map(activity => activity.activityId);

          // Filter to only include pending items related to todo page activities
          const todoPendingItems = pendingItems.filter((item: any) =>
            item.type === 'activity' && todoPageActivityIds.includes(item.referenceId)
          );

          console.log(`💰 Found ${todoPendingItems.length} pending money records for user ${userId}`);

          // Get current balance via API
          const balanceResponse = await axios.get(`${baseUrl}/api/user-balance?userId=${encodeURIComponent(userId)}`);
          let currentBalance = balanceResponse.data.balance || 0;

          for (const item of todoPendingItems) {
            try {
              // Add pending amount to current balance
              currentBalance += item.amount;

              // Update balance using the API (which creates proper logs)
              await axios.put(`${baseUrl}/api/user-balance`, {
                userId: userId,
                balance: currentBalance,
                reason: `Approved: ${item.reason}`
              });

              // Delete the pending money record
              await axios.delete(`${baseUrl}/api/pending-money/${item.pendingId}`, {
                headers: { 'x-userid': userId }
              });

              console.log(`💰 Approved pending item: ${item.reason} (+$${item.amount})`);
              approvedCount++;
            } catch (err) {
              console.error('❌ Error approving pending item:', err);
              errorCount++;
            }
          }

          // Update local user balance for completion bonus/fine calculations
          user.balance = currentBalance;

        } catch (err) {
          console.error('❌ Error processing pending rewards:', err);
          errorCount++;
        }

        // Step 3b: Check completion status and apply awards/fines BEFORE reset (like manual reset)
        console.log(`🏆 Step 3b: Checking completion status for user: ${userId}`);

        // Use the activities we already have (like manual reset uses frontend state)
        const dailyActivities = userActivities.filter(activity => activity.repeat === 'daily');

        if (dailyActivities.length > 0) {
          // Count uncompleted daily activities (activities that are still marked as 'false')
          // Note: After pending money approval, activities with pending_quantity=0 and completed='false' are truly incomplete
          // Activities that were done should have completed='pending' or 'true' or pending_quantity>0
          const uncompletedDaily = dailyActivities.filter(activity =>
            activity.completed === 'false' && (activity.pending_quantity || 0) === 0
          );

          console.log(`🏆 Daily activities summary for user ${userId}: ${dailyActivities.length} total, ${uncompletedDaily.length} uncompleted`);

          // Debug: Log each activity's status
          dailyActivities.forEach(activity => {
            console.log(`🔍 Activity "${activity.activityName}": completed="${activity.completed}", pending_quantity=${activity.pending_quantity || 0}`);
          });

          const completeAward = user.completeAward || 0;
          const uncompleteFine = user.uncompleteFine || 0;

          if (uncompletedDaily.length === 0 && completeAward > 0) {
            // All daily activities completed - give award
            try {
              const baseUrl = request.headers.get('host') ? `http://${request.headers.get('host')}` : 'http://localhost:3000';
              const balanceResponse = await axios.get(`${baseUrl}/api/user-balance?userId=${encodeURIComponent(userId)}`);
              const currentBalance = balanceResponse.data.balance || 0;
              const newBalance = currentBalance + completeAward;

              console.log(`🎉 Applying completion bonus: ${currentBalance} + ${completeAward} = ${newBalance}`);

              await axios.put(`${baseUrl}/api/user-balance`, {
                userId: userId,
                balance: newBalance,
                reason: `Daily completion bonus: All ${dailyActivities.length} activities completed (+$${completeAward}) via daily cron job`
              });

              completionBonusCount++;
              console.log(`🎉 Applied completion bonus: $${completeAward}`);

            } catch (err) {
              console.error('❌ Error applying complete award:', err);
              errorCount++;
            }
          } else if (uncompletedDaily.length > 0 && uncompleteFine > 0) {
            // Some activities incomplete - apply fine
            const totalFine = uncompletedDaily.length * uncompleteFine;
            try {
              const baseUrl = request.headers.get('host') ? `http://${request.headers.get('host')}` : 'http://localhost:3000';
              const balanceResponse = await axios.get(`${baseUrl}/api/user-balance?userId=${encodeURIComponent(userId)}`);
              const currentBalance = balanceResponse.data.balance || 0;
              const newBalance = currentBalance - totalFine;

              console.log(`💸 Applying incomplete fine: ${currentBalance} - ${totalFine} = ${newBalance}`);

              await axios.put(`${baseUrl}/api/user-balance`, {
                userId: userId,
                balance: newBalance,
                reason: `Daily incomplete fine: ${uncompletedDaily.length} activities not completed ($${uncompleteFine} per activity = $${totalFine} total) via daily cron job`
              });

              incompleteFineCount++;
              console.log(`💸 Applied incomplete fine: $${totalFine}`);

            } catch (err) {
              console.error('❌ Error applying incomplete fine:', err);
              errorCount++;
            }
          }
        }

        // Step 3c: Reset daily activities using the todos/reset API (like manual reset)
        console.log(`🔄 Step 3c: Resetting daily activities for user: ${userId}`);

        try {
          const baseUrl = request.headers.get('host') ? `http://${request.headers.get('host')}` : 'http://localhost:3000';
          const resetResponse = await axios.post(`${baseUrl}/api/todos/reset`, {
            resetType: 'daily',
            userId: userId
          });

          if (resetResponse.data.resetCount !== undefined) {
            resetCount += resetResponse.data.resetCount;
            console.log(`🔄 Reset ${resetResponse.data.resetCount} daily activities for user ${userId}`);
          }
        } catch (err) {
          console.error(`❌ Error resetting activities for user ${userId}:`, err);
          errorCount++;
        }

      } catch (userError) {
        console.error(`❌ Error processing user ${user.partitionKey}:`, userError);
        errorCount++;
      }
    }

    // Step 4: Summary (pending money cleanup is now handled per user above)
    console.log('✅ All users processed successfully');

    const summary = {
      timestamp: new Date().toISOString(),
      usersWithAutoReset: usersWithAutoReset.length,
      usersProcessed: usersProcessed,
      approvedActivities: approvedCount,
      resetDailyActivities: resetCount,
      cleanedPendingRecords: 0, // Now handled per user above
      completionBonuses: completionBonusCount,
      incompleteFines: incompleteFineCount,
      errors: errorCount,
      totalProcessed: repeatableActivities.length,
    };

    console.log('✅ Daily reset cron job completed:', summary);

    return NextResponse.json({
      success: true,
      message: `Daily reset completed successfully via ${requestType}`,
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