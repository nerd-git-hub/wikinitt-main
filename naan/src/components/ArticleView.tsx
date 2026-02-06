"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import remarkBreaks from "remark-breaks";
import rehypeSlug from "rehype-slug";
import FormattedDate from "@/components/FormattedDate";
import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import {
  Clock, Calendar, ChevronLeft, Twitter, Linkedin, Facebook,
  Link as LinkIcon, Check, User as UserIcon, Play, Pause, Headphones, Volume2
} from "lucide-react";
import Link from "next/link";
import { Article } from "@/gql/graphql";

// Dynamic import for Markdown
const Markdown = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
  { ssr: false },
);

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export default function ArticleView({ data }: { data: Article }) {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthesisRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthesisRef.current) synthesisRef.current.cancel();
    };
  }, []);

  useEffect(() => {
    if (data?.content) {
      const regex = /^(#{1,6})\s+(.+)$/gm;
      const extracted: TOCItem[] = [];
      let match;
      const slugify = (text: string) => text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      while ((match = regex.exec(data.content)) !== null) {
        extracted.push({ level: match[1].length, text: match[2], id: slugify(match[2]) });
      }
      setHeadings(extracted);
    }
  }, [data]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getShareUrl = (platform: string) => {
    if (typeof window === 'undefined') return '';
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(data?.title || '');
    switch (platform) {
      case 'twitter': return `https://twitter.com/intent/tweet?text=${title}&url=${url}`;
      case 'linkedin': return `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`;
      case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      default: return '#';
    }
  };

  const stripMarkdown = (markdown: string) => {
    return markdown.replace(/[#*`]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/!\[(.*?)\]\(.*?\)/g, '').replace(/\n/g, '. ');
  };

  const handleSpeak = () => {
    if (!synthesisRef.current || !data?.content) return;
    if (isPaused) {
      synthesisRef.current.resume();
      setIsPaused(false);
      setIsSpeaking(true);
    } else if (isSpeaking) {
      synthesisRef.current.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    } else {
      const text = `${data.title}. By ${data.author?.name || 'Unknown Author'}. ${stripMarkdown(data.content)}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
      synthesisRef.current.speak(utterance);
      setIsSpeaking(true);
    }
  };

  return (
    <div className="min-h-screen relative font-sans text-gray-900 selection:bg-indigo-200 selection:text-indigo-900 overflow-hidden">
      
      {/* === 1. LIVELY WALLPAPER BACKGROUND === */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-400/30 blur-[120px] animate-blob mix-blend-multiply filter" />
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/30 blur-[120px] animate-blob animation-delay-2000 mix-blend-multiply filter" />
        <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-pink-400/30 blur-[120px] animate-blob animation-delay-4000 mix-blend-multiply filter" />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" /> {/* Overlay to ensure text readability */}
      </div>

      {/* Global Styles for Fonts & Animations */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        body { font-family: 'Poppins', sans-serif !important; }

        /* Animation Keyframes */
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 10s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }

        /* Markdown Reset */
        [data-color-mode*='light'], .wmde-markdown { 
          background-color: transparent !important;
          color: #1f2937 !important; 
          font-family: 'Poppins', sans-serif !important;
        }
        .wmde-markdown h1, .wmde-markdown h2 { border-bottom: none !important; }
      `}</style>

      {/* Reading Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 origin-left z-50 shadow-lg" 
        style={{ scaleX }} 
      />

      {/* Content Wrapper (Relative to sit above background) */}
      <div className="relative z-10">
        
        {/* Back Button */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/articles" className="inline-flex items-center text-sm font-bold text-gray-600 hover:text-indigo-600 transition-all group bg-white/50 backdrop-blur-md px-4 py-2 rounded-full shadow-sm hover:shadow-md">
            <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Articles
          </Link>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 justify-center relative">

            {/* === LEFT SIDEBAR (TOC) === */}
            <aside className="hidden lg:block w-56 shrink-0 order-1">
              <motion.div 
                initial={{ opacity: 0, x: -30 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col gap-4"
              >
                {/* Glassmorphism TOC */}
                <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(31,38,135,0.07)]">
                  <h3 className="text-[10px] font-extrabold text-indigo-900/60 uppercase tracking-widest mb-3">Contents</h3>
                  <nav className="space-y-0.5 relative">
                    <div className="absolute left-[3px] top-1 bottom-1 w-[2px] bg-indigo-900/10 rounded-full" />
                    {headings.map((heading, index) => (
                      <a 
                        key={index} 
                        href={`#${heading.id}`} 
                        onClick={(e) => { e.preventDefault(); document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth" }); }} 
                        className={`block text-[12px] py-1 pl-3 border-l-2 border-transparent transition-all duration-300 hover:text-indigo-600 hover:pl-4 truncate ${heading.level === 1 ? "font-bold text-gray-800" : "font-medium text-gray-500"} ${heading.level > 2 ? "ml-2" : ""}`}
                      >
                        {heading.text}
                      </a>
                    ))}
                  </nav>
                </div>
              </motion.div>
            </aside>

            {/* === MAIN ARTICLE (CENTERED) === */}
            <article className="flex-1 min-w-0 max-w-3xl order-2">
              
              {/* Header Section */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.8 }} 
                className="mb-8 p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(31,38,135,0.07)]"
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-700 rounded-full border border-indigo-500/20">{data.category || "General"}</span>
                  <span className="text-xs font-medium text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1" />{Math.max(1, Math.ceil(data.content.length / 1000))} min read</span>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 mb-8 leading-[1.15] tracking-tight">
                  {data.title}
                </h1>
                
                <div className="flex items-center justify-between border-t border-gray-200/50 pt-6">
                  <div className="flex items-center space-x-4">
                    {data.author?.avatar ? 
                      <div className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-white shadow-lg"><Image src={data.author.avatar} alt={data.author.name} fill className="object-cover" /></div> 
                      : <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 shadow-inner"><UserIcon className="w-6 h-6" /></div>
                    }
                    <div>
                      <p className="text-sm font-bold text-gray-900">{data.author?.name || "WikiNITT Contributor"}</p>
                      <div className="flex items-center text-xs text-gray-500 mt-0.5"><Calendar className="w-3 h-3 mr-1" /><FormattedDate date={data.createdAt} /></div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Thumbnail with Float Animation */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ duration: 0.8, delay: 0.2 }} 
                className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl mb-10 bg-gray-200 border-4 border-white/50"
              >
                <Image src={data.thumbnail || "/images/placeholder.png"} alt={data.title} fill className="object-cover hover:scale-105 transition-transform duration-[2s]" priority />
              </motion.div>

              {/* Content Body - Glass Effect */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.4 }} 
                data-color-mode="light" 
                className="p-8 md:p-10 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.05)] prose prose-lg prose-indigo max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-indigo-600 prose-img:rounded-2xl pb-10"
              >
                <Markdown source={data.content} remarkPlugins={[remarkBreaks]} rehypePlugins={[rehypeSlug]} />
              </motion.div>

              {/* Mobile Bottom Actions */}
              <div className="xl:hidden mt-8">
                 <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg">
                    <button onClick={handleSpeak} className="flex items-center justify-between w-full p-4 mb-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-bold shadow-sm">
                        <span className="flex items-center gap-2">
                             {isSpeaking && !isPaused ? <Volume2 className="w-5 h-5 animate-pulse" /> : <Headphones className="w-5 h-5" />}
                             {isSpeaking ? "Playing Audio..." : "Listen to Article"}
                        </span>
                        {isSpeaking && !isPaused ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <div className="flex gap-2 justify-between">
                         <button onClick={() => window.open(getShareUrl('twitter'), '_blank')} className="flex-1 p-3 rounded-lg bg-sky-50 text-sky-600 flex justify-center"><Twitter className="w-5 h-5" /></button>
                         <button onClick={() => window.open(getShareUrl('linkedin'), '_blank')} className="flex-1 p-3 rounded-lg bg-blue-50 text-blue-700 flex justify-center"><Linkedin className="w-5 h-5" /></button>
                         <button onClick={() => window.open(getShareUrl('facebook'), '_blank')} className="flex-1 p-3 rounded-lg bg-indigo-50 text-indigo-600 flex justify-center"><Facebook className="w-5 h-5" /></button>
                         <button onClick={handleCopyLink} className="flex-1 p-3 rounded-lg bg-gray-50 text-gray-600 flex justify-center">{copied ? <Check className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}</button>
                    </div>
                 </div>
              </div>

            </article>
            
            {/* === RIGHT SIDEBAR (ACTIONS) === */}
            <aside className="hidden xl:flex w-20 flex-col gap-6 sticky top-28 h-fit items-center order-3 z-20">
              <motion.div 
                 initial={{ opacity: 0, x: 30 }} 
                 animate={{ opacity: 1, x: 0 }} 
                 transition={{ duration: 0.8, delay: 0.2 }}
                 className="flex flex-col gap-6 items-center"
              >
                {/* TTS Button */}
                <div className="flex flex-col items-center gap-2 group">
                    <button 
                      onClick={handleSpeak}
                      className={`p-3.5 rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-indigo-500/30 ${isSpeaking ? "bg-indigo-600 text-white ring-4 ring-indigo-200" : "bg-white/80 backdrop-blur-md text-gray-700 hover:text-indigo-600"}`}
                    >
                        {isSpeaking && !isPaused ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                    </button>
                    <span className="text-[10px] font-bold text-indigo-900/40 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                        {isSpeaking ? "Pause" : "Listen"}
                    </span>
                </div>

                <div className="w-10 h-[2px] bg-gradient-to-r from-transparent via-gray-300 to-transparent my-2" />

                {/* Share Actions (Glass) */}
                <div className="flex flex-col gap-4 p-3 rounded-full bg-white/40 backdrop-blur-md border border-white/40 shadow-lg">
                    {[
                      { icon: Twitter, color: "hover:text-[#1DA1F2]", action: () => window.open(getShareUrl('twitter'), '_blank') },
                      { icon: Linkedin, color: "hover:text-[#0A66C2]", action: () => window.open(getShareUrl('linkedin'), '_blank') },
                      { icon: Facebook, color: "hover:text-[#1877F2]", action: () => window.open(getShareUrl('facebook'), '_blank') },
                    ].map((btn, i) => (
                      <button key={i} onClick={btn.action} className={`p-2 rounded-full text-gray-500 transition-all hover:scale-125 ${btn.color}`}>
                        <btn.icon className="w-5 h-5" />
                      </button>
                    ))}
                    <div className="w-full h-[1px] bg-gray-300/50" />
                    <button onClick={handleCopyLink} className="p-2 text-gray-500 hover:text-green-600 transition-all hover:scale-125">
                        {copied ? <Check className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                    </button>
                </div>
              </motion.div>
            </aside>

          </div>
        </div>
      </div>
    </div>
  );
}