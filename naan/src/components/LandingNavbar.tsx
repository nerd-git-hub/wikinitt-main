"use client";
import { signIn, useSession } from "next-auth/react";
import { UserMenu } from "@/components/Navbar";
import { Menu, MapPin } from "lucide-react";
import Link from "next/link";

export default function LandingNavbar() {
    const { status } = useSession();

    return (
        <header className="flex justify-between items-center px-5 py-5 max-w-[1400px] mx-auto font-[Manrope,sans-serif]">

            <div className="text-[1.4rem] font-bold tracking-tight text-[#222]">
                WikiNITT
            </div>

            <nav className="hidden md:block">
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

            <div className="flex items-center gap-[25px]">
                <Link href="/map">
                    <MapPin className="w-5 h-5 text-[#666] hidden md:block" />
                </Link>

                {status === "unauthenticated" && (
                    <button
                        onClick={() => signIn("dauth")}
                        className="bg-white/80 px-[30px] py-[10px] rounded-[30px] text-[#333] text-[0.9rem] font-bold shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
                    >
                        Login
                    </button>
                )}

                {status === "authenticated" && <UserMenu />}

                <button className="md:hidden text-[#666]">
                    <Menu className="w-6 h-6" />
                </button>
            </div>
        </header>
    );
}
