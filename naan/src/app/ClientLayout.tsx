"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Global Lively Background (moved here so it persists across pages)
const LivelyBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-purple-400/30 blur-[100px] animate-blob mix-blend-multiply opacity-70" />
    <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-indigo-400/30 blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply opacity-70" />
    <div className="absolute bottom-[-20%] left-[20%] w-[40rem] h-[40rem] rounded-full bg-pink-400/30 blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply opacity-70" />
  </div>
);

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Define routes where Navbar/Footer should be hidden
  const isChatPage = pathname?.startsWith("/chat");

  return (
    <SessionProvider>
      <div className="relative min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
        
        {/* Render Background on all pages */}
        <LivelyBackground />

        {/* Conditionally Render Navbar */}
        {!isChatPage && <Navbar />}

        {/* Main Content Area */}
        {/* If it's the chat page, we don't add the top padding (pt-20) */}
        <main className={`relative z-10 ${isChatPage ? "" : "pt-20"}`}>
          {children}
        </main>

        {/* Conditionally Render Footer */}
        {!isChatPage && <Footer />}
      </div>
    </SessionProvider>
  );
}