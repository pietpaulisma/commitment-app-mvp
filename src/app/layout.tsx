import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { WeekModeProvider } from "@/contexts/WeekModeContext";
import OnboardingGuard from "@/components/OnboardingGuard";
import { PenaltyAutoChecker } from "@/components/PenaltyAutoChecker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Commitment Fitness App",
  description: "Track your fitness journey with commitment and consistency",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Commitment"
  },
  applicationName: "Commitment",
  keywords: ["fitness", "commitment", "workout", "health", "accountability"],
  authors: [{ name: "Commitment Team" }],
  creator: "Commitment Team",
  publisher: "Commitment Team",
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Commitment Fitness App",
    title: "Commitment Fitness App",
    description: "Track your fitness journey with commitment and consistency",
  },
  twitter: {
    card: "summary",
    title: "Commitment Fitness App",
    description: "Track your fitness journey with commitment and consistency",
  },
  itunes: {
    appId: "commitment-fitness-app",
  },
  verification: {
    google: "commitment-fitness-app",
    yandex: "commitment-fitness-app",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Primary Meta Tags */}
        <meta name="application-name" content="Commitment" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />

        {/* iOS Safari Specific Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Commitment" />
        <meta name="apple-touch-fullscreen" content="yes" />

        {/* iOS Safari Icon Tags */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* Android Chrome Specific Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Favicon and Icons */}
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Prevent zooming and ensure fullscreen */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Windows specific */}
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-config" content="none" />

        {/* Service Worker Registration with PWA support */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('SW registered: ', registration);
                    
                    // PWA Debug logging
                    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone ||
                      document.referrer.includes('android-app://');
                    
                    if (isPWA) {
                      console.log('PWA mode detected - service worker registered for standalone app');
                    }
                  })
                  .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
              
              // Listen for messages from service worker
              navigator.serviceWorker.addEventListener('message', function(event) {
                console.log('Message from SW:', event.data);
                
                if (event.data.type === 'NOTIFICATION_CLICK') {
                  // Handle notification click navigation
                  if (event.data.url && event.data.url !== window.location.pathname) {
                    window.location.href = event.data.url;
                  }
                } else if (event.data.type === 'OPEN_CHAT') {
                  // Handle chat opening
                  window.location.href = '/dashboard';
                } else if (event.data.type === 'OPEN_CHAT_REPLY') {
                  // Handle chat reply
                  window.location.href = '/dashboard';
                }
              });
              
              // PWA update handling
              navigator.serviceWorker.addEventListener('controllerchange', function() {
                console.log('Service worker updated - PWA content refreshed');
              });
            }
            
            // PWA install prompt handling
            let deferredPrompt;
            window.addEventListener('beforeinstallprompt', function(e) {
              e.preventDefault();
              deferredPrompt = e;
              console.log('PWA install prompt available');
            });
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <WeekModeProvider>
            <OnboardingGuard>
              {children}
            </OnboardingGuard>
            <PenaltyAutoChecker />
          </WeekModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
