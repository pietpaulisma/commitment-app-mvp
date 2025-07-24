'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const fillDemoCredentials = (email: string, password: string) => {
    setEmail(email)
    setPassword(password)
    setIsSignUp(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted with:', email, password)
    setLoading(true)
    setMessage('')

    try {
      // Demo mode - bypass auth for testing
      if (email === 'demo@test.com' && password === 'demo123') {
        console.log('Demo user login detected')
        // Set demo user in localStorage for testing
        const demoData = {
          id: 'demo-user-id',
          email: 'demo@test.com',
          role: 'user'
        }
        localStorage.setItem('demo-user', JSON.stringify(demoData))
        console.log('Demo user stored:', localStorage.getItem('demo-user'))
        
        // Force a page reload to trigger AuthContext re-check
        setTimeout(() => {
          console.log('Reloading page to trigger auth check...')
          window.location.href = '/dashboard'
        }, 100)
        return
      }

      // Admin demo mode
      if (email === 'admin@test.com' && password === 'admin123') {
        console.log('Demo admin login detected')
        const adminData = {
          id: 'admin-user-id',
          email: 'admin@test.com',
          role: 'supreme_admin'
        }
        localStorage.setItem('demo-user', JSON.stringify(adminData))
        console.log('Demo admin stored:', localStorage.getItem('demo-user'))
        
        // Force a page reload to trigger AuthContext re-check
        setTimeout(() => {
          console.log('Reloading page to trigger auth check...')
          window.location.href = '/dashboard'
        }, 100)
        return
      }

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Check your email for the confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full px-4">
        <div className="bg-gray-900/30 border border-gray-800 p-6">
          <h2 className="text-2xl font-bold text-center mb-6 text-white">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </h2>
          
          {message && (
            <div className={`mb-4 p-3 border text-sm ${
              message.includes('Check your email') 
                ? 'bg-green-900/20 text-green-400 border-green-800'
                : 'bg-red-900/20 text-red-400 border-red-800'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-400 text-sm bg-gray-800 text-white"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-400 text-sm bg-gray-800 text-white"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-orange-400 text-black py-4 px-4 hover:bg-orange-500 transition-colors font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-orange-400 hover:text-orange-300 text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700">
            <h3 className="text-sm font-medium text-white mb-2">Demo Accounts (for testing):</h3>
            <div className="space-y-2 text-sm">
              <button 
                onClick={() => fillDemoCredentials('demo@test.com', 'demo123')}
                className="w-full flex justify-between items-center p-2 hover:bg-gray-700 transition-colors"
              >
                <span className="text-gray-400">User Demo:</span>
                <span className="font-mono text-xs text-orange-400">demo@test.com / demo123</span>
              </button>
              <button 
                onClick={() => fillDemoCredentials('admin@test.com', 'admin123')}
                className="w-full flex justify-between items-center p-2 hover:bg-gray-700 transition-colors"
              >
                <span className="text-gray-400">Admin Demo:</span>
                <span className="font-mono text-xs text-orange-400">admin@test.com / admin123</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Click any demo account to auto-fill
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}