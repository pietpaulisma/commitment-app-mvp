# Commitment App - Development Guide

## Project Overview
Fitness accountability platform with group-based workouts, penalty systems, and social features. 

Mobile PWA: Built as a mobile web app specifically designed to run in PWA mode - all testing should be done in this format.

**Tech Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase, Radix UI

## Critical Deployment Rules
- **NEVER DEPLOY TO PRODUCTION** without explicit user permission
- **ALWAYS DEPLOY TO DEV ONLY**: commitment-app-dev.vercel.app
- **PRODUCTION IS**: commitment-app-mvp.vercel.app (HANDS OFF!)
- **DEV PROJECT NAME**: commitment-app-dev
- **PRODUCTION PROJECT NAME**: commitment-app-mvp
- Use `vercel link --project=commitment-app-dev --scope=pietpaulismas-projects` to link to dev
- Before any deployment, ALWAYS confirm the target URL with the user first
- Local development disabled - all changes must be deployed to test

## Cron Jobs (Production Only)
- **Vercel Cron Jobs**: Only execute on production deployments (commitment-app-mvp)
- **Dev Environment**: No automatic cron execution - use manual admin buttons for testing
- **Current Setup**: 2/2 cron jobs on Hobby plan (daily-summary at 08:00 UTC, penalty-check at 00:01 UTC)
- **Manual Controls**: "Send Yesterday's Summary" and other admin buttons available for development and emergency use

## Key File Locations

### Primary Screens
- **Dashboard**: `src/app/dashboard/page.tsx` (`RectangularDashboard`)
- **Workout**: `src/app/workout/page.tsx` (`MobileWorkoutLogger`) 
- **Group Admin**: `src/app/group-admin/page.tsx`
- **Supreme Admin**: `src/app/admin/page.tsx`
- **Onboarding**: `src/app/onboarding/`

### Core Components
- `RectangularDashboard` - Main dashboard
- `MobileWorkoutLogger` - Workout tracking & points entry
- `GroupChat` - Real-time messaging (embedded in dashboard)
- `SystemMessageConfigAdmin` - Supreme admin config

## Coding Standards
- Functional components with TypeScript
- Tailwind CSS for styling
- PascalCase for components, camelCase for hooks/utils
- Proper error handling and loading states
- Mobile-first responsive design
- **PWA Safe Areas**: Avoid double `env(safe-area-inset-*)` handling (wrapper OR inner, not both)

## PWA Header Height Issues - CRITICAL TROUBLESHOOTING
**Problem**: Headers appearing thick/double height in PWA mode only
**Root Cause**: Adding safe-area-inset to height calculations causes expansion in PWA

### Solution Pattern:
```tsx
// ❌ WRONG - Causes thick headers in PWA:
style={{ minHeight: 'calc(64px + env(safe-area-inset-top))' }}

// ✅ CORRECT - Use fixed height classes:
className="h-16"  // 64px fixed height
```

### Key Lesson Learned:
- **Safe-area should only affect POSITIONING, not HEIGHT**
- **Parent wrapper handles safe-area** with `paddingTop: 'env(safe-area-inset-top)'`
- **Child components use fixed heights** (`h-16`, `h-full`, etc.)
- **Architecture matters**: Workout is a MODAL (`WorkoutModal.tsx`), not a page

### Fixed in v0.1.6:
- WorkoutModal header: Removed `calc(64px + env(safe-area-inset-top))` → Added `h-16`
- Any component with thick PWA headers should follow this pattern

## Function Organization
- **Shared utilities**: Use existing `src/utils/` directory (targetCalculation, colorUtils, supabaseQueries, etc.)
- **UI utilities**: Use `src/components/ui/utils.ts` 
- **Component-specific helpers**: Keep in component file only if truly component-specific
- **Always prefer**: Modifying existing utility files over creating new ones or duplicating functions

## Database
- Supabase with Row Level Security (RLS)
- Handle real-time subscriptions properly
- Use TypeScript types for schemas

## Push Notifications - CRITICAL FIXES

### Apple Web Push Service VAPID Email Format (FIXED v0.2.26)
**Problem**: iOS PWA notifications failing with "Received unexpected response code" from Apple Web Push Service
**Root Cause**: VAPID email format with space after "mailto:" causes Apple to reject authentication with "BadJwtToken" error

**Solution Pattern**:
```typescript
// ❌ WRONG - Causes Apple Web Push authentication failure:
webpush.setVapidDetails(
  'mailto:' + process.env.VAPID_EMAIL,  // Space can cause "BadJwtToken"
  publicKey,
  privateKey
)

// ✅ CORRECT - Apple-compatible VAPID email format:
const vapidEmail = (process.env.VAPID_EMAIL || 'admin@commitment-app.com').trim()
const vapidSubject = `mailto:${vapidEmail}`  // No spaces after mailto:
webpush.setVapidDetails(vapidSubject, publicKey, privateKey)
```

**Key Requirements**:
- **VAPID email MUST be properly formatted**: `mailto:email@domain.com` (no spaces)
- **Apple Web Push Service is stricter** than Google FCM about VAPID format
- **Always trim environment variables** to remove whitespace/newlines
- **Apple notifications require**: TTL: 3600, urgency: 'high', no topic

**Files Fixed**:
- `src/app/api/notifications/send/route.ts`
- `src/app/api/notifications/test-apple/route.ts`

**Working Status**: ✅ iOS PWA notifications now working alongside desktop notifications

## Testing
```bash
npm run test        # Playwright E2E tests
npm run build       # Required before deployment
npm run lint        # Code quality check
```

## Development Workflow
1. Create feature branch from `dev`
2. **MANDATORY VERSION BUMP**: Before every dev deployment, increment version in `package.json`
   - Bug fixes: `0.1.2` → `0.1.3` (patch)
   - Features: `0.1.x` → `0.2.0` (minor)
   - Breaking changes: `0.x.x` → `1.0.0` (major)
3. Run `npm run lint` and `npm run build`
4. Deploy and test on commitment-app-dev.vercel.app
5. **PWA Testing**: Always test in actual PWA mode (add to home screen), not just responsive browser
6. **Cache Issues**: Bump service worker cache version (sw.js) if layout changes don't appear in PWA
7. Never push to live unless specifically instructed

## Version Tracking
- **Version Display**: Located at bottom of Settings/Profile screen
- **Current Dev Version**: Check `package.json` or Settings screen
- **Purpose**: Easily verify which version is deployed in PWA mode
- **Location**: `src/components/NewMobileProfile.tsx` imports from `package.json`

### Claude Version Bump Process
**BEFORE EVERY DEV DEPLOYMENT, Claude must:**
1. Check current version in `package.json`
2. Determine bump type:
   - **Bug fix/styling fix**: Patch bump (0.1.2 → 0.1.3)
   - **New feature/component**: Minor bump (0.1.x → 0.2.0)
   - **Breaking change**: Major bump (0.x.x → 1.0.0)
3. Update version in `package.json`
4. Proceed with build and deployment
5. Confirm version display works in Settings screen

**Example Commands for Claude:**
```bash
# Check current version
cat package.json | grep version

# After manual edit of package.json:
npm run build
vercel deploy --dev
```