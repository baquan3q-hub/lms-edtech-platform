import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import QueryProvider from "@/lib/providers/QueryProvider";
import GlobalNavigationProgress from "@/components/shared/GlobalNavigationProgress";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduSchool LMS",
  description: "Hệ thống quản lý học tập dành cho trường phổ thông",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EduSchool",
    startupImage: [
        "/icons/icon-512x512.png"
    ]
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-white text-black`}
        suppressHydrationWarning
      >
        <GlobalNavigationProgress />
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
