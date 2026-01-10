# Changelog

All notable changes to this project will be documented in this file.

This changelog tracks **PRODUCTION RELEASES ONLY** (not dev deployments).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

---

## [0.6.14] - 2026-01-10

### Fixed
- **Squad Status Percentage Mismatch**: Fixed bug where workout log modal showed different percentage (e.g., 105%) than dashboard (e.g., 110%) for the same user. The squad status API was using a hardcoded "insane" mode for recovery capping instead of each member's actual mode.
- **Progress Bar Overflow**: Fixed squad status progress bars overlapping when users exceeded 100% by large amounts (e.g., 267%). Bars now cap at 100% width with a shimmer effect to indicate overperformance.

---

## [0.6.13] - 2026-01-09

### Fixed
- **Penalty System Restored**: Fixed critical bug where penalty popup wasn't appearing - the `auto-create` endpoint was querying non-existent columns (`rest_day_1`, `rest_day_2`) from the `groups` table
- **Push Notifications Fixed**: Fixed notifications not being delivered - API routes were trying to select a `subscription` column that doesn't exist (should be `endpoint`, `p256dh`, `auth`)
- **Cron Job Column Fix**: Fixed daily-recap cron job with same non-existent column issue

### Technical
- Added detailed step-by-step logging to `auto-create` endpoint for easier debugging
- Enabled `SUPABASE_SERVICE_ROLE_KEY` environment variable for Preview deployments

---

## [0.6.12] - 2026-01-09

### Fixed
- **API Runtime 500 Errors**: Fixed module-scope environment variable reads that caused 500 errors on `/api/penalties/auto-create`, `/api/penalties/my-pending`, and `/api/dashboard/squad-status`

### Added
- **Unified Daily Recap Cron**: Single cron job (`/api/cron/daily-recap`) that runs at 00:00 to check workouts, create penalties, auto-accept expired penalties, and post summary to chat

---

## [0.6.11] - 2026-01-09

### Fixed
- **Penalty Auto-Create Bug**: Fixed issue where penalties weren't being created when `group_settings` table had no row for the group - now properly falls back to `groups` table for rest days and penalty amount
- **Existing Penalty Check**: Changed `.single()` to `.maybeSingle()` to prevent silent errors when checking for existing penalties
- **Improved Logging**: Added comprehensive logging throughout the penalty auto-create flow to help diagnose issues

---

## [0.6.10] - 2026-01-07

### Fixed
- **Settings Screen Redirect**: Fixed race condition where users were briefly redirected to onboarding when accessing settings/profile
- **Workout Progress Percentage**: Fixed mismatch between workout screen and dashboard percentages for users in "sane" mode (weekly progression)

---

## [0.6.8] - 2026-01-07

### Added
- **Global Error Boundary**: Added error screen with "Report Error to Developers" button that sends crash details to `/admin/error-logs`
- **Error Capture System**: Captures console errors before crashes for better debugging
- **75% Recovery Marker**: Added subtle dotted line at 75% mark in workout input header to indicate recovery threshold
- **Recovery Marker Icon**: Small heal/plus icon at the bottom of the 75% marker for visual clarity
- **Dashboard Stats**: Added "Most Popular Exercise" widget showing the most logged exercise of the week for both Group and Personal views
- **Time Period Selectors**: Added clickable time period cycling (TODAY → THIS WEEK → THIS MONTH → THIS YEAR) for:
  - Group Favorite / Your Top Exercise widget (default: TODAY)
  - Overperformers widget (default: THIS WEEK)
  - Peak Time widget (default: TODAY)
- **Season Champions History**: Added History button with improved modal showing only seasons with actual data

### Fixed
- **Mobile Navigation**: Fixed Profile button being hidden in portrait mode for regular users (5 items weren't fitting in 4-column grid)
- **Chat Unread Indicator**: Fixed always-green pulsing indicator - now properly tracks unread messages using localStorage
- **Chat Unread Indicator**: Changed from pulsing dot to subtle green glow on the entire chat button for better visibility
- **Chat Unread Indicator**: Indicator now correctly disappears after opening and viewing the chat

### Changed
- **HEAL Section Icon**: Changed HEAL category icon from smiley to green cross/plus for better visual consistency
- **Overperformers Widget**: Renamed from "Weekly Overperformers" to just "Overperformers" (time period shown on right)
- **Peak Time Widget**: Simplified title from "Peak Time: 9PM" to just "Peak Time"
- **Season Champions Widget**: Renamed from "SEASON WINNERS 2025" to "Season Champions"
- **Clickable Indicators**: Added subtle border/background styling to all clickable time period selectors for better affordance

### Technical
- **Project Cleanup**: Removed 17 orphaned/legacy files (~4,500 lines), reorganized file structure with dedicated folders for modals, scripts, and documentation
- **File Structure**: Added comprehensive file structure map to CLAUDE.md for easier navigation
- **Time Period Utilities**: Created `src/utils/timePeriodHelpers.ts` with reusable date range calculations

---

## [0.6.6] - 2026-01-06

### Fixed
- **Penalty Auto-Accept Bug**: Fixed critical bug where expired penalties were never auto-accepted because the API blocked all responses after deadline (now only blocks disputes, allows accepts)
- **Penalty Modal Accidental Dismissal**: Removed backdrop click dismissal - users can no longer accidentally close the penalty modal by tapping outside it
- **Penalty Modal Persistence**: Added visibility change listener so the penalty modal re-appears when users return to the app after dismissing it

### Technical
- **Improved Logging**: Added comprehensive `[PenaltyAutoChecker]` console logs for debugging penalty creation and auto-accept flows

---

## [0.4.45] - 2025-11-26

### Fixed
- **Daily Recap History**: Fixed data inaccuracy by using local dates instead of UTC
- **UX**: Redesigned history view to be a vertical scrolling feed of detailed daily recaps (Made It / Missed / Sick)

---

## [0.4.44] - 2025-11-26

### Fixed
- **Daily Recap History**: Fixed modal rendering issue by using Portal (now truly full-screen/overlay) and improved styling to match Pot History

---

## [0.4.43] - 2025-11-26

### Added
- **Daily Recap**: Added full-screen history modal (replacing arrow navigation) for better overview of past days

---

## [0.4.42] - 2025-11-26

### Fixed
- **Daily Recap**: Fixed inaccurate points display by pointing to correct `workout_logs` table
- **Penalty System**: Fixed 500 error and missing penalties by using correct table and improving recovery exercise detection
- **Daily Recap**: Added history navigation (Previous/Next day buttons)

---

## [0.4.41] - 2025-11-26

### Fixed
- **Workout Input UI**: Restored visibility of "-" and "+" buttons for workout counter (now always visible instead of hover-only)

---

## [0.4.40] - 2025-11-26

### Fixed
- **Workout Input UI**: Fixed application crash when viewing completed exercises with missing exercise data (added null check to icon renderer)

---

## [0.4.39] - 2025-11-26

### Fixed
- **Workout Input UI**: Fixed workout deletion (trash button) not working
- **Workout Input UI**: Fixed flexible rest day and slider submission logic to use correct table and schema

---

## [0.4.38] - 2025-11-26

### Fixed
- **Workout Input UI**: Fixed daily progress and workout list not updating by removing invalid database joins and using local state for exercise data mapping

---

## [0.4.37] - 2025-11-26

### Fixed
- **Workout Input UI**: Fixed critical bug where workouts were saving to incorrect table (`logs` instead of `workout_logs`), causing PRs to not update
- **Workout Input UI**: Enhanced debug logging for workout submission

---

## [0.4.36] - 2025-11-25

### Added
- **Workout Input UI**: Added temporary "Debug" button to inspect raw workout logs and verify data persistence

---

## [0.4.35] - 2025-11-25

### Fixed
- **Workout Input UI**: Fixed Personal Record (PR) not updating after workout submission
- **Workout Input UI**: Fixed PR fetching logic for time-based exercises (fetching duration instead of count)

---

## [0.4.34] - 2025-11-25

### Changed
- **Workout Input UI**: Refined weight selection to a single-row connected grid (up to 35kg)
- **Workout Input UI**: Added "No PR" indicator for better debugging of personal record display
- **Workout Input UI**: Removed horizontal scrolling from weight selection

---

## [0.4.33] - 2025-11-25

### Changed
- **Workout Input UI**: Added dynamic header that updates remaining points in real-time
- **Workout Input UI**: Added visual progress bar showing daily progress + current input
- **Workout Input UI**: Redesigned Weight Selection to match Counter card style (Top Display + Horizontal Scroll)

---

## [0.4.32] - 2025-11-25

### Changed
- **Workout Input UI**: Merged number display and increment buttons into a single cohesive card
- **Workout Input UI**: Improved label visibility and positioning ("REPS" inside display)
- **Workout Input UI**: Added debug logging for data troubleshooting

---

## [0.4.31] - 2025-11-25

### Changed
- **Workout Input UI**: Redesigned header with large title, gradient points pill, and Personal Record (PR) display
- **Workout Input UI**: Added explicit labels for "reps/mins" and "Weight Multiplier"
- **Workout Input UI**: Moved close button to standalone position

---

## [0.4.30] - 2025-11-24

### Changed
- **Workout Input UI**: Replaced static gradient with dynamic `TimeGradient` to match dashboard aesthetic (changes based on time of day)

---

## [0.4.29] - 2025-11-24

### Changed
- **Workout Input UI**: Significantly increased background gradient opacity for better visibility

---

## [0.4.28] - 2025-11-24

### Changed
- **Workout Input UI**: Added vibrant gradient background for more visual appeal
- **Workout Input UI**: Reduced excessive whitespace while maintaining visual hierarchy
- **Workout Input UI**: Optimized font sizes and spacing for tighter, more polished design

---

## [0.4.27] - 2025-11-24

### Fixed
- **Global CSS**: Removed CSS rule that was forcing all buttons to be square, overriding Tailwind rounded classes

---

## [0.4.26] - 2025-11-24

### Fixed
- **Workout Input UI**: Fixed weight selection buttons not displaying rounded corners (removed conflicting CSS class)

---

## [0.4.25] - 2025-11-24

### Changed
- **Workout Input UI**: Polished workout input screen with mode-colored submit button (blue for sane, red for insane)
- **Workout Input UI**: Made all buttons more rounded (circular X button, rounded increment/weight buttons)
- **Workout Input UI**: Improved weight selection button visual styling
- **Workout Input UI**: Header now shows remaining points to reach daily target instead of current workout points

---

## [0.4.24] - 2025-11-24

### Fixed
- **Flexible Rest Day**: Logic now correctly requires double the *Insane* target (not Sane) to earn a rest day on Mondays.
- **Penalty Popup**: Improved reliability by fixing race conditions and timezone handling.
- **Code Cleanup**: Removed unused files, optimized console logs, and resolved TypeScript lint errors.

### Changed
- **Flexible Rest Day**: Button now explicitly states it uses the current mode's points.

---

## [Unreleased]

### Added
- **Dashboard v2**: Complete redesign of dashboard with glassmorphism aesthetic and modern visual language
- **Dashboard v2**: New modular component system (GlassCard, CardHeader, SquadMemberRow, etc.)
- **Dashboard v2**: New bottom navigation bar with prominent "Log Workout" button and chat access
- **Dashboard v2**: Personal vs Group view toggle for all statistics
- **Dashboard v2**: Personal overperformance chart showing daily target vs actual points
- **Dashboard v2**: Peak workout time visualization with hourly distribution chart
- **Dashboard v2**: Live countdown timer showing time remaining in day
- **Dashboard v2**: Days Since Start counter (replacing days remaining for clearer progress tracking)
- **Dashboard v2**: Dynamic squad status with circular progress indicators
- **Dashboard v2**: Inline pot history and last contribution cards
- **Dashboard v2**: Yesterday's recap widget with Made It/Pending/Sick status
- **Dashboard v2**: Integrated Weekly Overperformers and Seasonal Champions widgets
- **LogWorkoutOverlay**: New full-screen workout logging interface with modern design
- **LogWorkoutOverlay**: Completed exercise cards showing logged workouts for today
- **LogWorkoutOverlay**: Standard exercise grid with searchable exercise selection

### Changed
- **Dashboard Design**: Module 1 - Redesigned top section with time remaining and days counter
- **Dashboard Design**: Module 2 - Redesigned squad member rows with circular progress and live indicators
- **Dashboard Design**: Module 3 - Enhanced Group Points card with average points per person
- **Dashboard Design**: Module 4 - Redesigned birthday countdown component with gradient background
- **Dashboard Design**: Module 5 - Condensed pot history layout for better space utilization
- **Typography**: Updated font weights to bold/black for better hierarchy throughout dashboard
- **Color System**: Replaced gray backgrounds with black + opacity for glassmorphism effect
- **Borders**: Unified border styling using white/10% opacity across all components
- **Spacing**: Increased padding and improved visual breathing room (px-5 py-4 standard)
- **Group Chat UI**: Applied v2 design system with glassmorphism effects to match dashboard aesthetic
- **Group Chat UI**: Updated header with rounded icon container, backdrop blur, and bold typography
- **Group Chat UI**: Redesigned input area with rounded pill shape, subtle borders, and enhanced send button with orange gradient glow
- **Group Chat UI**: Modernized day dividers and all UI elements with semi-transparent black backgrounds and white borders
- **Group Chat UI**: Completely redesigned message bubbles with 2rem rounded corners, removed traditional tails
- **Group Chat UI**: Updated message colors - `bg-[#111]` for received, enhanced orange gradient with glow for sent
- **Group Chat UI**: Improved message spacing, typography, and reaction button styling
- **Group Chat UI**: Enhanced avatars with borders and increased size for better visibility
- **Group Chat UI**: Improved overall visual consistency between dashboard and chat interface
- **Workout Summary**: Redesigned for chat efficiency - strictly shows exercises, quantities, and completion percentage
- **Workout Summary**: Removed points display and expandable details toggle for cleaner, direct information flow
- **Workout Summary**: Improved layout alignment and readability within chat bubbles
- **Group Chat UI**: Replaced emoji avatars with minimal 4-letter name codes (all caps, squad-style)
- **Group Chat UI**: Removed sender name from inside message bubbles for cleaner look
- **Group Chat UI**: Simplified avatar area by removing background colors and icons
- **Group Chat UI**: Increased visibility of avatar name codes (white, bold, drop shadow)
- **Group Chat UI**: Implemented sticky date headers for easier timeline navigation
- **Group Chat UI**: Redesigned header to be cleaner, text-only, and all-caps matching dashboard style
- **Group Chat UI**: Polished message input area with integrated send button and file picker
- **Workout Summary**: Standardized card styling to match chat bubbles (bg-[#1a1a1a], uniform padding)
- **Workout Summary**: Added SANE/INSANE intensity labels with distinct color coding (Cyan/Purple vs Orange)
- **Workout Summary**: Unified fonts for cleaner look and distinguished user's own workouts with subtle background contrast

### Fixed
- **Chat Button**: Fixed non-functional chat button in new dashboard (was displaying TODO, now properly opens chat modal)
- Fixed penalty popup not appearing due to timezone mismatch (UTC vs Local) in Daily Recap
- Fixed race condition where penalty check ran before penalty creation

### Technical
- Created reusable v2 component library in `/src/components/dashboard/v2/`
- Implemented consistent design tokens for glassmorphism effects
- Standardized component props and interfaces across v2 dashboard
- Improved component modularity for easier maintenance and updates

---

## [0.4.22] - 2025-11-20

### Recovered
- Restored missing features from Vercel deployment (Pot history, timezone fixes, etc.)
- Fixed flexible rest day logic
- Updated dashboard components

---

## [0.4.21] - 2025-11-18

### Added
- Seasonal champions widget now calculates winners on-demand from logs table
- Weekly overperformers automatically display without manual intervention
- Production release tracking system (CHANGELOG.md)
- Release preparation helper script (prepare-release.sh)

### Changed
- Removed dependency on `weekly_overperformer_history` table for seasonal champions
- Removed dependency on "Run Penalty Check" button for weekly winner calculation
- SeasonalChampionsWidget and SeasonalChampionsHistoryModal now query logs directly

### Technical
- Real-time calculation of weekly winners based on completed weeks
- No cron jobs or manual triggers needed for weekly overperformers
- Automated release workflow with git tagging

---

## [0.2.53] - 2024-11-XX

### Added
- Deployment safety system with `deploy-dev.sh` and `deploy-mvp.sh` scripts
- Production deployment confirmation prompt to prevent accidents
- Git pre-commit hook to prevent accidental commits to main branch

### Fixed
- Duplicate entries in Yesterday's Recap (deduplication by user_id)
- Duplicate entries in daily summary system messages
- "Hours to respond" removed from system messages (not live-updated)
- "Money added" section removed from system messages (money added on accept, not creation)

### Changed
- Weekly Overperformers: Removed "this week" text for more compact display
- Weekly Overperformers: Shortened footer to "Points beyond sane • Resets Monday"
- Yesterday's Recap: Added separate "Sick Mode" section
- Yesterday's Recap: Removed count numbers from section headers
- Dashboard: Show "Sick Mode" instead of percentage when user toggles sick mode

---

## Release History (Pre-Changelog)

The following releases were deployed before this changelog was established:

- **v0.2.26** - Fixed Apple Web Push Service VAPID email format for iOS PWA notifications
- **v0.1.6** - Fixed PWA header height issues (removed double safe-area handling)
- Earlier versions - Push notification system, penalty system, workout tracking, etc.

---

## How to Use This Changelog

**For Developers:**
- Before deploying to production, move changes from "Unreleased" to a new version section
- Include the deployment date
- Update version in `package.json` to match
- Create a git tag for the release (e.g., `git tag v0.4.21`)

**For Stakeholders:**
- Check the latest version number to see what's currently in production
- "Unreleased" section shows what's coming in the next release
- Each version lists all changes in that production deployment

**Categories:**
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Fixed**: Bug fixes
- **Removed**: Removed features
- **Security**: Security fixes
- **Technical**: Internal improvements (optional, for developer context)
