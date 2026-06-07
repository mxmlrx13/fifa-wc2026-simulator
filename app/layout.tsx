import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { TournamentProvider } from "@/lib/store";
import Navbar from "@/components/layout/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://wc2026.netlify.app"),
  title: "FIFA World Cup 2026 Simulator",
  description: "Predict and simulate the FIFA World Cup 2026 tournament",
  openGraph: {
    title: "FIFA World Cup 2026 Simulator",
    description: "Predict and simulate the FIFA World Cup 2026 tournament",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <TournamentProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
        </TournamentProvider>
      </body>
    </html>
  );
}
