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
  Clock, Calendar, ChevronLeft, ChevronDown, Twitter, Linkedin, Facebook,
  Link as LinkIcon, Check, User as UserIcon, Play, Pause, Square, Headphones, Share2
} from "lucide-react";
import Link from "next/link";
import { Article } from "@/gql/graphql"; // Import type

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

// Receive data as a PROP instead of fetching it
export default function ArticleView({ data }: { data: Article }) {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [copied, setCopied] = useState(false);

  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
      utteranceRef.current = utterance;
      synthesisRef.current.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleStop = () => {
    if (!synthesisRef.current) return;
    synthesisRef.current.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      <motion.div className="fixed top-0 left-0 right-0 h-1.5 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 origin-left z-60" style={{ scaleX }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/articles" className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-indigo-600 transition-all group">
          <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Articles
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 relative">

          {/* DESKTOP SIDEBAR */}
          <aside className="hidden lg:block w-72 shrink-0 order-1 lg:order-1">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="sticky top-28 flex flex-col gap-8">
              <div className="p-6 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Table of Contents</h3>
                <nav className="space-y-1 relative">
                  <div className="absolute left-[3px] top-2 bottom-2 w-[2px] bg-gray-100 rounded-full" />
                  {headings.map((heading, index) => (
                    <a key={index} href={`#${heading.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth" }); }} className={`block text-sm py-1.5 pl-4 border-l-2 border-transparent transition-all duration-300 hover:text-indigo-600 ${heading.level === 1 ? "font-bold text-gray-800" : "font-medium text-gray-500"} ${heading.level > 2 ? "ml-3 text-xs" : ""}`}>{heading.text}</a>
                  ))}
                </nav>
              </div>
              <div className="p-6 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Share this article</h3>
                <div className="flex gap-3">
                  {[
                    { icon: Twitter, color: "hover:bg-sky-500 hover:text-white text-sky-500", action: () => window.open(getShareUrl('twitter'), '_blank') },
                    { icon: Linkedin, color: "hover:bg-blue-600 hover:text-white text-blue-600", action: () => window.open(getShareUrl('linkedin'), '_blank') },
                    { icon: Facebook, color: "hover:bg-indigo-600 hover:text-white text-indigo-600", action: () => window.open(getShareUrl('facebook'), '_blank') },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.action} className={`p-2.5 rounded-xl bg-gray-50 transition-all duration-300 transform hover:scale-110 shadow-sm ${btn.color}`}><btn.icon className="w-5 h-5" /></button>
                  ))}
                  <button onClick={handleCopyLink} className="p-2.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-green-500 hover:text-white transition-all duration-300 transform hover:scale-110 shadow-sm">{copied ? <Check className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}</button>
                </div>
              </div>
            </motion.div>
          </aside>

          {/* MAIN ARTICLE */}
          <article className="flex-1 min-w-0 order-2 lg:order-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="px-4 py-1.5 text-xs font-bold tracking-wider uppercase bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">{data.category}</span>
                <span className="text-sm font-medium text-gray-400 flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5" />{Math.ceil(data.content.length / 1000)} min read</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-8 leading-[1.1] tracking-tight">{data.title}</h1>
              <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                <div className="flex items-center space-x-4">
                  {data.author?.avatar ? <div className="relative h-12 w-12 overflow-hidden rounded-full ring-4 ring-white shadow-md"><Image src={data.author.avatar} alt={data.author.name} fill className="object-cover" /></div> : <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner"><UserIcon className="w-6 h-6" /></div>}
                  <div><p className="text-base font-bold text-gray-900">{data.author?.name || "WikiNITT Contributor"}</p><div className="flex items-center text-sm text-gray-500 mt-0.5"><Calendar className="w-3.5 h-3.5 mr-1.5" /><FormattedDate date={data.createdAt} /></div></div>
                </div>
              </div>
            </motion.div>

            {/* AUDIO PLAYER */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
              <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${isSpeaking ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200" : "bg-linear-to-br from-indigo-50 to-white border-indigo-100 shadow-sm hover:shadow-md"}`}>
                <div className="relative z-10 p-5 sm:p-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <button onClick={handleSpeak} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-105 shadow-md shrink-0 ${isSpeaking ? "bg-white text-indigo-600" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>{isSpeaking && !isPaused ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}</button>
                    <div className="flex flex-col"><h3 className={`font-bold text-lg ${isSpeaking ? "text-white" : "text-gray-900"}`}>{isSpeaking ? "Now Playing" : "Listen to this article"}</h3><div className={`flex items-center text-sm font-medium mt-1 ${isSpeaking ? "text-indigo-100" : "text-gray-500"}`}><Headphones className="w-4 h-4 mr-2" /><span>Audio Version Available</span></div></div>
                  </div>
                  <div className="flex items-center gap-4">{(isSpeaking || isPaused) && <button onClick={handleStop} className={`p-2 rounded-lg transition-colors ${isSpeaking ? "bg-indigo-500/50 text-white hover:bg-indigo-500" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}><Square className="w-5 h-5 fill-current" /></button>}</div>
                </div>
                {!isSpeaking && <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-linear-to-l from-indigo-100/50 to-transparent pointer-events-none" />}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl mb-10 bg-gray-100">
              <Image src={data.thumbnail || "/images/placeholder.png"} alt={data.title} fill className="object-cover transition-transform duration-1000 hover:scale-105" priority />
            </motion.div>

            {/* MOBILE NAV (TOC + Share) */}
            <div className="lg:hidden flex flex-col gap-4 mb-12">
              <details className="group rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between p-4 font-bold text-gray-800 cursor-pointer list-none select-none bg-gray-50/50 group-open:bg-indigo-50/50 transition-colors">
                  <div className="flex items-center gap-2"><span className="text-indigo-600"><ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform duration-300" /></span><span>Table of Contents</span></div>
                </summary>
                <nav className="p-4 bg-white flex flex-col gap-1 max-h-64 overflow-y-auto">
                  {headings.map((heading, index) => (
                    <a key={index} href={`#${heading.id}`} onClick={(e) => { e.preventDefault(); const details = e.currentTarget.closest('details'); if (details) details.open = false; document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth" }); }} className={`block text-sm py-2.5 px-3 rounded-lg transition-colors text-gray-600 hover:bg-indigo-50 ${heading.level === 1 ? "font-bold text-gray-900" : "font-medium"}`}>{heading.text}</a>
                  ))}
                </nav>
              </details>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 font-bold text-sm uppercase tracking-wider"><Share2 className="w-4 h-4" /><span>Share</span></div>
                <div className="flex gap-2">
                  {[{ icon: Twitter, color: "text-sky-500 bg-sky-50", action: () => window.open(getShareUrl('twitter'), '_blank') }, { icon: Linkedin, color: "text-blue-600 bg-blue-50", action: () => window.open(getShareUrl('linkedin'), '_blank') }, { icon: Facebook, color: "text-indigo-600 bg-indigo-50", action: () => window.open(getShareUrl('facebook'), '_blank') }].map((btn, i) => (<button key={i} onClick={btn.action} className={`p-2 rounded-lg ${btn.color} hover:opacity-80 transition-opacity`}><btn.icon className="w-5 h-5" /></button>))}
                </div>
              </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} data-color-mode="light" className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-indigo-600 prose-img:rounded-2xl pb-20">
              <Markdown source={data.content} remarkPlugins={[remarkBreaks]} rehypePlugins={[rehypeSlug]} />
            </motion.div>
          </article>
        </div>
      </div>
    </div>
  );
}