import React, { useRef, useEffect } from 'react';
import { Button } from './ui/button';

interface SimpleEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

const popularEmojis = [
  '👍', '❤️', '😂', '😮', '😢', '🔥',
  '💪', '🙏', '👏', '✅', '🎉', '😍'
];

export function SimpleEmojiPicker({ onEmojiSelect, onClose, position }: SimpleEmojiPickerProps) {
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

  return (
    <div
      ref={pickerRef}
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3"
      style={{
        top: position?.top || 0,
        left: position?.left || 0,
        transform: 'translate(-50%, -100%)',
        width: '240px'
      }}
    >
      <div className="grid grid-cols-6 gap-2">
        {popularEmojis.map((emoji, index) => (
          <Button
            key={`emoji-${emoji}-${index}`}
            variant="ghost"
            size="sm"
            onClick={() => onEmojiSelect(emoji)}
            className="h-10 w-10 p-0 text-lg hover:bg-gray-700 rounded-lg"
          >
            {emoji}
          </Button>
        ))}
      </div>
    </div>
  );
}