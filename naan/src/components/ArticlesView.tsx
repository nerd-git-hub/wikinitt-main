"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Article, Query } from "@/gql/graphql";
import { useInfiniteQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import { GET_ARTICLES } from "@/gql/queries";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import FormattedDate from "@/components/FormattedDate";
import { Clock, User, ArrowRight } from "lucide-react";

interface ArticlesViewProps {
  articles: Article[];
}

const PAGE_SIZE = 9;

export default function ArticlesView({
  articles: initialArticles,
}: ArticlesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const parentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1024);
  const [listOffset, setListOffset] = useState(0);

  const categories = [
    "All",
    ...new Set(initialArticles.map((article) => article.category)),
  ];

  const fetchArticles = async ({ pageParam = 0 }) => {
    const endpoint =
      process.env.NEXT_PUBLIC_GRAPHQL_API_URL || "http://localhost:8080/query";
    const data = await request<Query>(endpoint, GET_ARTICLES, {
      category: selectedCategory === "All" ? null : selectedCategory,
      limit: PAGE_SIZE,
      offset: pageParam,
    });
    return data.articles;
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["articles", selectedCategory],
      queryFn: fetchArticles,
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.length < PAGE_SIZE) return undefined;
        return allPages.length * PAGE_SIZE;
      },
      initialData:
        selectedCategory === "All"
          ? {
            pages: [initialArticles.slice(0, PAGE_SIZE)],
            pageParams: [0],
          }
          : undefined,
    });

  const allArticles = data ? data.pages.flatMap((page) => page) : [];

  const numColumns = useMemo(() => {
    if (containerWidth >= 1280) return 3;
    if (containerWidth >= 768) return 2;
    return 1;
  }, [containerWidth]);

  const rowCount =
    Math.ceil(allArticles.length / numColumns) + (hasNextPage ? 1 : 0);

  const isInitialLoading = isLoading && (!data || data.pages.length === 0);

  useEffect(() => {
    if (parentRef.current) {
      setListOffset(parentRef.current.offsetTop);
    }
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 480,
    overscan: 5,
    scrollMargin: listOffset,
  });

  useEffect(() => {
    if (!parentRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setListOffset(parentRef.current?.offsetTop ?? 0);
      }
    });
    resizeObserver.observe(parentRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (lastItem.index >= rowCount - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    allArticles.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
    rowCount,
  ]);

  return (
    <div className="space-y-10 relative z-10">
      <div className="text-center space-y-6">
        <h2 className="text-4xl md:text-[3.5rem] font-[Playfair_Display,serif] text-[#050505] tracking-tight leading-tight">
          Explore <span className="italic font-semibold text-[#3b28cc]">Knowledge</span>
        </h2>
        <p className="max-w-2xl mx-auto text-[0.95rem] text-[#666] font-[Manrope,sans-serif] leading-relaxed">
          Curated stories, academic resources, and campus guides written by the community.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-8">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`cat-btn ${selectedCategory === category ? "active" : ""}`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Loading shimmer grid */}
      {isInitialLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 px-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-[24px] border border-white/80 shadow-[0_10px_40px_rgba(0,0,0,0.04)] bg-white/70 backdrop-blur-xl overflow-hidden"
            >
              <div className="h-56 w-full shimmer" />
              <div className="p-6 space-y-4">
                <div className="flex gap-2 items-center text-xs font-semibold text-[#888] uppercase tracking-wide">
                  <div className="h-3 w-16 shimmer rounded-full" />
                  <div className="h-3 w-10 shimmer rounded-full" />
                </div>
                <div className="h-8 w-5/6 shimmer rounded-md" />
                <div className="h-4 w-4/6 shimmer rounded-md" />
                <div className="h-4 w-3/6 shimmer rounded-md" />
                <div className="mt-2 pt-4 border-t border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 shimmer rounded-full" />
                    <div className="space-y-2">
                      <div className="h-3 w-20 shimmer rounded-sm" />
                      <div className="h-2.5 w-12 shimmer rounded-sm" />
                    </div>
                  </div>
                  <div className="h-9 w-9 shimmer rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={parentRef}
          style={{
            width: "100%",
            position: "relative",
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
          className="mt-8"
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const startIndex = virtualRow.index * numColumns;
            const rowArticles = allArticles.slice(
              startIndex,
              startIndex + numColumns,
            );

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start - listOffset}px)`,
                }}
                className="flex gap-6 lg:gap-8 px-2 pb-6"
              >
                {rowArticles.map((article) => (
                  <article
                    key={article.id}
                    style={{
                      width: `calc((100% - ${(numColumns - 1) * 32}px) / ${numColumns})`,
                    }}
                    className="group flex flex-col h-full bg-white/60 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_10px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_50px_rgba(59,40,204,0.08)] hover:-translate-y-2 transition-all duration-400 overflow-hidden"
                  >
                    <div className="relative h-56 w-full overflow-hidden">
                      <Image
                        src={article.thumbnail || "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80"}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />

                      <div className="absolute top-4 left-4">
                        <span className="inline-block px-3 py-1.5 text-[0.7rem] font-bold tracking-widest uppercase bg-white/90 backdrop-blur-md text-[#3b28cc] rounded-full shadow-sm">
                          {article.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col font-[Manrope,sans-serif]">
                      <div className="flex items-center gap-3 text-xs font-semibold text-[#888] mb-3 uppercase tracking-wide">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <FormattedDate date={article.createdAt} />
                        </div>
                      </div>

                      <Link
                        href={`/articles/${article.slug}`}
                        className="block mb-3 transition-colors duration-200"
                      >
                        <h3 className="text-[1.5rem] font-[Playfair_Display,serif] text-[#222] leading-[1.2] line-clamp-2 group-hover:text-[#3b28cc]">
                          {article.title}
                        </h3>
                      </Link>

                      <p className="text-[0.9rem] text-[#666] line-clamp-2 leading-[1.6] mb-6 font-normal">
                        {article.description || "Tap to read the full story."}
                      </p>

                      <div className="mt-auto pt-5 border-t border-black/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 rounded-full overflow-hidden border border-white shadow-sm ring-1 ring-black/5">
                            {article.author?.avatar ? (
                              <Image
                                src={article.author.avatar}
                                alt={article.author.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#f0f0fa] flex items-center justify-center text-[#3b28cc]">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[#333]">
                              {article.author?.name || "WikiNITT"}
                            </span>
                            <span className="text-[10px] text-[#888] font-semibold uppercase">Author</span>
                          </div>
                        </div>

                        <div className="w-9 h-9 rounded-full bg-[#f8f8fb] flex items-center justify-center text-[#666] group-hover:bg-[#3b28cc] group-hover:text-white transition-all duration-300">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {isFetchingNextPage && virtualRow.index === rowCount - 1 && (
                  <div className="absolute bottom-0 w-full flex justify-center items-center py-4">
                    <span className="text-sm text-[#3b28cc] font-medium animate-pulse">Loading more stories...</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,500;1,600&display=swap');

        :root {
          --primary-blue: #3b28cc;
        }

        .cat-btn {
          padding: 10px 24px;
          border-radius: 30px;
          font-size: 0.9rem;
          cursor: pointer;
          font-weight: 600;
          font-family: 'Playfair Display', serif;
          letter-spacing: 0.5px;
          transition: background-color 0.3s, color 0.3s, transform 0.2s;
        }
        .cat-btn:not(.active) {
          background-color: rgba(255,255,255,0.6);
          border: 1px solid rgba(0,0,0,0.05);
          color: #666;
          backdrop-filter: blur(10px);
        }
        .cat-btn:hover:not(.active) { 
          background: white; 
          transform: translateY(-2px);
        }
        .cat-btn.active {
          background-color: var(--primary-blue);
          color: white;
          box-shadow: 0 5px 15px rgba(59, 40, 204, 0.2);
        }
        .shimmer {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #f1f1f5 0%, #e6e6ef 50%, #f1f1f5 100%);
          background-size: 200% 100%;
          animation: shimmer 1.2s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
