"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SearchModal } from "@/components/SearchModal";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LogoIcon from "@/components/logo.svg";
import {
  Home,
  BookOpen,
  Users,
  Menu,
  X,
  Search,
  User,
  LogOut,
  MapPin,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { signIn, useSession, signOut } from "next-auth/react";
import { GET_ME } from "@/queries/user";
import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type CurrentUser = {
  avatar?: string | null;
  username: string;
  displayName?: string | null;
};

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      if (!session?.backendToken) return null;
      const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_API_URL!;
      const data = await request<{ me: CurrentUser }>(
        endpoint,
        GET_ME,
        {},
        {
          Authorization: `Bearer ${session.backendToken}`,
        },
      );
      return data.me;
    },
    enabled: !!session?.backendToken,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!me) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="flex text-sm rounded-full focus:ring-4 focus:ring-indigo-100 transition-all"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="sr-only">Open user menu</span>
        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
          <Image
            src={me.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(me.username)}`}
            alt={me.username}
            className="w-full h-full object-cover"
            width={36}
            height={36}
            unoptimized
          />
        </div>
      </button>

      {isOpen && (
        <div className="z-50 absolute right-0 top-full mt-2 w-56 text-base list-none bg-white/80 backdrop-blur-xl divide-y divide-gray-100/50 rounded-xl shadow-xl border border-white/60 animation-fade-in-up">
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
              Signed in as
            </p>
            <p className="text-sm font-bold text-slate-800 truncate">
              {me.displayName || me.username}
            </p>
          </div>
          <ul className="py-2">
            <li>
              <Link
                href={`/u/${me.username}`}
                className="flex items-center px-4 py-2.5 text-sm text-slate-600 hover:bg-indigo-50/50 hover:text-indigo-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-4 h-4 mr-3" />
                Profile
              </Link>
            </li>
            <li>
              <button
                onClick={() => signOut()}
                className="flex items-center px-4 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 w-full text-left transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = pathname?.startsWith("/admin");
  const isChat = pathname === "/chat";
  const isLanding = pathname === "/";
  const isArticlesPage = pathname === "/articles";
  const isArticleDetail = pathname?.startsWith("/articles/") && pathname !== "/articles";
  const isMap = pathname === "/map";

  // Bypass for Landing, Articles List, and Map to use LandingNavbar instead
  if (isAdmin || isChat || isLanding || isArticlesPage || isMap) {
    return <>{children}</>;
  }

  if (isArticleDetail) {
    return (
      <>
        <nav className="fixed top-0 z-50 w-full bg-[#2d2d2d] transition-all duration-300">
          <div className="w-full px-[5%] md:px-[8%] py-[15px]">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center group relative pb-1">
                <span className="text-[1.2rem] font-bold tracking-[1px] text-white">WikiNITT</span>
              </Link>
              <div className="hidden items-center gap-[30px] md:flex">
                <Link href="/" className="text-[0.8rem] uppercase text-[#aaa] hover:text-white transition-colors">Homepage</Link>
                <Link href="/articles" className="text-[0.8rem] uppercase text-[#aaa] hover:text-white transition-colors">Articles</Link>
                <Link href="/c" className="text-[0.8rem] uppercase text-[#aaa] hover:text-white transition-colors">Community</Link>
              </div>
              <div className="flex items-center gap-[15px]">
                <Link href="/map">
                  <MapPin className="h-4 w-4 text-white" />
                </Link>
                {mounted && (
                  <>
                    {status === "unauthenticated" ? (
                      <button onClick={() => signIn("dauth")} className="bg-white px-[16px] py-[6px] text-[0.75rem] font-semibold text-[#2d2d2d] rounded-sm">Login</button>
                    ) : <UserMenu />}
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>
        <main className="min-h-screen pt-[60px] bg-[#f3f3ff]">
          {children}
        </main>
      </>
    );
  }

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Articles", href: "/articles", icon: BookOpen },
    { name: "Community", href: "/c", icon: Users },
  ];

  return (
    <>
      <nav className="fixed top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm">
        <div className="px-3 py-3 lg:px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 rounded-lg hover:bg-white/50 transition-colors">
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Link href="/" className="flex ms-2 items-center group">
                <LogoIcon className="h-8 w-8 mr-2 fill-white bg-indigo-600 rounded-lg p-1.5" />
                <span className="text-xl font-bold text-slate-800">Wiki<span className="text-amber-600">NITT</span></span>
              </Link>
            </div>
            <div className="hidden md:block flex-1 max-w-xl mx-4">
              <div className="relative cursor-pointer" onClick={() => setIsSearchOpen(true)}>
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input className="w-full p-2.5 ps-10 text-sm border border-slate-200/60 rounded-xl bg-slate-50/50 cursor-pointer" placeholder="Search WikiNITT..." readOnly />
              </div>
            </div>
            <div className="flex items-center ms-3">
              {mounted && (
                <>
                  {status === "unauthenticated" ? (
                    <button onClick={() => signIn("dauth")} className="bg-indigo-600 px-5 py-2 text-sm font-bold text-white rounded-full">Login</button>
                  ) : <UserMenu />}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <aside className={cn("fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform bg-white/70 backdrop-blur-xl border-r border-white/50 shadow-sm", isSidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="h-full px-4 overflow-y-auto flex flex-col">
          <ul className="space-y-1.5 font-medium">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link href={item.href} className={cn("flex items-center p-2.5 rounded-xl transition-all", pathname === item.href ? "bg-indigo-50/80 text-indigo-700" : "text-slate-600 hover:bg-white/60")}>
                  <item.icon className="w-5 h-5" />
                  <span className="ms-3 text-sm font-semibold">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className={cn("p-4 transition-all pt-20 min-h-screen relative z-10", isSidebarOpen ? "md:ml-64" : "ml-0")}>
        {children}
      </main>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}