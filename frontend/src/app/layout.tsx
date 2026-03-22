import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { TransitionProvider } from "@/contexts/TransitionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DebugErrorHandler } from "@/components/DebugErrorHandler";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Haptimize",
  description: "Win today, win tomorrow. Build habits that compound.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=window.location.pathname;var lightOnly=p==='/'||p==='/signup'||p==='/onboarding';var d=document.documentElement;d.setAttribute('data-theme','light');d.classList.remove('dark');})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DebugErrorHandler>
          <AuthProvider>
            <ThemeProvider>
              <TransitionProvider>
              {children}
              <Toaster richColors position="top-center" />
            </TransitionProvider>
            </ThemeProvider>
          </AuthProvider>
        </DebugErrorHandler>
      </body>
    </html>
  );
}
