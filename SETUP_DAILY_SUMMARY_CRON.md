# Daily Summary Cron Job Setup Guide

## Overview
This system automatically generates and sends daily workout summaries to group chats at 08:00 UTC each morning, providing yesterday's workout completion data, top performers, and group streaks.

## Production-Only Configuration

### Important: Vercel Cron Job Behavior
⚠️ **Vercel cron jobs ONLY execute on production deployments** - they completely ignore preview/dev environments.

This means:
- ✅ **Production**: Automated daily summaries at 08:00 UTC
- ❌ **Dev Environment**: No automatic execution (use manual admin buttons)
- 🧪 **Testing**: Use "Send Yesterday's Summary" button in Bot Message Settings

## Required Setup Steps

### 1. Environment Variables
Ensure these are set in your **production** Vercel project:

```
CRON_SECRET=your-random-secret-string-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
```

### 2. Database Function
Apply the `generate_daily_summary_for_date` function to Supabase:

```sql
-- Execute in Supabase SQL Editor
-- File: /add_daily_summary_for_date.sql
```

### 3. Vercel Configuration
The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Schedule Details:**
- `0 8 * * *` = Every day at 08:00 UTC
- Generates summary of previous day's workouts
- Only runs in production environment

## How It Works

### Daily Process (08:00 UTC)
1. **Cron Trigger**: Vercel automatically calls `/api/cron/daily-summary`
2. **Authentication**: Verifies CRON_SECRET header
3. **Configuration Check**: Reads daily summary settings from database
4. **Group Processing**: Generates summaries for all active groups
5. **Content Generation**: Creates workout completion stats, top performers, streaks
6. **Message Delivery**: Posts summaries to group chats via system messages

### Generated Content
- 💪 **Workout Completion Rate**: How many members completed workouts
- 🏆 **Top Performer**: Member with highest points yesterday
- 🔥 **Group Streak**: Current consecutive day streak
- ✨ **Motivational Message**: Inspiring fitness quote (if enabled)

## Manual Controls

### Development Testing
In dev environment, use Bot Message Settings:
- "Send Today's Summary" - Current day data
- "Send Yesterday's Summary" - Previous day data (like cron job)

### Production Backup
Manual buttons remain available in production for:
- Emergency manual summaries
- Testing configuration changes
- One-off summary requests

## Troubleshooting

### Common Issues
1. **No summaries received**: Check environment variables in production
2. **Wrong timezone**: Cron runs at UTC, adjust schedule if needed
3. **Missing data**: Verify database function was applied
4. **Authentication errors**: Confirm CRON_SECRET matches

### Testing
```bash
# Manual trigger (production only)
curl -X GET https://your-production-domain.com/api/cron/daily-summary \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Monitoring
- Check Vercel function logs in dashboard
- Monitor chat messages for successful deliveries
- Verify system message entries in database

## Plan Limitations

**Vercel Hobby Plan:**
- Limited to 2 cron jobs total
- Each triggered once per day maximum
- This uses 1 of your 2 available slots

**Upgrade Benefits:**
- Pro plan allows 40 cron jobs
- Unlimited daily invocations
- More reliable execution timing