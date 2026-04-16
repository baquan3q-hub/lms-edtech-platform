import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import QueryProvider from "@/lib/providers/QueryProvider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E-Learning Platform",
  description: "Nền tảng học trực tuyến thông minh",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ELearn",
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
  maximumScale: 1,
  userScalable: false,
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
        <QueryProvider>
          {/* Strip browser extension attributes before React hydrates */}
          <script
            dangerouslySetInnerHTML={{
              __html: `document.querySelectorAll('[bis_skin_checked]').forEach(function(el){el.removeAttribute('bis_skin_checked')});`,
            }}
          />
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

