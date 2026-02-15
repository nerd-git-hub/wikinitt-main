"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Sparkles, MessageCircle, RefreshCw } from "lucide-react";
import styles from "./chat.module.css";
import { CHAT_ENDPOINT } from "@/lib/chat"; //

type Message = {
  role: "user" | "bot";
  content: string;
  isThinking?: boolean; // For the "thinkingBlock" styles in your CSS
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Example fetch call - adjust endpoint as needed based on your backend
      const response = await fetch(`${CHAT_ENDPOINT}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();
      
      // Assuming API returns { response: "..." }
      const botMsg: Message = { role: "bot", content: data.response || "Sorry, I couldn't understand that." };
      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      {/* Background Mesh from chat.module.css */}
      <div className={styles.backgroundWrapper}>
        <div className={styles.blobBlue}></div>
        <div className={styles.blobIndigo}></div>
        <div className={styles.noiseOverlay}></div>
      </div>

      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.backBtn}>
              <ArrowLeft size={20} />
            </Link>
            <span className={styles.headerTitle}>
              WikiNITT Assistant
            </span>
          </div>
          <button className={styles.newChatBtn} onClick={() => setMessages([])}>
            <span className="flex items-center gap-2">
              <RefreshCw size={14} /> New Chat
            </span>
          </button>
        </header>

        {/* Chat Content Area */}
        <div className={styles.chatScrollArea} ref={scrollRef}>
          {messages.length === 0 ? (
            <div className={styles.emptyStateContainer}>
              <div className={styles.logoWrapper}>
                <span className={styles.logoText}>W</span>
              </div>
              <h1 className={styles.welcomeHeadline}>How can I help you?</h1>
              <p className={styles.welcomeSub}>
                Ask me about NITT campus life, academics, hostels, or events.
              </p>
              
              <div className={styles.suggestionsGrid}>
                <button 
                  className={styles.suggestionCard}
                  onClick={() => setInput("What are the best places to eat near campus?")}
                >
                  <div className={styles.cardIcon}><Sparkles size={18} /></div>
                  <span className={styles.cardText}>Best places to eat?</span>
                </button>
                <button 
                  className={styles.suggestionCard}
                  onClick={() => setInput("How do I join a club?")}
                >
                  <div className={styles.cardIcon}><MessageCircle size={18} /></div>
                  <span className={styles.cardText}>How to join a club?</span>
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={styles.messageRow}>
                <div className={styles.messageContent}>
                  {msg.role === "user" ? (
                    <>
                      <div className={`${styles.bubble} ${styles.userBubble}`}>
                        {msg.content}
                      </div>
                      <div className={`${styles.avatar} ${styles.userAvatar}`}>U</div>
                    </>
                  ) : (
                    <>
                      <div className={`${styles.avatar} ${styles.botAvatar}`}>AI</div>
                      <div className={styles.wrapper}>
                         {/* Render Thinking Block if exists */}
                         {msg.isThinking && (
                           <div className={styles.thinkingBlock}>
                             <div className={styles.thinkingHeader}>
                               Thinking <div className={styles.pulsingDot}></div>
                             </div>
                           </div>
                         )}
                         <div className={`${styles.bubble} ${styles.botBubble}`}>
                           {msg.content}
                         </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className={styles.messageRow}>
               <div className={styles.messageContent}>
                  <div className={`${styles.avatar} ${styles.botAvatar}`}>AI</div>
                  <div className={`${styles.bubble} ${styles.botBubble}`}>
                    <span className={styles.cursor}></span>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={styles.inputContainer}>
          <div className={styles.inputBoxWrapper}>
            <textarea
              className={styles.textarea}
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button 
              className={`${styles.sendButton} ${input.trim() ? styles.active : ""}`}
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send size={18} />
            </button>
          </div>
          <p className={styles.disclaimer}>
            AI can make mistakes. Please verify important information.
          </p>
        </div>
      </main>
    </div>
  );
}