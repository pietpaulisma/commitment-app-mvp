# Penalty System Setup Instructions

## 1. Database Setup

Run the SQL migration file to add penalty tracking:

```bash
# Execute this SQL file in your Supabase dashboard
/add_penalty_tracking.sql
```

This will:
- Add `total_penalty_owed` and `last_penalty_check` columns to profiles table
- Create `penalty_logs` table for audit trail
- Set up proper RLS policies

## 2. Environment Variables

Add these environment variables to your Vercel project:

### Required for Cron Job Security
```
CRON_SECRET=your-random-secret-string-here
```

Generate a secure random string for CRON_SECRET:
```bash
openssl rand -base64 32
```

### Required for Admin Database Operations
```
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

This should be the service role key (not anon key) from your Supabase project settings.

## 3. Cron Job Schedule

The system is configured to run daily at 00:01 (1 minute past midnight) UTC.

- **Schedule**: `1 0 * * *` (every day at 00:01 UTC)
- **Endpoint**: `/api/cron/daily-penalty-check`
- **Function**: Checks previous day's performance and issues €10 penalties for missed targets

## 4. Testing

You can manually test the penalty system by making a GET request to:
```
https://your-domain.com/api/cron/daily-penalty-check
```

Include the authorization header:
```
Authorization: Bearer YOUR_CRON_SECRET
```

## 5. How It Works

1. **Daily Check**: At 00:01 UTC, system checks all users' performance from previous day
2. **Rest Day Skip**: Automatically skips penalty on configured rest days
3. **Target Calculation**: Uses proper daily target calculation (sane mode as minimum)
4. **Penalty Logic**: If actual points < target points → €10 penalty
5. **Audit Trail**: All penalties logged in `penalty_logs` table
6. **Debt Tracking**: Running total maintained in `total_penalty_owed` field

## 6. Manual Payment Processing

### Option A: Manual Database Update
When users pay their penalties:
1. Update `last_donation_date` in profiles table
2. Reduce `total_penalty_owed` by payment amount
3. This will update the "days since donation" counter

### Option B: API Endpoint (Available)
Use the payment recording API endpoint:

```bash
POST /api/payment/record
Content-Type: application/json
Authorization: Bearer <user-session-token>

{
  "amount": 20.00
}
```

This endpoint:
- Verifies user authentication
- Updates `total_penalty_owed` and `last_donation_date`
- Returns payment confirmation and remaining debt
- Prevents overpayment (limits to current debt amount)

## 7. Security Features

- Cron endpoint protected by secret token
- RLS policies prevent users from manipulating penalty data
- Only system can insert penalty logs
- Users can only view their own penalty history
- Group admins can view group penalty data