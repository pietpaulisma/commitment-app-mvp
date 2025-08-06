'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    if (!loading && !hasRedirected) {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
      setHasRedirected(true)
    }
  }, [user, loading, router, hasRedirected])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto"></div>
        <p className="mt-2 text-gray-400">Loading...</p>
      </div>
    </div>
  )
}