"use client";

import { useMemo, useState } from "react";
import { LandingSearch } from "@/components/LandingSearch";
import { Calendar, MessageCircle, User } from "lucide-react";
import LandingNavbar from "@/components/LandingNavbar";
import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import { GET_ARTICLES } from "@/gql/queries";
import { Query, Article } from "@/gql/graphql";
import Link from "next/link";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const { data: categorySeed } = useQuery({
    queryKey: ["landing-categories"],
    queryFn: async () => {
      const endpoint =
        process.env.NEXT_PUBLIC_GRAPHQL_API_URL || "http://localhost:8080/query";
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
      const endpoint =
        process.env.NEXT_PUBLIC_GRAPHQL_API_URL || "http://localhost:8080/query";
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
      return { featuredArticle: null as Article | null, listArticles: [] as Article[] };
    }
    const subset = articlesData.slice(0, 4);
    const [first, ...rest] = subset;
    return { featuredArticle: first || null, listArticles: rest.slice(0, 3) };
  }, [articlesData]);

  return (
    <div className="relative min-h-screen overflow-x-hidden font-[Manrope,sans-serif] bg-[#fdfcff] text-[#1a1a1a]">
      
      {/* Background Ambient Blobs */}
      <div className="ambient-blob top-blob"></div>
      <div className="ambient-blob bottom-blob"></div>

      <LandingNavbar />

      <main className="w-full max-w-[1200px] mx-auto px-5 pb-[60px] flex flex-col gap-[60px]">
        
        {/* --- Hero Section (The Glass Box) --- */}
        <section className="hero-box">
          <span className="tag-pill animate-up delay-1">Digital Campus Hub</span>
          <h1 className="hero-title animate-up delay-2">
            Explore the <span>Pulse</span> of<br />NITT
          </h1>
          
          <div className="search-wrapper animate-up delay-3 w-full max-w-[500px]">
            {/* Keeping your functional Search Component */}
            <LandingSearch />
          </div>
        </section>

        {/* --- Categories --- */}
        <section className="flex justify-center gap-3 flex-wrap">
          {categoryOptions.map((label) => (
            <button
              key={label}
              className={`cat-btn ${(!selectedCategory && label === "All") || selectedCategory === label ? "active" : ""}`}
              onClick={() =>
                setSelectedCategory(label === "All" ? undefined : label)
              }
            >
              {label}
            </button>
          ))}
        </section>

        {/* --- Featured Article --- */}
        <section className="flex justify-center mt-5">
          <div className="featured-card group">
            <span className="floating-tag">Featured</span>
            {featuredArticle ? (
              <Link href={featuredArticle.slug ? `/articles/${featuredArticle.slug}` : "#"} className="block h-full w-full">
                <img
                  src={
                    featuredArticle.thumbnail ||
                    "https://images.unsplash.com/photo-1516410303867-c04373208022?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={featuredArticle.title}
                />
                <div className="featured-content">
                  <h2>{featuredArticle.title}</h2>
                  <p>{featuredArticle.description || "Tap to read the full story."}</p>
                  <div className="meta-tags">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />{" "}
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(featuredArticle.createdAt))}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />{" "}
                      {featuredArticle.author?.name || "WikiNITT"}
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

        {/* --- Article List --- */}
        <section className="flex flex-col gap-10 max-w-[720px] mx-auto">
          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="article-skeleton">
                  <div className="img" />
                  <div className="text">
                    <div className="line w-24" />
                    <div className="line w-32" />
                    <div className="line w-52" />
                  </div>
                </div>
              ))}
            </>
          )}

          {!isLoading && listArticles.length === 0 && (
            <div className="text-center text-sm text-[#777]">
              No articles yet. Check back soon.
            </div>
          )}

          {listArticles.map((article) => (
            <Link
              href={article.slug ? `/articles/${article.slug}` : "#"}
              className="article-item"
              key={article.id}
            >
              <img
                src={
                  article.thumbnail ||
                  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80"
                }
                alt={article.title}
              />
              <div className="article-text">
                <div className="date-line">
                  <span>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(article.createdAt))}</span>
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> {article.author?.name || "WikiNITT"}
                  </span>
                </div>
                <h3>{article.title}</h3>
                <p>{article.description || "Tap to read the full story."}</p>
              </div>
            </Link>
          ))}
        </section>

      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,500;1,600&display=swap');

        :root {
          --primary-blue: #3b28cc;
        }

        /* Ambient Blobs */
        .ambient-blob {
          position: absolute;
          width: 60vw;
          height: 60vh;
          z-index: -1;
        }
        .top-blob {
          top: -10%;
          left: -10%;
          background: radial-gradient(circle, rgba(169, 196, 255, 0.4) 0%, rgba(255,255,255,0) 70%);
        }
        .bottom-blob {
          top: 10%;
          right: -10%;
          background: radial-gradient(circle, rgba(245, 200, 255, 0.4) 0%, rgba(255,255,255,0) 70%);
        }

        /* Animations */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-up {
          animation: none;
          opacity: 1;
        }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.3s; }
        .delay-3 { animation-delay: 0.5s; }

        /* Hero Box */
        .hero-box {
          width: 100%;
          height: calc(100vh - 120px); 
          min-height: 600px;
          padding: 0 20px;
          margin-top: 10px;
          background: linear-gradient(125deg, rgba(255, 255, 255, 0.6) 0%, rgba(240, 245, 255, 0.4) 50%, rgba(255, 240, 250, 0.3) 100%);
          backdrop-filter: blur(30px) saturate(120%);
          -webkit-backdrop-filter: blur(30px) saturate(120%);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 40px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05), inset 0 0 0 2px rgba(255, 255, 255, 0.5), inset 0 0 40px rgba(255, 255, 255, 0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .tag-pill {
          display: inline-block;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          color: var(--primary-blue);
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 30px;
          box-shadow: 0 5px 15px rgba(59, 40, 204, 0.1);
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: 4.5rem;
          line-height: 1.1;
          margin-bottom: 40px;
          color: #050505;
          letter-spacing: -1px;
          text-shadow: 0 2px 10px rgba(255,255,255,0.8);
        }
        .hero-title span {
          font-style: italic;
          color: var(--primary-blue);
          font-weight: 600;
        }

        /* Categories */
        .cat-btn {
          padding: 10px 24px;
          border-radius: 30px;
          font-size: 0.9rem;
          cursor: pointer;
          font-weight: 600;
          font-family: 'Playfair Display', serif;
          letter-spacing: 0.5px;
          transition: background-color 0.3s, color 0.3s;
        }
        .cat-btn:not(.active) {
          background-color: rgba(255,255,255,0.5);
          border: 1px solid rgba(0,0,0,0.05);
          color: #666;
        }
        .cat-btn:hover { background: white; }
        .cat-btn.active {
          background-color: var(--primary-blue);
          color: white;
          box-shadow: 0 5px 15px rgba(59, 40, 204, 0.2);
        }

        /* Featured Card */
        .featured-card {
          position: relative;
          width: 100%;
          max-width: 600px;
          height: 750px;
          border-radius: 30px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .featured-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .featured-content {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          padding: 40px;
          background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);
          color: white;
        }
        .featured-content h2 {
          font-family: 'Playfair Display', serif;
          font-size: 2.2rem;
          font-weight: 500;
          margin-bottom: 15px;
          line-height: 1.2;
        }
        .featured-content p {
          font-size: 0.95rem;
          opacity: 0.9;
          margin-bottom: 20px;
          font-weight: 300;
        }
        .meta-tags {
          display: flex;
          gap: 20px;
          font-size: 0.8rem;
          opacity: 0.8;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
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
        .featured-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: #f6f6fb;
          color: #777;
          font-weight: 600;
        }

        /* Article List */
        .article-item {
          display: flex;
          gap: 30px;
          align-items: flex-start;
          text-decoration: none;
          color: inherit;
          transition: transform 0.25s ease;
        }
        .article-item:hover h3 {
          color: var(--primary-blue);
        }
        .article-item:hover { transform: translateX(6px); }
        .article-item img {
          width: 150px;
          height: 150px;
          object-fit: cover;
          border-radius: 8px;
        }
        .article-text { flex: 1; padding-top: 5px; }
        .date-line {
          font-size: 0.75rem;
          color: #888;
          margin-bottom: 10px;
          display: flex;
          gap: 15px;
          align-items: center;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .article-text h3 {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          font-weight: 400;
          color: #222;
          margin-bottom: 12px;
          line-height: 1.1;
        }
        .article-text p {
          font-size: 0.9rem;
          color: #666;
          line-height: 1.6;
          font-weight: 400;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .article-skeleton {
          display: flex;
          gap: 30px;
          align-items: center;
        }
        .article-skeleton .img {
          width: 150px;
          height: 150px;
          border-radius: 8px;
          background: linear-gradient(90deg, #f1f1f5 0%, #e6e6ef 50%, #f1f1f5 100%);
          background-size: 200% 100%;
          animation: shimmer 1.2s infinite;
        }
        .article-skeleton .text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .article-skeleton .line {
          height: 12px;
          border-radius: 6px;
          background: linear-gradient(90deg, #f1f1f5 0%, #e6e6ef 50%, #f1f1f5 100%);
          background-size: 200% 100%;
          animation: shimmer 1.2s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 768px) {
          .hero-title { font-size: 2.5rem; }
          .hero-box { height: auto; min-height: 450px; padding: 60px 20px; }
          .article-item { flex-direction: column; gap: 15px; }
          .article-item img { width: 100%; height: 250px; }
          .featured-card { height: 500px; }
        }
      `}</style>
    </div>
  );
}
