"use server";

import { getDb } from "@/lib/db";
import { pageViews, analyticsSessions, prospects, units, users, logs, floors, appointments } from "@/lib/db/schema";
import { eq, and, isNull, isNotNull, gte, lte, count, desc, like, sql } from "drizzle-orm";
import { isAnalyticsId, isPublicAnalyticsPath, measuredDuration, VISIT_TIMEOUT_SECONDS } from "@/lib/analytics/policy";
import { auth } from "@/auth";

// Utility to calculate monthly growth percentage
function calculateGrowth(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "+100%" : "0%";
  }
  const percentage = Math.round(((current - previous) / previous) * 100);
  return percentage >= 0 ? `+${percentage}%` : `${percentage}%`;
}

// A visit is a browser session; page opens remain separate events for unit analytics.
export async function trackPageView(
  path: string,
  deviceType: string,
  candidateSessionId?: string,
  candidatePageViewId?: string,
) {
  if (!isPublicAnalyticsPath(path)) return { success: false, error: "Invalid public path" };
  try {
    const db = await getDb();
    const pageViewId = isAnalyticsId(candidatePageViewId) ? candidatePageViewId : crypto.randomUUID();
    // Retried events reuse their original session, even after its cookie expires.
    const [existingView] = await db.select({ id: pageViews.id, sessionId: pageViews.sessionId })
      .from(pageViews).where(eq(pageViews.id, pageViewId)).limit(1);
    if (existingView) return { success: true, pageViewId: existingView.id, sessionId: existingView.sessionId };

    const now = new Date();
    const [existingSession] = isAnalyticsId(candidateSessionId)
      ? await db.select().from(analyticsSessions).where(eq(analyticsSessions.id, candidateSessionId)).limit(1)
      : [];
    const sessionId = existingSession && now.getTime() - existingSession.lastSeenAt.getTime() < VISIT_TIMEOUT_SECONDS * 1000
      ? existingSession.id : pageViewId;
    const device = ["desktop", "mobile", "tablet"].includes(deviceType) ? deviceType : "desktop";

    let unitId: string | null = null;
    if (path.startsWith("/unidad/")) {
      const [unit] = await db.select({ id: units.id }).from(units)
        .where(and(eq(units.id, path.split("/")[2]), isNull(units.deletedAt))).limit(1);
      // Nonexistent units are error pages, not department visits.
      if (!unit) return { success: false, error: "Unknown unit" };
      unitId = unit.id;
    }

    await db.batch([
      db.insert(analyticsSessions).values({ id: sessionId, deviceType: device, createdAt: now, lastSeenAt: now })
        .onConflictDoUpdate({ target: analyticsSessions.id, set: { lastSeenAt: now } }),
      db.insert(pageViews).values({ id: pageViewId, sessionId, path, unitId, deviceType: device, duration: 0 })
        .onConflictDoNothing({ target: pageViews.id }),
    ]);
    return { success: true, pageViewId, sessionId };
  } catch (error) {
    console.error("Error tracking page view:", error);
    return { success: false, error: "Unable to register visit" };
  }
}

// Action to update page view duration (dwell time)
export async function updatePageViewDuration(id: string, duration: number) {
  try {
    const db = await getDb();
    await db
      .update(pageViews)
      .set({ duration: sql`max(coalesce(${pageViews.duration}, 0), ${Math.max(0, Math.round(duration))})` })
      .where(eq(pageViews.id, id));
    return { success: true };
  } catch (error) {
    console.error("Error updating page view duration:", error);
    return { success: false, error: String(error) };
  }
}

// Helper to format duration in seconds to "Xm Ys" or "Xs"
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// Action to get all dynamic stats for the dashboard
export async function getDashboardStats(filters?: {
  timeRange?: 'day' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  selectedSellerId?: string;
}) {
  try {
    const db = await getDb();
    const session = await auth();
    const role = session?.user?.role || "SELLER";
    const currentUserId = session?.user?.id || "";

    const timeRange = filters?.timeRange || 'month';
    const startDateStr = filters?.startDate;
    const endDateStr = filters?.endDate;

    const now = new Date();
    let start: Date;
    let end: Date;

    if (timeRange === "day") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (timeRange === "week") {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      end = new Date();
    } else if (timeRange === "custom" && startDateStr && endDateStr) {
      start = new Date(startDateStr + "T00:00:00");
      end = new Date(endDateStr + "T23:59:59.999");
    } else {
      // Default: current month
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Previous range for growth calculation
    const durationMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - durationMs);
    const prevEnd = new Date(end.getTime() - durationMs);

    // 1. Visits count sessions by their start time, never page opens.
    const [visitsResult] = await db
      .select({ count: count() })
      .from(analyticsSessions)
      .where(and(gte(analyticsSessions.createdAt, start), lte(analyticsSessions.createdAt, end)));
    const totalVisits = visitsResult?.count || 0;

    const [prevVisitsResult] = await db
      .select({ count: count() })
      .from(analyticsSessions)
      .where(and(gte(analyticsSessions.createdAt, prevStart), lte(analyticsSessions.createdAt, prevEnd)));
    const prevVisits = prevVisitsResult?.count || 0;
    const visitsGrowth = calculateGrowth(totalVisits, prevVisits);

    // 2. Prospectos (Formularios)
    // If role is SELLER, only count prospects who have an appointment with this seller
    let totalProspects = 0;
    let prevProspects = 0;

    if (role === "SELLER") {
      const [prospResult] = await db
        .select({ count: sql<number>`count(distinct ${prospects.id})` })
        .from(prospects)
        .innerJoin(appointments, eq(appointments.prospectId, prospects.id))
        .where(
          and(
            isNull(prospects.deletedAt),
            eq(appointments.sellerId, currentUserId),
            isNull(appointments.deletedAt),
            gte(prospects.createdAt, start),
            lte(prospects.createdAt, end)
          )
        );
      totalProspects = Number(prospResult?.count || 0);

      const [prevProspResult] = await db
        .select({ count: sql<number>`count(distinct ${prospects.id})` })
        .from(prospects)
        .innerJoin(appointments, eq(appointments.prospectId, prospects.id))
        .where(
          and(
            isNull(prospects.deletedAt),
            eq(appointments.sellerId, currentUserId),
            isNull(appointments.deletedAt),
            gte(prospects.createdAt, prevStart),
            lte(prospects.createdAt, prevEnd)
          )
        );
      prevProspects = Number(prevProspResult?.count || 0);
    } else {
      const [prospResult] = await db
        .select({ count: count() })
        .from(prospects)
        .where(
          and(
            isNull(prospects.deletedAt),
            gte(prospects.createdAt, start),
            lte(prospects.createdAt, end)
          )
        );
      totalProspects = prospResult?.count || 0;

      const [prevProspResult] = await db
        .select({ count: count() })
        .from(prospects)
        .where(
          and(
            isNull(prospects.deletedAt),
            gte(prospects.createdAt, prevStart),
            lte(prospects.createdAt, prevEnd)
          )
        );
      prevProspects = prevProspResult?.count || 0;
    }
    const prospectsGrowth = calculateGrowth(totalProspects, prevProspects);

    // 3. Unidades Reservadas
    const [reservedUnitsResult] = await db
      .select({ count: count() })
      .from(logs)
      .where(
        and(
          eq(logs.entityType, "unit"),
          eq(logs.action, "UPDATE"),
          like(logs.details, "%-> RESERVED%"),
          gte(logs.createdAt, start),
          lte(logs.createdAt, end)
        )
      );
    const reservedUnits = reservedUnitsResult?.count || 0;

    const [prevReservedResult] = await db
      .select({ count: count() })
      .from(logs)
      .where(
        and(
          eq(logs.entityType, "unit"),
          eq(logs.action, "UPDATE"),
          like(logs.details, "%-> RESERVED%"),
          gte(logs.createdAt, prevStart),
          lte(logs.createdAt, prevEnd)
        )
      );
    const prevReserved = prevReservedResult?.count || 0;
    const reservedGrowth = calculateGrowth(reservedUnits, prevReserved);

    // 4. Vendedores Activos
    let activeSellers = 0;
    if (role !== "SELLER") {
      const [activeSellersResult] = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.role, "SELLER"), isNull(users.deletedAt)));
      activeSellers = activeSellersResult?.count || 0;
    }

    // Define time buckets for graphing
    const buckets: { label: string; start: Date; end: Date }[] = [];
    if (timeRange === "day") {
      for (let h = 0; h < 24; h += 2) {
        buckets.push({
          label: `${h}:00`,
          start: new Date(start.getTime() + h * 3600000),
          end: new Date(start.getTime() + (h + 2) * 3600000),
        });
      }
    } else {
      const daysCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 3600000)));
      const step = daysCount > 15 ? Math.ceil(daysCount / 10) : 1;

      for (let i = 0; i < daysCount; i += step) {
        const d = new Date(start.getTime() + i * 24 * 3600000);
        const label = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
        buckets.push({
          label,
          start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
          end: new Date(d.getFullYear(), d.getMonth(), d.getDate() + step, 0, 0, 0, 0),
        });
      }
    }

    // 5. Unidades y Tiempos de Permanencia
    // Query ALL page views for units in the range
    const rawPopularUnits = await db
      .select({
        id: pageViews.id,
        unitId: pageViews.unitId,
        duration: pageViews.duration,
        unitIdentifier: units.identifier,
        unitType: units.type,
        floorName: floors.name,
        createdAt: pageViews.createdAt,
      })
      .from(pageViews)
      .innerJoin(units, eq(pageViews.unitId, units.id))
      .innerJoin(floors, eq(units.floorId, floors.id))
      .where(and(isNotNull(pageViews.unitId), gte(pageViews.createdAt, start), lte(pageViews.createdAt, end)));

    const unitStatsMap = new Map<string, {
      unitId: string;
      identifier: string;
      type: string;
      floor: string;
      views: number;
      totalDuration: number;
    }>();

    for (const pv of rawPopularUnits) {
      const uId = pv.unitId!;
      const existing = unitStatsMap.get(uId) || {
        unitId: uId,
        identifier: pv.unitIdentifier,
        type: pv.unitType || "APARTMENT",
        floor: pv.floorName,
        views: 0,
        totalDuration: 0,
      };
      existing.views++;
      existing.totalDuration += measuredDuration(pv.duration);
      unitStatsMap.set(uId, existing);
    }

    const popularUnits = Array.from(unitStatsMap.values())
      .map(item => {
        let typeLabel = "Dep";
        if (item.type === "STORAGE") typeLabel = "Bodega";
        else if (item.identifier === "Terraza") typeLabel = "Terraza";

        const avgDuration = item.views > 0 ? Math.round(item.totalDuration / item.views) : 0;

        // Calculate time-series history for this specific unit
        const unitViews = rawPopularUnits.filter(pv => pv.unitId === item.unitId);
        
        const unitViewsSeries = buckets.map(b => {
          return unitViews.filter(pv => pv.createdAt && pv.createdAt >= b.start && pv.createdAt < b.end).length;
        });

        const unitDurationSeries = buckets.map(b => {
          const bucketViews = unitViews.filter(pv => pv.createdAt && pv.createdAt >= b.start && pv.createdAt < b.end);
          if (bucketViews.length === 0) return 0;
          const sum = bucketViews.reduce((acc, pv) => acc + measuredDuration(pv.duration), 0);
          return Math.round(sum / bucketViews.length);
        });

        return {
          id: item.unitId,
          unit: `${typeLabel} ${item.identifier} - Piso ${item.floor}`,
          views: item.views,
          avgDuration,
          avgDurationFormatted: formatDuration(avgDuration),
          history: {
            views: unitViewsSeries,
            duration: unitDurationSeries,
          }
        };
      })
      .sort((a, b) => b.views - a.views);

    // 6. Dispositivos (Valores absolutos)
    const rawDevices = await db
      .select({
        deviceType: analyticsSessions.deviceType,
        count: count(analyticsSessions.id),
      })
      .from(analyticsSessions)
      .where(and(gte(analyticsSessions.createdAt, start), lte(analyticsSessions.createdAt, end)))
      .groupBy(analyticsSessions.deviceType);

    const mobileViews = rawDevices.find(d => d.deviceType === "mobile")?.count || 0;
    const desktopViews = rawDevices.find(d => d.deviceType === "desktop")?.count || 0;
    const tabletViews = rawDevices.find(d => d.deviceType === "tablet")?.count || 0;

    const devices = {
      mobile: mobileViews,
      desktop: desktopViews,
      tablet: tabletViews,
      total: mobileViews + desktopViews + tabletViews,
    };

    // 7. Zonas más visitadas del sitio web
    const rawAllViews = await db
      .select({
        id: pageViews.id,
        path: pageViews.path,
        deviceType: pageViews.deviceType,
        createdAt: pageViews.createdAt,
      })
      .from(pageViews)
      .where(and(gte(pageViews.createdAt, start), lte(pageViews.createdAt, end)));

    const mapPathToZone = (path: string): string => {
      if (path === "/" || path === "/index") return "Inicio / Portada";
      if (path.startsWith("/showroom")) return "Showroom";
      if (path.startsWith("/plantas")) return "Planos";
      if (path.startsWith("/maqueta")) return "Maqueta 3D";
      if (path.startsWith("/recorridos")) return "Recorridos 3D";
      if (path.startsWith("/avance-de-obra")) return "Avance de Obra";
      if (path.startsWith("/galeria")) return "Galería";
      if (path.startsWith("/ubicacion")) return "Ubicación";
      if (path.startsWith("/video")) return "Video y Amenidades";
      if (path.startsWith("/unidad")) return "Detalle de Unidad";
      if (path.startsWith("/contact")) return "Contacto / Citas";
      return "Otros";
    };

    const zoneCountsOverall: Record<string, number> = {};
    const zoneCountsByDevice: Record<string, Record<string, number>> = {
      mobile: {},
      tablet: {},
      desktop: {},
    };

    for (const pv of rawAllViews) {
      const zone = mapPathToZone(pv.path);
      const dev = pv.deviceType || "desktop";
      zoneCountsOverall[zone] = (zoneCountsOverall[zone] || 0) + 1;
      if (zoneCountsByDevice[dev]) {
        zoneCountsByDevice[dev][zone] = (zoneCountsByDevice[dev][zone] || 0) + 1;
      }
    }

    let topZoneOverall = "Ninguna";
    let topZoneOverallCount = 0;
    for (const [zone, cnt] of Object.entries(zoneCountsOverall)) {
      if (cnt > topZoneOverallCount) {
        topZoneOverallCount = cnt;
        topZoneOverall = zone;
      }
    }

    const topZoneByDevice: Record<string, string> = {};
    for (const dev of ["mobile", "tablet", "desktop"]) {
      let topDevZone = "Ninguna";
      let topDevZoneCount = 0;
      for (const [zone, cnt] of Object.entries(zoneCountsByDevice[dev] || {})) {
        if (cnt > topDevZoneCount) {
          topDevZoneCount = cnt;
          topDevZone = zone;
        }
      }
      topZoneByDevice[dev] = topDevZone;
    }

    // Format zones breakdown
    const zonesBreakdown = Object.entries(zoneCountsOverall)
      .map(([name, countVal]) => ({ name, count: countVal }))
      .sort((a, b) => b.count - a.count);

    // 8. Gráficos y Series Temporales
    const chartLabels = buckets.map(b => b.label);
    const sessionsInRange = await db.select({ createdAt: analyticsSessions.createdAt })
      .from(analyticsSessions)
      .where(and(gte(analyticsSessions.createdAt, start), lte(analyticsSessions.createdAt, end)));
    const viewsSeries = buckets.map(b => sessionsInRange.filter(session => session.createdAt >= b.start && session.createdAt < b.end).length);

    let allProspectsInRange: { createdAt: Date | null }[] = [];
    if (role === "SELLER") {
      allProspectsInRange = await db
        .select({ createdAt: prospects.createdAt })
        .from(prospects)
        .innerJoin(appointments, eq(appointments.prospectId, prospects.id))
        .where(
          and(
            isNull(prospects.deletedAt),
            eq(appointments.sellerId, currentUserId),
            isNull(appointments.deletedAt),
            gte(prospects.createdAt, start),
            lte(prospects.createdAt, end)
          )
        );
    } else {
      allProspectsInRange = await db
        .select({ createdAt: prospects.createdAt })
        .from(prospects)
        .where(and(isNull(prospects.deletedAt), gte(prospects.createdAt, start), lte(prospects.createdAt, end)));
    }
    const prospectsSeries = buckets.map(b => allProspectsInRange.filter(p => p.createdAt && p.createdAt >= b.start && p.createdAt < b.end).length);    // 9. Vendedores stats (Solo si no es SELLER)
    let sellerStats: any = null;
    if (role !== "SELLER") {
      const sellersList = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(and(eq(users.role, "SELLER"), isNull(users.deletedAt)))
        .orderBy(users.name);

      let apptFilter = and(
        gte(appointments.date, start),
        lte(appointments.date, end),
        isNull(appointments.deletedAt)
      );

      if (filters?.selectedSellerId && filters.selectedSellerId !== "all") {
        apptFilter = and(apptFilter, eq(appointments.sellerId, filters.selectedSellerId));
      }

      const allFilteredAppts = await db
        .select({
          id: appointments.id,
          status: appointments.status,
          sellerId: appointments.sellerId,
          prospectId: appointments.prospectId,
        })
        .from(appointments)
        .where(apptFilter);

      const totalApptsCount = allFilteredAppts.length;
      const cancelledApptsCount = allFilteredAppts.filter(a => a.status === "CANCELLED").length;
      const completedApptsCount = allFilteredAppts.filter(a => a.status === "COMPLETED").length;
      const scheduledApptsCount = allFilteredAppts.filter(a => a.status === "SCHEDULED").length;

      const allApptsInRange = await db
        .select({
          sellerId: appointments.sellerId,
          prospectId: appointments.prospectId,
        })
        .from(appointments)
        .where(and(gte(appointments.date, start), lte(appointments.date, end), isNull(appointments.deletedAt)));

      const apptsCountBySeller: Record<string, number> = {};
      const uniqueProspectsBySeller: Record<string, Set<string>> = {};

      for (const a of allApptsInRange) {
        apptsCountBySeller[a.sellerId] = (apptsCountBySeller[a.sellerId] || 0) + 1;
        if (a.prospectId) {
          if (!uniqueProspectsBySeller[a.sellerId]) {
            uniqueProspectsBySeller[a.sellerId] = new Set();
          }
          uniqueProspectsBySeller[a.sellerId].add(a.prospectId);
        }
      }

      const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
      const userNamesMap = new Map<string, string>();
      allUsers.forEach(u => userNamesMap.set(u.id, u.name));

      let topApptsSellerName = "Ninguno";
      let topApptsCount = 0;
      for (const [sId, countVal] of Object.entries(apptsCountBySeller)) {
        if (countVal > topApptsCount) {
          topApptsCount = countVal;
          topApptsSellerName = userNamesMap.get(sId) || "Desconocido";
        }
      }

      let topProspectsSellerName = "Ninguno";
      let topProspectsCount = 0;
      for (const [sId, prospectSet] of Object.entries(uniqueProspectsBySeller)) {
        if (prospectSet.size > topProspectsCount) {
          topProspectsCount = prospectSet.size;
          topProspectsSellerName = userNamesMap.get(sId) || "Desconocido";
        }
      }

      sellerStats = {
        sellersList,
        appointments: {
          total: totalApptsCount,
          completed: completedApptsCount,
          cancelled: cancelledApptsCount,
          scheduled: scheduledApptsCount,
        },
        topSeller: {
          name: topApptsSellerName,
          count: topApptsCount,
        },
        topProspectsSeller: {
          name: topProspectsSellerName,
          count: topProspectsCount,
        }
      };
    }

    return {
      success: true,
      data: {
        totalVisits,
        visitsGrowth,
        totalProspects,
        prospectsGrowth,
        reservedUnits,
        reservedGrowth,
        activeSellers,
        popularUnits,
        devices,
        topZoneOverall,
        topZoneByDevice,
        zonesBreakdown,
        chartLabels,
        viewsSeries,
        prospectsSeries,
        sellerStats,
        userRole: role,
        calculatedTimeRange: timeRange === "day"
          ? "Hoy"
          : timeRange === "week"
          ? "Últimos 7 días"
          : timeRange === "custom"
          ? `${start.toLocaleDateString("es-ES")} - ${end.toLocaleDateString("es-ES")}`
          : "Este mes",
      }
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return {
      success: false,
      error: String(error),
      data: {
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
      }
    };
  }
}
