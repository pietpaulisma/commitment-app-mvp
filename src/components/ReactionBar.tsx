import React, { useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';

interface ReactionBarProps {
  onEmojiSelect: (emoji: string) => void;
  onMoreEmojis: () => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function ReactionBar({ onEmojiSelect, onMoreEmojis, onClose, position }: ReactionBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={barRef}
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-full shadow-2xl px-2 py-1 flex items-center gap-1"
      style={{
        top: position?.top || 0,
        left: position?.left || 0,
        transform: 'translate(-50%, -100%)'
      }}
    >
      {quickEmojis.map((emoji) => (
        <Button
          key={emoji}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-lg hover:bg-gray-700 rounded-full"
          onClick={() => onEmojiSelect(emoji)}
        >
          {emoji}
        </Button>
      ))}
      <div className="w-px h-4 bg-gray-700 mx-1" />
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-gray-700 rounded-full flex items-center justify-center"
        onClick={onMoreEmojis}
      >
        <Plus className="w-4 h-4 text-gray-300" />
      </Button>
    </div>
  );
}