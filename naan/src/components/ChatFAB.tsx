"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";

export default function ChatFAB() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  // Hide on chat page
  const isChatPage = pathname === "/chat";
  const isArticlePage = pathname?.startsWith("/articles");

  useEffect(() => {
    // Delay visibility slightly to allow hydration and play animation smoothly
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible || isChatPage) return null;

  return (
    <Link
      href="/chat"
      className={`fixed bottom-8 right-8 z-[100] transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-label="Open chat assistant"
    >
      <div className="w-14 h-14 rounded-full bg-black text-white shadow-xl flex items-center justify-center hover:-translate-y-[2px] transition-transform duration-150">
        <MessageCircle className="w-6 h-6" />
      </div>
    </Link>
  );
}
