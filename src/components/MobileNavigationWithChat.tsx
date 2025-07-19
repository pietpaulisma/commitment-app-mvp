'use client'

import { useProfile } from '@/hooks/useProfile'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { 
  HomeIcon, 
  PlusCircleIcon, 
  TrophyIcon, 
  ChartBarIcon,
  UserIcon,
  CogIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  PlusCircleIcon as PlusCircleIconSolid,
  TrophyIcon as TrophyIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserIcon as UserIconSolid,
  CogIcon as CogIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid
} from '@heroicons/react/24/solid'
import GroupChat from '@/components/GroupChat'

export default function MobileNavigationWithChat() {
  const { profile, loading, isSupremeAdmin, isGroupAdmin, hasAdminPrivileges } = useProfile()
  const pathname = usePathname()
  const [isChatOpen, setIsChatOpen] = useState(false)

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
      <div className="lg:hidden bg-gray-900 shadow-sm border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Commitment App</h1>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">{profile.email}</span>
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

      {/* Floating Chat Button - Only show if user has a group */}
      {profile.group_id && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="lg:hidden fixed bottom-20 right-4 bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-colors z-40"
        >
          <ChatBubbleLeftRightIcon className="w-6 h-6" />
        </button>
      )}

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-lg">
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
                    ? 'text-blue-400 bg-blue-900/30'
                    : 'text-gray-400 hover:text-gray-200'
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
      <nav className="hidden lg:block bg-gray-900 shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold text-white">
                Commitment App
              </Link>
              
              <div className="flex space-x-6">
                <Link 
                  href="/dashboard" 
                  className="text-gray-300 hover:text-white"
                >
                  Dashboard
                </Link>
                
                <Link 
                  href="/workout" 
                  className="text-gray-300 hover:text-white"
                >
                  Log Workout
                </Link>

                <Link 
                  href="/leaderboard" 
                  className="text-gray-300 hover:text-white"
                >
                  Leaderboard
                </Link>

                <Link 
                  href="/targets" 
                  className="text-gray-300 hover:text-white"
                >
                  Targets
                </Link>

                {profile.group_id && (
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="text-gray-300 hover:text-white flex items-center space-x-1"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    <span>Group Chat</span>
                  </button>
                )}

                {isGroupAdmin && !isSupremeAdmin && (
                  <Link 
                    href="/group-admin" 
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Manage Group
                  </Link>
                )}

                {hasAdminPrivileges && (
                  <Link 
                    href="/admin" 
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Admin Panel
                  </Link>
                )}

                {isSupremeAdmin && (
                  <>
                    <Link 
                      href="/admin/exercises" 
                      className="text-purple-400 hover:text-purple-300 font-medium"
                    >
                      Manage Exercises
                    </Link>
                    <Link 
                      href="/admin/groups" 
                      className="text-purple-400 hover:text-purple-300 font-medium"
                    >
                      Manage Groups
                    </Link>
                    <Link 
                      href="/admin/users" 
                      className="text-purple-400 hover:text-purple-300 font-medium"
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
                className="text-sm text-gray-300 hover:text-white"
              >
                <span className="text-gray-300">Signed in as </span>
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

      {/* Group Chat Modal */}
      <GroupChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </>
  )
}