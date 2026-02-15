"use client";
import { signIn, useSession } from "next-auth/react";
import { UserMenu } from "@/components/Navbar";
import {
    Menu,
    Loader2,
} from 'lucide-react'
import LogoIcon from "@/components/logo.svg";
import Link from "next/link";
import { useEffect, useState } from "react";
import { googleLogin } from "@/app/actions";

export default function LandingNavbar() {
    const { status } = useSession();
    const [scrolled, setScrolled] = useState(false);

    // Add shadow/border only when scrolled
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled
                ? "bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm"
                : "bg-transparent border-b border-transparent"
                }`}
        >
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">

                    {/* LEFT: Logo */}
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center group gap-2.5">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
                                <LogoIcon className="relative h-9 w-9 fill-white bg-gradient-to-br from-indigo-700 to-blue-700 rounded-xl p-1.5 shadow-lg group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-lg font-bold text-slate-900 tracking-tight">
                                    Wiki<span className="text-amber-600">NITT</span>
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* CENTER: Navigation Links (Desktop) */}
                    <nav className="hidden md:flex items-center gap-1 bg-white/40 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/40 shadow-sm">
                        {[
                            { name: "Home", href: "/" },
                            { name: "Articles", href: "/articles" },
                            { name: "Community", href: "/c" },
                            { name: "Map", href: "/map" },
                        ].map((link) => (
                            <Link
                                key={link.name}
                                className="px-5 py-1.5 text-sm font-medium text-slate-600 rounded-full hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all"
                                href={link.href}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>

                    {/* RIGHT: Auth & Mobile Menu */}
                    <div className="flex items-center gap-4">
                        {status === "loading" && (
                            <div className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100">
                                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                            </div>
                        )}

                        {status === "unauthenticated" && (
                            <form action={googleLogin}>
                                <button
                                    type="submit"
                                    className="rounded-full bg-slate-900 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-900/20 hover:bg-indigo-600 hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all"
                                >
                                    Login
                                </button>
                            </form>
                        )}

                        {status === "authenticated" && <UserMenu />}

                        {/* Mobile Menu Button */}
                        <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}