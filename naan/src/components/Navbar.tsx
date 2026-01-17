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
  Building2,
  GraduationCap,
  Tent,
  PartyPopper,
  Menu,
  X,
  Search,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
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

function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

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
        className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="sr-only">Open user menu</span>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-900 font-bold border border-blue-900 overflow-hidden">
          {me.avatar ? (
            <Image
              src={me.avatar}
              alt={me.username}
              className="w-full h-full object-cover"
              width={32}
              height={32}
            />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="z-50 absolute right-0 top-full mt-2 w-48 text-base list-none bg-white divide-y divide-gray-100 rounded shadow border border-gray-200">
          <div className="px-4 py-3" role="none">
            <p className="text-sm text-gray-900" role="none">
              Signed in as
            </p>
            <p
              className="text-sm font-medium text-gray-900 truncate"
              role="none"
            >
              {me.displayName || me.username}
            </p>
          </div>
          <ul className="py-1" role="none">
            <li>
              <Link
                href={`/u/${me.username}`}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Link>
            </li>
            <li>
              <button
                onClick={() => signOut()}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                role="menuitem"
              >
                <LogOut className="w-4 h-4 mr-2" />
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open: boolean) => !open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsMobile(true);
        setIsSidebarOpen(false);
      } else {
        setIsMobile(false);
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navItems = [
    { name: "Home", href: "/", icon: Home, section: "main" },
    { name: "Articles", href: "/articles", icon: BookOpen, section: "main" },
    { name: "Community", href: "/c", icon: Users, section: "main" },
    {
      name: "Departments",
      href: "/departments",
      icon: Building2,
      section: "explore",
    },
    {
      name: "Hostels",
      href: "/hostels",
      icon: Tent,
      section: "explore",
    },

    {
      name: "Student Life",
      href: "/student-life",
      icon: GraduationCap,
      section: "explore",
    },
  ];

  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start rtl:justify-end">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                type="button"
                className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <span className="sr-only">Open sidebar</span>
                {isSidebarOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              <Link href="/" className="flex ms-2 md:me-24 items-center group">
                <LogoIcon className="h-8 w-8 mr-2 fill-white bg-blue-900 rounded-md p-1.5 group-hover:bg-blue-800 transition-colors" />
                <span className="self-center text-xl font-bold whitespace-nowrap text-blue-900">
                  Wiki
                </span>
                <span className="self-center text-xl font-bold whitespace-nowrap text-amber-600">
                  NITT
                </span>
              </Link>
            </div>

            <div className="hidden md:block flex-1 max-w-xl mx-4">
              <div
                className="relative cursor-pointer"
                onClick={() => setIsSearchOpen(true)}
              >
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="search"
                  id="default-search"
                  className="block w-full p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all cursor-pointer"
                  placeholder="Search... (Ctrl+K)"
                  readOnly
                  required
                />
              </div>
            </div>

            <div className="flex items-center">
              {}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="md:hidden p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 me-2"
              >
                <span className="sr-only">Search</span>
                <Search className="w-6 h-6" />
              </button>

              <div className="flex items-center ms-3 relative" ref={profileRef}>
                {status === "loading" && (
                  <div className="w-8 h-8 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  </div>
                )}

                {status === "unauthenticated" && (
                  <button
                    onClick={() => signIn("dauth")}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Login
                  </button>
                )}

                {status === "authenticated" && <UserMenu />}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform bg-white border-r border-gray-200",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Sidebar"
      >
        <div className="h-full px-3 pb-4 overflow-y-auto bg-white flex flex-col">
          <ul className="space-y-2 font-medium">
            {navItems
              .filter((item) => item.section === "main")
              .map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center p-2 rounded-lg group transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-900 hover:bg-gray-100",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-6 h-6 transition-colors",
                          isActive
                            ? "text-blue-600"
                            : "text-gray-500 group-hover:text-gray-900",
                        )}
                      />
                      <span className="ms-3 flex-1">{item.name}</span>
                      {isActive && <ChevronRight className="w-4 h-4" />}
                    </Link>
                  </li>
                );
              })}
          </ul>

          <div className="my-4 border-t border-gray-200" />

          <div className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Explore
          </div>

          <ul className="space-y-2 font-medium">
            {navItems
              .filter((item) => item.section === "explore")
              .map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center p-2 rounded-lg group transition-colors",
                        isActive
                          ? "bg-amber-50 text-amber-600"
                          : "text-gray-900 hover:bg-gray-100",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-6 h-6 transition-colors",
                          isActive
                            ? "text-amber-600"
                            : "text-gray-500 group-hover:text-gray-900",
                        )}
                      />
                      <span className="ms-3">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      </aside>

      <main
        className={cn(
          "p-4 transition-all duration-300 pt-20 min-h-screen bg-gray-50",
          isSidebarOpen ? "md:ml-64" : "ml-0",
        )}
      >
        {children}
      </main>
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
