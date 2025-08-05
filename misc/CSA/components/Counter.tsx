import { useState, useEffect, useRef } from 'react';
import { Moon, X, Check, Clock, Play, Pause, RotateCcw, ChevronDown, ChevronUp, Lock } from 'lucide-react';

export function Counter() {
  const [count, setCount] = useState(0);
  const [selectedWeightIndex, setSelectedWeightIndex] = useState(0); // Start with "body" selected
  const [lockedWeightIndex, setLockedWeightIndex] = useState<number | null>(null);
  const [animatingPath, setAnimatingPath] = useState<number[]>([]);
  const [isDecreased, setIsDecreased] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const maxCount = 583;

  // Stopwatch state
  const [isStopwatchExpanded, setIsStopwatchExpanded] = useState(false);
  const [stopwatchTime, setStopwatchTime] = useState(0); // in milliseconds
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  // Weight button configuration with multipliers (removed kg from all buttons)
  const weightButtons = [
    { label: 'body', value: 0, multiplier: 1.0 },
    { label: '5', value: 5, multiplier: 1.25 },
    { label: '10', value: 10, multiplier: 1.5 },
    { label: '15', value: 15, multiplier: 1.75 },
    { label: '20', value: 20, multiplier: 2.0 },
    { label: '25', value: 25, multiplier: 2.25 },
    { label: '30', value: 30, multiplier: 2.5 },
    { label: '35', value: 35, multiplier: 2.75 }
  ];

  const baseWeight = weightButtons[selectedWeightIndex].value;

  // Calculate the effective count (count + weight modifier)
  const effectiveCount = count + (isDecreased ? Math.floor(baseWeight * 0.5) : baseWeight);
  
  // Load locked weight from localStorage on mount
  useEffect(() => {
    const savedLockedWeight = localStorage.getItem('counter-locked-weight');
    if (savedLockedWeight) {
      const lockedIndex = parseInt(savedLockedWeight);
      if (lockedIndex >= 0 && lockedIndex < weightButtons.length) {
        setLockedWeightIndex(lockedIndex);
        setSelectedWeightIndex(lockedIndex);
      }
    }
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Stopwatch effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchTime(prevTime => prevTime + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  // Format stopwatch time
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  // Stopwatch controls
  const startStopwatch = () => setIsStopwatchRunning(true);
  const pauseStopwatch = () => setIsStopwatchRunning(false);
  const resetStopwatch = () => {
    setIsStopwatchRunning(false);
    setStopwatchTime(0);
  };

  // Direct number manipulation
  const increment = () => setCount(prev => prev + 1);
  const decrement = () => setCount(prev => Math.max(0, prev - 1));
  const addAmount = (amount: number) => setCount(prev => Math.max(0, prev + amount));

  // Editing handlers
  const startEditing = () => {
    setTempValue(count.toString());
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setTempValue('');
  };

  const saveEditing = () => {
    const newValue = parseInt(tempValue);
    if (!isNaN(newValue) && newValue >= 0) {
      setCount(newValue);
    }
    cancelEditing();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits
    if (value === '' || /^\d+$/.test(value)) {
      setTempValue(value);
    }
  };

  // Animate weight selection
  const animateWeightSelection = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    // Clear any existing animation
    setAnimatingPath([]);

    // Create path from current to target
    const path: number[] = [];
    const step = fromIndex < toIndex ? 1 : -1;
    
    for (let i = fromIndex + step; i !== toIndex + step; i += step) {
      path.push(i);
    }

    // Set the animating path and animate through it quickly
    setAnimatingPath([fromIndex]);
    
    path.forEach((index, pathIndex) => {
      setTimeout(() => {
        setAnimatingPath(prev => [...prev, index]);
      }, (pathIndex + 1) * 30); // 30ms delay for faster animation
    });

    // Clear animation and set final selection
    setTimeout(() => {
      setAnimatingPath([]);
      setSelectedWeightIndex(toIndex);
    }, path.length * 30 + 50);
  };

  // Lock/unlock weight
  const toggleWeightLock = (index: number) => {
    if (lockedWeightIndex === index) {
      // Unlock
      setLockedWeightIndex(null);
      localStorage.removeItem('counter-locked-weight');
    } else {
      // Lock
      setLockedWeightIndex(index);
      localStorage.setItem('counter-locked-weight', index.toString());
      // Also select this weight if it's not already selected
      if (selectedWeightIndex !== index) {
        animateWeightSelection(selectedWeightIndex, index);
      }
    }
  };

  // Weight button click handler with "tap again" logic
  const handleWeightClick = (targetIndex: number) => {
    if (targetIndex === selectedWeightIndex) {
      // Tapping the already selected weight toggles lock
      toggleWeightLock(targetIndex);
    } else {
      // Tapping a different weight selects it
      animateWeightSelection(selectedWeightIndex, targetIndex);
    }
  };

  const reset = () => {
    setCount(0);
    // Only reset weight if it's not locked
    if (lockedWeightIndex === null) {
      setSelectedWeightIndex(0); // Reset to "body"
    }
    setAnimatingPath([]);
    setIsDecreased(false);
    resetStopwatch();
    cancelEditing(); // Cancel any editing in progress
  };

  const handleSubmit = () => {
    // Handle submission logic here
    console.log('Submitted:', {
      count,
      weight: baseWeight,
      isDecreased,
      effectiveCount,
      time: stopwatchTime
    });
    // You could add toast notification, API call, etc.
  };

  // Calculate progress for gradient (0 to 1)
  const progress = Math.min(effectiveCount / maxCount, 1);

  // Action button styles - now matching the number display aesthetic
  const actionButtonStyle = `
    relative overflow-hidden
    bg-gradient-to-b from-zinc-800/40 to-zinc-900/40
    backdrop-blur-sm
    border border-white/10
    shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
    hover:bg-gradient-to-b hover:from-zinc-800/60 hover:to-zinc-900/60
    hover:border-white/15
    active:bg-gradient-to-b active:from-zinc-900/60 active:to-black/60
    active:scale-[0.96]
    transition-all duration-150
    touch-manipulation
  `;

  const stopwatchButtonStyle = `
    relative overflow-hidden
    bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900
    border border-zinc-600
    shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.3)]
    hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(0,0,0,0.4)]
    active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_4px_rgba(0,0,0,0.2)]
    hover:from-zinc-600 hover:via-zinc-700 hover:to-zinc-800
    active:from-zinc-800 active:via-zinc-900 active:to-black
    active:scale-[0.98]
    transition-all duration-150
    touch-manipulation
    before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-white/4 before:to-transparent before:pointer-events-none
  `;
  
  // Weight button styles (selector/toggle appearance)
  const getWeightButtonStyle = (index: number) => {
    const isSelected = selectedWeightIndex === index;
    const isAnimating = animatingPath.includes(index);
    const isLocked = lockedWeightIndex === index;
    
    if (isLocked) {
      // Locked state - gold/amber theme with lock icon
      return `
        relative overflow-hidden
        bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600
        border-2 border-amber-300
        shadow-[inset_0_2px_0_rgba(255,255,255,0.3),inset_0_0_25px_rgba(245,158,11,0.3),0_0_25px_rgba(245,158,11,0.6)]
        hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.35),inset_0_0_30px_rgba(245,158,11,0.35),0_0_30px_rgba(245,158,11,0.7)]
        active:shadow-[inset_0_3px_0_rgba(255,255,255,0.4),inset_0_0_35px_rgba(245,158,11,0.4),0_0_20px_rgba(245,158,11,0.5)]
        hover:from-amber-300 hover:via-amber-400 hover:to-amber-500
        active:from-amber-500 active:via-amber-600 active:to-amber-700
        active:scale-[0.95]
        transition-all duration-200
        touch-manipulation
        before:absolute before:inset-[2px] before:rounded-[inherit] before:bg-gradient-to-br before:from-white/20 before:via-white/8 before:to-transparent before:pointer-events-none
        after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-t after:from-amber-600/20 after:to-transparent after:pointer-events-none
      `;
    } else if (isSelected || isAnimating) {
      return `
        relative overflow-hidden
        bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700
        border-2 border-indigo-400
        shadow-[inset_0_2px_0_rgba(255,255,255,0.2),inset_0_0_20px_rgba(99,102,241,0.2),0_0_20px_rgba(99,102,241,0.4)]
        hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.25),inset_0_0_25px_rgba(99,102,241,0.25),0_0_25px_rgba(99,102,241,0.5)]
        active:shadow-[inset_0_3px_0_rgba(255,255,255,0.3),inset_0_0_30px_rgba(99,102,241,0.3),0_0_15px_rgba(99,102,241,0.3)]
        hover:from-indigo-400 hover:via-purple-500 hover:to-violet-600
        active:from-indigo-600 active:via-purple-700 active:to-violet-800
        active:scale-[0.95]
        transition-all duration-200
        touch-manipulation
        before:absolute before:inset-[2px] before:rounded-[inherit] before:bg-gradient-to-br before:from-white/15 before:via-white/5 before:to-transparent before:pointer-events-none
        after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-t after:from-indigo-600/20 after:to-transparent after:pointer-events-none
        ${isAnimating ? 'scale-105 shadow-[inset_0_2px_0_rgba(255,255,255,0.3),inset_0_0_30px_rgba(99,102,241,0.4),0_0_30px_rgba(99,102,241,0.6)]' : ''}
      `;
    }
    
    return `
      relative overflow-hidden
      bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800
      border-2 border-slate-500
      shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.2)]
      hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.3)]
      active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_4px_rgba(0,0,0,0.1)]
      hover:from-slate-500 hover:via-slate-600 hover:to-slate-700
      active:from-slate-700 active:via-slate-800 active:to-slate-900
      active:scale-[0.95]
      transition-all duration-150
      touch-manipulation
      before:absolute before:inset-[2px] before:rounded-[inherit] before:bg-gradient-to-br before:from-white/3 before:to-transparent before:pointer-events-none
    `;
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-3">
        <div className="absolute inset-0" style={{ 
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.05) 0%, transparent 25%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 25%)`,
          backgroundSize: '100px 100px'
        }}></div>
      </div>

      {/* Header with gradient that fills based on progress */}
      <div 
        className="relative p-4 flex items-center justify-between backdrop-blur-sm border-b border-white/10"
        style={{
          background: `linear-gradient(to right, rgba(99, 102, 241, 0.15) ${progress * 100}%, rgba(0, 0, 0, 0.5) ${progress * 100}%)`
        }}
      >
        <div className="flex items-center gap-3">
          <Moon className="w-6 h-6" />
          <div>
            <div className="font-medium text-base">Counter</div>
            <div className="text-sm text-white/60">{isDecreased ? '0.5x' : '1x'} weight</div>
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-sans font-bold">{effectiveCount} pts</div>
          <div className="text-sm text-white/60">
            {count} + {isDecreased ? Math.floor(baseWeight * 0.5) : baseWeight}w
          </div>
        </div>
        
        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Stopwatch Section */}
      <div className="border-b border-white/10 backdrop-blur-sm">
        <button
          onClick={() => setIsStopwatchExpanded(!isStopwatchExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span className="font-medium">Stopwatch</span>
            <span className="font-sans text-cyan-400">{formatTime(stopwatchTime)}</span>
          </div>
          {isStopwatchExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        
        {isStopwatchExpanded && (
          <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* Large time display */}
            <div className="text-center">
              <div className="font-sans text-6xl font-bold text-cyan-400 tracking-wider">
                {formatTime(stopwatchTime)}
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex justify-center gap-3">
              <button
                onClick={isStopwatchRunning ? pauseStopwatch : startStopwatch}
                className={`${stopwatchButtonStyle} px-6 py-3 rounded-xl flex items-center gap-2 ${
                  isStopwatchRunning 
                    ? 'from-orange-600 via-orange-700 to-orange-800 border-orange-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(234,88,12,0.3)]' 
                    : 'from-green-600 via-green-700 to-green-800 border-green-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(34,197,94,0.3)]'
                }`}
              >
                {isStopwatchRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isStopwatchRunning ? 'Pause' : 'Start'}
              </button>
              
              <button
                onClick={resetStopwatch}
                className={`${stopwatchButtonStyle} px-6 py-3 rounded-xl flex items-center gap-2`}
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 p-3 flex flex-col gap-3">
        {/* Interactive Counter Display - Now with keyboard editing */}
        <div className="relative flex items-center justify-center h-32 group">
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-transparent to-purple-500/8 rounded-3xl blur-xl"></div>
          
          {/* Number display with interactive click zones and editing */}
          <div className="relative w-full h-full flex items-center justify-center rounded-3xl bg-gradient-to-b from-zinc-800/60 to-zinc-900/60 backdrop-blur-sm border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
            {!isEditing ? (
              <>
                {/* Left click zone (decrement) */}
                <button
                  onClick={decrement}
                  className="absolute left-0 top-0 w-1/3 h-full z-10 flex items-center justify-center hover:bg-white/8 active:bg-white/12 transition-all duration-150 active:scale-95 touch-manipulation"
                >
                  <span className="opacity-25 hover:opacity-50 active:opacity-70 text-3xl font-bold transition-opacity duration-200">−</span>
                </button>
                
                {/* Right click zone (increment) */}
                <button
                  onClick={increment}
                  className="absolute right-0 top-0 w-1/3 h-full z-10 flex items-center justify-center hover:bg-white/8 active:bg-white/12 transition-all duration-150 active:scale-95 touch-manipulation"
                >
                  <span className="opacity-25 hover:opacity-50 active:opacity-70 text-3xl font-bold transition-opacity duration-200">+</span>
                </button>
                
                {/* Number display - clickable for editing */}
                <button
                  onClick={startEditing}
                  className="relative z-0 w-full h-full flex items-center justify-center group/number hover:bg-white/5 transition-all duration-200 rounded-3xl"
                >
                  <span 
                    className="font-sans font-black tabular-nums text-white leading-none tracking-tight drop-shadow-2xl group-hover/number:scale-105 transition-transform duration-200" 
                    style={{ 
                      fontSize: '5rem',
                      textShadow: '0 0 40px rgba(255,255,255,0.2)' 
                    }}
                  >
                    {effectiveCount}
                  </span>
                </button>
              </>
            ) : (
              /* Editing input field */
              <input
                ref={inputRef}
                type="text"
                value={tempValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onBlur={saveEditing}
                className="relative z-10 w-full h-full bg-transparent border-none outline-none text-center font-sans font-black tabular-nums text-white leading-none tracking-tight"
                style={{ 
                  fontSize: '5rem',
                  textShadow: '0 0 40px rgba(255,255,255,0.2)' 
                }}
                maxLength={6}
              />
            )}
          </div>
        </div>

        {/* Action Buttons - Now styled like the number display */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => addAmount(-10)}
            className={`${actionButtonStyle} aspect-square rounded-3xl flex items-center justify-center`}
          >
            <div className="flex items-baseline">
              <span className="text-2xl font-thin">−</span>
              <span className="text-3xl font-bold">10</span>
            </div>
          </button>
          
          <button
            onClick={() => addAmount(-5)}
            className={`${actionButtonStyle} aspect-square rounded-3xl flex items-center justify-center`}
          >
            <div className="flex items-baseline">
              <span className="text-2xl font-thin">−</span>
              <span className="text-3xl font-bold">5</span>
            </div>
          </button>
          
          <button
            onClick={() => addAmount(5)}
            className={`${actionButtonStyle} aspect-square rounded-3xl flex items-center justify-center`}
          >
            <div className="flex items-baseline">
              <span className="text-2xl font-thin">+</span>
              <span className="text-3xl font-bold">5</span>
            </div>
          </button>
          
          <button
            onClick={() => addAmount(10)}
            className={`${actionButtonStyle} aspect-square rounded-3xl flex items-center justify-center`}
          >
            <div className="flex items-baseline">
              <span className="text-2xl font-thin">+</span>
              <span className="text-3xl font-bold">10</span>
            </div>
          </button>
        </div>

        {/* Weight Selector Section - Fixed button layout */}
        <div className="space-y-2">
          <div className="text-center">
            <div className="text-sm text-white/60 font-medium uppercase tracking-wider">Weight Selection (kg)</div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {/* Weight buttons - fixed layout with proper centering */}
            {weightButtons.map((button, index) => (
              <button
                key={index}
                onClick={() => handleWeightClick(index)}
                className={`${getWeightButtonStyle(index)} aspect-square rounded-3xl relative`}
              >
                {/* Lock icon for locked weights */}
                {lockedWeightIndex === index && (
                  <div className="absolute top-2 right-2 z-20">
                    <Lock className="w-4 h-4 text-amber-900 drop-shadow-sm" />
                  </div>
                )}
                
                {/* Container for centered content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`relative z-10 font-bold ${button.label === 'body' ? 'text-xl' : 'text-3xl'} ${lockedWeightIndex === index ? 'text-amber-900' : ''}`}>
                    {button.label}
                  </span>
                </div>
                
                {/* Multiplier - positioned at bottom, outside flex container */}
                <span className={`absolute bottom-3 left-1/2 transform -translate-x-1/2 text-xs z-10 ${lockedWeightIndex === index ? 'text-amber-900/60' : 'text-white/30'}`}>
                  ×{button.multiplier}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom section with calculation and submit */}
      <div className="p-4 space-y-4 border-t border-white/10 backdrop-blur-sm">
        {/* Decreased/Regular toggle - now full width and subtle */}
        <button
          onClick={() => setIsDecreased(!isDecreased)}
          className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl transition-all duration-200 backdrop-blur-sm relative overflow-hidden ${
            isDecreased 
              ? 'bg-gradient-to-b from-amber-600/40 via-amber-700/40 to-amber-800/40 border border-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none' 
              : 'bg-gradient-to-b from-zinc-800/30 via-zinc-900/30 to-black/30 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:from-zinc-800/40 hover:via-zinc-900/40 hover:to-black/40 before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-white/3 before:to-transparent before:pointer-events-none'
          }`}
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all relative z-10 ${
            isDecreased 
              ? 'bg-amber-400 border-amber-400' 
              : 'border-white/30 bg-transparent'
          }`}>
            {isDecreased && <Check className="w-3 h-3 text-black" />}
          </div>
          <span className="font-medium relative z-10 text-center flex-1">
            {isDecreased ? 'Decreased (0.5x weight)' : 'Regular (1x weight)'}
          </span>
        </button>

        {/* Calculation breakdown - NOT a button */}
        <div className="text-center space-y-3 px-4 py-6">
          <div className="text-sm text-white/50 font-medium">CALCULATION</div>
          <div className="text-2xl font-sans tracking-wide">
            <span className="text-white font-bold">{count}</span>
            <span className="text-white/40 mx-3">+</span>
            <span className="text-indigo-400 font-bold">{isDecreased ? Math.floor(baseWeight * 0.5) : baseWeight}</span>
            <span className="text-white/40 mx-3">=</span>
            <span className="text-white font-black text-3xl">{effectiveCount}</span>
          </div>
          <div className="text-xs text-white/40 font-sans">
            Base: {count} • Weight: {baseWeight}{isDecreased ? ' × 0.5' : ''}
          </div>
        </div>
        
        {/* Submit button */}
        <button
          onClick={handleSubmit}
          className="w-full relative overflow-hidden bg-gradient-to-b from-indigo-500 via-purple-600 to-violet-700 border border-indigo-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_6px_24px_rgba(99,102,241,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(99,102,241,0.5)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_2px_12px_rgba(99,102,241,0.3)] hover:from-indigo-400 hover:via-purple-500 hover:to-violet-600 active:from-indigo-600 active:via-purple-700 active:to-violet-800 active:scale-[0.98] py-4 rounded-xl font-bold transition-all duration-200 touch-manipulation before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-white/15 before:to-transparent before:pointer-events-none"
        >
          <span className="relative z-10">Submit • {effectiveCount} points</span>
        </button>
      </div>
    </div>
  );
}