import { useState } from 'react';
import { OnboardingFlow } from './components/OnboardingFlow';
import { LoginScreen } from './components/LoginScreen';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Trophy, AlertTriangle, Users, Euro } from 'lucide-react';

type AppState = 'onboarding' | 'login' | 'main';

export default function App() {
  const [appState, setAppState] = useState<AppState>('login');

  // Handle when user completes onboarding
  const handleOnboardingComplete = () => {
    setAppState('main');
  };

  // Handle when user clicks "I'm not made for this" - go to login
  const handleGoToLogin = () => {
    setAppState('login');
  };

  // Handle login (existing user)
  const handleLogin = () => {
    setAppState('main');
  };

  // Handle signup (new user) - go to onboarding
  const handleSignUp = () => {
    setAppState('onboarding');
  };

  if (appState === 'onboarding') {
    return (
      <OnboardingFlow 
        onComplete={handleOnboardingComplete} 
        onGoToLogin={handleGoToLogin}
      />
    );
  }

  if (appState === 'login') {
    return (
      <LoginScreen 
        onLogin={handleLogin}
        onSignUp={handleSignUp}
        onBack={() => {}} // Simplified - no back functionality needed
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-xl font-bold">COMMITMENT</h1>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setAppState('login')}
            className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Status Banner */}
        <div className="bg-red-950/50 border border-red-600 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <span className="text-red-400 font-semibold">SYSTEM ACTIVE</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to the System</h2>
          <p className="text-gray-300">
            Your commitment is now locked in. The system is watching. Your group is watching.
            There's no backing out now.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Current Streak</p>
                  <p className="text-2xl font-bold">0 Days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Group Standing</p>
                  <p className="text-2xl font-bold">12/12</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                  <Euro className="w-4 h-4 text-yellow-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Penalties Owed</p>
                  <p className="text-2xl font-bold">€0.00</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💪</span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Commitment</p>
                  <p className="text-2xl font-bold">75%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Challenge */}
        <Card className="bg-gradient-to-r from-red-950/50 to-gray-900 border border-red-600/30">
          <CardContent className="p-8">
            <div className="flex items-start space-x-6">
              <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🔥</span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">TODAY'S MISSION</h3>
                <p className="text-gray-300 mb-4">
                  Complete your workout or face the €10 penalty. Your group ELITE WARRIORS 
                  is counting on you. Don't let them down.
                </p>
                <Button className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl">
                  START WORKOUT
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Group Status */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Users className="w-6 h-6" />
              <span>ELITE WARRIORS</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Group Performance</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }} />
                  </div>
                  <span className="text-sm">85%</span>
                </div>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Total Penalties This Week</p>
                <p className="text-xl font-bold text-red-400">€120.00</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Your Position</p>
                <p className="text-xl font-bold text-green-400">#1</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commitment Reminder */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-2xl">💪</span>
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: '#dc2626' }}
            />
            <span className="font-bold">YOUR_USERNAME</span>
          </div>
          <div className="text-gray-300 space-y-2">
            <p><strong>Avatar:</strong> 💪 (FOR LIFE)</p>
            <p><strong>Color:</strong> <span style={{ color: '#dc2626' }}>■</span> Red (FOR LIFE)</p>
            <p><strong>Birthday Challenge:</strong> Double points required</p>
            <p><strong>Commitment Level:</strong> 75% intensity</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 p-6 text-center text-gray-500 text-sm">
        <p>COMMITMENT SYSTEM</p>
        <p className="mt-1">Your choices are permanent. Your commitment is binding.</p>
      </footer>
    </div>
  );
}