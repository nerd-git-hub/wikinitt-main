"use client";

import Image from "next/image";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import FormattedDate from "@/components/FormattedDate";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  User as UserIcon,
  Link as LinkIcon,
  Check,
  MessageSquare,
} from "lucide-react";
import { Article } from "@/gql/graphql";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export default function ArticleView({ data }: { data: Article }) {
  const [copied, setCopied] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string>("");

  const headings = useMemo(() => {
    if (!data.content) return [];
    const regex = /^(#{1,6})\s+(.+)$/gm;
    const extracted: TOCItem[] = [];
    let match: RegExpExecArray | null;
    const slugify = (text: string) =>
      text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");

    while ((match = regex.exec(data.content)) !== null) {
      extracted.push({
        level: match[1].length,
        text: match[2],
        id: slugify(match[2]),
      });
    }
    return extracted;
  }, [data.content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const readMinutes = Math.max(1, Math.ceil(data.content.length / 1000));

  return (
    <div className="bg-[#f3f3ff] text-[#333] font-(--font-lato) text-[16px] leading-[1.6] animate-[fadeInPage_0.8s_ease-out_forwards]">

      <section className="bg-[#2d2d2d] text-white px-[5%] md:px-[20px] pb-[25px] pt-[15px] flex justify-center">
        <h1 className="text-[1.8rem] md:text-[2.2rem] font-bold mt-[10px] w-full max-w-[1050px] animate-[slideUpFade_0.8s_ease-out_0.2s_backwards] text-center md:text-left leading-tight">
          {data.title}
        </h1>
      </section>

      <section className="relative w-full h-[30vh] md:h-[35vh] min-h-[250px] animate-[slideUpFade_0.8s_ease-out_0.4s_backwards]">
        <Image
          src={data.thumbnail || "/images/placeholder.png"}
          alt={data.title}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />

        <div className="absolute inset-0 px-[5%] md:px-[8%] pb-[15px] flex flex-col sm:flex-row justify-end sm:justify-between items-center sm:items-end text-[rgba(255,255,255,0.9)] gap-4 sm:gap-0 max-w-[1300px] mx-auto w-full">
          <div className="hidden sm:flex gap-[25px] mb-[5px]">
            <span className="flex items-center gap-[6px] transition-colors hover:text-white cursor-default text-[0.85rem] tracking-wide">
              <Clock className="w-[14px] h-[14px]" /> {readMinutes} min read
            </span>
            <span className="flex items-center gap-[6px] transition-colors hover:text-white cursor-default text-[0.85rem] tracking-wide">
              <Calendar className="w-[14px] h-[14px]" /> <FormattedDate date={data.createdAt} />
            </span>
            <span className="flex items-center gap-[6px] transition-colors hover:text-white cursor-default text-[0.85rem] tracking-wide">
              <UserIcon className="w-[14px] h-[14px]" /> {data.author?.name || "Contributor"}
            </span>
          </div>

          <button
            className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-[20px] py-[8px] rounded-full cursor-pointer font-medium text-[0.85rem] flex items-center justify-center gap-[8px] transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95 w-full sm:w-auto shadow-[0_4px_12px_rgba(0,0,0,0.2)] mb-[5px]"
            onClick={handleCopyLink}
          >
            {copied ? <Check className="w-[14px] h-[14px]" /> : <LinkIcon className="w-[14px] h-[14px]" />}
            {copied ? "Copied!" : "Share Article"}
          </button>
        </div>
      </section>

      <main className="w-full mt-[25px] md:mt-[40px] px-[5%] md:px-[20px] animate-[slideUpFade_0.8s_ease-out_0.6s_backwards] relative pb-10">
        <div className="flex justify-center max-w-[1400px] mx-auto w-full">

          <aside className="hidden lg:block sticky top-[90px] self-start w-[220px] shrink-0 mr-[40px] xl:mr-[80px] max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar pr-2">
            <h3 className="font-bold text-[1.1rem] mb-[15px] text-[#444] pb-[5px] inline-block">
              Contents
            </h3>
            <ul className="list-none p-0 m-0 border-l border-[#d0d2df] pl-3 flex flex-col gap-[12px]">
              {headings.map((heading, index) => (
                <li
                  key={`${heading.id}-${index}`}
                  onClick={() => document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth" })}
                  className={`text-[0.9rem] cursor-pointer transition-all duration-200 relative left-0 hover:text-[#333] hover:left-[3px] ${activeHeading === heading.id ? "text-[#333] font-bold" : "text-[#777]"
                    }`}
                >
                  {heading.text}
                </li>
              ))}
            </ul>
          </aside>

          <article className="max-w-[780px] w-full shrink">
            <div data-color-mode="light" className="article-markdown">
              <Markdown
                remarkPlugins={[remarkBreaks]}
                rehypePlugins={[rehypeSlug, rehypeRaw]}
              >
                {data.content}
              </Markdown>
            </div>
          </article>

          <div className="hidden lg:block w-[220px] shrink-0 ml-[40px] xl:ml-[80px] pointer-events-none"></div>

        </div>

        {/* FAB Chat */}
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Kaisei+Decol:wght@400;500;700&family=Lato:ital,wght@0,400;0,700;1,400&display=swap');
        
        :root {
          --font-kaisei: "Kaisei Decol", serif;
          --font-lato: "Lato", sans-serif;
        }

        @keyframes fadeInPage {
          to { opacity: 1; }
        }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* React Markdown styles */
        .article-markdown {
          background: transparent !important;
          color: #333 !important;
          font-family: var(--font-lato) !important;
          line-height: 1.7 !important;
          font-size: 16px !important;
        }

        .article-markdown h1,
        .article-markdown h2,
        .article-markdown h3,
        .article-markdown h4 {
          font-family: var(--font-kaisei) !important;
          color: #222 !important;
          border-bottom: none !important;
          font-weight: 700 !important;
          line-height: 1.3 !important;
          scroll-margin-top: 90px;
        }

        /* * FIX FOR THE "LINK ALONG WITH THE HEADING"
         * Hides the auto-generated anchor links inside headings 
         */
        .article-markdown h1 a.anchor,
        .article-markdown h2 a.anchor,
        .article-markdown h3 a.anchor,
        .article-markdown h4 a.anchor,
        .article-markdown h5 a.anchor,
        .article-markdown h6 a.anchor {
          display: none !important;
        }

        /* Prevent our custom link underline from applying to heading anchors just in case */
        .article-markdown h1 a::after,
        .article-markdown h2 a::after,
        .article-markdown h3 a::after,
        .article-markdown h4 a::after {
          display: none !important;
        }

        .article-markdown h2 {
          font-size: 1.5rem !important;
          margin-top: 28px !important;
          margin-bottom: 12px !important;
        }
        
        .article-markdown h3 {
          font-size: 1.25rem !important;
          margin-top: 24px !important;
          margin-bottom: 10px !important;
        }

        .article-markdown h2:first-child {
          margin-top: 0 !important;
        }

        .article-markdown p {
          margin-bottom: 20px !important;
          color: #444 !important;
          font-size: 16px !important;
          text-align: justify !important;
          line-height: 1.7 !important;
        }

        .article-markdown img {
          max-height: 350px !important;
          max-width: 100% !important;
          width: auto !important;
          object-fit: contain !important;
          border-radius: 12px !important;
          margin: 2.5rem auto !important;
          display: block !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08) !important;
        }

        .article-markdown a {
          color: #6a7c92 !important;
          text-decoration: none !important;
          position: relative;
          display: inline-block;
          font-weight: 700;
        }
        
        .article-markdown a::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 1.5px;
          bottom: 0px;
          left: 0;
          background-color: #6a7c92;
          transform: scaleX(0);
          transform-origin: bottom right;
          transition: transform 0.4s ease-out;
        }

        .article-markdown a:hover::after {
          transform: scaleX(1);
          transform-origin: bottom left;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d0d2df;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
