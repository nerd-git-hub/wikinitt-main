"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Linkedin } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isArticlesPage = pathname === "/articles";
  const isArticleDetail = pathname?.startsWith("/articles/") && pathname !== "/articles";

  // Use simple footer for Landing, Articles list, and Article Detail
  if (isLanding || isArticlesPage || isArticleDetail) {
    return (
      <div id="footer">
        <hr className="border-t border-[#c8c6d8] opacity-50" />
        <footer className="w-full px-[5%] md:px-[8%] h-[110px] box-border flex flex-col md:flex-row justify-between items-center text-[0.75rem] text-[#777] gap-[20px] font-[Inter,sans-serif]" style={{ background: "rgba(237, 236, 255, 1)" }}>
          <div className="flex flex-col md:flex-row items-center gap-[10px] md:gap-[20px]">
            <div>© 2026 NITT. All rights reserved.</div>
            <div className="flex gap-[15px] text-[1rem] items-center">
              <Link href="https://www.nitt.edu" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <Image
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=WikiNITT"
                  alt="WikiNITT"
                  width={20}
                  height={20}
                  className="rounded-full"
                  unoptimized
                />
              </Link>
              <Link href="https://www.linkedin.com/school/naboratorynit/" target="_blank" rel="noopener noreferrer" className="hover:text-[#2d2d2d] transition-colors"><Linkedin className="w-4 h-4" /></Link>
              <Link href="mailto:contact@nitt.edu" className="hover:text-[#2d2d2d] transition-colors"><Mail className="w-4 h-4" /></Link>
            </div>
          </div>
          <Link href="mailto:contact@nitt.edu" className="font-medium transition-colors hover:text-[#333]">Contact Us ↗</Link>
        </footer>
      </div>
    );
  }

  return (
    <footer className="w-full mt-auto bg-slate-50 border-t border-border-light pt-16 pb-8">
      {/* ... standard directory footer code ... */}
    </footer>
  );
}