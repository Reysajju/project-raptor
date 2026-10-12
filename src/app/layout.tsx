import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/portal/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Client Management 360 Portal",
  description:
    "Dark-mode command center for client communications, projects, files, approvals and intake — across Gmail, OpenPhone and RingCentral in one unified timeline.",
  keywords: [
    "client management",
    "unified inbox",
    "CRM",
    "Gmail",
    "OpenPhone",
    "RingCentral",
    "approvals",
    "intake forms",
  ],
  authors: [{ name: "Onboard With Us" }],
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
  openGraph: {
    title: "Client Management 360 Portal",
    description:
      "Every email, text, call, file and project update for a client in one chronological stream.",
    siteName: "Client Management 360",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Client Management 360 Portal",
    description:
      "Unified client communications, projects, files, approvals and intake.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
