import React, { useState, useRef } from 'react';
import { X, Send, Plus, Smile, MessageCircle, Reply } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MessageComponent } from './MessageComponent';
import { WorkoutSummaryPost } from './WorkoutSummaryPost';

interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isOnline: boolean;
}

interface Message {
  id: string;
  user: User;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'workout';
  reactions?: { [emoji: string]: string[] }; // emoji -> array of user ids
  imageUrl?: string;
  workoutData?: any;
  replyTo?: {
    messageId: string;
    userName: string;
    content: string;
    type: 'text' | 'image' | 'workout';
  };
}

const users: User[] = [
  { id: '1', name: 'Susanne', avatar: '🌊', color: '#e91e63', isOnline: true },
  { id: '2', name: 'Inge Van De Ven', avatar: '🏔️', color: '#4caf50', isOnline: false },
  { id: '3', name: 'Mike', avatar: '⚡', color: '#3b82f6', isOnline: true },
  { id: '4', name: 'You', avatar: '🎯', color: '#8b5cf6', isOnline: true },
  { id: '5', name: 'Alex', avatar: '🚀', color: '#f59e0b', isOnline: false },
  { id: '6', name: 'Sarah', avatar: '💎', color: '#ec4899', isOnline: true },
  { id: '7', name: 'Tom', avatar: '🎸', color: '#06b6d4', isOnline: false },
  { id: '8', name: 'Lisa', avatar: '🌟', color: '#10b981', isOnline: false },
];

const currentUser = users[3];

const totalMembers = users.length;
const onlineMembers = users.filter(user => user.isOnline).length;

export function ChatInterface() {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      user: users[0],
      content: "Just finished my morning run! 5k in 28 minutes 💪",
      timestamp: new Date('2024-01-13T20:47:00'),
      type: 'text',
      reactions: {}
    },
    {
      id: '2',
      user: users[1],
      content: "Amazing pace Susanne! I'm heading to the gym in 30. Who's joining for leg day? 🦵",
      timestamp: new Date('2024-01-13T21:12:00'),
      type: 'text',
      reactions: { '🔥': ['1'] }
    },
    {
      id: '3',
      user: users[0],
      content: "Count me in! Need to make up for yesterday's rest day",
      timestamp: new Date('2024-01-14T09:14:00'),
      type: 'text',
      reactions: {}
    },
    {
      id: '4',
      user: users[3],
      content: "Let's gooooo! Time to crush those squats 💯",
      timestamp: new Date('2024-01-14T16:19:00'),
      type: 'text',
      reactions: {}
    },
    {
      id: '5',
      user: users[3],
      content: "Anyone tried the new HIIT class at the studio? Heard it's intense",
      timestamp: new Date('2024-01-14T16:20:00'),
      type: 'text',
      reactions: {}
    },
    {
      id: '6',
      user: users[0],
      content: "Yes! Did it yesterday. Prepare to sweat buckets 😅",
      timestamp: new Date('2024-01-14T17:04:00'),
      type: 'text',
      reactions: {}
    },
    {
      id: '7',
      user: users[2],
      content: "Just crushed leg day! 💪",
      timestamp: new Date('2024-01-14T18:30:00'),
      type: 'workout',
      reactions: {},
      workoutData: {
        title: "Evening Strength Session",
        points: 420,
        target: 400,
        percentage: 105,
        exercises: [
          { name: "Barbell Squats", reps: 45, points: 150 },
          { name: "Romanian Deadlifts", reps: 30, points: 120 },
          { name: "Walking Lunges", reps: 40, points: 100 },
          { name: "Calf Raises", reps: 60, points: 50 }
        ],
        completedAt: "18:30"
      }
    },
    {
      id: '8',
      user: users[1],
      content: "Mike going absolutely INSANE! 🔥🔥🔥",
      timestamp: new Date('2024-01-14T18:35:00'),
      type: 'text',
      reactions: { '💪': ['3'], '🔥': ['0', '3'] }
    },
    {
      id: '9',
      user: users[0],
      content: "Thanks! That was brutal but so worth it 😅",
      timestamp: new Date('2024-01-14T18:37:00'),
      type: 'text',
      reactions: {},
      replyTo: {
        messageId: '8',
        userName: 'Inge Van De Ven',
        content: 'Mike going absolutely INSANE! 🔥🔥🔥',
        type: 'text'
      }
    }
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    let replyInfo;
    if (replyingTo) {
      const originalMessage = getReplyingToMessage();
      if (originalMessage) {
        replyInfo = {
          messageId: originalMessage.id,
          userName: originalMessage.user.name,
          content: originalMessage.type === 'workout' 
            ? 'Workout summary' 
            : originalMessage.content,
          type: originalMessage.type
        };
      }
    }
    
    const message: Message = {
      id: Date.now().toString(),
      user: currentUser,
      content: newMessage,
      timestamp: new Date(),
      type: 'text',
      replyTo: replyInfo
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setReplyingTo(null); // Clear reply state after sending
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // In a real app, you'd upload the file and get a URL
    const fakeUrl = URL.createObjectURL(file);
    
    const message: Message = {
      id: Date.now().toString(),
      user: currentUser,
      content: `Shared ${file.type.startsWith('image/') ? 'an image' : 'a file'}`,
      timestamp: new Date(),
      type: 'image',
      imageUrl: fakeUrl
    };
    
    setMessages(prev => [...prev, message]);
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = { ...msg.reactions };
        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }
        
        const userIndex = reactions[emoji].indexOf(currentUser.id);
        if (userIndex >= 0) {
          reactions[emoji].splice(userIndex, 1);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji].push(currentUser.id);
        }
        
        return { ...msg, reactions };
      }
      return msg;
    }));
  };

  const handleReply = (messageId: string) => {
    setReplyingTo(messageId);
    // Focus on input - you could add a ref to the input for this
  };

  const getReplyingToMessage = () => {
    return messages.find(msg => msg.id === replyingTo);
  };

  return (
    <div className="chat-container flex flex-col h-screen bg-black text-white max-w-2xl mx-auto relative border-l border-r border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <MessageCircle className="w-10 h-10 text-white scale-x-[-1]" />
          <div>
            <h2 className="text-lg font-medium">OG Commitment</h2>
            <p className="text-sm text-gray-400">{totalMembers} members • {onlineMembers} online</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-gray-800 w-10 h-10"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Date separator for yesterday */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-800 px-4 py-2 rounded-full text-sm text-gray-300">
            Saturday
          </div>
        </div>
        
        {messages.slice(0, 2).map((message) => (
          <MessageComponent
            key={message.id}
            message={message}
            currentUser={currentUser}
            onAddReaction={addReaction}
            onReply={handleReply}
          />
        ))}

        {/* Date separator for today */}
        <div className="flex justify-center my-6">
          <div className="bg-gray-800 px-4 py-2 rounded-full text-sm text-gray-300">
            Today
          </div>
        </div>

        {messages.slice(2).map((message) => (
          <MessageComponent
            key={message.id}
            message={message}
            currentUser={currentUser}
            onAddReaction={addReaction}
            onReply={handleReply}
          />
        ))}
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Reply className="w-4 h-4" />
            <span>Replying to {getReplyingToMessage()?.user.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyingTo(null)}
            className="text-gray-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileChange}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFileUpload}
            className="text-gray-400 hover:text-white hover:bg-gray-800 shrink-0 w-10 h-10"
          >
            <Plus className="w-8 h-8" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 rounded-full pr-16 h-10 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-gradient-to-r from-orange-700 to-red-600 hover:from-orange-800 hover:to-red-700 rounded-full shrink-0 w-10 h-10"
            size="icon"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}