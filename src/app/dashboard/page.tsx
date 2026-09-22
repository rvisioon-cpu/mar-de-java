import { auth } from "@/auth";
import { getDashboardStats } from "@/app/actions/analytics";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard - Residencial Mar de Java",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = (session.user.role as string) || "SELLER";

  // Fetch initial database statistics
  const response = await getDashboardStats();
  
  const statsData = response?.data || {
    totalVisits: 0,
    visitsGrowth: "0%",
    totalProspects: 0,
    prospectsGrowth: "0%",
    reservedUnits: 0,
    reservedGrowth: "0%",
    activeSellers: 0,
    popularUnits: [],
    devices: { mobile: 0, desktop: 0, tablet: 0, total: 0 },
    topZoneOverall: "Ninguna",
    topZoneByDevice: { mobile: "Ninguna", tablet: "Ninguna", desktop: "Ninguna" },
    zonesBreakdown: [],
    chartLabels: [],
    viewsSeries: [],
    prospectsSeries: [],
    sellerStats: null,
    userRole: "SELLER",
    calculatedTimeRange: "Este mes",
  };

  return (
    <DashboardClient initialStats={statsData} userRole={userRole} />
  );
}

