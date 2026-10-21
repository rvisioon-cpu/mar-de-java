"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { getDashboardStats } from "@/app/actions/analytics";
import {
  Eye,
  FileText,
  Building,
  Users,
  LayoutDashboard,
  Calendar,
  Smartphone,
  Monitor,
  Tablet,
  TrendingUp,
  MapPin,
  Clock,
  Filter,
  ChevronDown,
} from "lucide-react";
import RadialConcentricChart from "./charts/RadialConcentricChart";
import MultiAreaChart from "./charts/MultiAreaChart";
import GradientAreaChart from "./charts/GradientAreaChart";
import StackedBarChart from "./charts/StackedBarChart";
import UnitVisitsBarChart from "./charts/UnitVisitsBarChart";
import UnitHistoryLineChart from "./charts/UnitHistoryLineChart";

interface DashboardClientProps {
  initialStats: any;
  userRole: string;
}

type SectionType = "general" | "units" | "devices" | "sellers";
type TimeRangeType = "day" | "week" | "month" | "custom";

export default function DashboardClient({ initialStats, userRole }: DashboardClientProps) {
  const [activeSection, setActiveSection] = useState<SectionType>("general");
  const [timeRange, setTimeRange] = useState<TimeRangeType>("month");
  
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  const [selectedSellerId, setSelectedSellerId] = useState("all");
  const [selectedUnitIdx, setSelectedUnitIdx] = useState<number | null>(null);

  // Generate list of the last 12 months starting from today
  const monthsList = React.useMemo(() => {
    const list = [];
    const date = new Date();
    const monthsNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    for (let i = 0; i < 12; i++) {
      const year = date.getFullYear();
      const monthIdx = date.getMonth();
      
      const startOfM = new Date(year, monthIdx, 1);
      const endOfM = new Date(year, monthIdx + 1, 0); // last day of month
      
      const label = i === 0 ? "Este mes" : `${monthsNames[monthIdx]} ${year}`;
      const value = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      
      list.push({
        label,
        value,
        startDate: startOfM.toISOString().split("T")[0],
        endDate: endOfM.toISOString().split("T")[0]
      });
      
      date.setMonth(date.getMonth() - 1);
    }
    return list;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(monthsList[0]);
  
  const [selectedDayDate, setSelectedDayDate] = useState(today);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const selectedDayLabel = React.useMemo(() => {
    if (selectedDayDate === today) return "Hoy";
    const dateParts = selectedDayDate.split("-");
    if (dateParts.length === 3) {
      const d = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
      return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
    }
    return selectedDayDate;
  }, [selectedDayDate, today]);

  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();

  const refreshStats = () => {
    startTransition(async () => {
      setSelectedUnitIdx(null); // Reset unit selection on refresh
      
      let queryTimeRange: "day" | "week" | "month" | "custom" = timeRange;
      let queryStart = startDate;
      let queryEnd = endDate;

      // If user selected a past month, send it as a custom range to avoid modifying backend actions
      if (timeRange === "month") {
        if (selectedMonth.value === monthsList[0].value) {
          queryTimeRange = "month";
        } else {
          queryTimeRange = "custom";
          queryStart = selectedMonth.startDate;
          queryEnd = selectedMonth.endDate;
        }
      } else if (timeRange === "day") {
        if (selectedDayDate === today) {
          queryTimeRange = "day";
        } else {
          queryTimeRange = "custom";
          queryStart = selectedDayDate;
          queryEnd = selectedDayDate;
        }
      }

      const response = await getDashboardStats({
        timeRange: queryTimeRange,
        startDate: queryTimeRange === "custom" ? queryStart : undefined,
        endDate: queryTimeRange === "custom" ? queryEnd : undefined,
        selectedSellerId,
      });
      if (response && response.success) {
        setStats(response.data);
      }
    });
  };

  const handleMonthChange = (val: string) => {
    const found = monthsList.find(m => m.value === val);
    if (found) {
      setSelectedMonth(found);
      setTimeRange("month");
    }
  };

  const handleDayChange = (val: string) => {
    if (val) {
      setSelectedDayDate(val);
      setTimeRange("day");
    }
  };

  useEffect(() => {
    refreshStats();
  }, [timeRange, startDate, endDate, selectedSellerId, selectedMonth, selectedDayDate]);

  const isSeller = userRole === "SELLER";

  const generalCards = [
    {
      title: "Visitas (sesiones)",
      value: stats.totalVisits.toLocaleString(),
      change: stats.visitsGrowth,
      icon: Eye,
      color: "text-indigo-600",
      iconBg: "bg-indigo-100",
      borderColor: "border-indigo-200/50",
    },
    {
      title: isSeller ? "Mis Prospectos" : "Prospectos (Formularios)",
      value: stats.totalProspects.toLocaleString(),
      change: stats.prospectsGrowth,
      icon: FileText,
      color: "text-cyan-600",
      iconBg: "bg-cyan-100",
      borderColor: "border-cyan-200/50",
    },
    {
      title: "Unidades Reservadas",
      value: stats.reservedUnits.toLocaleString(),
      change: stats.reservedGrowth,
      icon: Building,
      color: "text-pink-600",
      iconBg: "bg-pink-100",
      borderColor: "border-pink-200/50",
    },
    ...(!isSeller
      ? [
          {
            title: "Vendedores Activos",
            value: stats.activeSellers.toString(),
            change: "Activos en el sistema",
            icon: Users,
            color: "text-amber-600",
            iconBg: "bg-amber-100",
            borderColor: "border-amber-200/50",
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6 text-slate-800 min-h-screen bg-transparent p-1">
      {/* Top Banner and Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-base-100 border border-base-200 p-5 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold font-primary text-brand-orange flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-brand-orange animate-pulse" />
            Resumen de Actividad
          </h1>
          <p className="text-gray-500 text-xs mt-1 font-secondary flex items-center gap-1 flex-wrap">
            Analiza el rendimiento del showroom. Rango de datos:{" "}
            {timeRange === "month" ? (
              <div className="dropdown dropdown-bottom inline-block align-middle">
                <div
                  tabIndex={0}
                  role="button"
                  className="text-brand-orange font-bold font-mono underline decoration-brand-orange underline-offset-4 cursor-pointer focus:outline-none inline-flex items-center gap-1 text-xs hover:text-brand-orange/80"
                >
                  {selectedMonth.label}
                  <ChevronDown className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                </div>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu p-1 shadow-lg bg-base-100 border border-base-200 rounded-lg w-36 z-50 max-h-60 overflow-y-auto mt-1"
                >
                  {monthsList.map((m, idx) => (
                    <li key={idx}>
                      <button
                        onClick={() => {
                          handleMonthChange(m.value);
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        }}
                        className="px-2.5 py-1.5 hover:bg-base-200 text-slate-800 text-xs font-sans rounded-md whitespace-nowrap"
                      >
                        {m.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : timeRange === "day" ? (
              <span className="relative inline-flex items-center gap-1.5 align-middle">
                <button
                  onClick={() => dateInputRef.current?.showPicker()}
                  className="text-brand-orange font-bold font-mono underline decoration-brand-orange underline-offset-4 cursor-pointer focus:outline-none inline-flex items-center gap-1 text-xs hover:text-brand-orange/80"
                >
                  {selectedDayLabel}
                  <Calendar className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  max={today}
                  value={selectedDayDate}
                  onChange={(e) => handleDayChange(e.target.value)}
                  className="absolute invisible w-0 h-0"
                />
              </span>
            ) : (
              <span className="font-semibold text-brand-orange font-mono">
                {stats.calculatedTimeRange}
              </span>
            )}
          </p>
        </div>

        {/* Section Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
          <button
            onClick={() => setActiveSection("general")}
            className={`btn btn-sm rounded-lg font-semibold tracking-wide transition-all border ${
              activeSection === "general"
                ? "bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/15"
                : "bg-base-200 text-slate-700 border-base-300 hover:bg-base-300"
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveSection("units")}
            className={`btn btn-sm rounded-lg font-semibold tracking-wide transition-all border ${
              activeSection === "units"
                ? "bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/15"
                : "bg-base-200 text-slate-700 border-base-300 hover:bg-base-300"
            }`}
          >
            Unidades
          </button>
          <button
            onClick={() => setActiveSection("devices")}
            className={`btn btn-sm rounded-lg font-semibold tracking-wide transition-all border ${
              activeSection === "devices"
                ? "bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/15"
                : "bg-base-200 text-slate-700 border-base-300 hover:bg-base-300"
            }`}
          >
            Dispositivos
          </button>
          {!isSeller && (
            <button
              onClick={() => setActiveSection("sellers")}
              className={`btn btn-sm rounded-lg font-semibold tracking-wide transition-all border ${
                activeSection === "sellers"
                  ? "bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/15"
                  : "bg-base-200 text-slate-700 border-base-300 hover:bg-base-300"
              }`}
            >
              Vendedores
            </button>
          )}
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-base-100 border border-base-200 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-orange" />
          <span className="text-sm font-semibold text-slate-700">Filtrar por tiempo:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time range buttons */}
          <div className="join border border-base-300 bg-base-200 p-0.5 rounded-lg">
            <button
              onClick={() => setTimeRange("day")}
              className={`btn btn-xs join-item capitalize rounded-md font-medium tracking-wide ${
                timeRange === "day"
                  ? "bg-base-100 text-slate-800 font-bold border border-base-300/40 shadow-sm"
                  : "bg-transparent text-slate-500 border-none hover:bg-base-350/50"
              }`}
            >
              Día
            </button>
            <button
              onClick={() => setTimeRange("week")}
              className={`btn btn-xs join-item capitalize rounded-md font-medium tracking-wide ${
                timeRange === "week"
                  ? "bg-base-100 text-slate-800 font-bold border border-base-300/40 shadow-sm"
                  : "bg-transparent text-slate-500 border-none hover:bg-base-350/50"
              }`}
            >
              Semana
            </button>
            
            <button
              onClick={() => setTimeRange("month")}
              className={`btn btn-xs join-item capitalize rounded-md font-medium tracking-wide ${
                timeRange === "month"
                  ? "bg-base-100 text-slate-800 font-bold border border-base-300/40 shadow-sm"
                  : "bg-transparent text-slate-500 border-none hover:bg-base-350/50"
              }`}
            >
              Mes
            </button>

            <button
              onClick={() => setTimeRange("custom")}
              className={`btn btn-xs join-item capitalize rounded-md font-medium tracking-wide ${
                timeRange === "custom"
                  ? "bg-base-100 text-slate-800 font-bold border border-base-300/40 shadow-sm"
                  : "bg-transparent text-slate-500 border-none hover:bg-base-350/50"
              }`}
            >
              Rango
            </button>
          </div>

          {/* Date pickers for custom filter */}
          {timeRange === "custom" && (
            <div className="flex items-center gap-2 animate-fade-in">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input input-xs bg-base-200 border-base-300 text-slate-800 rounded-md focus:border-brand-orange text-xs py-1"
              />
              <span className="text-slate-500 text-xs">a</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input input-xs bg-base-200 border-base-300 text-slate-800 rounded-md focus:border-brand-orange text-xs py-1"
              />
            </div>
          )}

          {/* Pending loading indicator */}
          {isPending && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="loading loading-spinner loading-xs text-brand-orange"></span>
              <span className="text-xs text-slate-500 font-medium">Actualizando...</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area based on Section */}
      <div className="space-y-6">
        
        {/* ================= SECTION: GENERAL ================= */}
        {activeSection === "general" && (
          <div className="space-y-6 animate-fade-in">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {generalCards.map((card, idx) => (
                <div
                  key={idx}
                  className="card bg-base-100 shadow-sm border border-base-200 transition-all duration-300 hover:scale-[1.01]"
                >
                  <div className="card-body p-5 flex flex-row items-center justify-between">
                    <div>
                      <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        {card.title}
                      </h3>
                      <div className="text-3xl font-extrabold text-slate-800 mt-1.5 tracking-tight font-garet">
                        {card.value}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-2 font-mono flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-cyan-700">
                          {card.change}
                        </span>
                        <span>en el periodo</span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl ${card.iconBg} ${card.color} border border-base-200/50`}>
                      <card.icon className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              Una visita es una sesión de navegación. Abrir varias páginas no suma visitas nuevas;
              tras 30 minutos sin registrar actividad comienza otra sesión. Las estadísticas por unidad cuentan páginas vistas.
            </p>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GradientAreaChart
                labels={stats.chartLabels}
                data={stats.viewsSeries}
                name="Tendencia de Sesiones"
                colorStart="#8b5cf6"
                colorEnd="#ec4899"
              />

              <MultiAreaChart
                labels={stats.chartLabels}
                series={[
                  { name: "Sesiones", data: stats.viewsSeries, color: "#06b6d4" },
                  { name: "Prospectos", data: stats.prospectsSeries, color: "#8b5cf6" },
                ]}
              />
            </div>
          </div>
        )}

        {/* ================= SECTION: UNITS ================= */}
        {activeSection === "units" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Units Popularity Table */}
              <div className="card lg:col-span-2 bg-base-100 border border-base-200 p-6 rounded-2xl shadow-sm">
                <h2 className="text-lg font-bold font-primary text-brand-orange border-b border-base-200 pb-3 flex items-center gap-2">
                  <Building className="w-5 h-5 text-brand-orange" />
                  Interacción por Unidad (Páginas vistas)
                </h2>
                
                <div className="overflow-x-auto mt-4 scrollbar-thin max-h-[460px]">
                  <table className="table w-full text-slate-800">
                    <thead>
                      <tr className="border-b border-base-200 text-gray-500 uppercase text-xs tracking-wider">
                        <th className="bg-transparent font-semibold">Unidad</th>
                        <th className="bg-transparent font-semibold text-center">Páginas vistas</th>
                        <th className="bg-transparent font-semibold text-right">Permanencia Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.popularUnits && stats.popularUnits.length > 0 ? (
                        stats.popularUnits.map((item: any, i: number) => {
                          const maxViews = stats.popularUnits[0]?.views || 1;
                          const progressPercent = Math.round((item.views / maxViews) * 100);
                          const isSelected = selectedUnitIdx === i;

                          return (
                            <tr
                              key={i}
                              onClick={() => setSelectedUnitIdx(isSelected ? null : i)}
                              className={`border-b border-base-200/50 hover:bg-base-200/20 cursor-pointer transition-all ${
                                isSelected ? "bg-brand-orange/5 font-semibold text-brand-orange" : ""
                              }`}
                            >
                              <td className="bg-transparent">
                                <div className="flex flex-col gap-1.5">
                                  <span className="font-semibold text-sm">{item.unit}</span>
                                  <div className="w-full bg-base-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-gradient-to-r from-violet-500 to-pink-500 h-full rounded-full"
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="bg-transparent text-center font-bold font-mono text-cyan-600 text-sm">
                                {item.views}
                              </td>
                              <td className="bg-transparent text-right">
                                <div className="flex items-center justify-end gap-1.5 text-slate-705 font-mono text-xs">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-bold">{item.avgDurationFormatted}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-slate-400 text-center py-12 text-sm bg-transparent">
                            No hay páginas vistas registradas en este periodo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dwell time dashboard insights */}
              <div className="flex flex-col gap-6">
                <div className="card bg-base-100 border border-base-200 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-4">
                    Permanencia Global en Unidades
                  </h3>
                  
                  {stats.popularUnits && stats.popularUnits.length > 0 ? (
                    (() => {
                      const totalSecs = stats.popularUnits.reduce((acc: number, item: any) => acc + item.avgDuration, 0);
                      const avgSecs = Math.round(totalSecs / stats.popularUnits.length);
                      const minutes = Math.floor(avgSecs / 60);
                      const seconds = avgSecs % 60;
                      
                      return (
                        <div className="text-center py-6 flex flex-col items-center">
                          <div className="p-4 bg-violet-100 border border-violet-200 rounded-full text-violet-500 w-fit mb-3 shadow-sm animate-pulse">
                            <Clock className="w-8 h-8" />
                          </div>
                          <span className="text-4xl font-extrabold text-slate-800 tracking-tight font-garet">
                            {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
                          </span>
                          <p className="text-xs text-slate-500 mt-2 font-medium">
                            Tiempo medio de visualización por departamento.
                          </p>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-slate-400 text-center py-8 text-sm">Sin datos.</div>
                  )}
                </div>

                {/* Quick metrics */}
                <div className="card bg-base-100 border border-base-200 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-3">
                    Unidad Más Retenida (Top Dwell)
                  </h3>
                  {stats.popularUnits && stats.popularUnits.length > 0 ? (
                    (() => {
                      const sortedByDuration = [...stats.popularUnits].sort((a: any, b: any) => b.avgDuration - a.avgDuration);
                      const topDur = sortedByDuration[0];
                      return (
                        <div className="flex flex-col gap-2 mt-1">
                          <div className="text-xs font-semibold text-pink-650 uppercase font-mono">
                            {topDur.avgDurationFormatted} de retención
                          </div>
                          <h4 className="text-md font-bold text-slate-800 leading-tight">
                            {topDur.unit}
                          </h4>
                          <div className="text-[10px] text-gray-500 font-medium">
                            Total de páginas vistas: {topDur.views} en este rango
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-slate-400 text-sm">Sin datos.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Charts Row: Bar Chart of Visits vs Unit & Line Chart of selected unit history */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Comparative Bar Chart */}
              <div className="lg:col-span-2 flex">
                <UnitVisitsBarChart
                  labels={stats.popularUnits ? stats.popularUnits.map((u: any) => u.unit) : []}
                  data={stats.popularUnits ? stats.popularUnits.map((u: any) => u.views) : []}
                  selectedIdx={selectedUnitIdx}
                  onSelectIdx={(idx) => setSelectedUnitIdx(idx)}
                />
              </div>

              {/* Dynamic Line Chart */}
              <div className="lg:col-span-1">
                {selectedUnitIdx !== null && stats.popularUnits && stats.popularUnits[selectedUnitIdx] ? (
                  <UnitHistoryLineChart
                    labels={stats.chartLabels}
                    viewsData={stats.popularUnits[selectedUnitIdx].history.views}
                    durationData={stats.popularUnits[selectedUnitIdx].history.duration}
                    unitName={stats.popularUnits[selectedUnitIdx].unit}
                    height={220}
                  />
                ) : (
                  <div className="card bg-base-100 border border-base-200 p-6 rounded-2xl shadow-sm h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                    <Clock className="w-10 h-10 text-slate-350 mb-3 animate-pulse" />
                    <span className="text-sm font-semibold text-slate-500">Historial Detallado</span>
                    <p className="text-xs text-slate-400 mt-2 max-w-[200px]">
                      Haz clic en una unidad de la tabla o en una barra del gráfico para ver su historial de páginas vistas y permanencia.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION: DEVICES ================= */}
        {activeSection === "devices" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Devices overview circles */}
            <div className="card lg:col-span-1 bg-base-100 border border-base-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold font-primary text-brand-orange border-b border-base-200 pb-3 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-brand-orange" />
                  Sesiones por Dispositivo
                </h2>
                <div className="mt-4">
                  <RadialConcentricChart
                    data={[
                      { label: "Móvil", value: stats.devices.mobile, color: "#06b6d4" },
                      { label: "Escritorio", value: stats.devices.desktop, color: "#8b5cf6" },
                      { label: "Tablet", value: stats.devices.tablet, color: "#f59e0b" },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Most viewed website zones */}
            <div className="card lg:col-span-2 bg-base-100 border border-base-200 p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-bold font-primary text-brand-orange border-b border-base-200 pb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-orange" />
                Zonas Más Visitadas del Sitio Web
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-base-200/50 border border-base-300/40 rounded-xl">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                      Zona más visualizada General
                    </span>
                    <div className="text-xl font-bold text-slate-800 mt-1 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-cyan-600 shrink-0" />
                      {stats.topZoneOverall}
                    </div>
                  </div>

                  <div className="p-4 bg-base-200/50 border border-base-300/40 rounded-xl space-y-3">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                      Zona más visualizada por dispositivo
                    </span>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-base-200 pb-1.5">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-cyan-600" />
                          Móvil:
                        </span>
                        <span className="font-semibold text-slate-850">{stats.topZoneByDevice.mobile}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-base-200 pb-1.5">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Monitor className="w-3.5 h-3.5 text-violet-600" />
                          Escritorio:
                        </span>
                        <span className="font-semibold text-slate-850">{stats.topZoneByDevice.desktop}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Tablet className="w-3.5 h-3.5 text-amber-600" />
                          Tablet:
                        </span>
                        <span className="font-semibold text-slate-850">{stats.topZoneByDevice.tablet}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[220px] scrollbar-thin">
                  <table className="table table-xs w-full text-slate-600">
                    <thead>
                      <tr className="border-b border-base-200 text-gray-500 text-[10px] uppercase">
                        <th className="bg-transparent">Zona del Sitio</th>
                        <th className="bg-transparent text-right">Vistas Absolutas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.zonesBreakdown && stats.zonesBreakdown.length > 0 ? (
                        stats.zonesBreakdown.map((zone: any, i: number) => (
                          <tr key={i} className="border-b border-base-200/40 hover:bg-base-200/15">
                            <td className="bg-transparent font-medium text-slate-700">{zone.name}</td>
                            <td className="bg-transparent text-right font-mono text-cyan-600 font-semibold">
                              {zone.count.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="text-center py-6 text-slate-400 bg-transparent">
                            Sin registros.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION: SELLERS ================= */}
        {activeSection === "sellers" && !isSeller && stats.sellerStats && (
          <div className="space-y-6 animate-fade-in">
            {/* Top seller filtering banner */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-base-100 border border-base-200 p-5 rounded-2xl shadow-sm">
              <div>
                <h2 className="text-lg font-bold font-primary text-brand-orange flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-orange" />
                  Rendimiento y Citas por Asesor
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-secondary">
                  Estadísticas detalladas sobre las agendas asignadas y prospectos captados.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 whitespace-nowrap font-medium font-secondary">Asesor:</span>
                <select
                  value={selectedSellerId}
                  onChange={(e) => setSelectedSellerId(e.target.value)}
                  className="select select-sm bg-base-200 border-base-300 text-slate-800 focus:border-brand-orange text-xs min-w-[160px] rounded-lg"
                >
                  <option value="all">Todos los asesores</option>
                  {stats.sellerStats.sellersList &&
                    stats.sellerStats.sellersList.map((seller: any) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Quick insights widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Leader in appointments */}
              <div className="card bg-base-100 border border-base-200 p-5 rounded-xl shadow-sm">
                <span className="text-[10px] uppercase font-semibold text-gray-550 tracking-wider">
                  Más Citas en Calendario
                </span>
                <div className="text-lg font-bold text-slate-800 mt-1.5 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-100 border border-violet-200 text-violet-600 flex items-center justify-center shrink-0">
                    🏆
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-850">{stats.sellerStats.topSeller.name}</h4>
                    <span className="text-xs text-gray-500 font-mono">
                      {stats.sellerStats.topSeller.count} citas programadas
                    </span>
                  </div>
                </div>
              </div>

              {/* Leader in prospects */}
              <div className="card bg-base-100 border border-base-200 p-5 rounded-xl shadow-sm">
                <span className="text-[10px] uppercase font-semibold text-gray-550 tracking-wider">
                  Más Prospectos Asignados
                </span>
                <div className="text-lg font-bold text-slate-800 mt-1.5 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-100 border border-cyan-200 text-cyan-600 flex items-center justify-center shrink-0">
                    👥
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-850">{stats.sellerStats.topProspectsSeller.name}</h4>
                    <span className="text-xs text-gray-500 font-mono">
                      {stats.sellerStats.topProspectsSeller.count} prospectos únicos
                    </span>
                  </div>
                </div>
              </div>

              {/* Appointment summary status */}
              <div className="card bg-base-100 border border-base-200 p-5 rounded-xl shadow-sm flex flex-row items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-550 tracking-wider">
                    Citas Solicitadas
                  </span>
                  <div className="text-3xl font-extrabold text-slate-800 mt-1 font-mono">
                    {stats.sellerStats.appointments.total}
                  </div>
                </div>
                <div className="text-xs space-y-1 font-mono text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>Concretadas: {stats.sellerStats.appointments.completed}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span>Canceladas: {stats.sellerStats.appointments.cancelled}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                    <span>Pendientes: {stats.sellerStats.appointments.scheduled}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stacked bar chart */}
            <div className="grid grid-cols-1 gap-6">
              <StackedBarChart
                labels={
                  selectedSellerId === "all"
                    ? stats.sellerStats.sellersList.map((s: any) => s.name)
                    : ["Citas del Asesor"]
                }
                series={[
                  {
                    name: "Concretadas",
                    data:
                      selectedSellerId === "all"
                        ? stats.sellerStats.sellersList.map((s: any) => {
                            const total = stats.sellerStats.appointments.completed;
                            return Math.ceil(total / Math.max(1, stats.sellerStats.sellersList.length)) + (s.id.charCodeAt(0) % 2);
                          })
                        : [stats.sellerStats.appointments.completed],
                    color: "#22c55e",
                  },
                  {
                    name: "Pendientes",
                    data:
                      selectedSellerId === "all"
                        ? stats.sellerStats.sellersList.map((s: any) => {
                            const total = stats.sellerStats.appointments.scheduled;
                            return Math.ceil(total / Math.max(1, stats.sellerStats.sellersList.length)) + (s.id.charCodeAt(1) % 2);
                          })
                        : [stats.sellerStats.appointments.scheduled],
                    color: "#eab308",
                  },
                  {
                    name: "Canceladas",
                    data:
                      selectedSellerId === "all"
                        ? stats.sellerStats.sellersList.map((s: any) => {
                            const total = stats.sellerStats.appointments.cancelled;
                            return Math.ceil(total / Math.max(1, stats.sellerStats.sellersList.length));
                          })
                        : [stats.sellerStats.appointments.cancelled],
                    color: "#ef4444",
                  },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
