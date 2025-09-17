# Push Notification System Implementation

This document describes the comprehensive push notification system implemented for the Commitment Fitness App.

## Overview

The notification system provides real-time push notifications for:
- **Chat Messages**: When someone sends a message in the group chat
- **Workout Completions**: When group members complete their workouts
- **Group Achievements**: Future feature for group milestones

## Architecture

### Frontend Components
- **NotificationService** (`src/services/notificationService.ts`): Core service managing subscriptions and preferences
- **NotificationSettings** (`src/components/NotificationSettings.tsx`): User interface for managing notification preferences
- **useNotifications** (`src/hooks/useNotifications.ts`): React hook for notification management

### Backend Components
- **Send API Route** (`src/app/api/notifications/send/route.ts`): Handles sending push notifications
- **Service Worker** (`public/sw.js`): Enhanced with push notification handling
- **Database Schema** (`notification_system_schema.sql`): Tables for subscriptions and preferences

### Integration Points
- **GroupChat** (`src/components/GroupChat.tsx`): Triggers notifications for new chat messages
- **WorkoutModal** (`src/components/WorkoutModal.tsx`): Triggers notifications for workout completions
- **Profile Settings** (`src/components/NewMobileProfile.tsx`): Access to notification settings

## Database Schema

### Push Subscriptions Table
```sql
CREATE TABLE push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);
```

### Notification Preferences Table
```sql
CREATE TABLE notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    chat_messages BOOLEAN DEFAULT TRUE,
    workout_completions BOOLEAN DEFAULT TRUE,
    group_achievements BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install web-push
npm install --save-dev @types/web-push
```

### 2. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

### 3. Environment Variables

Add the following to your `.env.local`:

```env
# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=mailto:your_email@domain.com

# Site URL for API calls (production URL)
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### 4. Database Setup

Run the SQL schema from `notification_system_schema.sql` in your Supabase database.

### 5. Deploy and Test

1. Deploy the app to your hosting platform
2. Test notification permissions in a PWA environment
3. Verify push notifications work across different devices

## Service Worker Features

The enhanced service worker (`public/sw.js`) includes:

### Push Event Handling
- Receives push messages from the server
- Displays notifications with custom styling
- Handles different notification types (chat, workout, etc.)

### Notification Actions
- **Chat Messages**: Reply, Open Chat
- **Workout Completions**: View Workout, Add Reaction
- **Group Achievements**: View Dashboard

### Notification Click Handling
- Opens the app if closed
- Navigates to relevant sections if app is open
- Focuses existing app windows when possible

### Background Sync
- Queues notifications when offline
- Processes queued notifications when back online

## User Experience

### Notification Permission Flow
1. User visits notification settings
2. System checks browser support and current permissions
3. User can enable notifications with clear explanation
4. Granular preferences available after enabling

### Notification Types

#### Chat Messages
- **Title**: "{SenderName} in {GroupName}"
- **Body**: Message content (truncated if long)
- **Actions**: Reply, Open Chat
- **Data**: Message ID, Group ID, Sender info

#### Workout Completions
- **Title**: "🔥 {UserName} in {GroupName}" (emoji varies by achievement)
- **Body**: "{achievement text} - {points} points earned!"
- **Actions**: View Workout, Add Reaction
- **Data**: Workout details, achievement level

### Quiet Hours
- Users can set quiet hours (default: 10 PM - 8 AM)
- Notifications are suppressed during these hours
- Configurable start and end times

## Technical Details

### Permission Handling
- Checks browser support (`'serviceWorker' in navigator`)
- Requests notification permission gracefully
- Handles denied permissions with helpful instructions

### Subscription Management
- Automatic subscription renewal
- Handles expired/invalid subscriptions
- Clean removal when unsubscribing

### Error Handling
- Graceful fallbacks for unsupported browsers
- Non-blocking errors (chat/workouts work without notifications)
- Automatic cleanup of invalid subscriptions

### Security
- VAPID keys for authenticated push messages
- Row Level Security (RLS) on all notification tables
- Service role access for sending notifications

### Performance
- Efficient batching of notifications
- Debounced preference updates
- Background processing for offline scenarios

## Testing

### Manual Testing
1. **Browser Support**: Test in Chrome, Firefox, Safari, Edge
2. **PWA Mode**: Install app and test notifications in PWA
3. **Permission States**: Test grant, deny, and default states
4. **Notification Types**: Send chat messages and complete workouts
5. **Quiet Hours**: Test during and outside quiet hours
6. **Settings**: Verify all preference changes work correctly

### Automated Testing Suggestions
- Unit tests for NotificationService methods
- Integration tests for API routes
- Service worker notification handling tests
- Database constraint and RLS policy tests

## Troubleshooting

### Common Issues

#### Notifications Not Working
1. Check browser support and permissions
2. Verify VAPID keys are correctly set
3. Ensure service worker is properly registered
4. Check console for error messages

#### Permission Denied
1. Users need to manually enable in browser settings
2. Provide clear instructions in the UI
3. Check if site is HTTPS (required for notifications)

#### Service Worker Issues
1. Clear browser cache and reload
2. Check Network tab for service worker errors
3. Verify service worker cache version is updated

#### Database Errors
1. Verify RLS policies are correctly set
2. Check that user has proper authentication
3. Ensure foreign key constraints are satisfied

## Future Enhancements

### Planned Features
1. **Group Achievement Notifications**: Milestone celebrations
2. **Penalty Reminders**: Daily target reminders
3. **Workout Streaks**: Streak maintenance notifications
4. **Custom Notification Sounds**: Per-notification-type sounds
5. **Rich Media**: Images in workout completion notifications

### Advanced Features
1. **Notification Scheduling**: Send reminders at specific times
2. **A/B Testing**: Test different notification styles
3. **Analytics**: Track notification engagement
4. **Batch Notifications**: Digest notifications for high-activity groups
5. **Push to Multiple Devices**: Handle users with multiple devices

## Maintenance

### Regular Tasks
1. **Cleanup Invalid Subscriptions**: Run cleanup function monthly
2. **Monitor Push Success Rates**: Track delivery and engagement
3. **Update Service Worker**: Bump cache version when needed
4. **Review User Preferences**: Analyze opt-out patterns

### Monitoring
- Track push notification delivery rates
- Monitor service worker error rates
- Analyze user engagement with notifications
- Watch for browser compatibility issues

---

## Quick Start Checklist

- [ ] Install dependencies (`web-push`, `@types/web-push`)
- [ ] Generate VAPID keys
- [ ] Set environment variables
- [ ] Run database schema migration
- [ ] Test in PWA mode
- [ ] Verify notifications work across devices
- [ ] Deploy to production
- [ ] Enable cron jobs if applicable

For technical support or questions, refer to the implementation files or create an issue in the project repository.