import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

const recentReactions = [
  '✅', '🍌', '❌', '🍿', '🔥', '👍', '📌', '😂',
  '❤️', '👎', '💪', '🥦', '💔', '💰', '😬', '👋'
];

const smileysAndPeople = [
  '😃', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🤣', '😊', '☺️', '😇', '🙂', '🙃', '😉', '😌',
  '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
  '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁',
  '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭'
];

const categoryIcons = [
  { key: 'recent', icon: '🕒' },
  { key: 'smileys', icon: '😊' },
  { key: 'people', icon: '👥' },
  { key: 'coffee', icon: '☕' },
  { key: 'settings', icon: '⚙️' },
  { key: 'car', icon: '🚗' },
  { key: 'bulb', icon: '💡' },
  { key: 'grid', icon: '#️⃣' },
  { key: 'flag', icon: '🏁' }
];

export function ChatEmojiPicker({ onEmojiSelect, onClose, position }: EmojiPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('recent');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    onClose();
  };

  return (
    <div
      ref={pickerRef}
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-80 h-96"
      style={{
        top: position?.top || 0,
        left: position?.left || 0,
        transform: 'translate(-50%, -100%)'
      }}
    >
      {/* Search */}
      <div className="p-3 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 h-9 rounded-lg"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Recent Reactions */}
        <div className="mb-4">
          <h3 className="text-xs text-gray-400 mb-2 tracking-wide">RECENT REACTIONS</h3>
          <div className="grid grid-cols-8 gap-1">
            {recentReactions.map((emoji, index) => (
              <Button
                key={`recent-${emoji}-${index}`}
                variant="ghost"
                size="sm"
                onClick={() => handleEmojiClick(emoji)}
                className="h-9 w-9 p-0 text-lg hover:bg-gray-700 rounded-lg"
              >
                {emoji}
              </Button>
            ))}
          </div>
        </div>

        {/* Smileys & People */}
        <div className="mb-4">
          <h3 className="text-xs text-gray-400 mb-2 tracking-wide">SMILEYS & PEOPLE</h3>
          <div className="grid grid-cols-8 gap-1">
            {smileysAndPeople.map((emoji, index) => (
              <Button
                key={`smileys-${emoji}-${index}`}
                variant="ghost"
                size="sm"
                onClick={() => handleEmojiClick(emoji)}
                className="h-9 w-9 p-0 text-lg hover:bg-gray-700 rounded-lg"
              >
                {emoji}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="border-t border-gray-700 p-2">
        <div className="flex justify-center gap-1">
          {categoryIcons.map((category) => (
            <Button
              key={category.key}
              variant="ghost"
              size="sm"
              onClick={() => setActiveCategory(category.key)}
              className={`h-8 w-8 p-0 text-lg hover:bg-gray-700 rounded ${
                activeCategory === category.key ? 'bg-gray-700' : ''
              }`}
            >
              {category.icon}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}