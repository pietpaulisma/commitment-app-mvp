import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
  onSignUp: () => void;
  onBack: () => void;
}

export function LoginScreen({ onLogin, onSignUp }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div 
      className="min-h-screen text-white relative overflow-hidden flex items-center justify-center"
      style={{
        background: '#000000',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="text-center space-y-8 max-w-md mx-auto px-4 w-full"
      >
        {/* Header */}
        <div className="space-y-4">
          <div className="w-16 h-16 bg-red-600 rounded-2xl mx-auto flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-4">COMMITMENT</h1>
            <p className="text-xl md:text-2xl text-gray-300 font-bold">
              Welcome back to <span className="text-red-400 underline">the lifestyle</span>
            </p>
          </div>
        </div>

        {/* Login Form */}
        <motion.div
          className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 md:p-8 backdrop-blur-sm"
          animate={{
            boxShadow: '0 15px 40px rgba(220, 38, 38, 0.2)'
          }}
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg font-medium placeholder-gray-400 focus:border-red-500 focus:outline-none backdrop-blur-sm transition-all"
              />
              
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg font-medium placeholder-gray-400 focus:border-red-500 focus:outline-none backdrop-blur-sm transition-all"
              />
            </div>

            <motion.button
              type="submit"
              className="w-full relative overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: 'linear-gradient(135deg, #B91C1C 0%, #7F1D1D 100%)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid rgba(185, 28, 28, 0.4)',
                boxShadow: '0 0 15px rgba(185, 28, 28, 0.3)'
              }}
            >
              <span className="text-white text-lg font-black">
                LOGIN TO CONTINUE
              </span>
            </motion.button>
          </form>
        </motion.div>

        {/* Subtle sign up link */}
        <div className="text-center">
          <p className="text-gray-500 font-medium">
            Don't have an account?{' '}
            <motion.button
              onClick={onSignUp}
              className="text-gray-400 hover:text-red-400 underline font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Sign up here
            </motion.button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}