import type { Metadata } from "next";
export const dynamic = "force-dynamic";
import { Montserrat, Inter } from "next/font/google"; // Using fonts closer to original (Montserrat/Inter)
import "./globals.css";
import config from "@/config/config";
import StoreInitializer from "@/components/layout/StoreInitializer";
import FloorEntryTransition from "@/components/layout/FloorEntryTransition";
import UseLandscape from "@/components/layout/UseLandscape";
import ForcedLandscapeWrapper from "@/components/layout/ForcedLandscapeWrapper";
import BrochureModal from "@/components/modals/BrochureModal";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { getFloorsData } from "@/app/actions/units";
import { getBuildingFacesData } from "@/app/actions/building";
import { type Floor } from "@/data/floors";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let floorsData: Floor[] = [];
  let buildingFacesData: any[] = [];
  try {
    floorsData = (await getFloorsData()) as Floor[];
  } catch (e) {
    console.error("Failed to load initial floorsData during SSR:", e);
  }
  try {
    buildingFacesData = await getBuildingFacesData();
  } catch (e) {
    console.error("Failed to load initial buildingFacesData during SSR:", e);
  }

  return (
    <html lang="es" data-theme="light">
      <head>
        <link href='https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css' rel='stylesheet' />
      </head>
      <body
        className={`${montserrat.variable} ${inter.variable} antialiased h-screen w-screen overflow-hidden bg-base-100 text-base-content`}
      >
        <StoreInitializer initialFloorsData={floorsData} initialBuildingFacesData={buildingFacesData} />
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
