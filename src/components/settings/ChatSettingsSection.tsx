'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SystemMessageService } from '@/services/systemMessages'

type ChatSettingsSectionProps = {
    groupId: string
    initialSenderName: string
    onSave: () => Promise<void>
}

export function ChatSettingsSection({ groupId, initialSenderName, onSave }: ChatSettingsSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [senderName, setSenderName] = useState(initialSenderName)
    const [originalName, setOriginalName] = useState(initialSenderName)
    const [loading, setLoading] = useState(false)

    const handleSave = async () => {
        if (senderName === originalName || !senderName.trim()) return

        setLoading(true)
        try {
            const success = await SystemMessageService.updateSystemSenderName(groupId, senderName.trim())
            if (success) {
                setOriginalName(senderName.trim())
                alert('Chat settings saved successfully!')
                await onSave()
            } else {
                alert('Failed to save chat settings')
                setSenderName(originalName)
            }
        } catch (error) {
            console.error('Error saving chat settings:', error)
            alert('Failed to save chat settings')
            setSenderName(originalName)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                        <span className="text-xs">💬</span>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                            Chat Settings
                        </span>
                        <span className="text-[10px] text-zinc-500">Bot sender name</span>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                ) : (
                    <ChevronDown size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                )}
            </button>

            {isExpanded && (
                <div className="px-4 pb-4">
                    <div className="bg-zinc-900/50 rounded-lg border border-white/5 p-4">
                        <h4 className="text-sm font-semibold text-white mb-3">System Message Sender</h4>
                        <p className="text-xs text-zinc-500 mb-4">
                            Customize the name that appears on automated system messages in your group chat.
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                                    Sender Name
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        placeholder="Enter sender name (e.g., Barry, Coach)"
                                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 text-white text-sm rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        maxLength={50}
                                        disabled={loading}
                                    />
                                    <button
                                        onClick={handleSave}
                                        disabled={loading || !senderName.trim() || senderName === originalName}
                                        className="px-4 py-2 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                                <div className="text-xs text-zinc-600 mt-1">{senderName.length}/50 characters</div>
                            </div>

                            {/* Preview */}
                            <div>
                                <h5 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Preview</h5>
                                <div className="bg-zinc-800/50 border border-zinc-700 p-3 rounded-lg">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm">🤖</span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-blue-300">{senderName || 'Barry'}</div>
                                            <div className="text-xs text-zinc-500">System Message</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-zinc-300 bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                                        🌅 **Daily Summary** - {new Date().toDateString()}
                                        <br />
                                        <br />
                                        💪 **Commitment Rate**: 85% (4/5 members)
                                        <br />
                                        🏆 **Top Performer**: TestUser (150 points)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
