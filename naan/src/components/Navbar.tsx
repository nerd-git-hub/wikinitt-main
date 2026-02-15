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
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { signIn, useSession, signOut } from "next-auth/react";
import { GET_ME } from "@/queries/user";
import { useQuery } from "@tanstack/react-query";
import { request } from "graphql-request";
import { googleLogin } from "@/app/actions";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  console.log(session?.backendToken)
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      if (!session?.backendToken) return null;
      const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_API_URL!;
      const data = await request<any>(
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
          {me.avatar ? (
            <Image
              src={me.avatar}
              alt={me.username}
              className="w-full h-full object-cover"
              width={36}
              height={36}
            />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="z-50 absolute right-0 top-full mt-2 w-56 text-base list-none bg-white/80 backdrop-blur-xl divide-y divide-gray-100/50 rounded-xl shadow-xl border border-white/60 animation-fade-in-up">
          <div className="px-4 py-3" role="none">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1" role="none">
              Signed in as
            </p>
            <p
              className="text-sm font-bold text-slate-800 truncate"
              role="none"
            >
              {me.displayName || me.username}
            </p>
          </div>
          <ul className="py-2" role="none">
            <li>
              <Link
                href={`/u/${me.username}`}
                className="flex items-center px-4 py-2.5 text-sm text-slate-600 hover:bg-indigo-50/50 hover:text-indigo-600 transition-colors"
                role="menuitem"
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
                role="menuitem"
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
  const profileRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { status } = useSession();

  // === EXCLUSION LOGIC ===
  const isAdmin = pathname?.startsWith("/admin");
  const isChat = pathname === "/chat";

  // If Admin, Chat, or Home page, render children ONLY (no navbar/sidebar)
  if (isAdmin || isChat || pathname === "/") {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Home", href: "/", icon: Home, section: "main" },
    { name: "Articles", href: "/articles", icon: BookOpen, section: "main" },
    { name: "Community", href: "/c", icon: Users, section: "main" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] rounded-full bg-blue-100/30 blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-100/30 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      <nav className="fixed top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm transition-all duration-300">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start rtl:justify-end">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                type="button"
                className="inline-flex items-center p-2 text-sm text-slate-500 rounded-lg hover:bg-white/50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
              >
                <span className="sr-only">Open sidebar</span>
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Link href="/" className="flex ms-2 md:me-24 items-center group">
                <LogoIcon className="h-8 w-8 mr-2 fill-white bg-linear-to-br from-indigo-600 to-blue-600 rounded-lg p-1.5 shadow-md group-hover:scale-105 transition-transform" />
                <span className="self-center text-xl font-bold whitespace-nowrap text-slate-800 tracking-tight">
                  Wiki<span className="text-amber-600">NITT</span>
                </span>
              </Link>
            </div>

            <div className="hidden md:block flex-1 max-w-xl mx-4">
              <div className="relative cursor-pointer group" onClick={() => setIsSearchOpen(true)}>
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="search"
                  className="block w-full p-2.5 ps-10 text-sm text-slate-900 border border-slate-200/60 rounded-xl bg-slate-50/50 hover:bg-white/80 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all cursor-pointer shadow-sm"
                  placeholder="Search WikiNITT... (Ctrl+K)"
                  readOnly
                />
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex items-center ms-3 relative" ref={profileRef}>
                {status === "unauthenticated" && (
                  <form action={googleLogin}>
                    <button
                      type="submit"
                      className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all"
                    >
                      Login with Google
                    </button>
                  </form>
                )}
                {status === "authenticated" && <UserMenu />}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform bg-white/70 backdrop-blur-xl border-r border-white/50 shadow-sm",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-full px-4 pb-4 overflow-y-auto custom-scrollbar flex flex-col">
          <ul className="space-y-1.5 font-medium">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center p-2.5 rounded-xl group transition-all duration-200",
                    pathname === item.href
                      ? "bg-indigo-50/80 text-indigo-700 shadow-sm border border-indigo-100/50"
                      : "text-slate-600 hover:bg-white/60 hover:text-indigo-600 hover:shadow-sm",
                  )}
                >
                  <item.icon className={cn("w-5 h-5 transition-colors", pathname === item.href ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500")} />
                  <span className="ms-3 flex-1 text-sm font-semibold">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className={cn("p-4 transition-all duration-300 pt-20 min-h-screen relative z-10", isSidebarOpen ? "md:ml-64" : "ml-0")}>
        {children}
      </main>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}