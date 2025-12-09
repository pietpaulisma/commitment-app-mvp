# Automatic Penalty System Setup Guide

## Overview
This system automatically checks all users daily at 00:01 UTC and assigns €10 penalties to users who missed their daily workout targets the previous day.

## Required Setup Steps

### 1. Database Migration
Run the SQL migration to add penalty tracking columns:

```sql
-- Execute in Supabase SQL Editor
-- File: /add_penalty_tracking.sql
```

This adds:
- `total_penalty_owed` column to profiles table
- `last_penalty_check` column to profiles table  
- `penalty_logs` table for audit trail
- Proper RLS policies using existing `role` column (not boolean admin flags)

### 2. Environment Variables
Add these to your Vercel project environment variables:

**Required:**
```
CRON_SECRET=your-random-secret-string-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Generate secure CRON_SECRET:
```bash
openssl rand -base64 32
```

### 3. Vercel Deployment
The cron jobs are configured in `vercel.json` and **ONLY run in production environment**:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/daily-penalty-check",
      "schedule": "1 0 * * *"
    }
  ]
}
```

**Important Notes:**
- ⚠️ **Production Only**: Vercel cron jobs only execute on production deployments, never on preview/dev environments
- 📊 **Hobby Plan Limit**: Uses 2/2 allowed cron jobs on Vercel Hobby plan
- 🧪 **Development Testing**: Use manual admin buttons in dev environment for testing
- 🏥 **Backup Controls**: Manual admin buttons remain available for emergency use in production

## How It Works

### Daily Process (00:01 UTC)
1. **Fetch Active Users**: Gets all users who are in groups
2. **Check Rest Days**: Skips penalty for configured rest days
3. **Calculate Targets**: Uses `calculateDailyTarget()` function
4. **Check Performance**: Compares actual points vs target points
5. **Issue Penalties**: If points < target, adds €10 penalty
6. **Update Database**: Records transaction and updates user's total

### Penalty Logic
- **Target Calculation**: Uses same logic as dashboard (weekly vs daily mode)
- **Rest Day Skip**: Automatically skips penalties on rest days
- **Recovery Points**: Includes recovery points in actual total
- **Audit Trail**: All penalties logged with reason and amounts

### Security Features
- **Cron Secret**: Endpoint protected by CRON_SECRET environment variable
- **Service Role**: Uses Supabase service role for admin operations
- **RLS Policies**: Users can only view their own penalty data
- **Error Handling**: Continues processing if individual user fails

## Testing

### Manual Test
You can manually trigger the penalty check:

```bash
curl -X GET https://your-domain.com/api/cron/daily-penalty-check \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Expected Response
```json
{
  "message": "Daily penalty check completed",
  "date": "2024-01-15",
  "usersChecked": 5,
  "penaltiesIssued": 2,
  "penalties": [
    {
      "username": "john_doe",
      "penaltyAmount": 10,
      "target": 30,
      "actual": 15,
      "newTotal": 20
    }
  ]
}
```

## Monitoring

### Check Penalty Status
Group admins can view penalty status in the Group Admin panel under the "Pot" tab.

### Audit Trail
All penalties are logged in the `penalty_logs` table with:
- User ID and Group ID
- Target vs Actual points
- Penalty amount and date
- Automatic reason

### User Balance
User's current penalty balance is stored in `profiles.total_penalty_owed` and displayed on dashboard.

## Manual Adjustments
Group admins can still make manual adjustments which will:
1. Add transaction to `payment_transactions` table
2. Update user's `total_penalty_owed` balance
3. Show in recent activity

## Troubleshooting

### Common Issues
1. **No penalties issued**: Check if users are in groups and have workout data
2. **Wrong amounts**: Verify group `penalty_amount` setting
3. **Cron not running**: Check Vercel cron logs and environment variables
4. **Database errors**: Ensure migration was run and RLS policies are correct
5. **Column does not exist errors**: The migration uses `role` column, not `is_group_admin`/`is_supreme_admin` booleans

### Debug Logs
The cron job logs detailed information including:
- Users checked and skipped
- Target calculations
- Penalty decisions
- Database operations

Check Vercel function logs for debugging information.