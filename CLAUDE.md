# Commitment App - Development Guide

## Project Overview

The Commitment App is a fitness accountability platform that helps users stay committed to their workout goals through group-based social accountability, penalty systems, and leaderboards.

### Core Features
- **Group-based Workouts**: Users join groups to work out together and hold each other accountable
- **Workout Logging**: Track exercises, sets, reps, and workout completion
- **Penalty System**: Financial penalties for missed workouts to maintain commitment
- **Group Chat**: Real-time messaging with emoji reactions and workout summaries
- **Leaderboards**: Track progress and compete with group members
- **Admin Dashboard**: Group and exercise management for administrators
- **Target Setting**: Weekly/daily workout targets with progress tracking

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **UI Components**: Radix UI, Lucide React icons
- **Testing**: Playwright
- **Deployment**: Vercel

## Deployment Guidelines

- Local host is not working for my computer, thereby all changes that we implement should be immediately be deployed and pushed to vercel
- **ALWAYS ONLY PUSH TO DEV branch**
- Only push to live branch if specifically instructed to do so
- When pushing something to dev, ALWAYS push to commitment-app-dev.vercel.app. Don't push to new urls, I always want to check url above to see my updated progress

### Deployment Commands
```bash
npm run build    # Build the application
npm run lint     # Run linting
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Main dashboard
│   ├── admin/             # Admin panel
│   ├── group-admin/       # Group administration
│   ├── onboarding/        # User onboarding flow
│   ├── profile/           # User profiles
│   ├── targets/           # Target setting
│   └── workout/           # Workout logging
├── components/            # React components
│   ├── shared/           # Shared components
│   └── ui/               # UI primitives
├── contexts/             # React contexts
├── hooks/                # Custom hooks
├── lib/                  # Library configurations
├── services/             # API services
├── types/                # TypeScript types
└── utils/                # Utility functions
```

## Coding Standards

### Component Architecture
- Use functional components with hooks
- Implement proper TypeScript typing
- Follow React best practices (keys, proper state management)
- Use Tailwind CSS for styling
- Implement proper error boundaries where needed

### File Naming
- Components: PascalCase (e.g., `WorkoutLogger.tsx`)
- Hooks: camelCase starting with "use" (e.g., `useProfile.ts`)
- Utils: camelCase (e.g., `supabaseQueries.ts`)
- Pages: lowercase with hyphens (e.g., `group-admin/page.tsx`)

### Database Operations
- Use Supabase client with proper error handling
- Implement Row Level Security (RLS) policies
- Handle real-time subscriptions properly
- Use TypeScript types for database schemas

### State Management
- Use React Context for global state (Auth, WeekMode)
- Local state with useState/useEffect for component-specific data
- Custom hooks for data fetching and business logic

## Testing Guidelines

### Playwright Tests
```bash
npm run test        # Run all tests
npm run test:headed # Run tests with browser UI
npm run test:ui     # Run with Playwright test UI
```

### Testing Strategy
- E2E tests for critical user flows (login, workout logging, group creation)
- Component testing for complex UI interactions
- API endpoint testing for data operations
- Mobile responsiveness testing

## Development Workflow

1. **Feature Development**
   - Create feature branch from `dev`
   - Implement feature with proper testing
   - Run `npm run lint` and `npm run build`
   - Deploy to dev environment for testing
   - Test on commitment-app-dev.vercel.app

2. **Code Quality**
   - Follow ESLint rules
   - Use TypeScript strictly
   - Implement proper error handling
   - Add loading states for async operations
   - Ensure mobile responsiveness

3. **Database Changes**
   - Create migration SQL files
   - Test migrations on dev database
   - Update TypeScript types accordingly
   - Verify RLS policies are correct

## Key Screens (Primary User Interface)

When referring to screens in development, use these exact names and file locations:

### 1. **Dashboard Screen**
- **File**: `src/app/dashboard/page.tsx`
- **Component**: `RectangularDashboard`
- **Purpose**: Main landing page showing user progress, targets, group overview, and navigation to other screens

### 2. **Chat Screen** 
- **Component**: `GroupChat` (embedded in dashboard)
- **Purpose**: Real-time group messaging with emoji reactions and workout summary posts

### 3. **Workout Overview Screen**
- **File**: `src/app/workout/page.tsx`
- **Component**: `MobileWorkoutLogger`
- **Purpose**: Main workout interface showing exercises, progress tracking, and workout completion

### 4. **Points Entry Screen**
- **Component**: Part of `MobileWorkoutLogger` workflow
- **Purpose**: Screen within workout overview where users input points/reps/sets for specific exercises

### 5. **Settings Screen**
- **Group Admin**: `src/app/group-admin/page.tsx`
- **Supreme Admin**: `src/app/admin/page.tsx` (with sub-pages for users, groups, exercises)
- **Components**: `SystemMessageConfigAdmin`, `SystemMessageAdmin`
- **Purpose**: Configuration panels for group-level and system-level administration

### 6. **Onboarding Flow** (Single-use)
- **Files**: `src/app/onboarding/**/*.tsx`
- **Purpose**: Initial user setup and group joining process

## Key Components

- `RectangularDashboard`: Main dashboard layout and navigation
- `MobileWorkoutLogger`: Core workout tracking and points entry interface
- `GroupChat`: Real-time messaging with reactions and workout summaries
- `SystemMessageConfigAdmin`: Supreme admin configuration panel
- `MobileNavigation`: Mobile-first navigation system

## Environment Variables

Ensure these are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Database connection strings for migrations

## Performance Considerations

- Optimize images and assets
- Implement proper loading states
- Use React.memo for expensive components
- Minimize database queries with proper joins
- Implement pagination for large data sets