'use client'

import { useState, useEffect, useMemo } from 'react'

// Comprehensive emoji data organized by category
const EMOJI_DATA = {
  'Faces & People': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
    '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑',
    '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😶‍🌫️', '😏', '😒', '🙄',
    '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '🤧', '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐',
    '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '🧑‍🦱', '👨‍🦱', '👩‍🦰', '🧑‍🦰',
    '👨‍🦰', '👱‍♀️', '👱', '👱‍♂️', '👩‍🦳', '🧑‍🦳', '👨‍🦳', '👩‍🦲', '🧑‍🦲', '👨‍🦲',
    '🧔', '👵', '🧓', '👴', '👲', '👳‍♀️', '👳', '👳‍♂️', '🧕', '👮‍♀️', '👮', '👮‍♂️'
  ],
  'Body & Hands': [
    '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
    '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏',
    '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶',
    '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋'
  ],
  'Animals & Nature': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮',
    '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣',
    '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋',
    '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍',
    '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
    '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦣', '🦏', '🦛', '🐪',
    '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌',
    '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢',
    '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'
  ],
  'Sports & Activities': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸',
    '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋',
    '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🏋️‍♂️',
    '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺',
    '🤾‍♀️', '🤾', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘', '🧘‍♂️',
    '🏄‍♀️', '🏄', '🏄‍♂️', '🏊‍♀️', '🏊', '🏊‍♂️', '🤽‍♀️', '🤽', '🤽‍♂️', '🚣‍♀️',
    '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️'
  ],
  'Objects & Symbols': [
    '💪', '🔥', '⚡', '🏋️', '🎯', '🚀', '💎', '🏆', '👑', '⭐', '🌟', '💫', '✨',
    '🎊', '🎉', '🎈', '🎁', '🏅', '🥇', '🥈', '🥉', '⚔️', '🛡️', '🔱', '⚰️', '⚱️',
    '🗿', '🧿', '🪬', '🔮', '📿', '🪆', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺',
    '💊', '💉', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚿', '🛁'
  ]
}

// Create a flat list of all emojis with their names for searching
const ALL_EMOJIS = Object.entries(EMOJI_DATA).flatMap(([category, emojis]) =>
  emojis.map(emoji => ({
    emoji,
    category,
    name: getEmojiName(emoji)
  }))
)

// Simple emoji name mapping (you could expand this or use a library)
function getEmojiName(emoji: string): string {
  const names: Record<string, string> = {
    '💪': 'muscle flex strong power',
    '🔥': 'fire flame hot energy',
    '⚡': 'lightning bolt electric energy',
    '🏋️': 'weight lifting exercise gym',
    '🎯': 'target goal bullseye aim',
    '🚀': 'rocket launch space fast',
    '💎': 'diamond gem precious valuable',
    '🏆': 'trophy winner champion award',
    '👑': 'crown king queen royal',
    '⭐': 'star favorite special',
    '🌟': 'glowing star sparkle shine',
    '😀': 'happy smile grin joy',
    '😃': 'happy smile joy cheerful',
    '😄': 'happy smile laugh joy',
    '🤣': 'laugh funny hilarious',
    '😎': 'cool sunglasses awesome',
    '🤓': 'nerd smart glasses study',
    '🤩': 'star struck excited amazing',
    '🥰': 'love heart eyes adorable',
    '😍': 'love heart eyes beautiful',
    '🤯': 'mind blown shocked amazed',
    '🚴': 'cycling bike exercise',
    '🏃': 'running exercise fitness',
    '🏊': 'swimming exercise water',
    '⚽': 'soccer football sport',
    '🏀': 'basketball sport game',
    '🏈': 'american football sport',
    '⚾': 'baseball sport game',
    '🎾': 'tennis sport game',
    '🏐': 'volleyball sport game',
    '🥊': 'boxing gloves fight sport',
    '🥋': 'martial arts karate judo',
    '🦄': 'unicorn magical fantasy',
    '🐺': 'wolf wild animal',
    '🦅': 'eagle bird strong',
    '🦁': 'lion king strong brave',
    '🐯': 'tiger strong wild',
    '🐻': 'bear strong powerful'
  }
  
  // Return the mapped name or a default search term
  return names[emoji] || emoji
}

interface EmojiPickerProps {
  selectedEmoji: string
  onEmojiSelect: (emoji: string) => void
  disabled?: boolean
}

export default function EmojiPicker({ selectedEmoji, onEmojiSelect, disabled }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Filter emojis based on search term and category
  const filteredEmojis = useMemo(() => {
    let emojis = ALL_EMOJIS

    // Filter by search term
    if (searchTerm) {
      emojis = emojis.filter(({ emoji, name }) =>
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emoji.includes(searchTerm)
      )
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      emojis = emojis.filter(({ category }) => category === selectedCategory)
    }

    return emojis
  }, [searchTerm, selectedCategory])

  // Get suggested emojis (same as the original list)
  const suggestedEmojis = [
    '💪', '🔥', '⚡', '🏋️', '🎯', '🚀', 
    '💎', '🏆', '👑', '⭐', '🌟', '⚽',
    '🏀', '🎾', '🥊', '🦄', '🐺', '🦅'
  ]

  const categories = ['All', ...Object.keys(EMOJI_DATA)]

  useEffect(() => {
    // Close picker when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.emoji-picker-container')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="emoji-picker-container relative">
      <label className="block text-sm font-bold text-red-400 mb-3 uppercase tracking-wide">
        Your Symbol
      </label>
      
      {/* Selected emoji display and trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full p-4 border-2 bg-gray-900 transition-all flex items-center justify-between ${
          isOpen 
            ? 'border-red-400 bg-gray-800' 
            : 'border-gray-600 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{selectedEmoji}</span>
          <span className="text-white">Choose your symbol</span>
        </div>
        <span className="text-gray-400 text-xl">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {/* Emoji picker dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-gray-900 border border-gray-600 max-h-96 overflow-hidden">
          {/* Search bar */}
          <div className="p-4 border-b border-gray-700">
            <input
              type="text"
              placeholder="Search emojis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-red-400 text-sm"
            />
          </div>

          {/* Category tabs */}
          <div className="flex overflow-x-auto border-b border-gray-700 bg-gray-800">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'text-red-400 border-b-2 border-red-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Suggested emojis (only show when no search/filter) */}
          {!searchTerm && selectedCategory === 'All' && (
            <div className="p-4 border-b border-gray-700">
              <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Suggested</div>
              <div className="grid grid-cols-9 gap-2">
                {suggestedEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onEmojiSelect(emoji)
                      setIsOpen(false)
                    }}
                    className={`w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-700 transition-colors ${
                      selectedEmoji === emoji ? 'bg-red-900 ring-1 ring-red-400' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All emojis grid */}
          <div className="p-4 max-h-64 overflow-y-auto">
            {filteredEmojis.length > 0 ? (
              <div className="grid grid-cols-9 gap-2">
                {filteredEmojis.slice(0, 162).map(({ emoji }, index) => ( // Limit to 162 (18 rows)
                  <button
                    key={`${emoji}-${index}`}
                    onClick={() => {
                      onEmojiSelect(emoji)
                      setIsOpen(false)
                      setSearchTerm('')
                    }}
                    className={`w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-700 transition-colors ${
                      selectedEmoji === emoji ? 'bg-red-900 ring-1 ring-red-400' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                No emojis found matching &quot;{searchTerm}&quot;
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2">
        Choose a symbol that represents your commitment
      </div>
    </div>
  )
}