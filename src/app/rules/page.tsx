'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function RulesPage() {
  const router = useRouter()

  const rules = [
    {
      number: "01",
      title: "SHOW UP",
      subtitle: "Every. Single. Day.",
      color: "from-blue-500 to-cyan-500",
      glowColor: "rgba(59, 130, 246, 0.5)",
      description: "Your target increases by 1 point every day. Day 1 = 1 point. Day 500 = 500 points. No skipping. No banking. No compromises.",
      emoji: "💪"
    },
    {
      number: "02", 
      title: "MIDNIGHT",
      subtitle: "The deadline.",
      color: "from-red-500 to-orange-500",
      glowColor: "rgba(239, 68, 68, 0.5)",
      description: "Log your workout before 00:00 or you owe €10 to the pot. The clock doesn't care about your excuses.",
      emoji: "⏰"
    },
    {
      number: "03",
      title: "REST DAY",
      subtitle: "Mondays are sacred.",
      color: "from-green-500 to-emerald-500",
      glowColor: "rgba(34, 197, 94, 0.5)",
      description: "Take a break. Recover. But know this — the target still increases. You're just allowed to skip it.",
      emoji: "🛋️"
    },
    {
      number: "04",
      title: "RECOVERY",
      subtitle: "15 minutes to heal.",
      color: "from-emerald-400 to-teal-500",
      glowColor: "rgba(52, 211, 153, 0.5)",
      description: "Once per week (except Mondays), swap your workout for 15 min of yoga, meditation, or stretching. Use it or lose it — resets every Monday.",
      emoji: "🧘"
    },
    {
      number: "05",
      title: "FLEX DAY",
      subtitle: "Earn your freedom.",
      color: "from-yellow-400 to-orange-500",
      glowColor: "rgba(251, 191, 36, 0.5)",
      description: "Double your points on Monday → unlock an extra rest day that week. Planning ahead is power.",
      emoji: "⚡"
    },
    {
      number: "06",
      title: "BIRTHDAY",
      subtitle: "Double or nothing.",
      color: "from-pink-500 to-rose-500",
      glowColor: "rgba(236, 72, 153, 0.5)",
      description: "On your birthday, earn DOUBLE the points. Birthday on a rest day? Gift from the gods — you're free.",
      emoji: "🎂"
    },
    {
      number: "07",
      title: "SICK MODE",
      subtitle: "We understand.",
      color: "from-purple-500 to-violet-500",
      glowColor: "rgba(168, 85, 247, 0.5)",
      description: "Life happens. Enable Sick Mode when you truly need it. We'll be here when you're ready. But remember — cheating only hurts yourself.",
      emoji: "🤒"
    },
    {
      number: "08",
      title: "THE POT",
      subtitle: "Fuel for the group.",
      color: "from-amber-500 to-yellow-500",
      glowColor: "rgba(245, 158, 11, 0.5)",
      description: "Every €10 goes into a collective fund. It fuels whatever the group decides — celebration, charity, or chaos.",
      emoji: "💰"
    }
  ]

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden relative">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-30%] right-[-20%] w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[200px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[200px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-red-900/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-lg mx-auto min-h-screen flex flex-col pb-20">
        {/* Header */}
        <header className="px-6 pt-8 pb-6 flex items-center gap-4 sticky top-0 z-50 bg-gradient-to-b from-black via-black to-transparent">
          <button
            onClick={() => router.push('/profile')}
            className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 hover:scale-105 transition-all"
          >
            <ArrowLeft size={22} className="text-zinc-400" />
          </button>
        </header>

        {/* Hero */}
        <div className="px-6 pb-8">
          <h1 className="text-6xl font-black italic tracking-tighter text-white leading-none mb-4">
            THE<br/>RULES
          </h1>
          <p className="text-lg text-zinc-400 font-medium leading-relaxed">
            Eight commandments. Zero exceptions.<br/>
            <span className="text-zinc-600">Know them. Live them.</span>
          </p>
        </div>

        {/* Rules List */}
        <div className="px-4 flex flex-col gap-4">
          {rules.map((rule, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-3xl bg-zinc-900/80 backdrop-blur-sm border border-white/5 hover:border-white/10 transition-all duration-300"
            >
              {/* Gradient accent bar */}
              <div 
                className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${rule.color}`}
                style={{ boxShadow: `0 0 20px ${rule.glowColor}` }}
              />
              
              <div className="p-5 pl-6">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span 
                      className={`text-4xl font-black bg-gradient-to-r ${rule.color} bg-clip-text text-transparent`}
                    >
                      {rule.number}
                    </span>
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight">{rule.title}</h2>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{rule.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-3xl">{rule.emoji}</span>
                </div>

                {/* Description */}
                <p className="text-sm text-zinc-400 leading-relaxed pl-14">
                  {rule.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-12 mt-8">
          <div 
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 to-zinc-800 border border-white/10 p-8 text-center"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
            
            <p className="text-3xl font-black text-white mb-2">NO EXIT</p>
            <p className="text-sm text-zinc-500 font-medium">
              Silence means you keep paying.<br/>
              This is a commitment for life.
            </p>
            
            <div className="mt-6 flex justify-center gap-2">
              {['💀', '🔥', '💪'].map((emoji, i) => (
                <span key={i} className="text-2xl opacity-60">{emoji}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
