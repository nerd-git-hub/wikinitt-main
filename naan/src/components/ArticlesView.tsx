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
import { Sparkles, Clock, User, ArrowRight } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
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
        // Also update offset in case layout shifts
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
    <div className="space-y-10">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/50 backdrop-blur-sm px-4 py-1 text-xs font-bold text-indigo-600 shadow-sm mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Discover Knowledge
        </div>
        <h2 className="text-4xl md:text-5xl font-serif font-black text-slate-900 tracking-tight">
          Explore <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-blue-600">Articles</span>
        </h2>
        <p className="max-w-2xl mx-auto text-lg text-slate-500 font-light leading-relaxed">
          Curated stories, academic resources, and campus guides written by the community.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={twMerge(
              "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border backdrop-blur-md active:scale-95",
              selectedCategory === category
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-200"
                : "bg-white/40 text-slate-600 border-white/60 hover:bg-white/80 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-sm"
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <div
        ref={parentRef}
        style={{
          width: "100%",
          position: "relative",
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
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
                  className="group flex flex-col h-full bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  <div className="relative h-56 w-full overflow-hidden">
                    <Image
                      src={article.thumbnail || "/nitt.jpg"}
                      alt={article.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-900/60 to-transparent opacity-60" />

                    <div className="absolute top-4 left-4">
                      <span className="inline-block px-3 py-1 text-[10px] font-bold tracking-widest uppercase bg-white/95 backdrop-blur-md text-indigo-700 rounded-lg shadow-sm">
                        {article.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <FormattedDate date={article.createdAt} />
                      </div>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>5 min read</span>
                    </div>

                    <Link
                      href={`/articles/${article.slug}`}
                      className="block mb-3 group-hover:text-indigo-600 transition-colors duration-200"
                    >
                      <h3 className="text-xl font-bold text-slate-900 leading-tight line-clamp-2 font-serif">
                        {article.title}
                      </h3>
                    </Link>

                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-6 font-light">
                      {article.description}
                    </p>

                    <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 rounded-full overflow-hidden border border-white shadow-sm ring-1 ring-slate-100">
                          {article.author?.avatar ? (
                            <Image
                              src={article.author.avatar}
                              alt={article.author.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">
                            {article.author?.name || "Unknown"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Author</span>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {isFetchingNextPage && virtualRow.index === rowCount - 1 && (
                <div className="absolute bottom-0 w-full flex justify-center items-center py-4">
                  <span className="text-sm text-indigo-500 font-medium animate-pulse">Loading more stories...</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}