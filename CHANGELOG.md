# Changelog

All notable changes to this project will be documented in this file.

This changelog tracks **PRODUCTION RELEASES ONLY** (not dev deployments).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Fixed
- Fixed penalty popup not appearing due to timezone mismatch (UTC vs Local) in Daily Recap
- Fixed race condition where penalty check ran before penalty creation

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
