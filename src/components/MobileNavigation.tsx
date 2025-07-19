'use client'

import { useProfile } from '@/hooks/useProfile'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  PlusCircleIcon, 
  TrophyIcon, 
  ChartBarIcon,
  UserIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  PlusCircleIcon as PlusCircleIconSolid,
  TrophyIcon as TrophyIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserIcon as UserIconSolid,
  CogIcon as CogIconSolid
} from '@heroicons/react/24/solid'

export default function MobileNavigation() {
  const { profile, loading, isSupremeAdmin, isGroupAdmin, hasAdminPrivileges } = useProfile()
  const pathname = usePathname()

  if (loading || !profile) {
    return null
  }

  const navItems = [
    {
      name: 'Home',
      href: '/dashboard',
      icon: HomeIcon,
      iconActive: HomeIconSolid,
      show: true
    },
    {
      name: 'Workout',
      href: '/workout',
      icon: PlusCircleIcon,
      iconActive: PlusCircleIconSolid,
      show: true
    },
    {
      name: 'Targets',
      href: '/targets',
      icon: ChartBarIcon,
      iconActive: ChartBarIconSolid,
      show: true
    },
    {
      name: 'Leaderboard',
      href: '/leaderboard',
      icon: TrophyIcon,
      iconActive: TrophyIconSolid,
      show: true
    },
    {
      name: 'Admin',
      href: isGroupAdmin && !isSupremeAdmin ? '/group-admin' : '/admin',
      icon: CogIcon,
      iconActive: CogIconSolid,
      show: hasAdminPrivileges
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: UserIcon,
      iconActive: UserIconSolid,
      show: true
    }
  ]

  const visibleItems = navItems.filter(item => item.show)

  return (
    <>
      {/* Top Header for Mobile */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Commitment App</h1>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{profile.email}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                isSupremeAdmin 
                  ? 'bg-purple-100 text-purple-800'
                  : isGroupAdmin 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {profile.role === 'supreme_admin' ? 'Supreme Admin' : 
                 profile.role === 'group_admin' ? 'Group Admin' : 'Member'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href === '/admin' && pathname.startsWith('/admin') && pathname !== '/admin/users' && pathname !== '/admin/groups' && pathname !== '/admin/exercises') ||
              (item.href === '/group-admin' && pathname === '/group-admin')
            
            const Icon = isActive ? item.iconActive : item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Desktop Navigation (Hidden on Mobile) */}
      <nav className="hidden lg:block bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Commitment App
              </Link>
              
              <div className="flex space-x-6">
                <Link 
                  href="/dashboard" 
                  className="text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                
                <Link 
                  href="/workout" 
                  className="text-gray-600 hover:text-gray-900"
                >
                  Log Workout
                </Link>

                <Link 
                  href="/leaderboard" 
                  className="text-gray-600 hover:text-gray-900"
                >
                  Leaderboard
                </Link>

                <Link 
                  href="/targets" 
                  className="text-gray-600 hover:text-gray-900"
                >
                  Targets
                </Link>

                {isGroupAdmin && !isSupremeAdmin && (
                  <Link 
                    href="/group-admin" 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Manage Group
                  </Link>
                )}

                {hasAdminPrivileges && (
                  <Link 
                    href="/admin" 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Admin Panel
                  </Link>
                )}

                {isSupremeAdmin && (
                  <>
                    <Link 
                      href="/admin/exercises" 
                      className="text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Manage Exercises
                    </Link>
                    <Link 
                      href="/admin/groups" 
                      className="text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Manage Groups
                    </Link>
                    <Link 
                      href="/admin/users" 
                      className="text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Manage Users
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link 
                href="/profile" 
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                <span className="text-gray-600">Signed in as </span>
                <span className="font-medium hover:underline">{profile.email}</span>
              </Link>
              
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isSupremeAdmin 
                    ? 'bg-purple-100 text-purple-800'
                    : isGroupAdmin 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile.role === 'supreme_admin' ? 'Supreme Admin' : 
                   profile.role === 'group_admin' ? 'Group Admin' : 'Member'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="lg:hidden h-16"></div>
    </>
  )
}