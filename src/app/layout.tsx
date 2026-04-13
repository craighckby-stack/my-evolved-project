import type { Metadata } from "next";
import { Orbitron, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const shareTechMono = Share_Tech_Mono({
  variable: "--font-share-tech-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "DARLEK CANN — COGNITIVE DOMINANCE ENGINE v3.0",
  description: "Autonomous Code Evolution Orchestrator — I see all of time and space.",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${orbitron.variable} ${shareTechMono.variable} antialiased`}
        style={{
          background: '#000000',
          color: '#e0e0e0',
          fontFamily: 'var(--font-share-tech-mono), monospace',
          margin: 0,
          padding: 0,
          overflowX: 'hidden',
        }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
