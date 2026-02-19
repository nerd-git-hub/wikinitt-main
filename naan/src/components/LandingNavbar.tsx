"use client";
import { signIn, useSession } from "next-auth/react";
import { UserMenu } from "@/components/Navbar";
import { Menu, MapPin, X, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LandingSearch } from "@/components/LandingSearch";
import { SearchModal } from "@/components/SearchModal";

export default function LandingNavbar() {
    const { status } = useSession();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const closeMobile = () => setMobileOpen(false);

    return (
        <header className="w-full font-[Manrope,sans-serif] relative z-50">
            <div className="flex justify-between items-center px-5 sm:px-6 lg:px-8 py-5 max-w-[1400px] mx-auto">

                <div className="text-[1.4rem] font-bold tracking-tight text-[#222]">
                    <Link href="/">WikiNITT</Link>
                </div>

                <nav className="hidden lg:block">
                    <ul className="flex gap-10 list-none m-0 p-0">
                        <li>
                            <Link href="/" className="text-black text-[0.95rem] font-medium transition-colors hover:text-[#3b28cc]">
                                Homepage
                            </Link>
                        </li>
                        <li>
                            <Link href="/articles" className="text-[#888] text-[0.95rem] font-medium transition-colors hover:text-[#3b28cc]">
                                Articles
                            </Link>
                        </li>
                        <li>
                            <Link href="/c" className="text-[#888] text-[0.95rem] font-medium transition-colors hover:text-[#3b28cc]">
                                Community
                            </Link>
                        </li>
                    </ul>
                </nav>

                <div className="flex items-center gap-[20px] md:gap-[25px]">
                    {/* Search - Only on Articles */}
                    {pathname === "/articles" && (
                        <div className="hidden md:flex items-center gap-3">
                            <div className="w-[200px] lg:w-[240px]">
                                <LandingSearch />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSearchOpen(true)}
                                className="h-10 w-10 rounded-full border border-slate-200/70 bg-white/70 backdrop-blur hover:bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-[#3b28cc] transition-colors"
                                aria-label="Open search"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <Link href="/map">
                        <MapPin className="w-5 h-5 text-[#666] hidden md:block hover:text-[#3b28cc] transition-colors" />
                    </Link>

                    {status === "unauthenticated" && (
                        <button
                            onClick={() => signIn("dauth")}
                            className="bg-white/80 px-[20px] md:px-[30px] py-[8px] md:py-[10px] rounded-[30px] text-[#333] text-[0.9rem] font-bold shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-md transition-all"
                        >
                            Login
                        </button>
                    )}

                    {status === "authenticated" && <UserMenu />}

                    <button
                        className="lg:hidden text-[#666]"
                        onClick={() => setMobileOpen((prev) => !prev)}
                        aria-label="Toggle navigation menu"
                    >
                        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Drawer */}
            <div
                className={`lg:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl mt-3 transition-all duration-300 origin-top ${
                    mobileOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
                }`}
            >
                <div className="px-5 sm:px-6 lg:px-8 py-4 flex flex-col gap-4 max-w-[1400px] mx-auto">
                    {pathname === "/articles" && (
                        <div className="w-full flex flex-col gap-3">
                            <LandingSearch />
                            <button
                                type="button"
                                onClick={() => { setIsSearchOpen(true); closeMobile(); }}
                                className="flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 bg-white text-[#3b28cc] font-semibold"
                            >
                                <Search className="w-4 h-4" />
                                Open search dialog
                            </button>
                        </div>
                    )}
                    <Link href="/" onClick={closeMobile} className="flex items-center justify-between text-[0.95rem] font-semibold text-[#222] py-2">
                        Homepage
                        <span className="text-[#3b28cc] text-xs">Go</span>
                    </Link>
                    <Link href="/articles" onClick={closeMobile} className="flex items-center justify-between text-[0.95rem] font-semibold text-[#222] py-2">
                        Articles
                        <span className="text-[#3b28cc] text-xs">Go</span>
                    </Link>
                    <Link href="/c" onClick={closeMobile} className="flex items-center justify-between text-[0.95rem] font-semibold text-[#222] py-2">
                        Community
                        <span className="text-[#3b28cc] text-xs">Go</span>
                    </Link>
                    <Link href="/map" onClick={closeMobile} className="flex items-center justify-between text-[0.95rem] font-semibold text-[#222] py-2">
                        Map
                        <span className="text-[#3b28cc] text-xs">Go</span>
                    </Link>
                </div>
            </div>

            {/* Search dialog (articles only) */}
            {pathname === "/articles" && (
                <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
            )}
        </header>
    );
}
