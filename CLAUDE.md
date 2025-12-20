# Commitment App - Development Guide

## 🚨 MANDATORY: VERSION BUMP ON EVERY COMMIT TO DEV 🚨

**BEFORE EVERY `git push origin dev`, Claude MUST:**
1. Update version in `package.json` (current: check file)
2. Patch bump (0.5.0 → 0.5.1) for fixes, Minor bump (0.5.0 → 0.6.0) for features
3. Include version bump in the commit

**NO EXCEPTIONS. The user has explicitly requested this.**

---

## Project Overview
Fitness accountability platform with group-based workouts, penalty systems, and social features. 

Mobile PWA: Built as a mobile web app specifically designed to run in PWA mode - all testing should be done in this format.

**Tech Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase, Radix UI

## Critical Deployment Rules

### ⚠️ DEPLOYMENT SCRIPTS - MANDATORY USAGE
- **ALWAYS use `./deploy-dev.sh` for ALL deployments**
- **NEVER use `vercel` commands directly** - they can deploy to the wrong environment
- **Production deployments**: ONLY via `./deploy-mvp.sh` AND requires explicit user permission
- The deployment scripts automatically handle:
  - Linking to the correct Vercel project
  - Building the application
  - Deploying to the correct environment
  - Preventing accidental production deploys

### Environment Details
- **LOCAL**: Run `npm run dev` for local development (default for development)
- **DEV**: commitment-app-dev.vercel.app (for testing deployed builds)
- **PRODUCTION**: commitment-app-mvp.vercel.app (HANDS OFF unless explicitly requested!)
- **DEV PROJECT NAME**: commitment-app-dev
- **PRODUCTION PROJECT NAME**: commitment-app-mvp
- **Git Pre-Commit Hook**: A pre-commit hook is installed at `.git/hooks/pre-commit` that prevents accidental commits to `main` branch without explicit confirmation. See `.git/hooks/README.md` for details.

### Development Workflow
1. Make code changes
2. Test locally with `npm run dev` (default workflow)
3. OPTIONAL: Run `./deploy-dev.sh` to test on commitment-app-dev.vercel.app if needed
4. ONLY if user explicitly requests production: Run `./deploy-mvp.sh` (requires confirmation prompt)

## Penalty System - Manual Operation
- **Cron Jobs DISABLED**: Automatic cron jobs never worked reliably and have been disabled
- **Manual Penalty Check**: Admin must run "Run Penalty Check" button in Settings every day
- **Button Location**: Settings/Profile menu → "Run Penalty Check" (orange button at bottom)
- **What it does**:
  - Checks all members for yesterday's target completion
  - Creates pending penalties for those who missed targets
  - Auto-accepts expired penalties (24h deadline passed)
  - Posts daily summary to group chat
  - Handles sick mode, rest days, and flex rest days
- **Cron API routes**: Still exist in `src/app/api/cron/` but are not triggered automatically

## Project File Structure

```
commitment-app/
├── docs/                              # Documentation
│   └── setup-guides/                  # Setup and migration instructions
│       ├── SETUP_AUTOMATIC_PENALTY_SYSTEM.md
│       ├── SETUP_DAILY_SUMMARY_CRON.md
│       └── MIGRATION_INSTRUCTIONS.md
│
├── scripts/                           # Utility scripts
│   └── migrations/                    # One-time database migration scripts
│       ├── apply-daily-summary-update.js
│       ├── apply-notification-migration.js
│       ├── apply-pending-penalties-migration.js
│       └── ... (other migration scripts)
│
├── src/
│   ├── app/                           # Next.js 15 App Router
│   │   ├── page.tsx                   # Home page (uses NewDashboard)
│   │   ├── dashboard/page.tsx         # Dashboard route
│   │   ├── profile/page.tsx           # Profile/Settings route
│   │   ├── group-admin/page.tsx       # Group admin panel
│   │   ├── admin/                     # Supreme admin routes
│   │   ├── onboarding/                # Onboarding flow
│   │   ├── api/                       # API routes
│   │   │   ├── cron/                  # Cron job endpoints (manual trigger only)
│   │   │   ├── dashboard/             # Dashboard data endpoints
│   │   │   ├── notifications/         # Push notification endpoints
│   │   │   └── penalties/             # Penalty management endpoints
│   │   └── ...
│   │
│   ├── components/
│   │   ├── modals/                    # ⭐ All modal components
│   │   │   ├── WorkoutModal.tsx       # Workout logging modal
│   │   │   ├── DailyRecapHistoryModal.tsx
│   │   │   ├── PenaltyNotificationModal.tsx
│   │   │   ├── PenaltyResponseModal.tsx
│   │   │   ├── PotHistoryModal.tsx
│   │   │   └── SeasonalChampionsHistoryModal.tsx
│   │   │
│   │   ├── dashboard/v2/              # Dashboard v2 components
│   │   │   ├── NewDashboard.tsx       # ⭐ Current active dashboard
│   │   │   ├── SquadMemberRow.tsx
│   │   │   ├── GlassCard.tsx
│   │   │   ├── BottomNavigation.tsx
│   │   │   └── ... (chart & widget components)
│   │   │
│   │   ├── settings/                  # Settings screen sections
│   │   │   ├── ChatSettingsSection.tsx
│   │   │   ├── GroupMembersSection.tsx
│   │   │   ├── GroupSettingsSection.tsx
│   │   │   └── PotManagementSection.tsx
│   │   │
│   │   ├── GroupChat.tsx              # Real-time group messaging
│   │   ├── MobileWorkoutLogger.tsx    # Workout tracking & points entry
│   │   ├── NewMobileProfile.tsx       # Profile/Settings screen
│   │   ├── SystemMessageConfigAdmin.tsx # Supreme admin config
│   │   ├── WeeklyOverperformers.tsx
│   │   ├── SeasonalChampionsWidget.tsx
│   │   └── ... (other shared components)
│   │
│   ├── contexts/                      # React contexts
│   │   ├── AuthContext.tsx
│   │   └── WeekModeContext.tsx
│   │
│   ├── hooks/                         # Custom React hooks
│   │   ├── useProfile.ts
│   │   ├── useDashboardData.ts
│   │   └── useNotifications.ts
│   │
│   ├── utils/                         # ⭐ Shared utility functions
│   │   ├── targetCalculation.ts       # Daily target calculations
│   │   ├── colorUtils.ts              # Color utilities
│   │   ├── colors.ts                  # Color constants
│   │   ├── gradientUtils.ts           # Gradient generation
│   │   ├── penaltyHelpers.ts          # Penalty logic
│   │   ├── seasonHelpers.ts           # Season/week calculations
│   │   ├── supabaseQueries.ts         # Database queries
│   │   └── pwaUtils.ts                # PWA detection utilities
│   │
│   ├── services/                      # Business logic services
│   │   ├── systemMessages.ts
│   │   └── systemMessageConfig.ts
│   │
│   └── lib/                           # Third-party integrations
│       └── supabase.ts                # Supabase client
│
├── public/                            # Static assets
│   └── sw.js                          # Service worker (PWA)
│
├── CLAUDE.md                          # ⭐ This file - development guide
├── CHANGELOG.md                       # Production release history
├── README.md                          # Project documentation
├── package.json                       # Dependencies & version
├── deploy-dev.sh                      # Dev deployment script
└── deploy-mvp.sh                      # Production deployment script
```

## Key File Locations

### Primary Screens
- **Home/Dashboard**: `src/app/page.tsx` → Uses `NewDashboard` component
- **Dashboard Route**: `src/app/dashboard/page.tsx` → Also uses `NewDashboard`
- **Profile/Settings**: `src/app/profile/page.tsx` → Uses `NewMobileProfile`
- **Group Admin**: `src/app/group-admin/page.tsx`
- **Supreme Admin**: `src/app/admin/page.tsx`
- **Onboarding**: `src/app/onboarding/`

### Core Components
- **NewDashboard** (`src/components/dashboard/v2/NewDashboard.tsx`) - Current active dashboard
- **WorkoutModal** (`src/components/modals/WorkoutModal.tsx`) - Workout logging modal
- **GroupChat** (`src/components/GroupChat.tsx`) - Real-time messaging
- **NewMobileProfile** (`src/components/NewMobileProfile.tsx`) - Profile/Settings screen
- **MobileWorkoutLogger** (`src/components/MobileWorkoutLogger.tsx`) - Workout tracking
- **SystemMessageConfigAdmin** (`src/components/SystemMessageConfigAdmin.tsx`) - Supreme admin config

### Important: Where to Find Things
- **All modals**: `src/components/modals/` (WorkoutModal, PenaltyResponseModal, etc.)
- **Dashboard components**: `src/components/dashboard/v2/` (NewDashboard, SquadMemberRow, etc.)
- **Settings sections**: `src/components/settings/` (GroupMembersSection, PotManagementSection, etc.)
- **Utility functions**: `src/utils/` (targetCalculation, colorUtils, penaltyHelpers, etc.)
- **Migration scripts**: `scripts/migrations/` (apply-*.js files)
- **Documentation**: `docs/setup-guides/` (setup and migration guides)

### Data Architecture
- **Primary workout data table**: `logs` (NOT `workout_logs`)
- **Squad status**: Uses API route `/api/dashboard/squad-status` with service role key to bypass RLS
- **Recovery capping**: 25% max recovery points on non-recovery days
- **Individual targets**: Each user has their own target based on `week_mode` (sane/insane)
- **Sick mode**: Users in sick mode show "sick" badge, targets adjusted accordingly

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

### Dev Branch Workflow
1. Create feature branch from `dev`
2. **MANDATORY VERSION BUMP**: Before every dev deployment, increment version in `package.json`
   - Bug fixes: `0.1.2` → `0.1.3` (patch)
   - Features: `0.1.x` → `0.2.0` (minor)
   - Breaking changes: `0.x.x` → `1.0.0` (major)
3. Run `npm run lint` and `npm run build`
4. Deploy and test on commitment-app-dev.vercel.app
5. **PWA Testing**: Always test in actual PWA mode (add to home screen), not just responsive browser
6. **Cache Issues**: Bump service worker cache version (sw.js) if layout changes don't appear in PWA
7. As you work, update `CHANGELOG.md` "Unreleased" section with your changes
8. Never push to live unless specifically instructed

### Production Release Workflow

**IMPORTANT**: CHANGELOG.md tracks PRODUCTION RELEASES ONLY (not every dev version)

When ready to deploy to production:

1. **Prepare Release** - Run the helper script:
   ```bash
   ./prepare-release.sh
   ```
   This script will:
   - Verify you're on the correct branch
   - Show current version and unreleased changes
   - Update CHANGELOG.md (move "Unreleased" to versioned section with date)
   - Create git tag for the release
   - Show next steps

2. **Review and Push**:
   ```bash
   git show HEAD                    # Review the changelog commit
   git push origin dev              # Push to dev branch
   git push origin v0.x.x           # Push the version tag
   ```

3. **Deploy to Production**:
   ```bash
   git checkout main
   git merge dev
   git push origin main
   ./deploy-mvp.sh                  # Requires confirmation prompt
   ```

4. **Start Next Version**:
   ```bash
   git checkout dev
   # Update version in package.json to next version
   # Start adding changes to CHANGELOG.md "Unreleased" section
   ```

### CHANGELOG.md Guidelines

- **Update during development**: Add changes to "Unreleased" section as you work
- **Categories**:
  - **Added**: New features
  - **Changed**: Changes to existing functionality
  - **Fixed**: Bug fixes
  - **Removed**: Removed features
  - **Security**: Security fixes
  - **Technical**: Internal improvements (optional)
- **Be specific**: Write clear, user-friendly descriptions
- **Think stakeholders**: Changelog is for sharing with non-technical users
- **Only production**: Don't document every dev version, only what goes live

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