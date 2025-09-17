import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { WorkoutSummaryPost } from './WorkoutSummaryPost';
import { Plus, Reply } from 'lucide-react';

interface User {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  isOnline?: boolean;
}

interface ChatMessage {
  id: string;
  group_id: string;
  user_id: string;
  message: string;
  message_type?: 'text' | 'image' | 'workout_completion';
  image_url?: string;
  workout_data?: any;
  created_at: string;
  user_email?: string;
  user_role?: string;
  username?: string;
  reactions?: MessageReaction[];
  replyTo?: {
    messageId: string;
    userName: string;
    content: string;
    type: 'text' | 'image' | 'workout';
  };
}

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  user_email?: string;
}

interface MessageComponentProps {
  message: ChatMessage;
  currentUser: { id: string; email?: string; username?: string };
  onAddReaction: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
  onShowMenu: (messageId: string, position: { top: number, left: number }) => void;
  onCloseMenu: () => void;
  showMenu: boolean;
  menuPosition: { top: number, left: number };
  getUserColor: (email: string, role: string) => string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export function MessageComponent({ 
  message, 
  currentUser, 
  onAddReaction, 
  onReply,
  onShowMenu,
  onCloseMenu,
  showMenu,
  menuPosition,
  getUserColor,
  isFirstInGroup = true,
  isLastInGroup = true
}: MessageComponentProps) {
  const isCurrentUser = message.user_id === currentUser.id;
  const isWorkoutPost = message.message_type === 'workout_completion';


  const handleShowActionMenu = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Menu dimensions
    const menuWidth = 240;
    const menuHeight = 120;
    const offset = 10;
    
    // Position menu relative to viewport using fixed positioning
    // Start with centered position above the message
    let leftPosition = rect.left + rect.width / 2 - menuWidth / 2;
    let topPosition = rect.top - menuHeight - 10;
    
    // Ensure menu stays within horizontal viewport bounds
    if (leftPosition < offset) {
      leftPosition = offset;
    } else if (leftPosition + menuWidth > window.innerWidth - offset) {
      leftPosition = window.innerWidth - menuWidth - offset;
    }
    
    // Ensure menu stays within vertical viewport bounds
    if (topPosition < offset) {
      // Show below the element if there's not enough space above
      topPosition = rect.bottom + 10;
      
      // If still not enough space below, position at the top with margin
      if (topPosition + menuHeight > window.innerHeight - offset) {
        topPosition = offset;
      }
    }
    
    onShowMenu(message.id, {
      top: topPosition,
      left: leftPosition
    });
  };

  // Long press implementation with proper scroll detection
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);

  const LONG_PRESS_DURATION = 600; // 600ms - industry standard
  const MOVEMENT_THRESHOLD = 10; // 10px movement tolerance

  const handleTouchStart = (event: React.TouchEvent) => {
    event.stopPropagation();
    
    // Store the initial touch position
    const touch = event.touches[0];
    touchStartPositionRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    
    longPressTriggeredRef.current = false;

    // Start the long press timer
    longPressTimeoutRef.current = setTimeout(() => {
      if (!longPressTriggeredRef.current) {
        longPressTriggeredRef.current = true;
        handleShowActionMenu(event);
        
        // Optional: Add haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
    }, LONG_PRESS_DURATION);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    // If we don't have a start position, ignore
    if (!touchStartPositionRef.current || !longPressTimeoutRef.current) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPositionRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPositionRef.current.y);
    
    // If movement exceeds threshold, cancel the long press
    if (deltaX > MOVEMENT_THRESHOLD || deltaY > MOVEMENT_THRESHOLD) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
      touchStartPositionRef.current = null;
    }
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Clean up the long press timer
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    touchStartPositionRef.current = null;
    
    // If long press was already triggered, don't do anything else
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
  };

  const handleTouchCancel = () => {
    // Clean up on touch cancel (when user drags finger off element)
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    touchStartPositionRef.current = null;
    longPressTriggeredRef.current = false;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    onAddReaction(message.id, emoji);
    onCloseMenu();
  };

  const handleReply = () => {
    onReply(message.id);
    onCloseMenu();
  };

  const hasReactions = message.reactions && message.reactions.length > 0;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const parseWorkoutData = () => {
    if (message.message_type === 'workout_completion' && message.message) {
      try {
        const parsedMessage = JSON.parse(message.message);
        return parsedMessage.workout_data;
      } catch (e) {
        console.log('Could not parse workout completion message:', e);
        return null;
      }
    }
    return null;
  };

  const workoutData = parseWorkoutData();

  // Get user avatar and color
  const getUserAvatar = () => {
    // For demo purposes, assign emojis based on user email/username
    const avatars = ['🌊', '🏔️', '⚡', '🎯', '🚀', '💎', '🎸', '🌟'];
    const email = message.user_email || '';
    const hash = email.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return avatars[Math.abs(hash) % avatars.length];
  };

  const getUserBgColor = () => {
    const colors = [
      '#e91e63', '#4caf50', '#3b82f6', '#8b5cf6', 
      '#f59e0b', '#ec4899', '#06b6d4', '#10b981'
    ];
    const email = message.user_email || '';
    const hash = email.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={`flex gap-2 ${isLastInGroup ? 'mb-3' : 'mb-1'} items-end ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar - only show for other users and only on last message in group */}
      {!isCurrentUser && isLastInGroup && (
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
          style={{ backgroundColor: getUserBgColor() }}
        >
          {getUserAvatar()}
        </div>
      )}
      
      {/* Spacer for grouped messages without avatar */}
      {!isCurrentUser && !isLastInGroup && (
        <div className="w-8 h-8 flex-shrink-0" />
      )}

      {/* Message content */}
      <div className={`${isWorkoutPost ? 'max-w-full w-full' : 'max-w-md'} relative ${isCurrentUser ? 'mr-2' : 'ml-1'}`}>
        {/* Timestamp - positioned to align with text content right edge */}
        {isFirstInGroup && (
          <div className="absolute top-2 right-3 text-xs text-gray-400 z-50">
            {formatTime(message.created_at)}
          </div>
        )}
        
        {/* Message bubble */}
        <div className="relative">
          <div 
            className={`
              relative px-3 py-2 rounded-xl shadow-sm cursor-pointer transition-colors touch-manipulation select-none
              ${isCurrentUser 
                ? message.id.startsWith('temp-')
                  ? `bg-gradient-to-r from-orange-700 to-red-600 text-white opacity-70 ${isLastInGroup ? 'rounded-br-none' : ''}`
                  : `bg-gradient-to-r from-orange-700 to-red-600 hover:from-orange-800 hover:to-red-700 text-white ${isLastInGroup ? 'rounded-br-none' : ''}`
                : `bg-gray-800 hover:bg-gray-700 text-white ${isLastInGroup ? 'rounded-bl-none' : ''}`
              }
            `}
            onClick={handleShowActionMenu}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            role="button"
            tabIndex={0}
            style={{
              WebkitTapHighlightColor: 'transparent',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
          >
            {/* User name - show for all users and only on first message in group, inside the bubble */}
            {isFirstInGroup && (
              <div 
                className={`text-sm font-medium mb-1 ${
                  isCurrentUser 
                    ? 'text-orange-200' 
                    : getUserColor(message.user_email || '', message.user_role || 'user')
                }`}
              >
                {message.username || 'User'}
              </div>
            )}
            {/* Speech bubble tail - only show on last message in group */}
            {isLastInGroup && (
              <div 
                className={`
                  absolute bottom-0 w-3 h-3
                  ${isCurrentUser 
                    ? 'right-0 translate-x-full bg-gradient-to-br from-orange-700 to-red-600' 
                    : 'left-0 -translate-x-full bg-gray-800'
                  }
                `} 
                style={{
                  clipPath: isCurrentUser 
                    ? 'polygon(0 0, 100% 100%, 0 100%)' 
                    : 'polygon(100% 0, 0 100%, 100% 100%)'
                }}
              ></div>
            )}

            {/* Reply context - shown when this message is a reply */}
            {message.replyTo && (
              <div className={`
                mb-3 p-2 rounded-lg border-l-4 border-opacity-50
                ${isCurrentUser 
                  ? 'bg-orange-500/20 border-orange-300' 
                  : 'bg-gray-700/50 border-gray-400'
                }
              `}>
                <div className={`text-sm font-medium mb-1 ${isCurrentUser ? 'text-orange-200' : 'text-gray-300'}`}>
                  {message.replyTo.userName}
                </div>
                <div className={`text-sm opacity-75 truncate ${isCurrentUser ? 'text-orange-100' : 'text-gray-400'}`}>
                  {message.replyTo.type === 'workout' ? '🏋️ Workout summary' : message.replyTo.content}
                </div>
              </div>
            )}

            {/* Message content */}
            {isWorkoutPost && workoutData ? (
              <WorkoutSummaryPost 
                workoutData={workoutData} 
                user={message}
                compact={true}
              />
            ) : message.message_type === 'image' && message.image_url ? (
              <div className="mb-2">
                <img 
                  src={message.image_url} 
                  alt="Shared image" 
                  className="rounded-lg max-w-full h-auto"
                  style={{ maxHeight: '300px' }}
                  loading="lazy"
                  decoding="async"
                  onLoad={(e) => {
                    // Force a repaint for better mobile performance
                    e.currentTarget.style.transform = 'translateZ(0)'
                  }}
                />
              </div>
            ) : message.message && message.message_type !== 'workout_completion' ? (
              <div className="text-sm leading-5">
                {message.message}
              </div>
            ) : null}

            {/* Sending indicator for pending messages */}
            {message.id.startsWith('temp-') && (
              <div className="flex items-center justify-end mt-1">
                <div className="w-3 h-3 animate-spin border border-white border-t-transparent rounded-full opacity-50"></div>
              </div>
            )}
          </div>


          {/* Existing reactions */}
          {hasReactions && (
            <div className={`flex gap-1 mt-1 flex-wrap items-center ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(
                message.reactions!.reduce((acc, reaction) => {
                  if (!acc[reaction.emoji]) {
                    acc[reaction.emoji] = [];
                  }
                  acc[reaction.emoji].push(reaction);
                  return acc;
                }, {} as { [emoji: string]: MessageReaction[] })
              ).map(([emoji, reactions]) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className={`h-6 px-2 rounded-full text-xs bg-gray-800 hover:bg-gray-700 border ${
                    reactions.some(r => r.user_id === currentUser.id) ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700'
                  }`}
                  onClick={() => onAddReaction(message.id, emoji)}
                >
                  {emoji} {reactions.length > 1 && reactions.length}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}