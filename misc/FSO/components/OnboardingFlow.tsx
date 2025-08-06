import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, AlertTriangle, Zap, Users, Target, Shield, Skull } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
  onGoToLogin: () => void;
}

export function OnboardingFlow({ onComplete, onGoToLogin }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentRuleCard, setCurrentRuleCard] = useState(0);
  const [revealedSentences, setRevealedSentences] = useState(0);
  const [revealedRuleCards, setRevealedRuleCards] = useState(0);
  const ruleCardsContainerRef = useRef<HTMLDivElement>(null);
  const [sliderValue, setSliderValue] = useState(50);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [currentQuote, setCurrentQuote] = useState('');
  const [screenIntensity, setScreenIntensity] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [birthday, setBirthday] = useState('');
  const [username, setUsername] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [attemptedProceedWithIncomplete, setAttemptedProceedWithIncomplete] = useState(false);
  const [finalWarningCompleted, setFinalWarningCompleted] = useState(false);
  const [confirmedRuleCards, setConfirmedRuleCards] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [showHoldButton, setShowHoldButton] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [selectedEmojiInput, setSelectedEmojiInput] = useState('');

  const finalWarningQuotes = [
    "Are you sure...",
    "ARE YOU REALLY SURE?",
    "THIS IS NOT FOR EVERYBODY",
    "THIS IS A LIFESTYLE",
    "NO BACKING OUT",
    "YOUR COMMITMENT IS BINDING",
    "YOU'RE ALL IN NOW"
  ];

  const colors = [
    '#DC2626', '#EA580C', '#D97706', '#EAB308', '#65A30D', 
    '#059669', '#0891B2', '#2563EB', '#7C3AED', '#C026D3', 
    '#E11D48', '#F97316', '#84CC16', '#06B6D4', '#8B5CF6'
  ];

  // Welcome screen sentences (first one is shown immediately)
  const welcomeSentences = [
    "This is a COMMITMENT system.",
    "You show up every day. Or you pay.",
    "Miss a session — or log it late — that's €10 to the group pot.",
    "This is a social contract. You support each other. You hold each other accountable.",
    "The money funds your crew — for fun, or for good.",
    "Understand this before you commit."
  ];

  // Rule cards data
  const ruleCards = [
    {
      icon: Zap,
      title: "Show up daily.",
      subtitle: "",
      description: "Every day, your target increases by one point. No skipping. No banking. No compromises.",
      color: "#DC2626",
      bgGradient: "linear-gradient(135deg, #DC2626 0%, #B91C1C 50%, #991B1B 100%)"
    },
    {
      icon: AlertTriangle,
      title: "Log it or pay.",
      subtitle: "",
      description: "If you don't log your workout before midnight, you owe €10 to the group pot. No exceptions. No excuses.",
      color: "#EA580C",
      bgGradient: "linear-gradient(135deg, #EA580C 0%, #DC2626 50%, #B91C1C 100%)"
    },
    {
      icon: Target,
      title: "Follow the system.",
      subtitle: "",
      description: "Only approved exercises count. Each has a defined point value. No improvising. No freelancing.",
      color: "#7C3AED",
      bgGradient: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)"
    },
    {
      icon: Shield,
      title: "Own your absence.",
      subtitle: "",
      description: "Sickness or grief may pause your progress — but you return when you can. If you abuse this, the system won't break — you will.",
      color: "#059669",
      bgGradient: "linear-gradient(135deg, #059669 0%, #047857 50%, #065F46 100%)"
    },
    {
      icon: Users,
      title: "The pot belongs to the group.",
      subtitle: "",
      description: "Every €10 goes into a collective fund. It fuels whatever the group decides — celebration, charity, or chaos.",
      color: "#0891B2",
      bgGradient: "linear-gradient(135deg, #0891B2 0%, #0E7490 50%, #155E75 100%)"
    },
    {
      icon: Shield,
      title: "This is not a challenge.",
      subtitle: "",
      description: "This is a standard. A pact. A personal operating system designed to build strength, discipline, and integrity.",
      color: "#C026D3",
      bgGradient: "linear-gradient(135deg, #C026D3 0%, #A21CAF 50%, #86198F 100%)"
    },
    {
      icon: Skull,
      title: "There is no exit.",
      subtitle: "",
      description: "Silence means you keep paying. You owe it to your crew — and to your own health. This is a commitment for life.",
      color: "#4B5563",
      bgGradient: "linear-gradient(135deg, #4B5563 0%, #374151 50%, #1F2937 100%)"
    }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHolding && holdProgress < 100) {
      interval = setInterval(() => {
        setHoldProgress(prev => {
          const newProgress = Math.min(prev + (100/150), 100); // 15 seconds = 150 intervals of 100ms
          const quoteIndex = Math.floor((newProgress / 100) * finalWarningQuotes.length);
          setCurrentQuote(finalWarningQuotes[Math.min(quoteIndex, finalWarningQuotes.length - 1)]);
          setScreenIntensity(newProgress / 100);
          
          // When reaching 100%, mark final warning as completed and trigger white flash
          if (newProgress >= 100) {
            setFinalWarningCompleted(true);
            // Dramatic gradient activation after flash
            setTimeout(() => {
              setScreenIntensity(0.2); // Reduced intensity for committed state
            }, 1000);
          }
          
          return newProgress;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isHolding, holdProgress]);

  // Handle scroll detection for final commitment page
  useEffect(() => {
    if (currentStep === 2) {
      const handleScroll = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        
        // Consider scrolled to bottom if within 50px of bottom
        if (scrollTop + clientHeight >= scrollHeight - 50) {
          setHasScrolledToBottom(true);
        }
      };

      window.addEventListener('scroll', handleScroll);
      handleScroll(); // Check initial state
      
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [currentStep]);

  // Auto-scroll when new rule cards are revealed
  useEffect(() => {
    if (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards > 0 && ruleCardsContainerRef.current) {
      // Get the latest revealed card
      const ruleCardElements = ruleCardsContainerRef.current.querySelectorAll('[data-rule-card]');
      const latestCard = ruleCardElements[revealedRuleCards - 1] as HTMLElement;
      
      if (latestCard) {
        // Scroll to show the new card with some offset to see the "pushing up" effect
        setTimeout(() => {
          latestCard.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }, 300); // Delay to let the animation start first
      }
    }
  }, [revealedRuleCards, currentStep, currentRuleCard]);

  const nextStep = () => {
    if (currentStep === 0 && currentRuleCard === 0) {
      // Move from welcome screen to rule cards
      setCurrentRuleCard(1);
      setRevealedRuleCards(0);
    } else if (currentStep === 0 && currentRuleCard === 1) {
      // Move from rule cards to commitment level step
      setCurrentStep(1);
      setCurrentRuleCard(0);
      setRevealedSentences(0);
      setRevealedRuleCards(0);
    } else if (currentStep < 10) {
      // Move through other steps
      setCurrentStep(currentStep + 1);
      setRevealedSentences(0);
      // Reset scroll state when moving to next step
      setHasScrolledToBottom(false);
    } else {
      // Complete onboarding
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep === 0 && currentRuleCard === 1) {
      setCurrentRuleCard(0);
      setRevealedRuleCards(0);
    } else if (currentStep === 1) {
      // Go back to rule cards
      setCurrentStep(0);
      setCurrentRuleCard(1);
      setRevealedSentences(0);
      setRevealedRuleCards(ruleCards.length); // Show all cards when going back
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setRevealedSentences(0);
      // Reset scroll state when going back
      setHasScrolledToBottom(false);
    }
  };

  const revealNextSentence = () => {
    if (revealedSentences < welcomeSentences.length) {
      setRevealedSentences(revealedSentences + 1);
    }
  };

  const revealNextRuleCard = () => {
    if (revealedRuleCards < ruleCards.length) {
      setRevealedRuleCards(revealedRuleCards + 1);
    }
  };

  const startHolding = () => {
    setIsHolding(true);
    setHoldProgress(0);
    setCurrentQuote(finalWarningQuotes[0]);
    setScreenIntensity(0); // Reset screen intensity when starting
  };

  const stopHolding = () => {
    setIsHolding(false);
    if (holdProgress < 100) {
      setHoldProgress(0);
      setCurrentQuote('');
      if (!finalWarningCompleted) {
        setScreenIntensity(0);
      }
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        if (currentRuleCard === 0) {
          return revealedSentences >= welcomeSentences.length;
        } else if (currentRuleCard === 1) {
          return revealedRuleCards >= ruleCards.length && confirmedRuleCards.every(confirmed => confirmed);
        }
        return true;
      case 1:
        return sliderValue === 100;
      case 2:
        return holdProgress >= 100;
      case 3:
        return password === passwordConfirm; // Password confirmation must match
      case 4:
        return inviteCode;
      case 5:
        return true; // Group confirmation
      case 6:
        return selectedEmoji || selectedEmojiInput;
      case 7:
        return selectedColor;
      case 8:
        return birthday;
      case 9:
        return username;
      case 10:
        return true; // Final step
      default:
        return true;
    }
  };

  const canClickCommitButton = () => {
    switch (currentStep) {
      case 1:
        return true; // Always allow clicking for commitment level step
      default:
        return canProceed();
    }
  };

  // Calculate gradient intensity based on progress
  const getGradientIntensity = () => {
    // NO gradients until after final warning is completed
    if (!finalWarningCompleted) {
      return 0;
    }
    
    // After commitment, show dramatic gradients
    const totalSteps = 12;
    const baseIntensity = 0.6; // Strong baseline after commitment
    const progressBonus = (currentStep / totalSteps) * 0.4;
    
    return Math.min(baseIntensity + progressBonus, 1);
  };

  const gradientIntensity = getGradientIntensity();

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        if (currentRuleCard === 0) {
          // Welcome screen with tap-to-reveal (no inline TAP TO CONTINUE button)
          return (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="text-center space-y-12 max-w-4xl mx-auto px-4"
              style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
            >
              <div className="space-y-8">
                <div>
                  <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-4">
                    COMMITMENT
                  </h1>
                </div>
              </div>
              
              <div className="max-w-4xl mx-auto px-4">
                {/* Stacking sentences animation - each new sentence appears and pushes others up */}
                <div className="text-center min-h-[400px] flex flex-col justify-center">
                  <div className="relative space-y-4">
                    
                    {/* Initial sentence - always visible, gets smaller as new sentences appear */}
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
                    
                    {/* All revealed sentences stacked */}
                    <AnimatePresence>
                      {welcomeSentences.slice(0, revealedSentences).map((sentence, index) => {
                        // Calculate size - newest sentence is largest, older ones get progressively smaller
                        const sentenceAge = revealedSentences - index - 1; // 0 for newest, higher for older
                        const fontSize = Math.max(1.1, 2.2 - (sentenceAge * 0.2)); // Start at 2.2rem, decrease by 0.2rem for each older sentence
                        const opacity = Math.max(0.6, 1 - (sentenceAge * 0.08)); // Slight opacity fade for older sentences
                        
                        // Color progression
                        const colors = ['#ffffff', '#e5e7eb', '#fca5a5', '#d1d5db', '#9ca3af', '#f87171'];
                        const color = colors[index] || '#9ca3af';
                        
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
                              marginTop: sentenceAge === 0 ? '1.5rem' : '0.75rem' // More space for newest sentence
                            }}
                          >
                            {sentence.includes("COMMITMENT") ? (
                              <>This is a <span className="text-red-400">COMMITMENT</span> system.</>
                            ) : (
                              sentence
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    
                  </div>
                </div>
              </div>
            </motion.div>
          );
        } else {
          // Rule cards with tap-to-reveal
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
              
              <div 
                ref={ruleCardsContainerRef}
                className="space-y-8 min-h-[500px] flex flex-col justify-start"
              >
                <AnimatePresence>
                  {ruleCards.slice(0, revealedRuleCards).map((rule, index) => {
                    const Icon = rule.icon;
                    const isConfirmed = confirmedRuleCards[index];
                    return (
                      <motion.div
                        key={index}
                        data-rule-card
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
                          {/* Icon */}
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
                          
                          {/* Content */}
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
                          
                          {/* Confirm Button */}
                          <div className="pt-4">
                            {!isConfirmed ? (
                              <motion.button
                                onClick={() => {
                                  const newConfirmed = [...confirmedRuleCards];
                                  newConfirmed[index] = true;
                                  setConfirmedRuleCards(newConfirmed);
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
                    );
                  })}
                </AnimatePresence>


              </div>
            </motion.div>
          );
        }

      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-2xl mx-auto px-4 relative"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
          >
            {/* Dynamic background glow based on slider value */}
            <motion.div 
              className="absolute inset-0 pointer-events-none rounded-3xl"
              animate={{
                background: `radial-gradient(ellipse 120% 100% at 50% 50%, rgba(220, 38, 38, ${sliderValue * 0.003}) 0%, rgba(147, 51, 234, ${sliderValue * 0.002}) 30%, transparent 70%)`,
                scale: 1 + (sliderValue * 0.0005),
                filter: `blur(${Math.max(0, sliderValue * 0.3)}px)`
              }}
              transition={{ duration: 0.3 }}
            />
            
            {/* Additional intense glow for higher values */}
            {sliderValue > 70 && (
              <motion.div 
                className="absolute inset-0 pointer-events-none rounded-3xl"
                animate={{
                  background: `radial-gradient(circle at 50% 50%, rgba(220, 38, 38, ${(sliderValue - 70) * 0.008}) 0%, transparent 60%)`,
                  scale: 1 + ((sliderValue - 70) * 0.001),
                  filter: `blur(${(sliderValue - 70) * 0.5}px)`
                }}
                transition={{ duration: 0.2 }}
              />
            )}

            <div className="space-y-4 relative z-10">
              <h2 className="text-4xl md:text-5xl font-black">Set Your Commitment Level</h2>
              <p className="text-xl md:text-2xl text-gray-300 font-bold">Choose your intensity level</p>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="relative p-6">
                {/* Enhanced slider container with depth */}
                <div className="relative">
                  {/* Track background with inner shadow */}
                  <div 
                    className="w-full h-8 rounded-full relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(180deg, #1f2937 0%, #374151 50%, #1f2937 100%)',
                      boxShadow: 'inset 0 4px 8px rgba(0, 0, 0, 0.6), inset 0 -2px 4px rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(75, 85, 99, 0.8)'
                    }}
                  >
                    {/* Progress fill with enhanced gradient */}
                    <motion.div 
                      className="h-full rounded-full relative overflow-hidden"
                      style={{
                        width: `${sliderValue}%`,
                        background: sliderValue === 100 
                          ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 25%, #15803d 50%, #166534 75%, #14532d 100%)'
                          : `linear-gradient(135deg, 
                              #dc2626 0%, 
                              #ef4444 ${Math.max(20, sliderValue * 0.3)}%, 
                              #f87171 ${Math.max(40, sliderValue * 0.6)}%, 
                              #fca5a5 ${Math.max(60, sliderValue * 0.8)}%, 
                              #fecaca 100%)`,
                        boxShadow: sliderValue > 0 ? `
                          inset 0 2px 4px rgba(255, 255, 255, 0.3),
                          inset 0 -2px 6px rgba(0, 0, 0, 0.4),
                          0 0 ${sliderValue * 0.3}px rgba(220, 38, 38, ${sliderValue * 0.01})
                        ` : 'none',
                        transition: 'all 0.3s ease-out'
                      }}
                      animate={{
                        boxShadow: sliderValue === 100 ? [
                          'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 6px rgba(0, 0, 0, 0.4), 0 0 20px rgba(34, 197, 94, 0.6)',
                          'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 6px rgba(0, 0, 0, 0.4), 0 0 30px rgba(34, 197, 94, 0.8)',
                          'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 6px rgba(0, 0, 0, 0.4), 0 0 20px rgba(34, 197, 94, 0.6)'
                        ] : `
                          inset 0 2px 4px rgba(255, 255, 255, 0.3),
                          inset 0 -2px 6px rgba(0, 0, 0, 0.4),
                          0 0 ${sliderValue * 0.3}px rgba(220, 38, 38, ${sliderValue * 0.01})
                        `
                      }}
                      transition={{ duration: sliderValue === 100 ? 2 : 0.3, repeat: sliderValue === 100 ? Infinity : 0 }}
                    >
                      {/* Inner highlight for more depth */}
                      <div 
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.2) 100%)'
                        }}
                      />
                    </motion.div>
                  </div>
                  
                  {/* Enhanced slider input - invisible but functional */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderValue}
                    onChange={(e) => {
                      setSliderValue(Number(e.target.value));
                      // Reset attempt state when slider reaches 100%
                      if (Number(e.target.value) === 100) {
                        setAttemptedProceedWithIncomplete(false);
                      }
                    }}
                    className="absolute inset-0 w-full h-8 opacity-0 cursor-pointer"
                    style={{ 
                      zIndex: 10,
                      margin: 0,
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                  
                  {/* Custom enhanced thumb */}
                  <motion.div 
                    className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      left: `calc(${sliderValue}% - 20px)`,
                      zIndex: 15
                    }}
                    animate={{
                      scale: sliderValue === 100 ? [1, 1.1, 1] : 1,
                      rotate: sliderValue === 100 ? [0, 5, -5, 0] : 0
                    }}
                    transition={{ duration: sliderValue === 100 ? 2 : 0.3, repeat: sliderValue === 100 ? Infinity : 0 }}
                  >
                    <div 
                      className="w-10 h-10 rounded-full border-4 border-white relative overflow-hidden"
                      style={{
                        background: sliderValue === 100 
                          ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)'
                          : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
                        boxShadow: `
                          0 4px 12px rgba(0, 0, 0, 0.4),
                          0 2px 6px rgba(0, 0, 0, 0.6),
                          inset 0 2px 4px rgba(255, 255, 255, 0.3),
                          inset 0 -2px 4px rgba(0, 0, 0, 0.3),
                          0 0 ${sliderValue * 0.2}px ${sliderValue === 100 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(220, 38, 38, 0.6)'}
                        `,
                        cursor: 'pointer'
                      }}
                    >
                      {/* Inner glow effect */}
                      <div 
                        className="absolute inset-1 rounded-full"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 50%, rgba(0, 0, 0, 0.2) 100%)'
                        }}
                      />
                      
                      {/* Center dot for grip texture */}
                      <div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                        style={{
                          background: 'rgba(255, 255, 255, 0.8)',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.4)'
                        }}
                      />
                    </div>
                  </motion.div>
                </div>
                
                {/* Labels with enhanced styling */}
                <div className="flex justify-between text-lg md:text-xl mt-6 font-bold">
                  <motion.span 
                    className="text-gray-400"
                    animate={{ 
                      opacity: sliderValue < 20 ? 1 : 0.5,
                      scale: sliderValue < 20 ? 1 : 0.9
                    }}
                  >
                    Casual
                  </motion.span>
                  <motion.span 
                    className="text-red-400 font-black"
                    animate={{ 
                      opacity: sliderValue > 80 ? 1 : 0.5,
                      scale: sliderValue > 80 ? 1.1 : 1,
                      textShadow: sliderValue > 80 ? '0 0 10px rgba(220, 38, 38, 0.6)' : '0 0 0px rgba(220, 38, 38, 0)'
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    BEAST MODE
                  </motion.span>
                </div>
              </div>
              
              {/* Percentage display without box */}
              <motion.div 
                className="text-center py-6"
                animate={{ 
                  scale: 1 + (sliderValue * 0.0008),
                  textShadow: `0 0 ${sliderValue * 0.3}px rgba(220, 38, 38, ${sliderValue * 0.01})`
                }}
                transition={{ duration: 0.2 }}
              >
                <div 
                  className="text-7xl md:text-8xl font-black mb-4"
                  style={{
                    color: sliderValue === 100 ? '#22c55e' : '#ef4444',
                    filter: `brightness(${1 + sliderValue * 0.01})`,
                    textShadow: sliderValue > 80 ? `0 0 ${(sliderValue - 80) * 2}px rgba(220, 38, 38, 0.6)` : 'none'
                  }}
                >
                  {sliderValue}%
                </div>
                {sliderValue === 100 && (
                  <p className="text-xl md:text-2xl font-black text-green-400">
                    MAXIMUM COMMITMENT ACHIEVED
                  </p>
                )}
              </motion.div>

              {/* Access denied message - only show when user attempted to proceed */}
              <AnimatePresence>
                {attemptedProceedWithIncomplete && sliderValue < 100 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className="bg-red-950/50 border border-red-600 rounded-2xl p-6 space-y-4"
                    style={{
                      boxShadow: '0 15px 40px rgba(220, 38, 38, 0.4)'
                    }}
                  >
                    <div>
                      <motion.p 
                        className="text-red-400 font-black text-xl mb-2"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 0.5, repeat: 3 }}
                      >
                        ACCESS DENIED
                      </motion.p>
                      <p className="text-gray-300 font-bold text-lg mb-4">
                        This system requires 100% commitment. Anything less is failure.
                      </p>
                      <p className="text-gray-400 font-medium">
                        Drag the slider to 100% or face the truth.
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t border-red-600/30">
                      <motion.button
                        onClick={() => onGoToLogin()}
                        className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-xl text-gray-300 hover:text-white transition-colors font-bold text-center"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        I'm not made for this
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            className={`text-center space-y-8 max-w-3xl mx-auto px-4 relative ${showHoldButton ? 'pointer-events-none' : 'pointer-events-auto'}`}
            style={{
              filter: holdProgress === 100 ? `brightness(${3 + Math.sin(Date.now() / 100) * 0.5})` : `brightness(${1 + screenIntensity * 1.5}) saturate(${1 + screenIntensity * 2}) contrast(${1 + screenIntensity * 0.5})`,
              transform: `scale(${1 + screenIntensity * 0.05})`,
              fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
            }}
          >

            {/* Dramatic background changes during holding */}
            <motion.div 
              className="fixed inset-0 pointer-events-none"
              animate={{
                background: `
                  radial-gradient(circle at center, rgba(220, 38, 38, ${screenIntensity * 0.8}) 0%, rgba(147, 51, 234, ${screenIntensity * 0.4}) 30%, transparent 60%),
                  radial-gradient(ellipse 150% 100% at 50% 100%, rgba(239, 68, 68, ${screenIntensity * 0.6}) 0%, transparent 50%),
                  linear-gradient(0deg, rgba(220, 38, 38, ${screenIntensity * 0.3}) 0%, transparent 40%)
                `,
                scale: 1 + (screenIntensity * 0.1),
                filter: `blur(${screenIntensity * 40}px) hue-rotate(${screenIntensity * 30}deg)`
              }}
              transition={{ duration: 0.2 }}
            />
            
            {/* Additional intense glow layer */}
            <motion.div 
              className="absolute inset-0 pointer-events-none rounded-3xl"
              animate={{
                background: `radial-gradient(circle at center, rgba(255, 0, 0, ${screenIntensity * 0.4}) 0%, rgba(255, 100, 100, ${screenIntensity * 0.2}) 40%, transparent 70%)`,
                scale: 1 + (screenIntensity * 0.15),
                filter: `blur(${screenIntensity * 60}px)`
              }}
              transition={{ duration: 0.1 }}
            />

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
        );

      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-md mx-auto px-4"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
          >
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black">Ready to Make It Official?</h2>
              <p className="text-xl md:text-2xl text-gray-300 font-bold">Enter your credentials to lock in your commitment.</p>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 backdrop-blur-sm">
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg font-medium placeholder-gray-400 focus:border-red-500 focus:outline-none backdrop-blur-sm transition-all"
                />
                <input
                  type="password"
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg font-medium placeholder-gray-400 focus:border-red-500 focus:outline-none backdrop-blur-sm transition-all"
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
                />
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="text-red-400 font-bold text-sm">Passwords do not match</p>
                )}
                {passwordConfirm && password === passwordConfirm && password && (
                  <p className="text-green-400 font-bold text-sm">Passwords match ✓</p>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-md mx-auto px-4"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
          >
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-black">JOIN YOUR ACCOUNTABILITY GROUP</h2>
              <p className="text-xl md:text-2xl text-gray-300 font-bold">Enter the code to join your witnesses</p>
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
                />
                
                <p className="text-gray-500 text-sm font-medium mt-3">Example: ABC12345</p>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-gray-400 font-bold text-lg">Once you join, there's no hiding from your group</p>
              <p className="text-red-400 font-black text-xl">They will see everything</p>
            </div>
          </motion.div>
        );

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
              <p className="text-xl md:text-2xl text-gray-300 font-bold">You are joining: <span className="text-white font-black">ELITE WARRIORS</span></p>
            </div>
            
            <div className="bg-gray-900/50 border border-red-600/50 rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <div className="text-center">
                <h3 className="text-2xl md:text-3xl font-black text-red-400 mb-6">GROUP COMMITMENT</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 font-bold mb-1">Members</p>
                    <p className="text-2xl font-black">12/15</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 font-bold mb-1">Daily Penalty</p>
                    <p className="text-2xl font-black text-red-400">€10.00</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 font-bold mb-1">Days Active</p>
                    <p className="text-2xl font-black">47</p>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                  <p className="text-gray-400 font-bold mb-1">Money in Pot</p>
                  <p className="text-3xl font-black text-green-400">€2,340.00</p>
                  <p className="text-gray-500 text-sm font-medium">From missed workouts</p>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4">
                  <p className="text-gray-400 font-bold mb-1">Group Admin</p>
                  <p className="font-black text-lg">💀 COMMANDER_X</p>
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
        );

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
                        setSelectedEmoji(emoji);
                        setSelectedEmojiInput('');
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
                    const input = e.target.value;
                    // Only allow single emoji or clear
                    if (input.length <= 2) { // Emojis can be 1-2 characters
                      setSelectedEmojiInput(input);
                      if (input) {
                        setSelectedEmoji('');
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
        );

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
        );

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
        );

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
        );

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
                      <p className="font-black">ELITE WARRIORS</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-gray-400 font-bold mb-1">Birthday Challenge</p>
                      <p className="font-black">{new Date(birthday).toLocaleDateString()}</p>
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
        );

      case 9:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center space-y-8 max-w-2xl mx-auto px-4"
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
          >
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black">FINAL CONFIRMATION</h2>
              <p className="text-xl md:text-2xl text-gray-300 font-bold">You are joining: <span className="text-white font-black">ELITE WARRIORS</span></p>
            </div>
            
            <div className="bg-gray-900/50 border border-red-600/50 rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <div className="text-center">
                <h3 className="text-2xl md:text-3xl font-black text-red-400 mb-6">GROUP COMMITMENT</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 font-bold mb-1">Members</p>
                    <p className="text-2xl font-black">12/15</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 font-bold mb-1">Daily Penalty</p>
                    <p className="text-2xl font-black text-red-400">€10.00</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 font-bold mb-1">Group Admin</p>
                    <p className="font-black text-lg">💀 COMMANDER_X</p>
                  </div>
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
        );

      default:
        return null;
    }
  };

  // Determine button text based on step and progress
  const getButtonText = () => {
    if (currentStep === 0 && currentRuleCard === 0) {
      return revealedSentences >= welcomeSentences.length ? 'CONTINUE' : 'TAP';
    } else if (currentStep === 0 && currentRuleCard === 1) {
      if (revealedRuleCards < ruleCards.length) {
        // Check if current revealed card is confirmed
        if (revealedRuleCards > 0 && !confirmedRuleCards[revealedRuleCards - 1]) {
          return 'CONFIRM CURRENT RULE FIRST';
        }
        return 'COMMIT';
      } else if (confirmedRuleCards.every(confirmed => confirmed)) {
        return 'I ACCEPT THE TERMS';
      } else {
        return 'CONFIRM ALL RULES';
      }
    } else if (currentStep === 10) {
      return 'LET THE COMMITMENT BEGIN';
    } else {
      return 'COMMIT';
    }
  };

  // Handle button click - either reveal sentence/rule card or proceed
  const handleButtonClick = () => {
    if (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) {
      revealNextSentence();
    } else if (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length) {
      // Only allow revealing next card if current card is confirmed (or if no cards revealed yet)
      if (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1]) {
        revealNextRuleCard();
      }
      // If current card is not confirmed, the button text will show "CONFIRM CURRENT RULE FIRST" and do nothing
    } else if (currentStep === 2) {
      // Final warning step - only proceed if hold is complete
      if (holdProgress >= 100) {
        nextStep();
      }
    } else if (currentStep === 1) {
      // Commitment level step - always allow clicking but check value
      if (sliderValue === 100) {
        nextStep();
        setAttemptedProceedWithIncomplete(false);
      } else {
        // Show access denied message for commitment level
        setAttemptedProceedWithIncomplete(true);
      }
    } else if (canProceed()) {
      nextStep();
      // Reset attempt state when successfully proceeding
      setAttemptedProceedWithIncomplete(false);
    }
  };

  return (
    <div 
      className="min-h-screen text-white relative overflow-hidden"
      style={{
        background: '#000000',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
      }}
    >
      {/* Warm orange/amber flowing gradients - ONLY after commitment */}
      {finalWarningCompleted && (
        <>
          <motion.div 
            className="fixed inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 1 }}
            style={{
              background: `
                radial-gradient(ellipse 140% 100% at 0% 100%, rgba(251, 146, 60, ${0.15 + gradientIntensity * 0.4}) 0%, transparent 40%),
                radial-gradient(ellipse 120% 90% at 100% 90%, rgba(245, 101, 101, ${0.12 + gradientIntensity * 0.35}) 0%, transparent 35%),
                radial-gradient(ellipse 100% 120% at 50% 100%, rgba(252, 211, 77, ${0.1 + gradientIntensity * 0.3}) 0%, transparent 30%),
                linear-gradient(0deg, rgba(251, 146, 60, ${0.08 + gradientIntensity * 0.25}) 0%, transparent 40%)
              `,
              opacity: 0.8 + gradientIntensity * 0.5
            }}
          />

          {/* Additional flowing warm accents */}
          <motion.div 
            className="fixed inset-0 pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 3, delay: 1.5 }}
            style={{
              background: `
                radial-gradient(circle 70vw at 30% 85%, rgba(249, 115, 22, ${0.08 + gradientIntensity * 0.15}) 0%, transparent 35%),
                radial-gradient(circle 50vw at 70% 95%, rgba(234, 88, 12, ${0.06 + gradientIntensity * 0.12}) 0%, transparent 30%),
                radial-gradient(circle 40vw at 50% 100%, rgba(251, 191, 36, ${0.05 + gradientIntensity * 0.1}) 0%, transparent 25%)
              `,
              opacity: gradientIntensity,
              transform: `scale(${1 + gradientIntensity * 0.08})`
            }}
          />
        </>
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
            onClick={() => onGoToLogin()}
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

      {/* Navigation - Fixed positioned at bottom - Hide completely on final warning step */}
      {currentStep !== 2 && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-20">
          <motion.button
            onClick={handleButtonClick}
            disabled={
              // Button is enabled if we're revealing content OR if we can click the commit button
              !(
                (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) ||
                (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length && (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1])) ||
                canClickCommitButton()
              )
            }
            className="relative overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: (
                (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) ||
                (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length && (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1])) ||
                canClickCommitButton()
              ) ? 
                'linear-gradient(135deg, #B91C1C 0%, #7F1D1D 100%)' : 
                'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
              borderRadius: '9999px',
              padding: '12px 32px',
              minWidth: '200px', // Fixed minimum width to prevent button from changing size
              border: `1px solid ${(
                (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) ||
                (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length && (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1])) ||
                canClickCommitButton()
              ) ? 'rgba(185, 28, 28, 0.4)' : 'rgba(55, 65, 81, 0.4)'}`,
              boxShadow: (
                (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) ||
                (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length && (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1])) ||
                canClickCommitButton()
              ) ? 
                '0 0 15px rgba(185, 28, 28, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : 
                '0 0 8px rgba(0, 0, 0, 0.3)',
              cursor: (
                (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) ||
                (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length && (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1])) ||
                canClickCommitButton()
              ) ? 'pointer' : 'not-allowed',
              filter: !(
                (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) ||
                (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length && (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1])) ||
                canClickCommitButton()
              ) ? 'grayscale(1) opacity(0.6)' : 'none'
            }}
            animate={{
              boxShadow: (
                (currentStep === 0 && currentRuleCard === 0 && revealedSentences < welcomeSentences.length) ||
                (currentStep === 0 && currentRuleCard === 1 && revealedRuleCards < ruleCards.length && (revealedRuleCards === 0 || confirmedRuleCards[revealedRuleCards - 1])) ||
                canClickCommitButton()
              ) ? [
                '0 0 15px rgba(185, 28, 28, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                '0 0 25px rgba(185, 28, 28, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                '0 0 15px rgba(185, 28, 28, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              ] : '0 0 8px rgba(0, 0, 0, 0.3)'
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-white text-lg font-black tracking-wide relative z-10 text-center block">
              {getButtonText()}
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
              onClick={() => onGoToLogin()}
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
            className="relative overflow-hidden min-w-[280px] bg-white text-black font-black text-xl py-4 px-8 rounded-full border-4 border-gray-800"
            onMouseDown={startHolding}
            onMouseUp={stopHolding}
            onMouseLeave={stopHolding}
            onTouchStart={startHolding}
            onTouchEnd={stopHolding}
            onClick={holdProgress >= 100 ? () => nextStep() : undefined}
            style={{
              background: holdProgress >= 100 
                ? '#22C55E' // Bright green when complete
                : '#FFFFFF', // White background - very visible
              color: holdProgress >= 100 ? '#FFFFFF' : '#000000',
              boxShadow: '0 0 20px rgba(255, 255, 255, 0.5)', // White glow to make it super visible
              cursor: 'pointer'
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
              {holdProgress >= 100 ? 'COMMITTED!' : 'HOLD TO COMMIT'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}