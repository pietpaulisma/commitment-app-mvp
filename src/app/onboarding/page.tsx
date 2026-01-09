'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, Zap, Users, Target, Shield, Skull, Check, Calendar, Palette, User, Sparkles, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface OnboardingFlowProps {
  onComplete?: () => void
  onGoToLogin?: () => void
}

export default function OnboardingPage() {
  const router = useRouter()
  
  const handleOnboardingComplete = () => {
    console.log('Onboarding completed, allowing time for profile data to refresh...')
    setTimeout(() => {
      console.log('Redirecting to dashboard after onboarding completion')
      router.replace('/dashboard')
    }, 2000)
  }

  const handleGoToLogin = () => {
    router.push('/login')
  }

  return (
    <OnboardingFlow 
      onComplete={handleOnboardingComplete} 
      onGoToLogin={handleGoToLogin}
    />
  )
}

function OnboardingFlow({ onComplete, onGoToLogin }: OnboardingFlowProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [currentRuleCard, setCurrentRuleCard] = useState(0)
  const [revealedSentences, setRevealedSentences] = useState(0)
  const [revealedRuleCards, setRevealedRuleCards] = useState(0)
  const [sliderValue, setSliderValue] = useState(50)
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [currentQuote, setCurrentQuote] = useState('')
  const [screenIntensity, setScreenIntensity] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [birthday, setBirthday] = useState('')
  const [username, setUsername] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [attemptedProceedWithIncomplete, setAttemptedProceedWithIncomplete] = useState(false)
  const [finalWarningCompleted, setFinalWarningCompleted] = useState(false)
  const [confirmedRuleCards, setConfirmedRuleCards] = useState<boolean[]>([false, false, false, false, false, false, false])
  const [animatedConfirmations, setAnimatedConfirmations] = useState<boolean[]>([false, false, false, false, false, false, false])
  const [showHoldButton, setShowHoldButton] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [groupInfo, setGroupInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(0)

  const nextStepRef = useRef<() => void>(() => {})

  const finalWarningQuotes = [
    "Are you sure...",
    "ARE YOU REALLY SURE?",
    "THIS IS NOT FOR EVERYBODY",
    "THIS IS A LIFESTYLE",
    "NO BACKING OUT",
    "YOUR COMMITMENT IS BINDING",
    "YOU'RE ALL IN NOW"
  ]


  const welcomeSentences = [
    "This is a COMMITMENT system.",
    "You show up every day. Or you pay.",
    "Miss a session — or log it late — that's €10 to the group pot.",
    "This is a social contract. You support each other. You hold each other accountable.",
    "The money funds your crew — for fun, or for good.",
    "Understand this before you commit."
  ]

  const ruleCards = [
    {
      icon: Zap,
      title: "Show up daily",
      description: "Every day, your target increases by one point. No skipping. No banking. No compromises.",
      gradient: "from-blue-500 to-cyan-400",
    },
    {
      icon: AlertTriangle,
      title: "Log it or pay",
      description: "If you don't log your workout before midnight, you owe €10 to the group pot. No exceptions.",
      gradient: "from-orange-500 to-amber-400",
    },
    {
      icon: Target,
      title: "Follow the system",
      description: "Only approved exercises count. Each has a defined point value. No improvising.",
      gradient: "from-purple-500 to-violet-400",
    },
    {
      icon: Shield,
      title: "Own your absence",
      description: "Sickness or grief may pause your progress — but you return when you can.",
      gradient: "from-emerald-500 to-teal-400",
    },
    {
      icon: Users,
      title: "The pot belongs to the group",
      description: "Every €10 goes into a collective fund. It fuels whatever the group decides.",
      gradient: "from-pink-500 to-rose-400",
    },
    {
      icon: Shield,
      title: "This is not a challenge",
      description: "This is a standard. A pact. A personal operating system designed to build discipline.",
      gradient: "from-indigo-500 to-blue-400",
    },
    {
      icon: Skull,
      title: "There is no exit",
      description: "Silence means you keep paying. This is a commitment for life.",
      gradient: "from-zinc-600 to-zinc-500",
    }
  ]

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isHolding && holdProgress < 100) {
      interval = setInterval(() => {
        setHoldProgress(prev => {
          const newProgress = Math.min(prev + (100/100), 100) // 10 seconds total
          const newQuoteIndex = Math.floor((newProgress / 100) * finalWarningQuotes.length)
          if (newQuoteIndex !== quoteIndex) {
            setQuoteIndex(newQuoteIndex)
            setCurrentQuote(finalWarningQuotes[Math.min(newQuoteIndex, finalWarningQuotes.length - 1)])
          }
          setScreenIntensity(newProgress / 100)
          
          if (newProgress >= 100) {
            setFinalWarningCompleted(true)
            setTimeout(() => {
              setScreenIntensity(0.2)
              setTimeout(() => {
                nextStepRef.current()
              }, 1500)
            }, 800)
          }
          
          return newProgress
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isHolding, holdProgress, finalWarningQuotes, quoteIndex])

  useEffect(() => {
    if (currentStep === 2) {
      setHasScrolledToBottom(false)
      
      const handleScroll = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollHeight = document.documentElement.scrollHeight
        const clientHeight = window.innerHeight || document.documentElement.clientHeight
        const scrollThreshold = 150
        const isScrollableContent = scrollHeight > clientHeight + 50
        
        if (isScrollableContent) {
          const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
          if (distanceFromBottom <= scrollThreshold) {
            setHasScrolledToBottom(true)
          } else {
            setHasScrolledToBottom(false)
          }
        } else {
          setTimeout(() => setHasScrolledToBottom(true), 1000)
        }
      }

      window.addEventListener('scroll', handleScroll)
      window.addEventListener('resize', handleScroll)
      setTimeout(() => handleScroll(), 800)
      
      return () => {
        window.removeEventListener('scroll', handleScroll)
        window.removeEventListener('resize', handleScroll)
      }
    }
  }, [currentStep])

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && currentStep === 1) {
        const sliderElement = document.querySelector('[data-slider-track]') as HTMLElement
        if (sliderElement) {
          const rect = sliderElement.getBoundingClientRect()
          const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
          setSliderValue(Math.round(percentage))
          if (Math.round(percentage) === 100) {
            setAttemptedProceedWithIncomplete(false)
          }
        }
      }
    }

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging && currentStep === 1) {
        e.preventDefault()
        const sliderElement = document.querySelector('[data-slider-track]') as HTMLElement
        if (sliderElement) {
          const touch = e.touches[0]
          const rect = sliderElement.getBoundingClientRect()
          const percentage = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100))
          setSliderValue(Math.round(percentage))
          if (Math.round(percentage) === 100) {
            setAttemptedProceedWithIncomplete(false)
          }
        }
      }
    }

    const handleGlobalEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false })
      document.addEventListener('mouseup', handleGlobalEnd)
      document.addEventListener('touchend', handleGlobalEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('touchmove', handleGlobalTouchMove)
      document.removeEventListener('mouseup', handleGlobalEnd)
      document.removeEventListener('touchend', handleGlobalEnd)
    }
  }, [isDragging, currentStep])

  const nextStep = () => {
    if (currentStep === 0 && currentRuleCard === 0) {
      setCurrentRuleCard(1)
      setRevealedRuleCards(0)
    } else if (currentStep === 0 && currentRuleCard === 1) {
      setCurrentStep(1)
      setCurrentRuleCard(0)
      setRevealedSentences(0)
      setRevealedRuleCards(0)
    } else if (currentStep < 10) {
      setCurrentStep(currentStep + 1)
      setRevealedSentences(0)
      setHasScrolledToBottom(false)
    } else {
      console.log('Onboarding nextStep completed, updating profile and calling onComplete callback')
      handleFinalCompletion()
    }
  }

  useEffect(() => {
    nextStepRef.current = nextStep
  })

  const prevStep = () => {
    if (currentStep === 0 && currentRuleCard === 1) {
      setCurrentRuleCard(0)
      setRevealedRuleCards(0)
    } else if (currentStep === 1) {
      setCurrentStep(0)
      setCurrentRuleCard(1)
      setRevealedSentences(0)
      setRevealedRuleCards(ruleCards.length)
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setRevealedSentences(0)
      setHasScrolledToBottom(false)
    }
  }

  const revealNextSentence = () => {
    if (revealedSentences < welcomeSentences.length) {
      setRevealedSentences(revealedSentences + 1)
      setTimeout(() => {
        const newSentenceCount = revealedSentences + 1
        if (newSentenceCount >= 2) {
          const viewportHeight = window.innerHeight
          const scrollAmount = Math.max(150, viewportHeight * 0.25)
          window.scrollBy({ top: scrollAmount, behavior: 'smooth' })
        }
      }, 300)
    }
  }

  const revealNextRuleCard = () => {
    if (revealedRuleCards < ruleCards.length) {
      setRevealedRuleCards(revealedRuleCards + 1)
      setTimeout(() => {
        const newCardCount = revealedRuleCards + 1
        if (newCardCount >= 1) {
          const ruleCardElements = document.querySelectorAll('[data-rule-card]')
          const latestCard = ruleCardElements[newCardCount - 1] as HTMLElement
          
          if (latestCard) {
            const cardRect = latestCard.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            const desiredBottomPadding = viewportHeight * 0.3
            window.scrollBy({
              top: cardRect.bottom + desiredBottomPadding - viewportHeight,
              behavior: 'smooth'
            })
          } else {
            const viewportHeight = window.innerHeight
            const scrollAmount = Math.max(400, viewportHeight * 0.6)
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' })
          }
        }
      }, 500)
    }
  }

  const startHolding = () => {
    setIsHolding(true)
    setHoldProgress(0)
    setCurrentQuote(finalWarningQuotes[0])
    setScreenIntensity(0)
  }

  const stopHolding = () => {
    setIsHolding(false)
    if (holdProgress < 100) {
      setHoldProgress(0)
      setCurrentQuote('')
      if (!finalWarningCompleted) {
        setScreenIntensity(0)
      }
    }
  }

  const handleSignUp = async () => {
    if (password !== passwordConfirm) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            onboarding_started: true
          }
        }
      })

      if (error) throw error
      
      if (data.user) {
        console.log('User created:', data.user.email)
        
        if (!data.session && data.user && !data.user.email_confirmed_at) {
          setError('Please check your email and click the confirmation link, then try logging in.')
          setIsLoading(false)
          return
        }
        
        if (data.session) {
          nextStep()
        } else {
          setError('Account created! Please check your email for confirmation, then use the login screen.')
          setTimeout(() => {
            onGoToLogin?.()
          }, 3000)
        }
      }
    } catch (error: any) {
      console.error('Signup failed:', error)
      setError(error.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteCodeJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        console.log('Creating profile for user:', user.email)
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            username: user.email?.split('@')[0] || 'User',
            role: 'user',
            preferred_weight: 70,
            is_weekly_mode: false,
            location: 'Unknown',
            personal_color: '#3b82f6',
            custom_icon: '💪'
          })

        if (createError) {
          console.error('Error creating profile:', createError)
          throw new Error('Failed to create user profile')
        }
      }

      const { data, error } = await supabase.rpc('join_group_via_invite', {
        p_invite_code: inviteCode.trim().toUpperCase()
      })

      if (error) throw error

      if (data.success) {
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', data.group_id)
          .single()

        const { count: memberCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', data.group_id)

        const { data: adminData } = await supabase
          .from('profiles')
          .select('username, custom_icon')
          .eq('id', groupData?.created_by)
          .single()

        if (groupError) {
          console.error('Error fetching group info:', groupError)
        } else if (groupData) {
          setGroupInfo({
            ...groupData,
            member_count: memberCount || 0,
            group_admin: adminData
          })
        }

        nextStep()
      } else {
        throw new Error(data.error || 'Failed to join group')
      }
    } catch (error: any) {
      console.error('Error joining via invite code:', error)
      setError(error.message || 'Invalid or expired invite code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinalCompletion = async () => {
    // In demo mode, just show completion without saving
    if (demoMode) {
    setIsLoading(true)
      // Simulate a brief delay for effect
      await new Promise(resolve => setTimeout(resolve, 1500))
      setIsLoading(false)
      // Show a message but don't redirect
    setError('')
      return
    }
    
    setIsLoading(true)
    setError('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      const profileData = {
        username: username.trim() || user.email?.split('@')[0] || 'User',
        onboarding_completed: true,
        personal_color: '#3b82f6',
        custom_icon: '💪',
        birth_date: birthday || null,
        updated_at: new Date().toISOString()
      }

      console.log('Updating profile with completion data:', profileData)

      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        const { error: basicUpdateError } = await supabase
          .from('profiles')
          .update({
            username: profileData.username,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          
        if (basicUpdateError) {
          throw basicUpdateError
        }
      }

      console.log('Profile updated successfully, completing onboarding')
      onComplete?.()
    } catch (error: any) {
      console.error('Final completion failed:', error)
      setError(error.message || 'Failed to complete onboarding')
    } finally {
      setIsLoading(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        if (currentRuleCard === 0) {
          return revealedSentences >= welcomeSentences.length
        } else if (currentRuleCard === 1) {
          return revealedRuleCards >= ruleCards.length && confirmedRuleCards.every(confirmed => confirmed)
        }
        return true
      case 1:
        return sliderValue === 100
      case 2:
        return holdProgress >= 100
      case 3:
        // Allow demo mode to skip, or require valid credentials
        return demoMode || (email.trim() && password.trim() && password === passwordConfirm)
      case 4:
        // Allow demo mode to skip
        return demoMode || inviteCode.trim()
      case 5:
        return true
      case 6:
        return birthday
      case 7:
        const trimmedUsername = username.trim()
        return trimmedUsername && trimmedUsername.length >= 1 && trimmedUsername.length <= 4 && !trimmedUsername.includes(' ')
      case 8:
        return true
      default:
        return true
    }
  }

  const canClickCommitButton = () => {
    switch (currentStep) {
      case 1:
        return true
      default:
        return canProceed()
    }
  }

  // Glass Card Component
  const GlassCard = ({ children, className = "", noPadding = false }: { children: React.ReactNode; className?: string; noPadding?: boolean }) => (
    <div className={`relative bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-xl ${noPadding ? '' : 'p-6'} ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  )

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        if (currentRuleCard === 0) {
          // Welcome screen with enhanced animations
          return (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center space-y-8 max-w-2xl mx-auto px-6 pt-8 relative"
            >
              {/* Floating particles background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-blue-500/20"
                    initial={{ 
                      x: Math.random() * 300 - 150,
                      y: Math.random() * 400,
                      scale: Math.random() * 0.5 + 0.5 
                    }}
                    animate={{
                      y: [null, Math.random() * -100 - 50],
                      opacity: [0, 0.6, 0],
                    }}
                    transition={{
                      duration: 4 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                      ease: "easeOut"
                    }}
                    style={{ left: `${20 + i * 12}%` }}
                  />
                ))}
              </div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: -20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                transition={{ 
                  delay: 0.2,
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }}
                className="flex justify-center relative"
              >
                <motion.div
                  animate={{ 
                    boxShadow: [
                      '0 0 20px 0px rgba(96, 165, 250, 0.2)',
                      '0 0 40px 10px rgba(96, 165, 250, 0.3)',
                      '0 0 20px 0px rgba(96, 165, 250, 0.2)'
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="rounded-2xl"
                >
                  <img 
                    src="/logo.png" 
                    alt="The Commitment" 
                    className="h-14 w-auto"
                  />
                </motion.div>
              </motion.div>
              
              <div className="min-h-[400px] flex flex-col justify-center relative z-10">
                <div className="space-y-5">
                    <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      duration: 0.8, 
                      delay: 0.4,
                      type: "spring",
                      stiffness: 100
                    }}
                    className="text-2xl sm:text-3xl font-bold text-white leading-tight"
                  >
                    This is not just another fitness app — 
                    <motion.span 
                      className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 text-transparent bg-clip-text inline-block"
                      animate={{ 
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                      }}
                      transition={{ duration: 5, repeat: Infinity }}
                      style={{ backgroundSize: '200% 200%' }}
                    >
                      it&apos;s a lifestyle
                    </motion.span>.
                    </motion.div>
                    
                    <AnimatePresence>
                      {welcomeSentences.slice(0, revealedSentences).map((sentence, index) => {
                        const sentenceAge = revealedSentences - index - 1
                      const opacity = Math.max(0.5, 1 - (sentenceAge * 0.08))
                      const isLatest = index === revealedSentences - 1
                        
                        return (
                          <motion.div
                            key={index}
                          initial={{ opacity: 0, y: 25, x: -10 }}
                            animate={{ 
                            opacity, 
                              y: 0,
                            x: 0,
                            scale: isLatest ? 1 : 0.98,
                            }}
                            transition={{ 
                              duration: 0.6, 
                            type: "spring",
                            stiffness: 100,
                            damping: 15
                          }}
                          className={`text-lg sm:text-xl font-medium leading-relaxed transition-colors duration-300 ${
                            isLatest ? 'text-white' : 'text-zinc-500'
                          }`}
                          >
                            {sentence.includes("COMMITMENT") ? (
                            <>This is a <motion.span 
                              className="text-blue-400 font-bold"
                              animate={isLatest ? { 
                                textShadow: [
                                  '0 0 10px rgba(96, 165, 250, 0)',
                                  '0 0 20px rgba(96, 165, 250, 0.5)',
                                  '0 0 10px rgba(96, 165, 250, 0)'
                                ]
                              } : {}}
                              transition={{ duration: 2, repeat: Infinity }}
                            >COMMITMENT</motion.span> system.</>
                          ) : sentence.includes("€10") ? (
                            <>Miss a session — or log it late — that&apos;s <span className="text-orange-400 font-semibold">€10</span> to the group pot.</>
                            ) : (
                              sentence
                            )}
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )
        } else {
          // Rule cards with enhanced animations
          return (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center space-y-8 max-w-2xl mx-auto px-6 pt-8"
            >
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5 }}
              >
                <motion.h2 
                  className="text-3xl sm:text-4xl font-black"
                  animate={{ 
                    textShadow: [
                      '0 0 20px rgba(255,255,255,0)',
                      '0 0 30px rgba(255,255,255,0.1)',
                      '0 0 20px rgba(255,255,255,0)'
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  The Rules
                </motion.h2>
                <p className="text-zinc-400">Read and confirm each one. They are non-negotiable.</p>
                <motion.div 
                  className="flex justify-center gap-1.5 pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {ruleCards.map((_, i) => (
                    <motion.div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i < revealedRuleCards 
                          ? confirmedRuleCards[i] 
                            ? 'bg-emerald-500' 
                            : 'bg-blue-500'
                          : 'bg-white/20'
                      }`}
                      animate={i < revealedRuleCards && !confirmedRuleCards[i] ? {
                        scale: [1, 1.3, 1],
                      } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  ))}
                </motion.div>
              </motion.div>
              
              <div className="space-y-4">
                  {ruleCards.slice(0, revealedRuleCards).map((rule, index) => {
                    const Icon = rule.icon
                    const isConfirmed = confirmedRuleCards[index]
                  const isLatest = index === revealedRuleCards - 1
                  // Only animate entrance for newest card
                  const isNewlyRevealed = index === revealedRuleCards - 1
                  
                    return (
                      <motion.div
                      key={`rule-${index}`}
                      data-rule-card
                      initial={isNewlyRevealed ? { opacity: 0, y: 40, scale: 0.95 } : false}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 15 }}
                    >
                      <GlassCard className={`transition-all duration-500 ${
                        isConfirmed 
                          ? 'border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)]' 
                          : isLatest 
                            ? 'border-white/20 shadow-[0_0_30px_rgba(96,165,250,0.1)]'
                            : ''
                      }`}>
                        <div className="text-center space-y-4">
                          <div 
                            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${rule.gradient} flex items-center justify-center mx-auto transition-transform hover:scale-110`}
                          >
                            <Icon className="w-7 h-7 text-white" />
                          </div>
                          
                          <h3 className={`text-xl font-bold transition-colors duration-300 ${isConfirmed ? 'text-emerald-400' : 'text-white'}`}>
                              {rule.title}
                            </h3>
                            
                          <p className="text-zinc-400 text-base leading-relaxed">
                              {rule.description}
                            </p>
                          
                            {!isConfirmed ? (
                              <motion.button
                                onClick={() => {
                                  const newConfirmed = [...confirmedRuleCards]
                                  newConfirmed[index] = true
                                  setConfirmedRuleCards(newConfirmed)
                                }}
                              className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-medium"
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              I understand
                              </motion.button>
                            ) : (
                              <motion.div
                              initial={!animatedConfirmations[index] ? { opacity: 0, scale: 0.5 } : false}
                                animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 15 }}
                              onAnimationComplete={() => {
                                if (!animatedConfirmations[index]) {
                                  const newAnimated = [...animatedConfirmations]
                                  newAnimated[index] = true
                                  setAnimatedConfirmations(newAnimated)
                                }
                              }}
                              className="flex items-center justify-center gap-2 text-emerald-400 font-bold"
                            >
                              <motion.div
                                initial={!animatedConfirmations[index] ? { scale: 0, rotate: -180 } : false}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 300 }}
                              >
                                <Check size={20} />
                              </motion.div>
                              <span>Confirmed</span>
                              </motion.div>
                            )}
                          </div>
                      </GlassCard>
                      </motion.div>
                    )
                  })}
              </div>
            </motion.div>
          )
        }

      case 1:
        // Commitment slider with enhanced visuals
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-lg mx-auto px-6 pt-8 relative"
          >
            {/* Background glow effect based on slider value */}
                    <motion.div 
              className="absolute inset-0 pointer-events-none"
              animate={{
                        background: sliderValue === 100 
                  ? 'radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.15) 0%, transparent 50%)'
                  : `radial-gradient(circle at 50% 50%, rgba(96, 165, 250, ${sliderValue * 0.002}) 0%, transparent 50%)`
              }}
              transition={{ duration: 0.3 }}
            />

            <motion.div 
              className="space-y-2 relative z-10"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-3xl sm:text-4xl font-black">Commitment Level</h2>
              <p className="text-zinc-400">Slide to set your dedication</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard className={`transition-all duration-500 ${sliderValue === 100 ? 'border-emerald-500/30' : sliderValue > 80 ? 'border-blue-500/30' : ''}`}>
                <div className="space-y-8">
                  <div className="relative">
                    {/* Track background with segments */}
                  <div
                    data-slider-track
                      className="w-full h-4 rounded-full relative overflow-hidden cursor-pointer bg-zinc-800/80"
                    onMouseDown={(e) => {
                      setIsDragging(true)
                        const rect = e.currentTarget.getBoundingClientRect()
                        const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
                        setSliderValue(Math.round(percentage))
                        if (Math.round(percentage) === 100) setAttemptedProceedWithIncomplete(false)
                    }}
                    onTouchStart={(e) => {
                      setIsDragging(true)
                      const touch = e.touches[0]
                        const rect = e.currentTarget.getBoundingClientRect()
                        const percentage = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100))
                        setSliderValue(Math.round(percentage))
                        if (Math.round(percentage) === 100) setAttemptedProceedWithIncomplete(false)
                      }}
                    >
                      {/* Progress fill */}
                      <motion.div 
                        className="h-full rounded-full relative"
                        animate={{
                          width: `${sliderValue}%`,
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{
                          background: sliderValue === 100 
                            ? 'linear-gradient(90deg, rgb(34, 197, 94), rgb(16, 185, 129), rgb(34, 197, 94))'
                            : sliderValue > 80 
                              ? 'linear-gradient(90deg, rgb(96, 165, 250), rgb(139, 92, 246), rgb(236, 72, 153))'
                              : 'linear-gradient(90deg, rgb(96, 165, 250), rgb(139, 92, 246))',
                          boxShadow: sliderValue === 100
                            ? '0 0 30px rgba(34, 197, 94, 0.6), inset 0 0 10px rgba(255,255,255,0.2)'
                            : sliderValue > 80 
                              ? '0 0 25px rgba(139, 92, 246, 0.5), inset 0 0 10px rgba(255,255,255,0.1)'
                              : '0 0 20px rgba(96, 165, 250, 0.3)',
                          backgroundSize: sliderValue === 100 ? '200% 100%' : '100% 100%',
                        }}
                      >
                        {/* Shimmer effect when at 100% */}
                        {sliderValue === 100 && (
                          <motion.div
                            className="absolute inset-0 rounded-full"
                            animate={{
                              backgroundPosition: ['0% 0%', '200% 0%'],
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            style={{
                              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                              backgroundSize: '50% 100%',
                            }}
                          />
                        )}
                      </motion.div>
                    </div>
                    
                    {/* Thumb - draggable */}
                  <motion.div 
                    className="absolute top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10"
                      animate={{ left: `calc(${sliderValue}% - 14px)` }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        setIsDragging(true)
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation()
                        setIsDragging(true)
                      }}
                    >
                      <motion.div 
                        className="w-7 h-7 rounded-full border-2 border-white shadow-xl"
                        animate={sliderValue > 90 && sliderValue < 100 ? {
                          scale: [1, 1.1, 1],
                        } : { scale: 1 }}
                        transition={{ duration: 0.5, repeat: sliderValue > 90 && sliderValue < 100 ? Infinity : 0 }}
                      style={{
                        background: sliderValue === 100 
                            ? 'linear-gradient(135deg, rgb(34, 197, 94), rgb(16, 185, 129))'
                            : 'linear-gradient(135deg, rgb(96, 165, 250), rgb(139, 92, 246))',
                          boxShadow: sliderValue === 100 
                            ? '0 0 20px rgba(34, 197, 94, 0.8)'
                            : '0 0 15px rgba(96, 165, 250, 0.6)',
                      }}
                    />
                  </motion.div>
                </div>
                
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-zinc-500">Casual</span>
                    <motion.span 
                      className={sliderValue === 100 ? 'text-emerald-400' : 'text-blue-400'}
                      animate={sliderValue > 90 ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                      transition={{ duration: 0.5, repeat: sliderValue > 90 && sliderValue < 100 ? Infinity : 0 }}
                    >
                      Maximum
                    </motion.span>
              </div>
              
                  <div className="text-center">
                    <motion.div 
                      className="text-7xl font-black mb-2 tabular-nums"
                      animate={{ 
                        scale: sliderValue === 100 ? [1, 1.05, 1] : 1,
                        color: sliderValue === 100 ? '#22c55e' : '#60a5fa'
                      }}
                      transition={{ 
                        scale: { duration: 0.5, repeat: sliderValue === 100 ? 2 : 0 },
                        color: { duration: 0.3 }
                  }}
                >
                  {sliderValue}%
                    </motion.div>
                    <AnimatePresence>
                {sliderValue === 100 && (
                        <motion.p 
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-emerald-400 font-bold flex items-center justify-center gap-2"
                        >
                          <motion.span
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          >
                            🔥
                          </motion.span>
                          Maximum commitment unlocked
                          <motion.span
                            animate={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          >
                            🔥
                          </motion.span>
                        </motion.p>
                      )}
                      {sliderValue > 80 && sliderValue < 100 && (
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-purple-400 font-medium text-sm"
                        >
                          Almost there... push to 100%!
                        </motion.p>
                      )}
                    </AnimatePresence>
              </div>
                </div>
              </GlassCard>
            </motion.div>

              <AnimatePresence>
                {attemptedProceedWithIncomplete && sliderValue < 100 && (
                  <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                >
                  <GlassCard className="border-orange-500/30">
                    <div className="text-center space-y-3">
                      <motion.p 
                        className="text-orange-400 font-bold text-lg"
                        animate={{ x: [-2, 2, -2, 2, 0] }}
                        transition={{ duration: 0.4 }}
                      >
                        100% commitment required
                      </motion.p>
                      <p className="text-zinc-400">This system requires maximum dedication. Slide all the way to continue.</p>
                      
                      <button
                        onClick={() => onGoToLogin?.()}
                        className="text-zinc-500 hover:text-zinc-300 text-sm underline transition-colors"
                      >
                        I&apos;m not ready for this
                      </button>
                    </div>
                  </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>
          </motion.div>
        )

      case 2:
        // Final commitment
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-2xl mx-auto px-6 pt-8 min-h-screen"
          >
            {!showHoldButton && (
              <>
            <div className="space-y-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mx-auto flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-white" />
            </div>
                  <h2 className="text-3xl sm:text-4xl font-black">Final Commitment</h2>
              </div>
              
                <GlassCard className="text-left">
                  <div className="space-y-6">
                    <div className="space-y-4 text-zinc-300">
                      <p>This is where most people <span className="text-white font-semibold">back out</span>.</p>
                      <p>You&apos;ve read the rules. You understand the system.</p>
                      <p>From here on out, <span className="text-white font-semibold">every rep matters</span>. <span className="text-white font-semibold">Every miss costs</span>.</p>
                    </div>
                    
                    <div className="h-px bg-white/10" />
                    
                    <div className="space-y-3">
                      <h3 className="text-orange-400 font-bold">What this means:</h3>
                      <ul className="space-y-2 text-zinc-400">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          Daily discipline is required
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          Late logs = €10 penalty
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          Your data is visible to your group
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          Your commitment is binding
                        </li>
                      </ul>
                      </div>
                      
                    <div className="text-center text-zinc-500 py-4">
                        {!hasScrolledToBottom && (
                        <motion.p 
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                          ↓ Scroll to continue ↓
                        </motion.p>
                        )}
                      </div>
                    </div>
                </GlassCard>
                
                {hasScrolledToBottom && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 pb-8"
                  >
                      <motion.button
                        onClick={() => onGoToLogin?.()}
                      className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 font-semibold hover:bg-white/10 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                          I refuse
                      </motion.button>
                      <motion.button
                        onClick={() => setShowHoldButton(true)}
                      className="flex-1 h-14 rounded-2xl font-bold text-white"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                        background: 'linear-gradient(135deg, rgb(249, 115, 22), rgb(220, 38, 38))',
                        boxShadow: '0 0 30px rgba(249, 115, 22, 0.3)',
                      }}
                    >
                          I Commit
                      </motion.button>
                  </motion.div>
                )}
              </>
            )}

            {showHoldButton && (
              <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-30">
                  <motion.div
                  className="text-center px-8"
                  animate={{
                    scale: [1, 1.02, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <motion.p
                    className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight"
                    animate={{
                      opacity: currentQuote ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                      style={{
                      color: screenIntensity > 0.7 ? '#fbbf24' : '#f97316',
                      textShadow: `0 0 ${30 + screenIntensity * 50}px rgba(249, 115, 22, ${0.6 + screenIntensity * 0.4}), 0 0 ${60 + screenIntensity * 80}px rgba(249, 115, 22, ${0.3 + screenIntensity * 0.3})`,
                      }}
                    >
                      {currentQuote}
                  </motion.p>
                  <motion.div 
                    className="mt-6 text-lg text-orange-400/60 font-medium"
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {Math.round(holdProgress)}% committed
                  </motion.div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )

      case 3:
        // Create account
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-md mx-auto px-6 pt-8"
          >
            <div className="space-y-2">
              <motion.h2 
                className="text-3xl sm:text-4xl font-black"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Create Account
              </motion.h2>
              <motion.p 
                className="text-zinc-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Lock in your commitment
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard>
              <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left pl-1">Email</label>
                <input
                  type="email"
                      placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-4 bg-zinc-900/50 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      disabled={isLoading || demoMode}
                />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left pl-1">Password</label>
                <input
                  type="password"
                      placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-4 bg-zinc-900/50 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      disabled={isLoading || demoMode}
                />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left pl-1">Confirm Password</label>
                <input
                  type="password"
                      placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                      className={`w-full px-4 py-4 bg-zinc-900/50 border rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 transition-all ${
                    passwordConfirm && password !== passwordConfirm 
                          ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' 
                      : passwordConfirm && password === passwordConfirm 
                            ? 'border-emerald-500/50 focus:border-emerald-500/50 focus:ring-emerald-500/20'
                            : 'border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20'
                  }`}
                      disabled={isLoading || demoMode}
                />
                  </div>
                {passwordConfirm && password !== passwordConfirm && (
                    <p className="text-red-400 text-sm text-left">Passwords do not match</p>
                )}
                {passwordConfirm && password === passwordConfirm && password && (
                    <p className="text-emerald-400 text-sm text-left flex items-center gap-1">
                      <Check size={14} /> Passwords match
                    </p>
                )}
              </div>
              
              {error && (
                  <div className="mt-4 p-4 bg-red-950/50 border border-red-500/30 rounded-2xl">
                    <p className="text-red-400 text-sm">{error}</p>
              </div>
              )}
              </GlassCard>
          </motion.div>

            {/* Demo mode option */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-zinc-600 text-sm">or</span>
                <div className="h-px bg-white/10 flex-1" />
            </div>
            
                    <motion.button
                      onClick={() => {
                  setDemoMode(true)
                  // Set demo defaults
                  setGroupInfo({
                    name: 'Demo Squad',
                    member_count: 5,
                    daily_penalty: 10,
                    current_pot_amount: 150,
                    group_admin: { username: 'DemoAdmin', custom_icon: '👑' }
                  })
                  // Skip account creation, join group, and group confirmation - go directly to birthday (step 6)
                  setCurrentStep(6)
                }}
                className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 bg-white/5 border border-dashed border-white/20 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Sparkles size={16} />
                <span className="font-medium">Continue in Demo Mode</span>
                    </motion.button>
              <p className="text-zinc-600 text-xs">Skip account creation to preview the full onboarding</p>
            </motion.div>
          </motion.div>
        )

      case 4:
        // Join group
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-md mx-auto px-6 pt-8"
          >
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black">Join Your Group</h2>
              <p className="text-zinc-400">Enter the code from your group admin</p>
              </div>

            <GlassCard>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Invite Code</label>
                <input
                  type="text"
                    placeholder="XXXXXXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-5 bg-zinc-900/50 border border-white/10 rounded-2xl text-white text-center font-mono tracking-[0.3em] text-2xl placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all uppercase"
                  maxLength={8}
                  disabled={isLoading}
                />
                  <p className="text-zinc-600 text-xs">8-character code • Example: ABC12345</p>
            </div>
            
                <div className="pt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      setDemoMode(true)
                      setGroupInfo({
                        name: 'Demo Squad',
                        member_count: 5,
                        daily_penalty: 10,
                        current_pot_amount: 150,
                        group_admin: { username: 'DemoAdmin', custom_icon: '👑' }
                      })
                      nextStep()
                    }}
                    className="text-zinc-500 hover:text-zinc-300 text-sm underline transition-colors"
                  >
                    Skip for Demo
                  </button>
              </div>
                    </div>
                    
              {error && (
                <div className="mt-4 p-4 bg-red-950/50 border border-red-500/30 rounded-2xl">
                  <p className="text-red-400 text-sm">{error}</p>
                    </div>
              )}
            </GlassCard>
            
            <p className="text-zinc-500 text-sm">
              Once you join, your group will see your progress daily
            </p>
          </motion.div>
        )

      case 5:
        // Group confirmation
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-lg mx-auto px-6 pt-8"
          >
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black">Group Confirmed</h2>
              <p className="text-zinc-400">You&apos;re joining: <span className="text-white font-semibold">{groupInfo?.name || 'Loading...'}</span></p>
            </div>
            
            <GlassCard>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                    <p className="text-3xl font-black text-white">{groupInfo?.member_count || '1'}</p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-orange-400">€{groupInfo?.daily_penalty || '10'}</p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Failure Penalty</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-emerald-400">€{groupInfo?.current_pot_amount?.toFixed(0) || '0'}</p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Pot</p>
                  </div>
            </div>
            
                <div className="h-px bg-white/10" />
                
                <div className="text-center">
                  <p className="text-zinc-500 text-sm mb-1">Group Admin</p>
                  <p className="font-bold text-lg">
                    {groupInfo?.group_admin?.custom_icon || '👑'} {groupInfo?.group_admin?.username || 'Admin'}
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )

      case 6:
        // Birthday
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-md mx-auto px-6 pt-8"
          >
            <div className="space-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black">Birthday Challenge</h2>
              <p className="text-zinc-400">On your birthday, you must earn DOUBLE the points</p>
            </div>
            
            <GlassCard>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full px-4 py-4 bg-zinc-900/50 border border-white/10 rounded-2xl text-white text-center focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </GlassCard>
            
            {birthday && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard className="border-purple-500/30">
                  <div className="text-center">
                    <p className="text-purple-400 font-bold">Birthday Challenge Activated</p>
                    <p className="text-zinc-400 text-sm mt-1">
                      Double points on {new Date(birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </motion.div>
        )

      case 7:
        // Username
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-md mx-auto px-6 pt-8"
          >
            <div className="space-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl mx-auto flex items-center justify-center mb-4">
                <User className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black">Your Identity</h2>
              <p className="text-zinc-400">Choose a short nickname for your group</p>
            </div>
            
            <GlassCard>
              <div className="space-y-2">
              <input
                type="text"
                placeholder="NAME"
                value={username}
                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                  className="w-full px-4 py-5 bg-zinc-900/50 border border-white/10 rounded-2xl text-white text-center text-2xl font-bold tracking-wider placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all uppercase"
                  maxLength={4}
              />
                <p className="text-zinc-500 text-xs">4 characters max • This is how your group sees you</p>
            </div>
            </GlassCard>
            
            {username && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="inline-block px-6 py-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 rounded-2xl">
                  <span className="font-black text-3xl tracking-wider">{username}</span>
                </div>
                <p className="text-zinc-500 text-sm mt-2">Your display name</p>
              </motion.div>
            )}
          </motion.div>
        )

      case 8:
        // Complete - with confetti-like celebration
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-lg mx-auto px-6 pt-8 relative"
          >
            {/* Celebration particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                      style={{ 
                    background: ['#60a5fa', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'][i % 5],
                    left: `${10 + (i * 7)}%`,
                  }}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{
                    y: [0, 300 + Math.random() * 200],
                    opacity: [0, 1, 1, 0],
                    x: [0, (Math.random() - 0.5) * 100],
                    rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    delay: 0.5 + i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </div>
            
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.8, bounce: 0.5 }}
              className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-3xl mx-auto flex items-center justify-center relative"
            >
              <motion.div
                animate={{ 
                  boxShadow: [
                    '0 0 20px 0px rgba(16, 185, 129, 0.4)',
                    '0 0 40px 10px rgba(16, 185, 129, 0.6)',
                    '0 0 20px 0px rgba(16, 185, 129, 0.4)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-3xl"
              />
              <Check className="w-10 h-10 text-white relative z-10" />
            </motion.div>
            
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl sm:text-4xl font-black">
                {demoMode ? 'Demo Complete!' : 'Commitment Locked'}
              </h2>
              <p className="text-zinc-400">
                {demoMode ? 'You\'ve seen the full onboarding experience' : 'Your transformation begins now'}
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <GlassCard>
                <div className="space-y-6">
                  <motion.div 
                    className="flex items-center justify-center"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <div className="px-6 py-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 rounded-2xl">
                      <span className="font-black text-3xl tracking-wider">{username || 'USER'}</span>
                  </div>
                  </motion.div>

                  <div className="h-px bg-white/10" />

                  <div className="grid grid-cols-2 gap-4">
                    <motion.div 
                      className="text-center p-3 bg-white/5 rounded-xl"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <p className="text-zinc-500 text-xs uppercase tracking-wider">Group</p>
                      <p className="font-bold">{groupInfo?.name || 'Demo Squad'}</p>
                    </motion.div>
                    <motion.div 
                      className="text-center p-3 bg-white/5 rounded-xl"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <p className="text-zinc-500 text-xs uppercase tracking-wider">Failure Penalty</p>
                      <p className="font-bold text-orange-400">€{groupInfo?.daily_penalty || 10}</p>
                    </motion.div>
                </div>
                
                  {demoMode && (
                    <motion.div 
                      className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-2xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      <p className="text-blue-400 text-sm font-medium">🎭 Demo Mode</p>
                      <p className="text-zinc-400 text-xs mt-1">
                        Create a real account to start your commitment journey
                      </p>
                    </motion.div>
                  )}
                  
                  {error && (
                    <div className="p-4 bg-red-950/50 border border-red-500/30 rounded-2xl">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}
                  
                  {isLoading && (
                    <div className="text-center">
                      <motion.div 
                        className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full mx-auto"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <p className="text-zinc-500 text-sm mt-2">Completing setup...</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
            
            <motion.p 
              className="text-zinc-600 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {demoMode ? 'Ready to commit for real?' : 'Welcome to the commitment lifestyle'}
            </motion.p>
          </motion.div>
        )

      default:
        return null
    }
  }

  const getButtonText = () => {
    if (currentStep === 0 && currentRuleCard === 0) {
      return revealedSentences >= welcomeSentences.length ? 'Continue' : 'Next'
    } else if (currentStep === 0 && currentRuleCard === 1) {
      if (revealedRuleCards < ruleCards.length) {
        if (revealedRuleCards > 0 && !confirmedRuleCards[revealedRuleCards - 1]) {
          return 'Confirm rule first'
        }
        return 'Next Rule'
      } else if (confirmedRuleCards.every(confirmed => confirmed)) {
        return 'I Accept'
      } else {
        return 'Confirm all rules'
      }
    } else if (currentStep === 2) {
      return holdProgress >= 100 ? 'Continue' : ''
    } else if (currentStep === 3) {
      return 'Create Account'
    } else if (currentStep === 4) {
      return 'Join Group'
    } else if (currentStep === 5) {
      return 'Continue'
    } else if (currentStep === 6) {
      return 'Save Avatar'
    } else if (currentStep === 7) {
      return 'Save Color'
    } else if (currentStep === 8) {
      return 'Continue'
    } else if (currentStep === 9) {
      return demoMode ? 'Preview Complete' : 'Complete Setup'
    } else if (currentStep === 10) {
      return demoMode ? 'Start Over' : 'Enter Dashboard'
    } else {
      return 'Continue'
    }
  }

  const handleButtonClick = () => {
    if (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) {
      revealNextSentence()
    } else if (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length) {
      if (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1]) {
        revealNextRuleCard()
      }
    } else if (currentStep === 1) {
      if (sliderValue === 100) {
        nextStep()
        setAttemptedProceedWithIncomplete(false)
      } else {
        setAttemptedProceedWithIncomplete(true)
      }
    } else if (currentStep === 2) {
      if (holdProgress >= 100) {
        nextStep()
      }
    } else if (currentStep === 3) {
      handleSignUp()
    } else if (currentStep === 4) {
      handleInviteCodeJoin()
    } else if (currentStep === 10 && demoMode) {
      // In demo mode, restart the onboarding
      setCurrentStep(0)
      setCurrentRuleCard(0)
      setRevealedSentences(0)
      setRevealedRuleCards(0)
      setConfirmedRuleCards([false, false, false, false, false, false, false])
      setSliderValue(50)
      setHoldProgress(0)
      setShowHoldButton(false)
      setFinalWarningCompleted(false)
      setDemoMode(false)
      setSelectedEmoji('')
      setSelectedColor('')
      setBirthday('')
      setUsername('')
      setGroupInfo(null)
      window.scrollTo(0, 0)
    } else if (canProceed()) {
      nextStep()
      setAttemptedProceedWithIncomplete(false)
    }
  }

  const calculateTotalSteps = () => 9
  const calculateCurrentStep = () => {
    if (currentStep === 0 && currentRuleCard === 0) return 0
    if (currentStep === 0 && currentRuleCard === 1) return 1
    return currentStep + 1
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
    <div 
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-60"
      style={{
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.12) 0%, rgba(79, 70, 229, 0.08) 40%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-50"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(79, 70, 229, 0.06) 40%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        
        {/* Orange overlay when holding */}
        {showHoldButton && screenIntensity > 0 && (
          <div 
            className="absolute inset-0 transition-opacity"
            style={{
              background: `radial-gradient(circle at center, rgba(249, 115, 22, ${screenIntensity * 0.2}) 0%, transparent 70%)`,
          }}
        />
      )}
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-14">
          {(currentStep > 0 || currentRuleCard > 0) && currentStep !== 2 ? (
          <motion.button
            onClick={prevStep}
              className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors p-2 -ml-2 rounded-xl hover:bg-white/5"
              whileHover={{ x: -2 }}
            whileTap={{ scale: 0.95 }}
          >
              <ChevronLeft size={20} />
              <span className="text-sm font-medium">Back</span>
          </motion.button>
          ) : (
            <div className="w-20" />
          )}
          
          {/* Progress */}
          <div className="flex gap-1">
            {Array.from({ length: calculateTotalSteps() }).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i < calculateCurrentStep()
                    ? 'w-4 bg-gradient-to-r from-blue-400 to-purple-500'
                    : i === calculateCurrentStep()
                    ? 'w-4 bg-white/40'
                    : 'w-1.5 bg-white/10'
                }`}
              />
            ))}
          </div>
          
          {currentStep < 3 && !finalWarningCompleted ? (
          <motion.button
            onClick={() => onGoToLogin?.()}
              className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
            whileHover={{ scale: 1.05 }}
          >
              Login
          </motion.button>
          ) : (
            <div className="w-20" />
        )}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentStep}-${currentRuleCard}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
      </div>

      {/* Bottom Button - Hide for step 2 unless completed */}
      {(currentStep !== 2 || holdProgress >= 100) && getButtonText() && (
        <div className="fixed bottom-6 left-4 right-4 z-20">
          <div className="max-w-md mx-auto">
          <motion.button
            onClick={handleButtonClick}
            disabled={
              isLoading || !(
                (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) ||
                (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length && (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1])) ||
                canClickCommitButton()
              )
            }
              className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 transition-all overflow-hidden disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            background: !isLoading && (
              (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) ||
              (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length && (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1])) ||
              canClickCommitButton()
            ) ? 
                  'linear-gradient(135deg, rgb(96, 165, 250) 0%, rgb(79, 70, 229) 100%)' : 
                  'linear-gradient(135deg, rgb(63, 63, 70) 0%, rgb(39, 39, 42) 100%)',
                boxShadow: !isLoading && canClickCommitButton() ? '0 0 30px 5px rgba(96, 165, 250, 0.2)' : 'none',
              }}
            >
              <span className="text-white font-bold">
                {isLoading ? 'Processing...' : getButtonText()}
          </span>
              {!isLoading && canClickCommitButton() && <ChevronRight size={20} className="text-white" />}
        </motion.button>
          </div>
      </div>
      )}

      {/* Hold button for step 2 */}
      {currentStep === 2 && showHoldButton && holdProgress < 100 && (
        <div className="fixed bottom-6 left-4 right-4 z-50">
          <div className="max-w-md mx-auto">
          <button
              className="relative w-full h-16 rounded-2xl font-bold text-white overflow-hidden"
            onMouseDown={startHolding}
            onMouseUp={stopHolding}
            onMouseLeave={stopHolding}
            onTouchStart={startHolding}
            onTouchEnd={stopHolding}
            style={{
                background: 'linear-gradient(135deg, rgb(249, 115, 22), rgb(220, 38, 38))',
                boxShadow: '0 0 30px rgba(249, 115, 22, 0.4)',
              }}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 rounded-2xl transition-all"
              style={{ 
                width: `${holdProgress}%`,
                  background: 'linear-gradient(135deg, rgb(234, 179, 8), rgb(245, 158, 11))',
              }}
            />
              <span className="relative z-10">
                {holdProgress > 0 ? `${Math.round(holdProgress)}%` : 'HOLD TO COMMIT'}
            </span>
          </button>
          </div>
        </div>
      )}
      
      {/* Completed hold button */}
      {currentStep === 2 && showHoldButton && holdProgress >= 100 && (
        <div className="fixed bottom-6 left-4 right-4 z-50">
          <div className="max-w-md mx-auto">
            <motion.button
              onClick={nextStep}
              className="w-full h-16 rounded-2xl font-bold text-white"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: 'linear-gradient(135deg, rgb(34, 197, 94), rgb(16, 185, 129))',
                boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)',
              }}
            >
              🔥 COMMITTED! Continue 🔥
            </motion.button>
          </div>
        </div>
      )}
    </div>
  )
}
