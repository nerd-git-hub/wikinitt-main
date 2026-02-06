"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Paperclip, MoreVertical, Phone, Video, Smile, ChevronLeft,
  Bot, User, Search, Settings, ArrowLeft
} from "lucide-react";
import Link from "next/link";

// Mock Data
const MOCK_MESSAGES = [
  { id: 1, text: "Hello! I'm the WikiNITT Assistant. How can I help you today?", sender: "bot", time: "10:00 AM" },
];

const CONTACTS = [
  { id: 1, name: "WikiNITT Bot", active: true, message: "Online", time: "Now", avatar: null },
  { id: 2, name: "Community Support", active: false, message: "Ticket #4291 resolved", time: "2h ago", avatar: null },
];

export default function ChatPage() {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage = {
      id: messages.length + 1,
      text: input,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newMessage]);
    setInput("");
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: "I'm just a UI demo, but I look great! ✨",
        sender: "bot",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }, 1000);
  };

  return (
    // Changed: h-screen (full height), Removed mt-20
    <div className="relative w-full h-screen overflow-hidden font-poppins text-gray-800 bg-transparent p-4 md:p-6">
      
      {/* Back to Home Button (Since Navbar is gone) */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 z-50 p-2 bg-white/50 backdrop-blur-md rounded-full shadow-sm hover:bg-white transition-all md:hidden"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </Link>

      <div className="relative z-10 h-full max-w-[1600px] mx-auto flex gap-6">

        {/* === SIDEBAR === */}
        <motion.aside 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 h-full bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_8px_32px_rgba(31,38,135,0.05)] overflow-hidden shrink-0`}
        >
          {/* Header with Back Button for Desktop */}
          <div className="p-6 border-b border-white/30">
            <div className="flex items-center gap-3 mb-6">
               <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/40 transition-colors" title="Back to Home">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
               </Link>
               <h2 className="text-xl font-bold text-gray-800">Chats</h2>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-white/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {CONTACTS.map((contact) => (
              <div key={contact.id} className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${contact.active ? 'bg-white/80 shadow-sm border border-white/50' : 'hover:bg-white/30'}`}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 text-white shadow-sm">
                   {contact.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{contact.message}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.aside>

        {/* === CHAT AREA === */}
        <motion.main 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`${!isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col flex-1 h-full bg-white/60 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_8px_32px_rgba(31,38,135,0.05)] overflow-hidden relative`}
        >
          {/* Chat Header */}
          <header className="h-20 px-6 flex items-center justify-between border-b border-white/30 bg-white/30 backdrop-blur-md z-20">
             <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 hover:bg-white/50 rounded-full">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-md">
                   <Bot className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="font-bold text-gray-800">WikiNITT Assistant</h3>
                   <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-xs text-green-600 font-medium">Online</span>
                   </div>
                </div>
             </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex max-w-[80%] items-end gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.sender === "user" ? "bg-gray-900 text-white" : "bg-gradient-to-br from-indigo-500 to-blue-500 text-white"}`}>
                        {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                     </div>
                     <div className={`relative px-5 py-3.5 shadow-sm ${msg.sender === "user" ? "bg-gray-900 text-white rounded-2xl rounded-tr-sm" : "bg-white/80 backdrop-blur-sm border border-white/60 text-gray-800 rounded-2xl rounded-tl-sm"}`}>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                     </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 md:p-6 bg-white/40 backdrop-blur-md border-t border-white/30 z-20">
            <div className="flex items-end gap-3 max-w-4xl mx-auto">
               <div className="flex-1 bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl shadow-sm flex items-center px-2 py-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-4 py-2"
                  />
               </div>
               <button onClick={handleSend} className="p-3.5 rounded-full bg-indigo-600 text-white shadow-lg hover:scale-105 transition-transform">
                 <Send className="w-5 h-5" />
               </button>
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  );
}