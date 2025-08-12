'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { AlertTriangle } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted with:', email, password)
    setLoading(true)
    setMessage('')

    try {

      if (isSignUp) {
        // Sign up new user
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Check your email to confirm your account!')
      } else {
        // Sign in existing user
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

  const handleSignUp = () => {
    router.push('/onboarding')
  }

  return (
    <div 
      className="min-h-screen text-white relative overflow-hidden flex items-center justify-center"
      style={{
        background: '#000000',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="text-center space-y-8 max-w-md mx-auto px-4 w-full"
      >
        {/* Header */}
        <div className="space-y-4">
          <div className="w-16 h-16 bg-red-600 rounded-2xl mx-auto flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-4">COMMITMENT</h1>
            <p className="text-xl md:text-2xl text-gray-300 font-bold">
              Welcome back to <span className="text-red-400 underline">the lifestyle</span>
            </p>
          </div>
        </div>

        {/* Error/Success Messages */}
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 border rounded-2xl text-sm font-bold ${
              message.includes('Check your email') 
                ? 'bg-green-900/50 text-green-400 border-green-600'
                : 'bg-red-900/50 text-red-400 border-red-600'
            }`}
          >
            {message}
          </motion.div>
        )}

        {/* Login Form */}
        <motion.div
          className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 md:p-8 backdrop-blur-sm"
          animate={{
            boxShadow: '0 15px 40px rgba(220, 38, 38, 0.2)'
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg font-medium placeholder-gray-400 focus:border-red-500 focus:outline-none backdrop-blur-sm transition-all"
                disabled={loading}
              />
              
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg font-medium placeholder-gray-400 focus:border-red-500 focus:outline-none backdrop-blur-sm transition-all"
                disabled={loading}
                minLength={6}
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: 'linear-gradient(135deg, #B91C1C 0%, #7F1D1D 100%)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid rgba(185, 28, 28, 0.4)',
                boxShadow: '0 0 15px rgba(185, 28, 28, 0.3)'
              }}
            >
              <span className="text-white text-lg font-black">
                {loading ? 'SIGNING IN...' : 'LOGIN TO CONTINUE'}
              </span>
            </motion.button>
          </form>
        </motion.div>

        {/* Sign up link */}
        <div className="text-center">
          <p className="text-gray-500 font-medium">
            Don't have an account?{' '}
            <motion.button
              onClick={handleSignUp}
              className="text-gray-400 hover:text-red-400 underline font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Sign up here
            </motion.button>
          </p>
        </div>

      </motion.div>
    </div>
  )
}