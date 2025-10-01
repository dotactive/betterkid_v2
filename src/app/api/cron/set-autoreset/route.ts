import { NextResponse } from 'next/server';
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import dynamoDb from '@/lib/aws-config';

export async function GET(request: Request) {
  try {
    console.log('🔄 Set autoReset cron job started at', new Date().toISOString());
    
    // Check if this is a cron job request or a manual request
    const authHeader = request.headers.get('authorization');
    const userAgent = request.headers.get('user-agent');
    const referer = request.headers.get('referer');
    
    // Allow if it's a legitimate cron job OR a manual request from the app
    const isCronJob = authHeader?.includes('Bearer') || userAgent?.includes('vercel');
    const isManualRequest = referer?.includes(request.headers.get('host') || '');
    
    if (!isCronJob && !isManualRequest) {
      console.warn('Unauthorized set autoReset request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const requestType = isCronJob ? 'cron job' : 'manual request';
    console.log(`🔄 Set autoReset started via ${requestType}`);

    let usersUpdated = 0;
    let usersSkipped = 0;
    let errorCount = 0;

    // Get all users (METADATA records)
    console.log('👥 Fetching all users...');
    
    const scanUsersParams = {
      TableName: 'betterkid_v2',
      FilterExpression: 'sortKey = :metadata',
      ExpressionAttributeValues: {
        ':metadata': 'METADATA',
      },
    };

    const usersResult = await dynamoDb.send(new ScanCommand(scanUsersParams));
    const allUsers = usersResult.Items || [];
    
    console.log(`👥 Found ${allUsers.length} total users`);

    // Process each user
    for (const user of allUsers) {
      try {
        const currentAutoReset = user.autoReset;
        
        // Only update if autoReset is not already true
        if (currentAutoReset == true) {
          const updateParams = {
            TableName: 'betterkid_v2',
            Key: {
              partitionKey: user.partitionKey,
              sortKey: user.sortKey,
            },
            UpdateExpression: 'SET autoReset = :autoReset',
            ExpressionAttributeValues: {
              ':autoReset': false,
            },
          };
          
          await dynamoDb.send(new UpdateCommand(updateParams));
          console.log(`✅ Set autoReset = true for user: ${user.username || user.partitionKey}`);
          usersUpdated++;
        } else {
          console.log(`⏭️ User ${user.username || user.partitionKey} already has autoReset = true`);
          usersSkipped++;
        }
        
      } catch (userError) {
        console.error(`❌ Error updating user ${user.partitionKey}:`, userError);
        errorCount++;
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      totalUsers: allUsers.length,
      usersUpdated,
      usersSkipped,
      errors: errorCount,
    };

    console.log('✅ Set autoReset cron job completed:', summary);

    return NextResponse.json({
      success: true,
      message: `Set autoReset completed successfully via ${requestType}`,
      summary,
    });

  } catch (error) {
    console.error('❌ Set autoReset cron job failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Set autoReset failed', 
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