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
  avatar_url?: string;
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



  return (
    <div className={`flex gap-2 ${isLastInGroup ? 'mb-3' : 'mb-0.5'} items-end ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar - only show for other users and only on last message in group */}
      {/* Avatar - replaced with 4-letter code, only for other users and only on last message in group */}
      {/* Avatar - for other users, only on last message of group */}
      {!isCurrentUser && (
        <div className="w-8 mr-2 flex-shrink-0 flex flex-col justify-end">
          {isLastInGroup ? (
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center">
              {message.avatar_url ? (
                <img
                  src={message.avatar_url}
                  alt={message.username || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-bold text-zinc-500">
                  {(message.username || 'User').substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}

      {/* Message content column */}
      <div className={`${isWorkoutPost ? 'max-w-full w-full' : 'max-w-[85%]'} flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>

        {/* Timestamp & Name - positioned above first message in group */}
        {isFirstInGroup && (
          <div className={`flex items-center gap-2 mb-1 px-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isCurrentUser && (
              <span className="text-[11px] font-bold text-zinc-400">
                {message.username || 'User'}
              </span>
            )}
            <span className="text-[9px] font-medium text-white/30 uppercase tracking-wider">
              {formatTime(message.created_at)}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className="relative">
          <div
            className={`
              relative cursor-pointer transition-all touch-manipulation select-none
              ${isWorkoutPost || (message.message_type === 'image' && message.image_url)
                ? 'p-0 w-full bg-transparent' // For workout/image posts, let the component handle styling
                : `px-3 py-1.5 rounded-[1.5rem] ${isCurrentUser
                  ? message.id.startsWith('temp-')
                    ? `bg-gradient-to-br from-orange-500 to-red-600 text-white opacity-70 ${isLastInGroup ? 'rounded-br-[4px]' : ''}`
                    : `bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white ${isLastInGroup ? 'rounded-br-[4px]' : ''}`
                  : `bg-[#1a1a1a] hover:bg-[#222] text-white ${isLastInGroup ? 'rounded-bl-[4px]' : ''}`
                }`
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
            {/* Message tail for received messages */}
            {!isCurrentUser && isLastInGroup && !isWorkoutPost && !(message.message_type === 'image' && message.image_url) && (
              <div className="absolute -left-[6px] bottom-0 w-[6px] h-[16px] overflow-hidden">
                <svg viewBox="0 0 6 16" className="w-full h-full text-[#1a1a1a] fill-current">
                  <path d="M6 16V0C6 0 0 16 0 16H6Z" />
                </svg>
              </div>
            )}

            {/* Removed internal user name display */}
            {/* Removed speech bubble tail for cleaner modern look */}

            {/* Reply context - shown when this message is a reply */}
            {message.replyTo && (
              <div className={`
                mb-2 p-2 rounded-xl border-l-2
                ${isCurrentUser
                  ? 'bg-white/10 border-white/30'
                  : 'bg-white/5 border-white/20'
                }
              `}>
                <div className={`text-[9px] font-bold mb-0.5 ${isCurrentUser ? 'text-white/60' : 'text-white/50'}`}>
                  {message.replyTo.userName}
                </div>
                <div className={`text-xs opacity-70 truncate ${isCurrentUser ? 'text-white/80' : 'text-white/70'}`}>
                  {message.replyTo.type === 'workout' ? '🏋️ Workout' : message.replyTo.content}
                </div>
              </div>
            )}

            {/* Message content */}
            {isWorkoutPost && workoutData ? (
              <WorkoutSummaryPost
                workoutData={workoutData}
                user={message}
                compact={true}
                isCurrentUser={isCurrentUser}
                isLastInGroup={isLastInGroup}
              />
            ) : message.message_type === 'image' && message.image_url ? (
              <div className="mb-0 overflow-hidden relative group">
                <img
                  src={message.image_url}
                  alt="Shared image"
                  className={`
                    max-w-full h-auto object-cover border border-white/10
                    rounded-[1.5rem]
                    ${isLastInGroup
                      ? isCurrentUser
                        ? 'rounded-br-[4px]'
                        : 'rounded-bl-[4px]'
                      : ''
                    }
                  `}
                  style={{ maxHeight: '280px', width: '100%' }}
                  loading="lazy"
                  decoding="async"
                  onLoad={(e) => {
                    // Force a repaint for better mobile performance
                    e.currentTarget.style.transform = 'translateZ(0)'
                  }}
                />
              </div>
            ) : message.message && message.message_type !== 'workout_completion' ? (
              <div className="text-[14px] leading-[1.4]">
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


          {/* Reactions - hide by default, show on hover/interaction */}
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
                <button
                  key={emoji}
                  className={`h-5 px-1.5 rounded-full text-[10px] bg-black/50 hover:bg-black/70 border transition-all ${reactions.some(r => r.user_id === currentUser.id) ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/10'
                    }`}
                  onClick={() => onAddReaction(message.id, emoji)}
                >
                  <span className="text-xs">{emoji}</span>{reactions.length > 1 && <span className="text-[9px] ml-0.5 text-white/60">{reactions.length}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>


  );
}