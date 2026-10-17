import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google"; // Using fonts closer to original (Montserrat/Inter)
import "./globals.css";
import config from "@/config/config";
import FloorEntryTransition from "@/components/layout/FloorEntryTransition";
import UseLandscape from "@/components/layout/UseLandscape";
import ForcedLandscapeWrapper from "@/components/layout/ForcedLandscapeWrapper";
import BrochureModal from "@/components/modals/BrochureModal";
import AnalyticsTracker from "@/components/AnalyticsTracker";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-primary",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-secondary",
});

export const metadata: Metadata = {
  title: config.appName,
  description: config.appDescription,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="light">
      <body
        className={`${montserrat.variable} ${inter.variable} antialiased h-screen w-screen overflow-hidden bg-base-100 text-base-content`}
      >
        <UseLandscape />
        <ForcedLandscapeWrapper>
          <FloorEntryTransition />
          <AnalyticsTracker />
          <BrochureModal />
          {children}
        </ForcedLandscapeWrapper>
      </body>
    </html>
  );
}
