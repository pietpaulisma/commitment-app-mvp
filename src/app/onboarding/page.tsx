'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, AlertTriangle, Zap, Users, Target, Shield, Skull } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface OnboardingFlowProps {
  onComplete?: () => void
  onGoToLogin?: () => void
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const handleOnboardingComplete = () => {
    console.log('Onboarding completed, redirecting to dashboard...')
    // Add a small delay to ensure state is settled
    setTimeout(() => {
      router.push('/dashboard')
    }, 100)
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
  const [selectedEmoji, setSelectedEmoji] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [birthday, setBirthday] = useState('')
  const [username, setUsername] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [attemptedProceedWithIncomplete, setAttemptedProceedWithIncomplete] = useState(false)
  const [finalWarningCompleted, setFinalWarningCompleted] = useState(false)
  const [confirmedRuleCards, setConfirmedRuleCards] = useState<boolean[]>([false, false, false, false, false, false, false])
  const [showHoldButton, setShowHoldButton] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [selectedEmojiInput, setSelectedEmojiInput] = useState('')
  const [groupInfo, setGroupInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const finalWarningQuotes = [
    "Are you sure...",
    "ARE YOU REALLY SURE?",
    "THIS IS NOT FOR EVERYBODY",
    "THIS IS A LIFESTYLE",
    "NO BACKING OUT",
    "YOUR COMMITMENT IS BINDING",
    "YOU'RE ALL IN NOW"
  ]

  const colors = [
    '#DC2626', '#EA580C', '#D97706', '#EAB308', '#65A30D', 
    '#059669', '#0891B2', '#2563EB', '#7C3AED', '#C026D3', 
    '#E11D48', '#F97316', '#84CC16', '#06B6D4', '#8B5CF6'
  ]

  // Welcome screen sentences
  const welcomeSentences = [
    "This is a COMMITMENT system.",
    "You show up every day. Or you pay.",
    "Miss a session — or log it late — that's €10 to the group pot.",
    "This is a social contract. You support each other. You hold each other accountable.",
    "The money funds your crew — for fun, or for good.",
    "Understand this before you commit."
  ]

  // Rule cards data
  const ruleCards = [
    {
      icon: Zap,
      title: "Show up daily.",
      description: "Every day, your target increases by one point. No skipping. No banking. No compromises.",
      color: "#DC2626",
    },
    {
      icon: AlertTriangle,
      title: "Log it or pay.",
      description: "If you don't log your workout before midnight, you owe €10 to the group pot. No exceptions. No excuses.",
      color: "#EA580C",
    },
    {
      icon: Target,
      title: "Follow the system.",
      description: "Only approved exercises count. Each has a defined point value. No improvising. No freelancing.",
      color: "#7C3AED",
    },
    {
      icon: Shield,
      title: "Own your absence.",
      description: "Sickness or grief may pause your progress — but you return when you can. If you abuse this, the system won't break — you will.",
      color: "#059669",
    },
    {
      icon: Users,
      title: "The pot belongs to the group.",
      description: "Every €10 goes into a collective fund. It fuels whatever the group decides — celebration, charity, or chaos.",
      color: "#0891B2",
    },
    {
      icon: Shield,
      title: "This is not a challenge.",
      description: "This is a standard. A pact. A personal operating system designed to build strength, discipline, and integrity.",
      color: "#C026D3",
    },
    {
      icon: Skull,
      title: "There is no exit.",
      description: "Silence means you keep paying. You owe it to your crew — and to your own health. This is a commitment for life.",
      color: "#4B5563",
    }
  ]

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isHolding && holdProgress < 100) {
      interval = setInterval(() => {
        setHoldProgress(prev => {
          const newProgress = Math.min(prev + (100/150), 100)
          const quoteIndex = Math.floor((newProgress / 100) * finalWarningQuotes.length)
          setCurrentQuote(finalWarningQuotes[Math.min(quoteIndex, finalWarningQuotes.length - 1)])
          setScreenIntensity(newProgress / 100)
          
          if (newProgress >= 100) {
            setFinalWarningCompleted(true)
            setTimeout(() => {
              setScreenIntensity(0.2)
              // Automatically proceed to next step after completion
              setTimeout(() => {
                nextStep()
              }, 2000) // Wait 2 seconds to show completion state
            }, 1000)
          }
          
          return newProgress
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isHolding, holdProgress])

  // Handle scroll detection for final commitment page
  useEffect(() => {
    if (currentStep === 2) {
      // Reset scroll state when entering step 2
      setHasScrolledToBottom(false)
      
      const handleScroll = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollHeight = document.documentElement.scrollHeight
        const clientHeight = document.documentElement.clientHeight
        
        // Only consider scrolled to bottom if there's actually content to scroll
        // and user has scrolled significantly
        if (scrollHeight > clientHeight + 100) { // Only if page is taller than viewport + 100px
          if (scrollTop + clientHeight >= scrollHeight - 50) {
            setHasScrolledToBottom(true)
          } else {
            setHasScrolledToBottom(false)
          }
        } else {
          // If content doesn't require scrolling, don't show buttons yet
          setHasScrolledToBottom(false)
        }
      }

      window.addEventListener('scroll', handleScroll)
      // Wait a bit before first check to ensure content is fully rendered
      setTimeout(() => {
        handleScroll()
      }, 500)
      
      // Remove auto-scroll for step 2 - user should manually scroll
      
      return () => {
        window.removeEventListener('scroll', handleScroll)
      }
    }
  }, [currentStep])

  // Global mouse/touch event listeners for slider dragging
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
        e.preventDefault() // Prevent scrolling while dragging
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
      console.log('Onboarding nextStep completed, calling onComplete callback')
      onComplete?.()
    }
  }

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
      
      // Auto-scroll to show the new content after a short delay for animation
      setTimeout(() => {
        const newSentenceCount = revealedSentences + 1
        if (newSentenceCount >= 2) { // Start scrolling from 2nd sentence
          // More aggressive scrolling to ensure content is visible
          const viewportHeight = window.innerHeight
          const scrollAmount = Math.max(150, viewportHeight * 0.25) // Scroll 25% of viewport or 150px min
          
          window.scrollBy({
            top: scrollAmount,
            behavior: 'smooth'
          })
        }
      }, 300) // Wait for animation to start
    }
  }

  const revealNextRuleCard = () => {
    if (revealedRuleCards < ruleCards.length) {
      setRevealedRuleCards(revealedRuleCards + 1)
      
      // Very aggressive auto-scroll for rule cards to ensure confirm button is visible
      setTimeout(() => {
        const newCardCount = revealedRuleCards + 1
        if (newCardCount >= 1) { // Start scrolling from first card
          // Try to find the latest card and scroll it fully into view with extra padding
          const ruleCardElements = document.querySelectorAll('[data-rule-card]')
          const latestCard = ruleCardElements[newCardCount - 1] as HTMLElement
          
          if (latestCard) {
            // Scroll the card into view with extra bottom padding to show confirm button
            const cardRect = latestCard.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            const desiredBottomPadding = viewportHeight * 0.3 // 30% of viewport as padding below the card
            
            window.scrollBy({
              top: cardRect.bottom + desiredBottomPadding - viewportHeight,
              behavior: 'smooth'
            })
          } else {
            // Fallback to aggressive fixed scroll
            const viewportHeight = window.innerHeight
            const scrollAmount = Math.max(400, viewportHeight * 0.6) // Scroll 60% of viewport or 400px min
            
            window.scrollBy({
              top: scrollAmount,
              behavior: 'smooth'
            })
          }
        }
      }, 500) // Wait a bit longer to ensure the card is fully rendered
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
    // Demo/testing mode - skip account creation if fields are empty
    if (!email.trim() || !password.trim()) {
      console.log('Creating demo user for testing')
      // Create a demo user session for testing
      const testUser = {
        id: 'test-onboarding-user-' + Date.now(),
        email: email.trim() || 'test@onboarding.com',
        role: 'user'
      }
      localStorage.setItem('demo-user', JSON.stringify(testUser))
      
      // Small delay to ensure localStorage is set
      setTimeout(() => {
        nextStep()
      }, 100)
      return
    }

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
      
      // Check if user was created successfully
      if (data.user) {
        console.log('User created:', data.user.email)
        
        // If user needs email confirmation, show message
        if (!data.session && data.user && !data.user.email_confirmed_at) {
          setError('Please check your email and click the confirmation link, then try logging in.')
          setIsLoading(false)
          return
        }
        
        // If user is immediately signed in (confirmation disabled), continue
        if (data.session) {
          nextStep()
        } else {
          // For email confirmation flow, redirect to login
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
      // Check if we're in demo mode
      const demoUser = localStorage.getItem('demo-user')
      if (demoUser) {
        console.log('Demo mode: skipping invite code validation')
        // In demo mode, just proceed to next step
        setTimeout(() => {
          nextStep()
        }, 1000) // Simulate some loading time
        return
      }

      // First, ensure the user profile exists
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Check if profile exists, create if it doesn't
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
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

      // Now try to join the group
      const { data, error } = await supabase.rpc('join_group_via_invite', {
        p_invite_code: inviteCode.trim().toUpperCase()
      })

      if (error) throw error

      if (data.success) {
        // Fetch the full group information after successfully joining
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', data.group_id)
          .single()

        // Get member count separately
        const { count: memberCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', data.group_id)

        // Get group admin info
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

  const handleCompleteProfile = async () => {
    if (!username.trim()) {
      setError('Username is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Check if we're in demo mode
      const demoUser = localStorage.getItem('demo-user')
      if (demoUser) {
        console.log('Demo mode: skipping profile database update')
        // In demo mode, just proceed to completion
        setTimeout(() => {
          onComplete?.()
        }, 1000)
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          onboarding_completed: true,
          personal_color: selectedColor,
          custom_icon: selectedEmoji || selectedEmojiInput,
          birth_date: birthday
        })
        .eq('id', user?.id)

      if (updateError) {
        // Try fallback without custom columns
        const { error: basicUpdateError } = await supabase
          .from('profiles')
          .update({
            username: username.trim(),
            onboarding_completed: true
          })
          .eq('id', user?.id)
          
        if (basicUpdateError) {
          throw basicUpdateError
        }
      }

      onComplete?.()
    } catch (error: any) {
      console.error('Profile update failed:', error)
      setError(error.message || 'Failed to save profile')
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
        return email.trim() && password.trim() && password === passwordConfirm
      case 4:
        return inviteCode.trim()
      case 5:
        return true
      case 6:
        return selectedEmoji || selectedEmojiInput
      case 7:
        return selectedColor
      case 8:
        return birthday
      case 9:
        return username.trim()
      case 10:
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

  const getGradientIntensity = () => {
    if (!finalWarningCompleted) {
      return 0
    }
    
    const totalSteps = 12
    const baseIntensity = 0.6
    const progressBonus = (currentStep / totalSteps) * 0.4
    
    return Math.min(baseIntensity + progressBonus, 1)
  }

  const gradientIntensity = getGradientIntensity()

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        if (currentRuleCard === 0) {
          // Welcome screen with tap-to-reveal
          return (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="text-center space-y-12 max-w-4xl mx-auto px-4"
              style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
            >
              <div className="space-y-8">
                <div className="flex justify-center">
                  <img 
                    src="/logo.png" 
                    alt="The Commitment" 
                    className="h-16 md:h-20 w-auto drop-shadow-2xl"
                  />
                </div>
              </div>
              
              <div className="max-w-4xl mx-auto px-4">
                <div className="text-center min-h-[400px] flex flex-col justify-center">
                  <div className="relative space-y-4">
                    <motion.div
                      initial={{ opacity: 0, y: 40, scale: 1.1 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        scale: 1
                      }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                      className="text-white font-black leading-tight"
                      style={{
                        fontSize: revealedSentences === 0 ? '2rem' : `${Math.max(1.2, 2 - (revealedSentences * 0.15))}rem`
                      }}
                    >
                      This is not just another fitness app - <span className="text-red-400 underline">it's a lifestyle</span>.
                    </motion.div>
                    
                    <AnimatePresence>
                      {welcomeSentences.slice(0, revealedSentences).map((sentence, index) => {
                        const sentenceAge = revealedSentences - index - 1
                        const fontSize = Math.max(1.1, 2.2 - (sentenceAge * 0.2))
                        const opacity = Math.max(0.6, 1 - (sentenceAge * 0.08))
                        
                        const colors = ['#ffffff', '#e5e7eb', '#fca5a5', '#d1d5db', '#9ca3af', '#f87171']
                        const color = colors[index] || '#9ca3af'
                        
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 40, scale: 1.1 }}
                            animate={{ 
                              opacity: opacity,
                              y: 0,
                              scale: 1
                            }}
                            transition={{ 
                              duration: 0.6, 
                              ease: "easeOut",
                              delay: 0.1
                            }}
                            className="font-black leading-tight"
                            style={{
                              fontSize: `${fontSize}rem`,
                              color: color,
                              marginTop: sentenceAge === 0 ? '1.5rem' : '0.75rem'
                            }}
                          >
                            {sentence.includes("COMMITMENT") ? (
                              <>This is a <span className="text-red-400">COMMITMENT</span> system.</>
                            ) : (
                              sentence
                            )}
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        } else {
          // Rule cards
          return (
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="text-center space-y-8 max-w-4xl mx-auto px-4"
              style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
            >
              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-black mb-4">THE RULES</h2>
                <p className="text-xl md:text-2xl text-gray-300 font-bold">Read every single one. They are non-negotiable.</p>
              </div>
              
              <div className="space-y-8 min-h-[500px] flex flex-col justify-start">
                <AnimatePresence>
                  {ruleCards.slice(0, revealedRuleCards).map((rule, index) => {
                    const Icon = rule.icon
                    const isConfirmed = confirmedRuleCards[index]
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 40, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className={`border rounded-2xl p-6 md:p-8 relative overflow-hidden max-w-2xl mx-auto w-full transition-all ${
                          isConfirmed 
                            ? 'bg-green-900/30 border-green-500' 
                            : 'bg-black border-gray-700'
                        }`}
                        style={{
                          boxShadow: isConfirmed 
                            ? '0 15px 50px rgba(34, 197, 94, 0.4)' 
                            : `0 15px 50px ${rule.color}30`
                        }}
                      >
                        <div className="text-center space-y-6">
                          <div className="flex justify-center">
                            <div 
                              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center"
                              style={{ 
                                backgroundColor: isConfirmed ? '#22c55e' : rule.color,
                                boxShadow: `0 10px 30px ${isConfirmed ? 'rgba(34, 197, 94, 0.4)' : rule.color}40`
                              }}
                            >
                              <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <h3 
                              className={`text-2xl md:text-3xl font-black transition-colors ${
                                isConfirmed ? 'text-green-400' : 'text-white'
                              }`}
                            >
                              {rule.title}
                            </h3>
                            
                            <p className={`text-base md:text-lg leading-relaxed font-bold transition-colors ${
                              isConfirmed ? 'text-green-200' : 'text-gray-300'
                            }`}>
                              {rule.description}
                            </p>
                          </div>
                          
                          <div className="pt-4">
                            {!isConfirmed ? (
                              <motion.button
                                onClick={() => {
                                  const newConfirmed = [...confirmedRuleCards]
                                  newConfirmed[index] = true
                                  setConfirmedRuleCards(newConfirmed)
                                }}
                                className="px-6 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-gray-300 hover:text-white hover:border-gray-500 transition-all font-bold"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                CONFIRM
                              </motion.button>
                            ) : (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center justify-center space-x-2 text-green-400 font-black"
                              >
                                <span className="text-2xl">✓</span>
                                <span>CONFIRMED</span>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )
        }

      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-2xl mx-auto px-4 relative"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
          >
            <div className="space-y-4 relative z-10">
              <h2 className="text-4xl md:text-5xl font-black">Set Your Commitment Level</h2>
              <p className="text-xl md:text-2xl text-gray-300 font-bold">Choose your intensity level</p>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="relative p-6">
                <div className="relative">
                  <div 
                    className="w-full h-8 rounded-full relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(180deg, #1f2937 0%, #374151 50%, #1f2937 100%)',
                      boxShadow: 'inset 0 4px 8px rgba(0, 0, 0, 0.6), inset 0 -2px 4px rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(75, 85, 99, 0.8)'
                    }}
                  >
                    <motion.div 
                      className="h-full rounded-full relative overflow-hidden"
                      style={{
                        width: `${sliderValue}%`,
                        background: sliderValue === 100 
                          ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 25%, #15803d 50%, #166534 75%, #14532d 100%)'
                          : `linear-gradient(135deg, #dc2626 0%, #ef4444 25%, #f87171 50%, #fca5a5 75%, #fecaca 100%)`,
                        transition: 'all 0.3s ease-out'
                      }}
                    />
                  </div>
                  
                  {/* Touch-friendly slider overlay */}
                  <div
                    data-slider-track
                    className="absolute inset-0 w-full h-8 cursor-pointer"
                    style={{ zIndex: 10 }}
                    onMouseDown={(e) => {
                      setIsDragging(true)
                      const updateSlider = (clientX: number) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
                        setSliderValue(Math.round(percentage))
                        if (Math.round(percentage) === 100) {
                          setAttemptedProceedWithIncomplete(false)
                        }
                      }
                      updateSlider(e.clientX)
                    }}
                    onTouchStart={(e) => {
                      setIsDragging(true)
                      const updateSlider = (clientX: number) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
                        setSliderValue(Math.round(percentage))
                        if (Math.round(percentage) === 100) {
                          setAttemptedProceedWithIncomplete(false)
                        }
                      }
                      const touch = e.touches[0]
                      updateSlider(touch.clientX)
                    }}
                    onMouseMove={(e) => {
                      if (isDragging) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
                        setSliderValue(Math.round(percentage))
                        if (Math.round(percentage) === 100) {
                          setAttemptedProceedWithIncomplete(false)
                        }
                      }
                    }}
                    onTouchMove={(e) => {
                      if (isDragging) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const touch = e.touches[0]
                        const percentage = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100))
                        setSliderValue(Math.round(percentage))
                        if (Math.round(percentage) === 100) {
                          setAttemptedProceedWithIncomplete(false)
                        }
                      }
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    onTouchEnd={() => setIsDragging(false)}
                  />
                  
                  <motion.div 
                    className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      left: `calc(${sliderValue}% - 20px)`,
                      zIndex: 15
                    }}
                  >
                    <div 
                      className="w-10 h-10 rounded-full border-4 border-white relative overflow-hidden"
                      style={{
                        background: sliderValue === 100 
                          ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)'
                          : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
                        cursor: 'pointer'
                      }}
                    />
                  </motion.div>
                </div>
                
                <div className="flex justify-between text-lg md:text-xl mt-6 font-bold">
                  <span className="text-gray-400">Casual</span>
                  <span className="text-red-400 font-black">BEAST MODE</span>
                </div>
              </div>
              
              <div className="text-center py-6">
                <div 
                  className="text-7xl md:text-8xl font-black mb-4"
                  style={{
                    color: sliderValue === 100 ? '#22c55e' : '#ef4444',
                  }}
                >
                  {sliderValue}%
                </div>
                {sliderValue === 100 && (
                  <p className="text-xl md:text-2xl font-black text-green-400">
                    MAXIMUM COMMITMENT ACHIEVED
                  </p>
                )}
              </div>

              <AnimatePresence>
                {attemptedProceedWithIncomplete && sliderValue < 100 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className="bg-red-950/50 border border-red-600 rounded-2xl p-6 space-y-4"
                  >
                    <div>
                      <p className="text-red-400 font-black text-xl mb-2">ACCESS DENIED</p>
                      <p className="text-gray-300 font-bold text-lg mb-4">
                        This system requires 100% commitment. Anything less is failure.
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t border-red-600/30">
                      <button
                        onClick={() => onGoToLogin?.()}
                        className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-xl text-gray-300 hover:text-white transition-colors font-bold text-center"
                      >
                        I'm not made for this
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )

      // Add other cases as needed - simplified for now
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-md mx-auto px-4"
          >
            <div className="space-y-4">
              <h2 className="text-4xl font-black">Create Your Account</h2>
              <p className="text-xl text-gray-300 font-bold">Enter your credentials to lock in your commitment.</p>
              <p className="text-sm text-gray-400 font-medium">Leave fields empty to skip account creation for testing</p>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 backdrop-blur-sm">
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Email address (optional for testing)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg font-medium placeholder-gray-400 focus:border-red-500 focus:outline-none backdrop-blur-sm transition-all"
                  disabled={isLoading}
                />
                <input
                  type="password"
                  placeholder="Create password (optional for testing)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg font-medium placeholder-gray-400 focus:border-red-500 focus:outline-none backdrop-blur-sm transition-all"
                  disabled={isLoading}
                />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className={`w-full px-4 py-4 bg-gray-800/50 border rounded-xl text-white text-lg font-medium placeholder-gray-400 focus:outline-none backdrop-blur-sm transition-all ${
                    passwordConfirm && password !== passwordConfirm 
                      ? 'border-red-500 focus:border-red-400' 
                      : passwordConfirm && password === passwordConfirm 
                        ? 'border-green-500 focus:border-green-400'
                        : 'border-gray-600 focus:border-red-500'
                  }`}
                  disabled={isLoading}
                />
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="text-red-400 font-bold text-sm">Passwords do not match</p>
                )}
                {passwordConfirm && password === passwordConfirm && password && (
                  <p className="text-green-400 font-bold text-sm">Passwords match ✓</p>
                )}
              </div>
              
              {error && (
                <div className="bg-red-900/50 border border-red-600 rounded-xl p-4 mt-4">
                  <p className="text-red-200 text-sm font-bold">{error}</p>
                </div>
              )}
            </div>
          </motion.div>
        )

      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-md mx-auto px-4"
          >
            <div className="space-y-4">
              <h2 className="text-3xl font-black">JOIN YOUR ACCOUNTABILITY GROUP</h2>
              <p className="text-xl text-gray-300 font-bold">Enter the code to join your witnesses</p>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <div>
                <h3 className="text-2xl font-black mb-4">ENTER GROUP CODE</h3>
                <p className="text-gray-400 font-bold mb-6">8-character code from your group admin</p>
                
                <input
                  type="text"
                  placeholder="ENTER CODE"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-4 bg-gray-800/50 border border-red-600 rounded-xl text-white text-center font-mono tracking-widest text-xl font-bold focus:border-red-400 focus:outline-none backdrop-blur-sm transition-all"
                  maxLength={8}
                  disabled={isLoading}
                />
                
                <p className="text-gray-500 text-sm font-medium mt-3">Example: ABC12345</p>
              </div>
              
              {error && (
                <div className="bg-red-900/50 border border-red-600 rounded-xl p-4">
                  <p className="text-red-200 text-sm font-bold">{error}</p>
                </div>
              )}
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-gray-400 font-bold text-lg">Once you join, there's no hiding from your group</p>
              <p className="text-red-400 font-black text-xl">They will see everything</p>
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="text-center space-y-8 max-w-4xl mx-auto px-4 relative min-h-screen"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
          >
            {/* Header - only show when not in hold mode */}
            {!showHoldButton && (
              <div className="space-y-4 relative z-10 pointer-events-none">
                <motion.div
                  animate={{ 
                    boxShadow: `0 15px 40px rgba(220, 38, 38, ${0.5 + screenIntensity * 0.3})` 
                  }}
                  className="w-16 h-16 bg-red-600 rounded-2xl mx-auto flex items-center justify-center"
                >
                  <AlertTriangle className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-4xl md:text-5xl font-black">FINAL COMMITMENT</h2>
              </div>
            )}
            
            {/* Content area - only show when not in hold mode */}
            {!showHoldButton && (
              <div className="space-y-8 relative z-10 pointer-events-auto min-h-screen pb-32">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-gradient-to-br from-red-950/50 to-red-900/30 border border-red-500/30 rounded-2xl p-6 md:p-8 backdrop-blur-sm max-w-2xl mx-auto"
                >
                  <div className="text-center space-y-6">
                    <div className="space-y-4 text-lg md:text-xl font-normal text-gray-300">
                      <p>This is where most people <span className="font-bold">back out</span>.</p>
                      <p>You've read the rules. You understand the system.</p>
                      <p>From here on out, <span className="font-bold">every rep matters</span>. <span className="font-bold">Every miss costs</span>.</p>
                      <p>The group is <span className="font-bold">watching</span>. So is the system.</p>
                    </div>
                    
                    <div className="space-y-4 text-lg md:text-xl font-normal text-gray-300">
                      <p>There's <span className="font-bold">no pause button</span>. <span className="font-bold">No ghosting</span>.</p>
                      <p>You don't join to <span className="font-bold">try</span> — you join to <span className="font-bold">change</span>.</p>
                    </div>
                    
                    {/* Additional content to require scrolling */}
                    <div className="space-y-8 py-8">
                      {/* Separator */}
                      <div className="text-center text-gray-500 text-2xl">
                        ⸻
                      </div>
                      
                      <div className="space-y-6 text-lg text-gray-300">
                        <h3 className="text-2xl font-black text-red-400">THE REALITY CHECK</h3>
                        <div className="space-y-4">
                          <p>Most fitness apps let you lie to yourself. This one doesn't.</p>
                          <p>Most groups let you disappear quietly. This one doesn't.</p>
                          <p>Most systems let you quit when it gets hard. This one doesn't.</p>
                        </div>
                      </div>

                      {/* Separator */}
                      <div className="text-center text-gray-500 text-2xl">
                        ⸻
                      </div>
                      
                      {/* Lock in terms */}
                      <div className="bg-black/30 border border-red-600/50 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex items-center space-x-3 mb-4 justify-center">
                          <span className="text-2xl">🔐</span>
                          <span className="text-red-400 font-black text-xl">LOCK IN TERMS</span>
                        </div>
                        
                        <div className="text-left space-y-3 text-gray-200 text-base md:text-lg font-bold">
                          <p>• Daily discipline is required</p>
                          <p>• Late logs = €10 penalty</p>
                          <p>• Only approved exercises count</p>
                          <p>• Excuses are tracked</p>
                          <p>• Your data is visible to your group</p>
                          <p>• There is no exit button</p>
                          <p>• Your commitment is binding</p>
                          <p>• The system never forgets</p>
                        </div>
                      </div>

                      {/* More content */}
                      <div className="space-y-6 text-lg text-gray-300">
                        <h3 className="text-2xl font-black text-red-400">WHAT HAPPENS NEXT</h3>
                        <div className="space-y-4">
                          <p>You'll join your group. They'll see your progress every day.</p>
                          <p>You'll choose your identity - avatar and color. <span className="font-bold text-red-400">For life.</span></p>
                          <p>You'll start earning points immediately. Miss a day? Pay the price.</p>
                          <p>There's no trial period. No refunds. No second chances.</p>
                        </div>
                      </div>
                      
                      {/* Separator */}
                      <div className="text-center text-gray-500 text-2xl">
                        ⸻
                      </div>
                      
                      <div className="space-y-4 text-lg md:text-xl font-bold text-gray-300 text-center">
                        <p>If you're not ready, leave now.</p>
                        <p>If you are — scroll down to commit, and never look back.</p>
                      </div>
                      
                      {/* Separator */}
                      <div className="text-center text-gray-500 text-2xl">
                        ⸻
                      </div>
                      
                      <div className="space-y-4 text-lg md:text-xl font-bold text-gray-300 text-center">
                        <p>This is your last chance to opt out.</p>
                        <p className="text-red-400">Are you ready to live by this level of accountability?</p>
                        
                        {!hasScrolledToBottom && (
                          <motion.div 
                            className="pt-8"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <p className="text-gray-500 text-base">↓ Scroll down to continue ↓</p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Floating quotes overlay during holding - appears over everything */}
            {showHoldButton && currentQuote && (
              <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-30">
                <AnimatePresence>
                  <motion.div
                    key={currentQuote}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.2, y: -20 }}
                    className="text-center"
                  >
                    <p
                      className={`font-black ${
                        screenIntensity > 0.7 ? 'text-red-300' : 'text-red-500'
                      }`}
                      style={{
                        textShadow: `0 0 ${screenIntensity * 40}px rgba(220, 38, 38, ${0.8 + screenIntensity * 0.2})`,
                        fontSize: `${2 + screenIntensity * 3}rem`,
                        fontWeight: Math.min(900, 700 + screenIntensity * 200),
                        letterSpacing: `${screenIntensity * 0.1}em`,
                        transform: `scale(${1 + screenIntensity * 0.3})`
                      }}
                    >
                      {currentQuote}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )

      case 5:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-2xl mx-auto px-4"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
          >
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black">FINAL GROUP CONFIRMATION</h2>
              <p className="text-xl md:text-2xl text-gray-300 font-bold">You are joining: <span className="text-white font-black">{groupInfo?.name || 'LOADING...'}</span></p>
            </div>
            
            <div className="bg-gray-900/50 border border-red-600/50 rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <div className="text-center">
                <h3 className="text-2xl md:text-3xl font-black text-red-400 mb-6">GROUP COMMITMENT</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 font-bold mb-1">Members</p>
                    <p className="text-2xl font-black">{groupInfo?.member_count || '1'}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 font-bold mb-1">Daily Penalty</p>
                    <p className="text-2xl font-black text-red-400">€{groupInfo?.daily_penalty || '10.00'}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 font-bold mb-1">Days Active</p>
                    <p className="text-2xl font-black">{groupInfo ? Math.floor((new Date().getTime() - new Date(groupInfo.created_at).getTime()) / (1000 * 60 * 60 * 24)) : '0'}</p>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                  <p className="text-gray-400 font-bold mb-1">Money in Pot</p>
                  <p className="text-3xl font-black text-green-400">€{groupInfo?.current_pot_amount ? groupInfo.current_pot_amount.toFixed(2) : '0.00'}</p>
                  <p className="text-gray-500 text-sm font-medium">From missed workouts</p>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4">
                  <p className="text-gray-400 font-bold mb-1">Group Admin</p>
                  <p className="font-black text-lg">
                    {groupInfo?.group_admin?.custom_icon || '👑'} {groupInfo?.group_admin?.username || 'ADMIN'}
                  </p>
                </div>
              </div>
              
              <div className="border-t border-gray-600 pt-6">
                <h4 className="text-red-400 font-black text-xl mb-3">FINANCIAL COMMITMENT</h4>
                <p className="text-gray-300 text-lg font-bold">
                  Miss a workout day = €10 penalty to the group pot.<br/>
                  No exceptions. No mercy. No refunds.
                </p>
              </div>
              
              <div className="bg-red-950/50 border border-red-600 rounded-xl p-4">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <span className="text-red-400 font-black text-xl">POINT OF NO RETURN</span>
                </div>
                <p className="text-gray-300 font-bold">
                  By proceeding, you enter a binding commitment with real financial consequences.
                </p>
              </div>
            </div>
          </motion.div>
        )

      case 6:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-lg mx-auto px-4"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
          >
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black">Choose Your Avatar</h2>
              <p className="text-2xl md:text-3xl text-red-400 font-black">FOR LIFE. Choose wisely.</p>
              <p className="text-lg md:text-xl text-gray-300 font-bold">This emoji will represent you forever in the system</p>
            </div>
            
            <div className="space-y-6">
              {/* Quick selection emojis */}
              <div>
                <h3 className="text-xl font-black mb-4 text-gray-300">Quick Select</h3>
                <div className="grid grid-cols-4 gap-3 md:gap-4">
                  {['💪', '🔥', '⚡', '🎯', '🏆', '💀', '🚀', '⭐', '👑', '🔱', '⚔️', '🌟'].map((emoji) => (
                    <motion.button
                      key={emoji}
                      onClick={() => {
                        setSelectedEmoji(emoji)
                        setSelectedEmojiInput('')
                      }}
                      className={`aspect-square text-4xl md:text-5xl rounded-xl border-2 transition-all ${
                        selectedEmoji === emoji 
                          ? 'border-red-500 bg-red-600/20 shadow-lg' 
                          : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-700/50'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      animate={{
                        boxShadow: selectedEmoji === emoji ? '0 15px 40px rgba(220, 38, 38, 0.4)' : '0 5px 20px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Custom emoji input */}
              <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-xl font-black mb-4 text-gray-300">Or enter any emoji</h3>
                <input
                  type="text"
                  placeholder="Enter any emoji (e.g., 🦾, 🥊, 🏃‍♂️)"
                  value={selectedEmojiInput}
                  onChange={(e) => {
                    const input = e.target.value
                    // Only allow single emoji or clear
                    if (input.length <= 2) { // Emojis can be 1-2 characters
                      setSelectedEmojiInput(input)
                      if (input) {
                        setSelectedEmoji('')
                      }
                    }
                  }}
                  className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-center text-4xl font-medium placeholder-gray-400 focus:border-red-500 focus:outline-none backdrop-blur-sm transition-all placeholder:text-base"
                  maxLength={2}
                />
                <p className="text-gray-500 text-sm font-medium mt-3">Paste or type any emoji you want</p>
              </div>
            </div>
            
            {(selectedEmoji || selectedEmojiInput) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 md:p-6 bg-gray-800/50 rounded-2xl backdrop-blur-sm border border-gray-700"
              >
                <p className="text-gray-300 mb-2 text-lg font-bold">
                  Your avatar: <span className="text-4xl md:text-5xl">{selectedEmoji || selectedEmojiInput}</span>
                </p>
                <p className="text-red-400 font-black text-lg">Permanent. Unchangeable. Forever.</p>
              </motion.div>
            )}
          </motion.div>
        )

      case 7:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-lg mx-auto px-4"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
          >
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black">Choose Your Color</h2>
              <p className="text-2xl md:text-3xl text-red-400 font-black">FOR LIFE. This represents you.</p>
              <p className="text-lg md:text-xl text-gray-300 font-bold">Your identity color in the system - choose carefully</p>
            </div>
            
            <div className="grid grid-cols-5 gap-3 md:gap-4">
              {colors.map((color) => (
                <motion.button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`aspect-square rounded-xl transition-all border-4 ${
                    selectedColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ 
                    background: `linear-gradient(135deg, ${color} 0%, ${color}CC 50%, ${color}99 100%)`,
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: selectedColor === color ? `0 15px 40px ${color}60` : '0 5px 20px rgba(0, 0, 0, 0.2)'
                  }}
                />
              ))}
            </div>
            
            {selectedColor && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 md:p-6 bg-gray-800/50 rounded-2xl backdrop-blur-sm border border-gray-700"
              >
                <div 
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full mx-auto mb-4"
                  style={{ 
                    background: `linear-gradient(135deg, ${selectedColor} 0%, ${selectedColor}CC 50%, ${selectedColor}99 100%)`,
                    boxShadow: `0 0 30px ${selectedColor}60`
                  }}
                />
                <p className="text-gray-300 mb-2 text-lg font-bold">Your identity color</p>
                <p className="text-red-400 font-black text-lg">Locked in forever</p>
              </motion.div>
            )}
          </motion.div>
        )

      case 8:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-md mx-auto px-4"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
          >
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black">Your Birthday Challenge</h2>
              <p className="text-xl md:text-2xl text-gray-300 font-bold">On your birthday, you must earn DOUBLE the points</p>
              <p className="text-lg md:text-xl text-red-400 font-bold">The system remembers everything</p>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 backdrop-blur-sm">
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg font-medium focus:border-red-500 focus:outline-none backdrop-blur-sm text-center transition-all"
              />
            </div>
            
            {birthday && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-red-950/50 border border-red-600 rounded-2xl backdrop-blur-sm"
              >
                <p className="text-red-400 font-black text-xl mb-2">Birthday Challenge Activated</p>
                <p className="text-gray-300 font-bold text-lg">Double points required on {new Date(birthday).toLocaleDateString()}</p>
                <p className="text-gray-400 font-medium mt-2">The system will not forget</p>
              </motion.div>
            )}
          </motion.div>
        )

      case 9:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-md mx-auto px-4"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
          >
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black">Choose Your Identity</h2>
              <p className="text-xl md:text-2xl text-gray-300 font-bold">This is how your group will know you</p>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 backdrop-blur-sm">
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg font-medium placeholder-gray-400 focus:border-red-500 focus:outline-none backdrop-blur-sm text-center transition-all"
              />
            </div>
            
            {username && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center space-x-4 p-4 bg-gray-800/50 rounded-2xl backdrop-blur-sm border border-gray-700"
              >
                <span className="text-4xl">{selectedEmoji || selectedEmojiInput}</span>
                <span 
                  className="w-8 h-8 rounded-full"
                  style={{ 
                    background: `linear-gradient(135deg, ${selectedColor} 0%, ${selectedColor}CC 50%, ${selectedColor}99 100%)`,
                    boxShadow: `0 0 15px ${selectedColor}60`
                  }}
                />
                <span className="font-black text-xl">{username}</span>
              </motion.div>
            )}
          </motion.div>
        )

      case 10:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-2xl mx-auto px-4"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
          >
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-600 rounded-2xl mx-auto flex items-center justify-center mb-6">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black">COMMITMENT LOCKED</h2>
              <p className="text-xl md:text-2xl text-gray-300 font-bold">Your transformation journey begins now</p>
            </div>
            
            <div className="bg-gray-900/50 border border-green-600/50 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-black text-green-400 mb-4">PROFILE COMPLETE</h3>
                  
                  <div className="flex items-center justify-center space-x-4 p-4 bg-gray-800/50 rounded-2xl backdrop-blur-sm border border-gray-700 mb-6">
                    <span className="text-4xl">{selectedEmoji || selectedEmojiInput}</span>
                    <span 
                      className="w-8 h-8 rounded-full"
                      style={{ 
                        background: `linear-gradient(135deg, ${selectedColor} 0%, ${selectedColor}CC 50%, ${selectedColor}99 100%)`,
                        boxShadow: `0 0 15px ${selectedColor}60`
                      }}
                    />
                    <span className="font-black text-xl">{username}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-gray-400 font-bold mb-1">Group</p>
                      <p className="font-black">{groupInfo?.name || 'UNKNOWN'}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-gray-400 font-bold mb-1">Birthday Challenge</p>
                      <p className="font-black">{birthday ? new Date(birthday).toLocaleDateString() : 'Not set'}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-gray-400 font-bold mb-1">Commitment Level</p>
                      <p className="font-black text-red-400">100%</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-gray-400 font-bold mb-1">Daily Penalty</p>
                      <p className="font-black text-red-400">€10.00</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-600 pt-6 text-center">
                  <p className="text-gray-300 text-lg font-bold mb-4">
                    The system is now active. Your group is watching.<br/>
                    There's no turning back.
                  </p>
                  <p className="text-red-400 font-black text-xl">
                    Welcome to the commitment lifestyle.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )

      default:
        return (
          <div className="text-center">
            <h2 className="text-4xl font-black mb-4">Step {currentStep}</h2>
            <p className="text-gray-400">Step content goes here</p>
          </div>
        )
    }
  }

  const getButtonText = () => {
    if (currentStep === 0 && currentRuleCard === 0) {
      return revealedSentences >= welcomeSentences.length ? 'CONTINUE' : 'TAP'
    } else if (currentStep === 0 && currentRuleCard === 1) {
      if (revealedRuleCards < ruleCards.length) {
        if (revealedRuleCards > 0 && !confirmedRuleCards[revealedRuleCards - 1]) {
          return 'CONFIRM CURRENT RULE FIRST'
        }
        return 'COMMIT'
      } else if (confirmedRuleCards.every(confirmed => confirmed)) {
        return 'I ACCEPT THE TERMS'
      } else {
        return 'CONFIRM ALL RULES'
      }
    } else if (currentStep === 2) {
      return holdProgress >= 100 ? 'CONTINUE' : 'HOLD BUTTON ABOVE'
    } else if (currentStep === 3) {
      return 'CREATE ACCOUNT'
    } else if (currentStep === 4) {
      return 'JOIN GROUP'
    } else if (currentStep === 5) {
      return 'I ACCEPT AND COMMIT'
    } else if (currentStep === 6) {
      return 'LOCK IN AVATAR'
    } else if (currentStep === 7) {
      return 'LOCK IN COLOR'
    } else if (currentStep === 8) {
      return 'ACCEPT BIRTHDAY CHALLENGE'
    } else if (currentStep === 9) {
      return 'FINALIZE IDENTITY'
    } else if (currentStep === 10) {
      return 'BEGIN COMMITMENT'
    } else {
      return 'COMMIT'
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
    } else if (canProceed()) {
      nextStep()
      setAttemptedProceedWithIncomplete(false)
    }
  }

  return (
    <div 
      className="min-h-screen text-white relative overflow-hidden"
      style={{
        background: '#000000',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
      }}
    >
      {/* Warm gradients after commitment */}
      {finalWarningCompleted && (
        <motion.div 
          className="fixed inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 1 }}
          style={{
            background: `
              radial-gradient(ellipse 140% 100% at 0% 100%, rgba(251, 146, 60, ${0.15 + gradientIntensity * 0.4}) 0%, transparent 40%),
              radial-gradient(ellipse 120% 90% at 100% 90%, rgba(245, 101, 101, ${0.12 + gradientIntensity * 0.35}) 0%, transparent 35%),
              radial-gradient(ellipse 100% 120% at 50% 100%, rgba(252, 211, 77, ${0.1 + gradientIntensity * 0.3}) 0%, transparent 30%)
            `,
            opacity: 0.8 + gradientIntensity * 0.5
          }}
        />
      )}

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center p-4 border-b border-gray-800/50 backdrop-blur-sm">
        {(currentStep > 0 || currentRuleCard > 0) && (
          <motion.button
            onClick={prevStep}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-800/50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-bold">Back</span>
          </motion.button>
        )}
        <div className="flex-1" />
        {!finalWarningCompleted && (
          <motion.button
            onClick={() => onGoToLogin?.()}
            className="text-gray-500 hover:text-gray-300 transition-colors p-2 rounded-xl hover:bg-gray-800/50 text-sm font-medium text-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            I'm not made for this
          </motion.button>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-[calc(100vh-120px)]">
        <div className="flex-1 flex items-center justify-center p-4 pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentStep}-${currentRuleCard}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Button - Hide for step 2 since it has its own buttons */}
      {currentStep !== 2 && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-20">
          <motion.button
            onClick={handleButtonClick}
            disabled={
              isLoading || !(
                (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) ||
                (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length && (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1])) ||
                canClickCommitButton()
              )
            }
          className="relative overflow-hidden"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            background: !isLoading && (
              (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) ||
              (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length && (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1])) ||
              canClickCommitButton()
            ) ? 
              'linear-gradient(135deg, #B91C1C 0%, #7F1D1D 100%)' : 
              'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
            borderRadius: '9999px',
            padding: '12px 32px',
            minWidth: '200px',
            border: `1px solid ${!isLoading && (
              (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) ||
              (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length && (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1])) ||
              canClickCommitButton()
            ) ? 'rgba(185, 28, 28, 0.4)' : 'rgba(55, 65, 81, 0.4)'}`,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          <span className="text-white text-lg font-black tracking-wide relative z-10 text-center block">
            {isLoading ? 'PROCESSING...' : getButtonText()}
          </span>
        </motion.button>
      </div>
      )}

      {/* Two buttons for final warning step - only show when not holding AND when scrolled to bottom */}
      {currentStep === 2 && !showHoldButton && hasScrolledToBottom && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none">
          <div className="flex space-x-4 w-full max-w-lg pointer-events-auto">
            {/* I refuse button - blue */}
            <motion.button
              onClick={() => onGoToLogin?.()}
              className="relative overflow-hidden flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                borderRadius: '9999px',
                padding: '12px 24px',
                border: '1px solid rgba(37, 99, 235, 0.4)',
                boxShadow: '0 0 15px rgba(37, 99, 235, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                cursor: 'pointer'
              }}
              animate={{
                boxShadow: [
                  '0 0 15px rgba(37, 99, 235, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  '0 0 25px rgba(37, 99, 235, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  '0 0 15px rgba(37, 99, 235, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-white text-lg font-black tracking-wide relative z-10">
                I refuse
              </span>
            </motion.button>

            {/* I Commit button - red */}
            <motion.button
              onClick={() => setShowHoldButton(true)}
              className="relative overflow-hidden flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 50%, #991B1B 80%, #7F1D1D 100%)',
                borderRadius: '9999px',
                padding: '12px 24px',
                border: '1px solid rgba(220, 38, 38, 0.6)',
                boxShadow: '0 0 15px rgba(220, 38, 38, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                cursor: 'pointer'
              }}
              animate={{
                boxShadow: [
                  '0 0 15px rgba(220, 38, 38, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  '0 0 25px rgba(220, 38, 38, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  '0 0 15px rgba(220, 38, 38, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-white text-lg font-black tracking-wide relative z-10">
                I Commit
              </span>
            </motion.button>
          </div>
        </div>
      )}

      {/* Hold button - positioned at bottom like other buttons - BRIGHT AND VISIBLE */}
      {currentStep === 2 && showHoldButton && (
        <div className="fixed bottom-8 left-4 right-4 flex justify-center z-50">
          <button
            className="relative overflow-hidden min-w-[280px] font-black text-xl py-4 px-8 rounded-full border-4"
            onMouseDown={startHolding}
            onMouseUp={stopHolding}
            onMouseLeave={stopHolding}
            onTouchStart={startHolding}
            onTouchEnd={stopHolding}
            disabled={holdProgress >= 100}
            style={{
              background: holdProgress >= 100 
                ? '#22C55E' // Bright green when complete
                : '#FFFFFF', // White background - very visible
              color: holdProgress >= 100 ? '#FFFFFF' : '#000000',
              borderColor: holdProgress >= 100 ? '#16A34A' : '#374151',
              boxShadow: holdProgress >= 100 
                ? '0 0 20px rgba(34, 197, 94, 0.5)' 
                : '0 0 20px rgba(255, 255, 255, 0.5)', // White glow to make it super visible
              cursor: holdProgress >= 100 ? 'default' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Red progress fill overlay that goes from left to right */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-red-600 rounded-full transition-all duration-100"
              style={{ 
                width: `${holdProgress}%`,
                opacity: holdProgress > 0 && holdProgress < 100 ? 1 : 0
              }}
            />
            
            <span className="relative z-10">
              {holdProgress >= 100 ? '🔥 COMMITTED! 🔥' : 'HOLD TO COMMIT'}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}