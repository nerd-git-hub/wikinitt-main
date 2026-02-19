"use client";

import LandingNavbar from "@/components/LandingNavbar";
import MapWrapper from "@/components/MapWrapper";

export default function MapPage() {
  return (
    <div
      className="relative min-h-screen font-[Manrope,sans-serif] text-[#1a1a1a] flex flex-col"
      style={{ background: "rgba(237, 236, 255, 1)" }}
    >
      <LandingNavbar />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-5 pt-4 pb-10">
        <div className="text-center mb-6">
          <p className="text-[0.65rem] font-extrabold tracking-[2px] uppercase text-[#3b28cc]">
            Campus Navigation
          </p>
          <h1 className="text-4xl md:text-5xl font-[Playfair_Display] font-semibold text-[#111] tracking-tight mt-2">
            Explore the <span className="italic text-[#3b28cc]">Map</span>
          </h1>
          <p className="max-w-2xl mx-auto text-base text-[#777] font-light leading-relaxed mt-3">
            Navigate the NIT Trichy campus interactively. Find departments, hostels, eateries, and more.
          </p>
        </div>

        <div className="w-full rounded-3xl overflow-hidden shadow-xl border border-white/60" style={{ height: "calc(100vh - 320px)", minHeight: "400px" }}>
          <MapWrapper />
        </div>
      </main>
    </div>
  );
}
