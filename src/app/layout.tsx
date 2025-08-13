import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { WeekModeProvider } from "@/contexts/WeekModeContext";
import OnboardingGuard from "@/components/OnboardingGuard";
import DevTestingPanel from "@/components/DevTestingPanel";
import PageStateProvider from "@/components/PageStateProvider";

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
  themeColor: "#f97316"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA Primary Meta Tags */}
        <meta name="application-name" content="Commitment" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#f97316" />
        
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
        <meta name="msapplication-TileColor" content="#f97316" />
        <meta name="msapplication-config" content="none" />
        
        {/* Service Worker Registration */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('SW registered: ', registration);
                  })
                  .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
            }
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <WeekModeProvider>
            <OnboardingGuard>
              <PageStateProvider>
                {children}
              </PageStateProvider>
            </OnboardingGuard>
          </WeekModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
