import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SkillVault - Peer-to-Peer Time Banking | Trade Knowledge, Not Money",
  description: "A Build2Break hackathon project: Time banking system where 1 hour teaching = 1 Time Credit. Trade skills, not money. Built with financial-grade security and AI fraud detection.",
  keywords: ["time banking", "skill exchange", "peer learning", "build2break", "hackathon", "tutoring", "education", "credits"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        <AuthProvider>
          <Navbar />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
