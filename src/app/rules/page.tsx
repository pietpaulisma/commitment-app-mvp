'use client'

import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Target, 
  Clock, 
  Calendar, 
  Heart, 
  Sparkles,
  Gift,
  Zap,
  AlertTriangle
} from 'lucide-react'

export default function RulesPage() {
  const router = useRouter()

  const rules = [
    {
      icon: Target,
      title: "The Daily Target",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      description: "Your target increases by 1 point every day. This is the foundation of the commitment.",
      details: [
        "Day 1 = 1 point, Day 100 = 100 points, etc.",
        "After 448 days, 'Sane Mode' members progress weekly instead of daily",
        "'Insane Mode' continues daily progression forever"
      ]
    },
    {
      icon: Clock,
      title: "The Deadline",
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      description: "Log your workout before midnight (00:00) or you owe €10 to the group pot.",
      details: [
        "No exceptions, no excuses",
        "The pot funds whatever the group decides",
        "Penalties are tracked and must be paid"
      ]
    },
    {
      icon: Calendar,
      title: "Rest Days",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      description: "Mondays are rest days. You're not required to work out, but the target still increases.",
      details: [
        "No penalty for missing a rest day",
        "Use this day to recover and prepare for the week",
        "Rest days are configurable per group"
      ]
    },
    {
      icon: Sparkles,
      title: "Recovery Days",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      description: "Once per week, you can take a recovery day. Complete 15 minutes of recovery exercises.",
      details: [
        "Available any day except Monday (rest day)",
        "15 minutes of yoga, meditation, stretching, or foam rolling",
        "Resets every Monday — use it or lose it"
      ]
    },
    {
      icon: Zap,
      title: "Flexible Rest Days",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      description: "Earn an extra rest day by doubling your points on the regular rest day.",
      details: [
        "Complete 2× the required points on Monday",
        "Use your earned flex day any other day that week",
        "Expires at the end of the week (Sunday midnight)"
      ]
    },
    {
      icon: Gift,
      title: "Birthday Challenge",
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/20",
      description: "On your birthday, honor your new age by earning DOUBLE the points.",
      details: [
        "Birthday on a rest day? Gift from the gods — no workout required",
        "Otherwise, it's your chance to celebrate through effort",
        "Your squad will be watching 👀"
      ]
    },
    {
      icon: Heart,
      title: "Sick Mode",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      description: "Life happens. When you're truly sick or facing hardship, you can pause penalties.",
      details: [
        "Enable in Settings when genuinely needed",
        "We're here to support you and welcome you back",
        "Abusing this only hurts your own journey"
      ]
    },
    {
      icon: AlertTriangle,
      title: "The Commitment",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      description: "This is not a challenge. This is a standard. A pact. A commitment for life.",
      details: [
        "There is no exit — silence means you keep paying",
        "You owe it to your crew and to your own health",
        "Show up daily. Build discipline. Earn respect."
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 selection:text-blue-100 overflow-x-hidden relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[140px] opacity-20" />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[140px] opacity-20" />
      </div>

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col pb-20">
        {/* Header */}
        <header className="px-6 pt-8 pb-4 flex items-center gap-4 bg-gradient-to-b from-black via-black/90 to-transparent sticky top-0 z-50 backdrop-blur-md">
          <button
            onClick={() => router.push('/profile')}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-zinc-400" />
          </button>
          <h1 className="text-2xl font-black italic tracking-tighter text-white">THE RULES</h1>
        </header>

        {/* Intro */}
        <div className="px-6 pb-6">
          <p className="text-zinc-400 text-sm leading-relaxed">
            These are the rules that bind us. Know them. Follow them. There are no shortcuts.
          </p>
        </div>

        {/* Rules List */}
        <div className="px-5 flex flex-col gap-4">
          {rules.map((rule, index) => (
            <div
              key={index}
              className={`bg-zinc-900/50 backdrop-blur-sm border ${rule.borderColor} rounded-2xl p-5 transition-all hover:bg-zinc-900/70`}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${rule.bgColor} flex items-center justify-center`}>
                  <rule.icon size={20} className={rule.color} />
                </div>
                <h2 className={`text-lg font-black ${rule.color}`}>{rule.title}</h2>
              </div>

              {/* Description */}
              <p className="text-zinc-300 text-sm mb-3 leading-relaxed">
                {rule.description}
              </p>

              {/* Details */}
              <ul className="space-y-1.5">
                {rule.details.map((detail, detailIndex) => (
                  <li key={detailIndex} className="flex items-start gap-2 text-xs text-zinc-500">
                    <span className={`mt-1.5 w-1 h-1 rounded-full ${rule.bgColor} flex-shrink-0`} />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-8 mt-4">
          <div className="text-center">
            <p className="text-zinc-600 text-xs uppercase tracking-widest font-bold">
              Commitment is not optional
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
