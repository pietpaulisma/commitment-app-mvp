'use client'

import { useRouter } from 'next/navigation'
import OnboardingLayout from '@/components/OnboardingLayout'

export default function WelcomePage() {
  const router = useRouter()

  const handleContinue = () => {
    router.push('/onboarding/commit')
  }

  return (
    <OnboardingLayout>
      <div className="px-6 py-8 min-h-full flex flex-col justify-center">
        {/* App Logo/Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-600 border-2 border-red-400 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-black text-white">C</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
            COMMITMENT
          </h1>
          <div className="text-sm text-red-400 uppercase tracking-widest font-mono">
            FITNESS PROTOCOL
          </div>
        </div>

        {/* Main explanation */}
        <div className="space-y-6 mb-12">
          <div className="bg-gray-900/50 border border-red-900/30 p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-4">
                This is not just another fitness app.
              </h2>
              <p className="text-gray-300 leading-relaxed">
                This is a <span className="text-red-400 font-bold">COMMITMENT</span> system. 
                Once you join, you're bound by the protocol. No excuses. No backing out.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-black border border-gray-800 p-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-400 mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="text-white font-bold mb-1">Daily Accountability</h3>
                  <p className="text-gray-400 text-sm">
                    Check in every day. Miss a day, face the consequences.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black border border-gray-800 p-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-400 mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="text-white font-bold mb-1">Group Pressure</h3>
                  <p className="text-gray-400 text-sm">
                    Your group sees everything. Your failures. Your victories.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black border border-gray-800 p-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-400 mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="text-white font-bold mb-1">No Mercy</h3>
                  <p className="text-gray-400 text-sm">
                    The system doesn't care about your excuses. Results only.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Warning section */}
        <div className="bg-red-900/20 border border-red-600/50 p-6 mb-8">
          <div className="text-center">
            <div className="text-red-400 font-mono text-xs uppercase tracking-widest mb-2">
              WARNING
            </div>
            <p className="text-red-200 text-sm leading-relaxed">
              By proceeding, you agree to be held accountable by the system and your peers. 
              This commitment cannot be undone easily. Think carefully.
            </p>
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          className="w-full bg-red-600 text-white py-4 px-6 border border-red-400 hover:bg-red-500 transition-colors font-black text-lg"
        >
          I UNDERSTAND THE RISKS
        </button>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-600 font-mono">
            No turning back after this point
          </p>
        </div>
      </div>
    </OnboardingLayout>
  )
}