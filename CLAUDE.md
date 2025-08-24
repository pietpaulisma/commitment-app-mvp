# Commitment App - Development Guide

## Project Overview
Fitness accountability platform with group-based workouts, penalty systems, and social features. 

Mobile PWA: Built as a mobile web app specifically designed to run in PWA mode - all testing should be done in this format.

**Tech Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase, Radix UI

## Critical Deployment Rules
- **ALWAYS PUSH TO DEV BRANCH ONLY** (never live unless instructed)
- **ALWAYS DEPLOY TO**: commitment-app-dev.vercel.app
- Local development disabled - all changes must be deployed to test

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

## Function Organization
- **Shared utilities**: Use existing `src/utils/` directory (targetCalculation, colorUtils, supabaseQueries, etc.)
- **UI utilities**: Use `src/components/ui/utils.ts` 
- **Component-specific helpers**: Keep in component file only if truly component-specific
- **Always prefer**: Modifying existing utility files over creating new ones or duplicating functions

## Database
- Supabase with Row Level Security (RLS)
- Handle real-time subscriptions properly
- Use TypeScript types for schemas

## Testing
```bash
npm run test        # Playwright E2E tests
npm run build       # Required before deployment
npm run lint        # Code quality check
```

## Development Workflow
1. Create feature branch from `dev`
2. Run `npm run lint` and `npm run build`
3. Deploy and test on commitment-app-dev.vercel.app
4. Never push to live unless specifically instructed