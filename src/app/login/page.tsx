'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { Lock, Mail, ChevronRight, Sparkles } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const isSignUp = false
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted with:', email, password)
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Check your email to confirm your account!')
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

  const handleSignUp = () => {
    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center">
      {/* Animated background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Primary opal gradient - bottom left */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, rgba(79, 70, 229, 0.1) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Secondary purple gradient - top right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
          className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(79, 70, 229, 0.08) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Subtle accent - center */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]"
          style={{
            background: 'radial-gradient(ellipse, rgba(96, 165, 250, 0.03) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 30 }} 
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 text-center space-y-8 max-w-md mx-auto px-6 w-full"
      >
        {/* Logo/Brand */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex justify-center mb-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative"
            >
              <img 
                src="/logo.png" 
                alt="Commitment" 
                className="h-16 w-auto drop-shadow-2xl"
              />
            </motion.div>
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
              Welcome Back
            </h1>
            <p className="text-zinc-400 text-lg">
              Continue your commitment journey
            </p>
          </div>
        </motion.div>

        {/* Error/Success Messages */}
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`p-4 rounded-2xl text-sm font-medium border backdrop-blur-sm ${
              message.includes('Check your email') 
                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
                : 'bg-red-950/50 text-red-400 border-red-500/30'
            }`}
          >
            {message}
          </motion.div>
        )}

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Card gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left pl-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-white/10 rounded-2xl text-white text-base placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    disabled={loading}
                  />
                </div>
              </div>
              
              {/* Password Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left pl-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-white/10 rounded-2xl text-white text-base placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              </div>

              {/* Login Button */}
              <motion.button
                type="submit"
                disabled={loading}
                className="relative w-full h-14 rounded-2xl flex items-center justify-center gap-3 transition-all overflow-hidden group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'linear-gradient(135deg, rgb(96, 165, 250) 0%, rgb(79, 70, 229) 100%)',
                  boxShadow: '0 0 30px 5px rgba(96, 165, 250, 0.2), 0 0 15px 0px rgba(79, 70, 229, 0.3)',
                }}
              >
                <span className="text-white text-base font-bold tracking-wide">
                  {loading ? 'Signing in...' : 'Continue'}
                </span>
                {!loading && <ChevronRight size={20} className="text-white group-hover:translate-x-1 transition-transform" />}
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Sign up link */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
            <span className="text-zinc-600 text-sm">New here?</span>
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
          </div>
          
          <motion.button
            onClick={handleSignUp}
            className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Sparkles size={18} className="text-blue-400" />
            <span className="text-zinc-300 font-semibold group-hover:text-white transition-colors">
              Start your commitment
            </span>
          </motion.button>
        </motion.div>

        {/* Footer text */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-zinc-600 text-xs"
        >
          By continuing, you agree to our commitment protocol
        </motion.p>
      </motion.div>
    </div>
  )
}
