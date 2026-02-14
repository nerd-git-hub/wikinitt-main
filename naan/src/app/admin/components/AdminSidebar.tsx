"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LogoIcon from "@/components/logo.svg";
import { Users, BookOpen, LogOut, ChevronRight, MapPin } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { status } = useSession();

  useEffect(() => {
    setIsMounted(true);

    if (pathname !== "/admin/login" && status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [pathname, router, status]);

  if (pathname === "/admin/login") {
    return null;
  }

  if (!isMounted) return null;

  const handleLogout = () => {
    signOut({ callbackUrl: "/admin/login" });
  };

  const navItems = [
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Articles", href: "/admin/articles", icon: BookOpen },
    { name: "Maps", href: "/admin/map", icon: MapPin },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col bg-white border-r border-gray-200 transition-all duration-300">
      <div className="flex items-center justify-center border-b border-gray-200 p-6">
        <Link href="/admin/users" className="flex items-center group">
          <LogoIcon className="h-8 w-8 mr-2 fill-white bg-blue-900 rounded-md p-1.5 group-hover:bg-blue-800 transition-colors" />
          <span className="self-center text-xl font-bold whitespace-nowrap text-blue-900">
            Wiki
          </span>
          <span className="self-center text-xl font-bold whitespace-nowrap text-amber-600">
            NITT
          </span>
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            Admin
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-900 hover:bg-gray-100"
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 transition-colors ${
                  isActive
                    ? "text-blue-600"
                    : "text-gray-500 group-hover:text-gray-900"
                }`}
              />
              <span className="flex-1">{item.name}</span>
              {isActive && <ChevronRight className="w-4 h-4" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
