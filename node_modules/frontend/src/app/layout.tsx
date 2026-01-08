import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { Navbar } from "@/components/layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SkillVault - Trade Knowledge, Not Money",
  description: "A peer-to-peer time banking platform where students trade skills. Teach what you know, learn what you need.",
  keywords: ["tutoring", "skill exchange", "time banking", "peer learning", "education"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-950 text-white antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <SocketProvider>
            <Navbar />
            <main className="pt-16 min-h-screen">
              {children}
            </main>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
