import BrandedLoader from './BrandedLoader'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'white' | 'blue' | 'red' | 'green'
  fullScreen?: boolean
  message?: string
  className?: string
  branded?: boolean // New option for branded loader
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'white', 
  fullScreen = false,
  message = 'Loading...',
  className = '',
  branded = false
}: LoadingSpinnerProps) {
  // Use branded loader when requested
  if (branded) {
    return <BrandedLoader message={message} fullScreen={fullScreen} className={className} />
  }
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  const colorClasses = {
    white: 'border-white',
    blue: 'border-blue-600',
    red: 'border-red-400',
    green: 'border-green-500'
  }

  const spinner = (
    <div className="text-center">
      <div 
        className={`animate-spin rounded-full border-b-2 mx-auto ${sizeClasses[size]} ${colorClasses[color]}`}
      />
      {message && (
        <p className="mt-2 text-gray-400 text-sm">{message}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className={`min-h-screen bg-black flex items-center justify-center ${className}`}>
        {spinner}
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {spinner}
    </div>
  )
}