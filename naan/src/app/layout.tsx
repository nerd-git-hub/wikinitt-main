import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";

import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "WikiNITT - The Community Platform for NITT",
  description:
    "WikiNITT is a community platform for students of NIT Trichy to connect, share, and discuss.",
};

import { SetupModal } from "@/components/SetupModal";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-merriweather",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${merriweather.variable} antialiased`}>
        <Providers>
          <SetupModal />
          <Navbar>
            {children}
            <Footer />
          </Navbar>
        </Providers>
      </body>
    </html>
  );
}