"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

export default function ChatFAB() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasShownIntro, setHasShownIntro] = useState(false);
  const [isNearFooter, setIsNearFooter] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isChatPage = pathname === "/chat";

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Detect when footer is visible to slide FAB out of the way
  useEffect(() => {
    const checkFooter = () => {
      const footer = document.getElementById("footer");
      if (!footer) return;
      const footerRect = footer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      // If footer top is within viewport (with some margin)
      setIsNearFooter(footerRect.top < windowHeight - 20);
    };

    checkFooter();
    window.addEventListener("scroll", checkFooter, { passive: true });
    window.addEventListener("resize", checkFooter, { passive: true });
    return () => {
      window.removeEventListener("scroll", checkFooter);
      window.removeEventListener("resize", checkFooter);
    };
  }, []);

  // Auto-show tooltip on first load
  useEffect(() => {
    if (isVisible && !hasShownIntro) {
      const introTimer = setTimeout(() => {
        setShowTooltip(true);
        setHasShownIntro(true);
        hideTimer.current = setTimeout(() => setShowTooltip(false), 3000);
      }, 1500);
      return () => clearTimeout(introTimer);
    }
  }, [isVisible, hasShownIntro]);

  const handleMouseEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setShowTooltip(false), 1200);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!isVisible || isChatPage) return null;

  return (
    <div
      className={`fixed bottom-8 right-8 z-[100] flex items-end gap-3 transition-all duration-500 ${isNearFooter ? "translate-y-[200px] opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Tooltip Bubble */}
      <div
        className={`
          flex items-center gap-2.5 px-5 py-3.5 rounded-2xl rounded-br-sm text-[0.82rem] font-semibold
          transition-all duration-500 origin-bottom-right
          ${showTooltip
            ? "opacity-100 scale-100 translate-x-0"
            : "opacity-0 scale-90 translate-x-4 pointer-events-none"
          }
        `}
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          color: "#fff",
          fontFamily: "Manrope, sans-serif",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          boxShadow: "0 8px 32px rgba(59, 40, 204, 0.3), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>Ask me anything about NITT</span>
      </div>

      {/* FAB Button — Premium Glassmorphic */}
      <Link href="/chat" aria-label="Open chat assistant">
        <div
          className="group relative w-[60px] h-[60px] rounded-[20px] flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(145deg, #3b28cc 0%, #6d28d9 50%, #7c3aed 100%)",
            boxShadow: "0 8px 30px rgba(59, 40, 204, 0.4), 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          {/* Animated gradient border on hover */}
          <span
            className="absolute inset-[-2px] rounded-[22px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "linear-gradient(135deg, #818cf8, #c084fc, #818cf8)",
              filter: "blur(6px)",
              zIndex: -1,
            }}
          />

          {/* Chat icon — custom SVG for a cleaner look */}
          <svg
            className="w-6 h-6 text-white relative z-10 group-hover:scale-110 transition-transform duration-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>

          {/* Sparkle dots */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-400 border-2 border-white" />
          </span>
        </div>
      </Link>
    </div>
  );
}
