import React, { useState } from 'react';
import { Button } from './ui/button';
import { WorkoutSummaryPost } from './WorkoutSummaryPost';
import { SimpleEmojiPicker } from './SimpleEmojiPicker';
import { Plus, Reply } from 'lucide-react';

interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface Message {
  id: string;
  user: User;
  content: string;
  timestamp: Date;
  type?: 'text' | 'workout' | 'file';
  workoutData?: any;
  fileName?: string;
  fileSize?: string;
  reactions?: { [emoji: string]: string[] };
  replyTo?: {
    messageId: string;
    userName: string;
    content: string;
    type: 'text' | 'image' | 'workout';
  };
}

interface MessageComponentProps {
  message: Message;
  currentUser: User;
  onAddReaction: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
}

export function MessageComponent({ message, currentUser, onAddReaction, onReply }: MessageComponentProps) {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const isCurrentUser = message.user.id === currentUser.id;
  const isWorkoutPost = message.type === 'workout';

  const handleShowActionMenu = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Position menu relative to the message bubble
    let leftPosition = rect.left + rect.width / 2;
    let topPosition = rect.top - 20; // 20px above the element
    
    // Check if menu would go outside viewport
    const menuWidth = 120; // Half width for centering
    if (leftPosition - menuWidth < 10) {
      leftPosition = menuWidth + 10;
    }
    if (leftPosition + menuWidth > window.innerWidth - 10) {
      leftPosition = window.innerWidth - menuWidth - 10;
    }
    
    // Check if menu would go above viewport
    if (topPosition < 10) {
      topPosition = rect.bottom + 10; // Show below element instead
    }
    
    setMenuPosition({
      top: topPosition,
      left: leftPosition
    });
    setShowActionMenu(true);
  };

  const handleEmojiSelect = (emoji: string) => {
    onAddReaction(message.id, emoji);
    setShowActionMenu(false);
  };

  const handleReply = () => {
    onReply(message.id);
    setShowActionMenu(false);
  };

  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className={`flex gap-3 mb-4 items-end ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar - only show for other users, positioned at bottom */}
      {!isCurrentUser && (
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
          style={{ backgroundColor: message.user.color }}
        >
          {message.user.avatar}
        </div>
      )}

      {/* Message content */}
      <div className={`max-w-lg relative ${isCurrentUser ? 'mr-3' : 'ml-2'}`}>
        {/* User name - only show for other users */}
        {!isCurrentUser && (
          <div className="text-sm mb-2 ml-4 font-medium" style={{ color: message.user.color }}>
            {message.user.name}
          </div>
        )}

        {/* Message bubble */}
        <div className="relative">
          <div 
            className={`
              relative px-4 py-3 rounded-xl shadow-sm cursor-pointer transition-colors
              ${isCurrentUser 
                ? 'bg-gradient-to-r from-orange-700 to-red-600 hover:from-orange-800 hover:to-red-700 text-white rounded-br-none' 
                : 'bg-gray-800 hover:bg-gray-700 text-white rounded-bl-none'
              }
            `}
            onClick={handleShowActionMenu}
          >
            {/* Speech bubble tail */}
            <div 
              className={`
                absolute bottom-0 w-4 h-4
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
            {isWorkoutPost ? (
              <WorkoutSummaryPost 
                workoutData={message.workoutData} 
                user={message.user}
                compact={true}
              />
            ) : message.type === 'file' ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">📄</span>
                </div>
                <div className="flex-1">
                  <div className="text-base">{message.fileName}</div>
                  <div className="text-sm opacity-70">{message.fileSize}</div>
                </div>
              </div>
            ) : (
              <div className="text-base leading-6">
                {message.content}
              </div>
            )}

            {/* Timestamp and read receipt */}
            <div className={`
              flex items-center justify-end gap-1 mt-2 text-sm opacity-70
              ${isCurrentUser ? 'text-orange-100' : 'text-gray-300'}
            `}>
              <span>{formatTime(message.timestamp)}</span>
              {isCurrentUser && (
                <div className="text-orange-200 text-base">✓✓</div>
              )}
            </div>
          </div>

          {/* Existing reactions */}
          {hasReactions && (
            <div className={`flex gap-2 mt-2 flex-wrap items-center ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(message.reactions!).map(([emoji, userIds]) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-3 rounded-full text-sm bg-gray-800 hover:bg-gray-700 border ${
                    userIds.includes(currentUser.id) ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700'
                  }`}
                  onClick={() => onAddReaction(message.id, emoji)}
                >
                  {emoji} {userIds.length > 1 && userIds.length}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Action Menu */}
      {showActionMenu && (
        <div 
          className="fixed z-50 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3"
          style={{
            top: menuPosition.top,
            left: menuPosition.left - 120, // Center the menu
            transform: 'translateX(50%)'
          }}
        >
          {/* Reply Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-white hover:bg-gray-700 mb-2"
            onClick={handleReply}
          >
            <Reply className="w-4 h-4" />
            Reply
          </Button>

          {/* Emoji Reactions */}
          <div className="text-sm text-gray-400 mb-2">React with:</div>
          <div className="flex gap-1 flex-wrap">
            {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="text-2xl p-1 h-8 w-8 hover:bg-gray-700"
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Backdrop to close menu */}
      {showActionMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowActionMenu(false)}
        />
      )}
    </div>
  );
}