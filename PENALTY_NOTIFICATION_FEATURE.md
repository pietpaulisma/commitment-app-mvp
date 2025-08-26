# Penalty Notification Feature

## Overview
Users who receive penalties for missing their workout targets will see a popup notification the first time they open the app the next day.

## How It Works

### 🔍 **Detection Logic**
- Checks for penalties from the previous day when dashboard loads
- Also catches automatic penalties issued by cron job early in the morning (00:01-06:00 AM) 
- Uses localStorage to prevent showing the same penalty notification multiple times

### 📱 **User Experience**
1. **Trigger**: User opens app after receiving a penalty the previous day
2. **Display**: Modal popup with penalty details appears immediately
3. **Content**: Shows penalty amount, missed target vs actual points, motivational message
4. **Action**: User clicks "I Understand" to dismiss
5. **Prevention**: Won't show again for the same penalty day

### 🎨 **Design Features**
- **Warning Theme**: Red/orange color scheme to indicate penalty
- **Clear Information**: Shows penalty amount prominently (€10)
- **Performance Breakdown**: Displays target points vs actual points achieved  
- **Date Context**: Shows which day the penalty was for
- **Motivational Message**: Encourages consistency to avoid future penalties
- **App-Consistent Styling**: Matches overall app design with dark theme

### 🔧 **Technical Implementation**

#### Components
- `PenaltyNotificationModal.tsx`: Main modal component
- `usePenaltyNotification()`: Hook for penalty detection and modal state

#### Key Features
- **Smart Detection**: Finds penalties from yesterday or early morning automatic penalties
- **LocalStorage Tracking**: Prevents duplicate notifications with key format: `penalty_notification_shown_{date}_{userId}`
- **Robust Parsing**: Extracts target/actual points from penalty descriptions with fallbacks
- **Error Handling**: Graceful failure if database queries fail

#### Integration
- Integrated into `RectangularDashboard.tsx`
- Loads automatically when dashboard mounts
- Non-blocking - doesn't interfere with other dashboard functionality

### 🚦 **States**

#### When Notification Shows
- ✅ User received a penalty yesterday
- ✅ First time opening app since penalty was issued
- ✅ Haven't seen notification for this specific penalty date

#### When Notification Doesn't Show  
- ❌ No penalties from yesterday
- ❌ Already shown notification for this penalty date
- ❌ Database query errors (fail silently)

### 📊 **Example Flow**
1. **Day 1, 11:59 PM**: User misses workout target (e.g., 15/30 points)
2. **Day 2, 12:01 AM**: Cron job issues €10 penalty automatically
3. **Day 2, 8:00 AM**: User opens app → Penalty notification appears
4. **Day 2, 2:00 PM**: User opens app again → No notification (already shown)
5. **Day 3**: User opens app → No notification (different day)

### 🔒 **Privacy & Storage**
- Uses browser localStorage only (no server-side tracking)
- Only stores notification display status, not penalty details
- Automatically cleans up old entries (localStorage clears over time)

This feature provides immediate accountability feedback while maintaining a positive user experience through clear communication and preventing notification fatigue.