"use client";

import { useMemo, useState } from "react";
import { Calendar, MessageCircle, Search, User } from "lucide-react";
import LandingNavbar from "@/components/LandingNavbar";
import { SearchModal } from "@/components/SearchModal";
import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import { GET_ARTICLES } from "@/gql/queries";
import { Query, Article } from "@/gql/graphql";
import Link from "next/link";

// Helper to strip markdown syntax and get clean text
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Get a rich excerpt that fills at least 3-4 lines
function getArticleExcerpt(article: Article): string {
  const desc = article.description || '';
  const content = article.content ? stripMarkdown(article.content) : '';

  // If description is long enough (>120 chars), use it
  if (desc.length > 120) return desc;

  // Combine description + content excerpt
  const combined = desc ? `${desc} ${content}` : content;
  if (combined.length > 0) {
    return combined.slice(0, 300);
  }

  return "Discover insights and stories from the NITT campus community. This article explores key topics, events, and knowledge curated by students and faculty for a deeper understanding of campus life.";
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [heroSearchOpen, setHeroSearchOpen] = useState(false);

  const { data: categorySeed } = useQuery({
    queryKey: ["landing-categories"],
    queryFn: async () => {
      const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_API_URL || "http://localhost:8080/query";
      const data = await request<Query>(endpoint, GET_ARTICLES, {
        limit: 100,
        offset: 0,
      });
      return data.articles as Article[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ["landing-articles", selectedCategory],
    queryFn: async () => {
      const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_API_URL || "http://localhost:8080/query";
      const data = await request<Query>(endpoint, GET_ARTICLES, {
        limit: 12,
        offset: 0,
        category: selectedCategory,
      });
      return data.articles as Article[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const categoryOptions = useMemo(() => {
    const source = categorySeed || articlesData;
    if (!source || source.length === 0) return ["All"];
    const categories = Array.from(
      new Set(
        source
          .map((article) => article.category)
          .filter((c): c is string => Boolean(c)),
      ),
    ).sort((a, b) => a.localeCompare(b));
    return ["All", ...categories];
  }, [categorySeed, articlesData]);

  const { featuredArticle, listArticles } = useMemo(() => {
    if (!articlesData || articlesData.length === 0) {
      return { featuredArticle: null, listArticles: [] };
    }
    const subset = articlesData.slice(0, 4);
    const [first, ...rest] = subset;
    return { featuredArticle: first || null, listArticles: rest.slice(0, 3) };
  }, [articlesData]);

  return (
    <div className="relative min-h-screen font-[Manrope,sans-serif] text-[#1a1a1a] overflow-x-hidden" style={{ background: "rgba(237, 236, 255, 1)" }}>

      <div className="relative z-10">
        <LandingNavbar />

        {/* --- Hero Section: Full-width gradient container --- */}
        <section className="hero-section-outer relative z-10 w-full mt-2 mb-10">
          {/* Radial gradient blobs — full-width, localized to hero */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)" }}>
            <div className="absolute top-[-30%] left-[-5%] w-[60%] h-[90%] rounded-full bg-[#C7D2FE] blur-[100px] opacity-90" />
            <div className="absolute top-[0%] right-[-5%] w-[55%] h-[90%] rounded-full bg-[#FBCFE8] blur-[100px] opacity-80" />
            <div className="absolute bottom-[-20%] left-[25%] w-[50%] h-[60%] rounded-full bg-[#DDD6FE] blur-[90px] opacity-75" />
          </div>

          {/* Glass card centered */}
          <div className="relative z-10 flex justify-center py-16 px-5">
            <div className="hero-glass-card">
              <p className="tag-pill">DIGITAL CAMPUS HUB</p>
              <h1 className="hero-title">
                Explore the <span>Pulse</span> of<br />NITT
              </h1>
              <div className="hero-search-wrapper" onClick={() => setHeroSearchOpen(true)}>
                <Search className="h-5 w-5 text-[#888] shrink-0 ml-4" />
                <input
                  type="text"
                  placeholder="Search articles on anything..."
                  className="flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-[#999] h-full px-4 cursor-pointer"
                  readOnly
                />
                <button
                  className="m-1 rounded-full px-8 py-3 bg-[#3b28cc] text-white text-[0.9rem] font-medium hover:bg-[#2e20a8] transition-all shadow-md"
                  onClick={(e) => { e.stopPropagation(); setHeroSearchOpen(true); }}
                >
                  Search
                </button>
              </div>
              <SearchModal isOpen={heroSearchOpen} onClose={() => setHeroSearchOpen(false)} />
            </div>
          </div>
        </section>

        <main className="w-full max-w-[1200px] mx-auto px-5 pb-[60px] flex flex-col gap-[60px]">

          {/* --- TOP: Updated Categories --- */}
          <section className="flex justify-center gap-3 flex-wrap">
            {categoryOptions.map((label) => (
              <button
                key={label}
                className={`cat-btn ${(!selectedCategory && label === "All") || selectedCategory === label ? "active" : ""}`}
                onClick={() => setSelectedCategory(label === "All" ? undefined : label)}
              >
                {label}
              </button>
            ))}
          </section>

          {/* --- BOTTOM: Restored Featured Article (Centered) --- */}
          <section className="flex justify-center mt-5">
            <div className="featured-card group">
              <span className="floating-tag">Featured</span>
              {featuredArticle ? (
                <Link href={featuredArticle.slug ? `/articles/${featuredArticle.slug}` : "#"} className="block h-full w-full">
                  <img
                    src={featuredArticle.thumbnail || "https://images.unsplash.com/photo-1516410303867-c04373208022?auto=format&fit=crop&w=800&q=80"}
                    alt={featuredArticle.title}
                  />
                  <div className="featured-content">
                    <h2>{featuredArticle.title}</h2>
                    <p>{getArticleExcerpt(featuredArticle)}</p>
                    <div className="meta-tags">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />{" "}
                        {new Date(featuredArticle.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />{" "}
                        {featuredArticle.author?.displayName || featuredArticle.author?.name || "WikiNITT"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5" /> Read
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="featured-fallback">Loading featured story...</div>
              )}
            </div>
          </section>

          {/* --- BOTTOM: Restored Article List (Vertical) --- */}
          <section className="flex flex-col gap-10 max-w-[720px] mx-auto">
            {isLoading && (
              [1, 2, 3].map((i) => (
                <div key={i} className="article-skeleton">
                  <div className="img" />
                  <div className="text">
                    <div className="line w-24" />
                    <div className="line w-32" />
                    <div className="line w-52" />
                  </div>
                </div>
              ))
            )}

            {!isLoading && listArticles.length === 0 && (
              <div className="text-center text-sm text-[#777]">No articles yet. Check back soon.</div>
            )}

            {listArticles.map((article, idx) => {
              const lineClamp = idx % 2 === 0 ? 4 : 3;
              return (
                <Link
                  href={article.slug ? `/articles/${article.slug}` : "#"}
                  className="article-item"
                  key={article.id}
                >
                  <img
                    src={article.thumbnail || "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80"}
                    alt={article.title}
                  />
                  <div className="article-text">
                    <div className="date-line">
                      <span>{new Date(article.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> {article.author?.displayName || article.author?.name || "WikiNITT"}
                      </span>
                    </div>
                    <h3>{article.title}</h3>
                    <p style={{ WebkitLineClamp: lineClamp }}>{getArticleExcerpt(article)}</p>
                  </div>
                </Link>
              );
            })}
          </section>

        </main>


      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Kaisei+Decol&family=Lato:wght@300;400&family=Manrope:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,600;1,600&display=swap');

        /* Hero Section */

        .hero-glass-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 900px;
          border-radius: 40px;
          background: rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: none;
          padding: 80px 40px;
          text-align: center;
          box-shadow: 0 8px 80px 0 rgba(100, 80, 200, 0.12), 0 0 0 1px rgba(255,255,255,0.25), inset 0 1px 0 rgba(255,255,255,0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .tag-pill {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #3b28cc;
          margin-bottom: 30px;
          background: white;
          padding: 14px 36px;
          border-radius: 999px;
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: 4.5rem;
          font-weight: 600;
          line-height: 1.1;
          margin-bottom: 50px;
          color: #111;
          letter-spacing: -1.5px;
        }
        .hero-title span {
          font-style: italic;
          color: #3b28cc;
          font-weight: 600;
        }

        .hero-search-wrapper {
          width: 100%;
          max-width: 520px;
          height: 64px;
          display: flex;
          align-items: center;
          background: #ffffff;
          border-radius: 9999px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .hero-search-wrapper:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 50px -10px rgba(0,0,0,0.12);
        }

        /* Category Buttons */
        .cat-btn {
          padding: 10px 28px;
          border-radius: 30px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s;
          background: #F3F1E6; /* Beige for inactive */
          color: #555;
          margin-bottom: 10px;
        }
        .cat-btn:hover {
          background: #e8e6da;
        }
        .cat-btn.active {
          background: #3b28cc; /* Blue for active */
          color: white;
          box-shadow: 0 4px 15px rgba(59, 40, 204, 0.25);
        }

        /* Featured Card (Bottom Section) */
        .featured-card {
          position: relative;
          width: 100%;
          max-width: 600px;
          aspect-ratio: 1 / 1;
          border-radius: 30px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .featured-card img { width: 100%; height: 100%; object-fit: cover; }
        .featured-content {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          padding: 40px;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%);
          color: white;
        }
        .featured-content h2 { font-family: 'Kaisei Decol', serif; font-size: 2.2rem; font-weight: 500; margin-bottom: 15px; }
        .featured-content p { font-family: 'Lato', sans-serif; font-weight: 300; font-size: 0.95rem; opacity: 0.9; margin-bottom: 20px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .meta-tags { display: flex; gap: 20px; font-size: 0.8rem; opacity: 0.8; font-weight: 500; }
        .floating-tag {
          position: absolute;
          top: 30px;
          left: 30px;
          background: white;
          color: #333;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          z-index: 2;
        }

        /* Article List (Bottom Section) */
        .article-item { display: flex; gap: 30px; align-items: flex-start; color: inherit; transition: transform 0.25s ease; }
        .article-item:hover { transform: translateX(6px); }
        .article-item:hover h3 { color: #3b28cc; }
        .article-item img { width: 195px; height: 186px; object-fit: cover; border-radius: 0; }
        .article-text { flex: 1; padding-top: 5px; }
        .date-line { font-size: 0.75rem; color: #888; margin-bottom: 10px; display: flex; gap: 15px; align-items: center; font-weight: 600; text-transform: uppercase; }
        .article-text h3 { font-family: 'Kaisei Decol', serif; font-size: 24px; color: rgba(51, 51, 51, 1); margin-bottom: 12px; line-height: 1.2; transition: color 0.2s; }
        .article-text p { font-family: 'Lato', sans-serif; font-weight: 300; font-size: 0.9rem; color: #666; line-height: 1.6; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }

        .article-skeleton { display: flex; gap: 30px; align-items: center; }
        .article-skeleton .img { width: 150px; height: 150px; border-radius: 0; background: #f1f1f5; animation: shimmer 1.2s infinite; }
        .article-skeleton .line { height: 12px; border-radius: 6px; background: #f1f1f5; margin-bottom: 10px; animation: shimmer 1.2s infinite; }
        @keyframes shimmer { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }

        @media (max-width: 768px) {
          .hero-title { font-size: 2.5rem; margin-bottom: 30px; }
          .hero-glass-card { padding: 50px 24px; border-radius: 28px; }
          .tag-pill { padding: 10px 24px; font-size: 0.6rem; margin-bottom: 20px; }
          .hero-search-wrapper { max-width: 100%; height: 54px; }
          .hero-search-wrapper button { padding: 10px 20px; font-size: 0.8rem; }
          .featured-card { max-width: 100%; aspect-ratio: auto; height: 420px; border-radius: 20px; }
          .featured-content { padding: 24px; }
          .featured-content h2 { font-size: 1.5rem; margin-bottom: 10px; }
          .featured-content p { font-size: 0.85rem; margin-bottom: 12px; }
          .meta-tags { gap: 12px; font-size: 0.7rem; flex-wrap: wrap; }
          .floating-tag { top: 16px; left: 16px; padding: 5px 12px; font-size: 0.65rem; }
          .article-item { flex-direction: column; gap: 15px; }
          .article-item img { width: 100%; height: 220px; }
          .article-text h3 { font-size: 20px; }
          .article-text p { font-size: 0.85rem; }
          .date-line { font-size: 0.65rem; gap: 10px; }
          .cat-btn { padding: 8px 20px; font-size: 0.8rem; }
          .article-skeleton { flex-direction: column; }
          .article-skeleton .img { width: 100%; height: 180px; }
        }

        @media (max-width: 480px) {
          .hero-title { font-size: 1.8rem; letter-spacing: -0.5px; margin-bottom: 24px; }
          .hero-glass-card { padding: 36px 18px; border-radius: 24px; }
          .tag-pill { padding: 8px 18px; font-size: 0.55rem; letter-spacing: 1.5px; margin-bottom: 16px; }
          .hero-search-wrapper { height: 48px; }
          .hero-search-wrapper input { font-size: 0.8rem; padding: 0 8px; }
          .hero-search-wrapper button { padding: 8px 14px; font-size: 0.75rem; }
          .featured-card { height: 340px; border-radius: 16px; }
          .featured-content h2 { font-size: 1.2rem; }
          .featured-content p { font-size: 0.8rem; }
          .article-text h3 { font-size: 18px; }
          .cat-btn { padding: 7px 16px; font-size: 0.75rem; }
        }
      `}</style>
    </div>
  );
}