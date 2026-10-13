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
  title: "Raptor Portal",
  description:
    "Production-grade client management portal with unified communications, project tracking, file vault, approvals, and third-party integrations — Google Drive, Gmail, custom domain email, and more.",
  keywords: [
    "Raptor Portal",
    "client management",
    "unified inbox",
    "CRM",
    "Google Drive",
    "Gmail",
    "magic link",
    "approvals",
    "intake forms",
  ],
  authors: [{ name: "Raptor Portal" }],
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
  openGraph: {
    title: "Raptor Portal",
    description:
      "Every email, text, call, file and project update for a client in one chronological stream. Magic-link auth, Google Drive sync, and multi-account email.",
    siteName: "Raptor Portal",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Raptor Portal",
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
