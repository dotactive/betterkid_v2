import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Check if it's close to 21:10 - allowing for some flexibility
    const isResetTime = hour === 21 && minute >= 10 && minute < 15;

    const results = [];

    if (isResetTime) {
      // Daily reset every day at 21:10
      console.log('Performing daily todo reset...');
      const dailyResetResponse = await fetch(`${request.url.replace('/cron/todo-reset', '/todos/reset')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetType: 'daily' }),
      });
      const dailyResult = await dailyResetResponse.json();
      results.push({ type: 'daily', ...dailyResult });

      // Weekly reset every Monday at 21:10
      if (dayOfWeek === 1) { // Monday
        console.log('Performing weekly todo reset...');
        const weeklyResetResponse = await fetch(`${request.url.replace('/cron/todo-reset', '/todos/reset')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resetType: 'weekly' }),
        });
        const weeklyResult = await weeklyResetResponse.json();
        results.push({ type: 'weekly', ...weeklyResult });
      }

      // Monthly reset every 1st of the month at 21:10
      if (dayOfMonth === 1) {
        console.log('Performing monthly todo reset...');
        const monthlyResetResponse = await fetch(`${request.url.replace('/cron/todo-reset', '/todos/reset')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resetType: 'monthly' }),
        });
        const monthlyResult = await monthlyResetResponse.json();
        results.push({ type: 'monthly', ...monthlyResult });
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ 
        message: 'No resets performed - not the scheduled time',
        currentTime: now.toISOString(),
        nextDailyReset: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 21, 10, 0).toISOString(),
        nextWeeklyReset: getNextMonday(now).toISOString(),
        nextMonthlyReset: getNextFirstOfMonth(now).toISOString(),
      });
    }

    return NextResponse.json({ 
      message: 'Todo reset completed',
      results,
      timestamp: now.toISOString()
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error in cron todo reset:', err);
    return NextResponse.json(
      { error: 'Failed to perform scheduled todo reset', details: err.message },
      { status: 500 }
    );
  }
}

function getNextMonday(date: Date): Date {
  const nextMonday = new Date(date);
  const daysUntilMonday = (1 - date.getDay() + 7) % 7;
  if (daysUntilMonday === 0 && (date.getHours() > 21 || (date.getHours() === 21 && date.getMinutes() >= 10))) {
    nextMonday.setDate(date.getDate() + 7);
  } else {
    nextMonday.setDate(date.getDate() + daysUntilMonday);
  }
  nextMonday.setHours(21, 10, 0, 0);
  return nextMonday;
}

function getNextFirstOfMonth(date: Date): Date {
  const nextFirst = new Date(date);
  if (date.getDate() === 1 && (date.getHours() > 21 || (date.getHours() === 21 && date.getMinutes() >= 10))) {
    // If it's already the 1st but past 21:10, go to next month
    nextFirst.setMonth(date.getMonth() + 1, 1);
  } else if (date.getDate() > 1) {
    // If it's past the 1st, go to the 1st of next month
    nextFirst.setMonth(date.getMonth() + 1, 1);
  } else {
    // It's the 1st and before/at 21:10
    nextFirst.setDate(1);
  }
  nextFirst.setHours(21, 10, 0, 0);
  return nextFirst;
}