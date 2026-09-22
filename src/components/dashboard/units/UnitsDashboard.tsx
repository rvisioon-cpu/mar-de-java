"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import { getAssetUrl } from "@/utils/assets";
import {
  Building,
  LayoutGrid,
  TableProperties,
  Kanban,
  Plus,
  Edit,
  Trash2,
  X,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Eye,
  Bed,
  Bath,
  Maximize,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  Compass,
  Mail,
  Copy,
} from "lucide-react";
import {
  createFloor,
  updateFloor,
  deleteFloor,
  createUnit,
  updateUnit,
  deleteUnit,
  updateUnitState,
} from "@/app/actions/units";
import { uploadBrochure } from "@/app/actions/brochure";

// Floor and Unit Typings
interface Floor {
  id: string;
  name: string;
  level: number;
  type: string;
  imagePath?: string | null;
}

interface Unit {
  id: string;
  floorId: string;
  identifier: string;
  type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: number | null;
  state: string;
  buyerName?: string | null;
  tourUrl?: string | null;
  photosFurnished: string[];
  photosUnfurnished: string[];
  photosPlans: string[];
  photosBalcony: string[];
  gallery: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UnitsDashboardProps {
  initialFloors: Floor[];
  initialUnits: Unit[];
  currentUser: User;
}

export default function UnitsDashboard({
  initialFloors,
  initialUnits,
  currentUser,
}: UnitsDashboardProps) {
  const [floors, setFloors] = useState<Floor[]>(initialFloors);
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [activeView, setActiveView] = useState<"grid" | "table" | "kanban">("grid");
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Feedback notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Auth permissions
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isSupervisor = currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN";

  // ----------------------------------------------------
  // FORM & MODAL STATES
  // ----------------------------------------------------

  // Floor CRUD
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [floorEditing, setFloorEditing] = useState<Floor | null>(null);
  const [floorForm, setFloorForm] = useState({
    name: "",
    level: 0,
    type: "Piso",
    imagePath: "",
  });

  // Floor deletion confirmation
  const [isDeleteFloorConfirmOpen, setIsDeleteFloorConfirmOpen] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState<Floor | null>(null);

  // Unit CRUD
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitEditing, setUnitEditing] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({
    floorId: "",
    identifier: "",
    type: "",
    bedrooms: 0,
    bathrooms: 0,
    areaSqm: 0,
    state: "AVAILABLE",
    tourUrl: "",
    photosFurnishedText: "",
    photosUnfurnishedText: "",
    photosPlansText: "",
    photosBalconyText: "",
  });

  // Unit Deletion
  const [isDeleteUnitConfirmOpen, setIsDeleteUnitConfirmOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

  // Unit Details Viewer
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<
    "furnished" | "unfurnished" | "plans" | "balcony" | "gallery" | "brochure"
  >("furnished");
  const [unitBrochureUrl, setUnitBrochureUrl] = useState<string | null>(null);
  const [loadingBrochure, setLoadingBrochure] = useState(false);

  useEffect(() => {
    if (selectedUnit && activeDetailTab === "brochure") {
      setLoadingBrochure(true);
      fetch(`/api/brochure/active?unitId=${selectedUnit.id}`)
        .then((res) => res.json())
        .then((data: any) => {
          if (data && data.url) {
            setUnitBrochureUrl(data.url);
          } else {
            setUnitBrochureUrl(null);
          }
        })
        .catch((err) => {
          console.error("Error loading brochure:", err);
          setUnitBrochureUrl(null);
        })
        .finally(() => {
          setLoadingBrochure(false);
        });
    }
  }, [selectedUnit, activeDetailTab]);

  const [uploadingUnitBrochure, setUploadingUnitBrochure] = useState(false);
  const [unitBrochureError, setUnitBrochureError] = useState("");

  // Sube un PDF y lo deja activo para la unidad abierta. uploadBrochure ya
  // valida el rol y el formato en el servidor; aquí solo se refleja el estado.
  const handleUploadUnitBrochure = async (file: File) => {
    if (!selectedUnit) return;
    setUnitBrochureError("");
    setUploadingUnitBrochure(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", `Brochure ${selectedUnit.identifier}`);
      formData.append("type", "UNIT");
      formData.append("unitId", selectedUnit.id);

      await uploadBrochure(formData);

      const res = await fetch(`/api/brochure/active?unitId=${selectedUnit.id}`);
      const data: any = await res.json();
      setUnitBrochureUrl(data?.url || null);
    } catch (err: any) {
      console.error("Error subiendo el brochure de la unidad:", err);
      setUnitBrochureError(err?.message || "No se pudo subir el brochure.");
    } finally {
      setUploadingUnitBrochure(false);
    }
  };

  const getAbsoluteAssetUrl = (url: string | null) => {
    if (!url) return "";
    const resolved = getAssetUrl(url);
    if (resolved.startsWith("http")) return resolved;
    if (typeof window !== "undefined") {
      return `${window.location.origin}${resolved.startsWith("/") ? "" : "/"}${resolved}`;
    }
    return resolved;
  };

  const [copied, setCopied] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [imageCopied, setImageCopied] = useState(false);

  const handleCopyLink = () => {
    const absoluteUrl = getAbsoluteAssetUrl(unitBrochureUrl);
    if (!absoluteUrl) return;
    navigator.clipboard.writeText(absoluteUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
      });
  };

  // ----------------------------------------------------
  // HANDLERS - FLOOR
  // ----------------------------------------------------

  const openAddFloorModal = () => {
    setFloorEditing(null);
    setFloorForm({ name: "", level: floors.length + 1, type: "Piso", imagePath: "" });
    setIsFloorModalOpen(true);
  };

  const openEditFloorModal = (floor: Floor, e: React.MouseEvent) => {
    e.stopPropagation();
    setFloorEditing(floor);
    setFloorForm({
      name: floor.name,
      level: floor.level,
      type: floor.type,
      imagePath: floor.imagePath || "",
    });
    setIsFloorModalOpen(true);
  };

  const handleFloorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    startTransition(async () => {
      try {
        if (floorEditing) {
          const updated = await updateFloor(floorEditing.id, floorForm);
          setFloors(floors.map((f) => (f.id === updated.id ? updated : f)));
          showNotification("success", `Planta "${updated.name}" actualizada con éxito.`);
        } else {
          const created = await createFloor(floorForm);
          setFloors([...floors, created].sort((a, b) => a.level - b.level));
          showNotification("success", `Planta "${created.name}" creada con éxito.`);
        }
        setIsFloorModalOpen(false);
      } catch (err: any) {
        showNotification("error", err.message || "Error al guardar planta.");
      }
    });
  };

  const confirmDeleteFloor = (floor: Floor, e: React.MouseEvent) => {
    e.stopPropagation();
    setFloorToDelete(floor);
    setIsDeleteFloorConfirmOpen(true);
  };

  const handleDeleteFloor = async () => {
    if (!floorToDelete || !isSuperAdmin) return;

    startTransition(async () => {
      try {
        const res = await deleteFloor(floorToDelete.id);
        setFloors(floors.filter((f) => f.id !== floorToDelete.id));
        // Soft delete units in local state too
        setUnits(units.filter((u) => u.floorId !== floorToDelete.id));
        showNotification(
          "success",
          `Planta eliminada con éxito. Se eliminaron ${res.deletedUnitsCount} unidades asociadas.`
        );
        setIsDeleteFloorConfirmOpen(false);
        setFloorToDelete(null);
      } catch (err: any) {
        showNotification("error", err.message || "Error al eliminar planta.");
      }
    });
  };

  // ----------------------------------------------------
  // HANDLERS - UNIT
  // ----------------------------------------------------

  const openAddUnitModal = (floorId: string) => {
    setUnitEditing(null);
    setUnitForm({
      floorId,
      identifier: "",
      type: "Flat",
      bedrooms: 1,
      bathrooms: 1,
      areaSqm: 45,
      state: "AVAILABLE",
      tourUrl: "",
      photosFurnishedText: "",
      photosUnfurnishedText: "",
      photosPlansText: "",
      photosBalconyText: "",
    });
    setIsUnitModalOpen(true);
  };

  const openEditUnitModal = (unit: Unit, e: React.MouseEvent) => {
    e.stopPropagation();
    setUnitEditing(unit);
    setUnitForm({
      floorId: unit.floorId,
      identifier: unit.identifier,
      type: unit.type || "",
      bedrooms: unit.bedrooms || 0,
      bathrooms: unit.bathrooms || 0,
      areaSqm: unit.areaSqm || 0,
      state: unit.state,
      tourUrl: unit.tourUrl || "",
      photosFurnishedText: unit.photosFurnished.join("\n"),
      photosUnfurnishedText: unit.photosUnfurnished.join("\n"),
      photosPlansText: unit.photosPlans.join("\n"),
      photosBalconyText: unit.photosBalcony.join("\n"),
    });
    setIsUnitModalOpen(true);
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    const payload = {
      floorId: unitForm.floorId,
      identifier: unitForm.identifier,
      type: unitForm.type,
      bedrooms: Number(unitForm.bedrooms),
      bathrooms: Number(unitForm.bathrooms),
      areaSqm: Number(unitForm.areaSqm),
      state: unitForm.state,
      tourUrl: unitForm.tourUrl,
      photosFurnished: unitForm.photosFurnishedText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      photosUnfurnished: unitForm.photosUnfurnishedText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      photosPlans: unitForm.photosPlansText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      photosBalcony: unitForm.photosBalconyText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    startTransition(async () => {
      try {
        if (unitEditing) {
          const updated = await updateUnit(unitEditing.id, payload);
          setUnits(
            units.map((u) =>
              u.id === updated.id
                ? ({
                    ...updated,
                    photosFurnished: (updated.photosFurnished as string[]) || [],
                    photosUnfurnished: (updated.photosUnfurnished as string[]) || [],
                    photosPlans: (updated.photosPlans as string[]) || [],
                    photosBalcony: (updated.photosBalcony as string[]) || [],
                    gallery: (updated.gallery as string[]) || [],
                  } as Unit)
                : u
            )
          );
          showNotification("success", `Unidad "${updated.identifier}" actualizada.`);
        } else {
          const created = await createUnit(payload);
          setUnits([
            ...units,
            {
              ...created,
              photosFurnished: (created.photosFurnished as string[]) || [],
              photosUnfurnished: (created.photosUnfurnished as string[]) || [],
              photosPlans: (created.photosPlans as string[]) || [],
              photosBalcony: (created.photosBalcony as string[]) || [],
              gallery: (created.gallery as string[]) || [],
            } as Unit,
          ]);
          showNotification("success", `Unidad "${created.identifier}" creada.`);
        }
        setIsUnitModalOpen(false);
      } catch (err: any) {
        showNotification("error", err.message || "Error al guardar unidad.");
      }
    });
  };

  const confirmDeleteUnit = (unit: Unit, e: React.MouseEvent) => {
    e.stopPropagation();
    setUnitToDelete(unit);
    setIsDeleteUnitConfirmOpen(true);
  };

  const handleDeleteUnit = async () => {
    if (!unitToDelete || !isSuperAdmin) return;

    startTransition(async () => {
      try {
        await deleteUnit(unitToDelete.id);
        setUnits(units.filter((u) => u.id !== unitToDelete.id));
        showNotification("success", `Unidad "${unitToDelete.identifier}" eliminada.`);
        setIsDeleteUnitConfirmOpen(false);
        setUnitToDelete(null);
      } catch (err: any) {
        showNotification("error", err.message || "Error al eliminar unidad.");
      }
    });
  };

  // State modification (Kanban drag-drop or details change)
  const handleStatusChange = async (unitId: string, newState: string) => {
    const unitToMove = units.find((u) => u.id === unitId);
    if (!unitToMove) return;

    if (unitToMove.state === newState) return;

    startTransition(async () => {
      try {
        const updated = await updateUnitState(unitId, newState);
        setUnits(
          units.map((u) =>
            u.id === updated.id ? { ...u, state: updated.state } : u
          )
        );
        showNotification(
          "success",
          `Estado de unidad "${unitToMove.identifier}" cambiado a ${getStateLabel(newState)}.`
        );

        // Update selectedUnit if it's the one opened
        if (selectedUnit && selectedUnit.id === unitId) {
          setSelectedUnit((prev) => (prev ? { ...prev, state: updated.state } : null));
        }
      } catch (err: any) {
        showNotification("error", err.message || "Error al cambiar el estado.");
      }
    });
  };

  // ----------------------------------------------------
  // HELPERS & GETTERS
  // ----------------------------------------------------

  const getStateLabel = (state: string) => {
    switch (state) {
      case "AVAILABLE":
        return "Disponible";
      case "RESERVED":
        return "Apartado";
      case "SOLD":
        return "Vendido";
      case "COMMON_AREA":
        return "Área Común";
      default:
        return state;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "AVAILABLE":
        return "badge-success text-success bg-success/10 border-success/20";
      case "RESERVED":
        return "badge-warning text-warning bg-warning/10 border-warning/20";
      case "SOLD":
        return "badge-error text-error bg-error/10 border-error/20";
      case "COMMON_AREA":
        return "badge-info text-info bg-info/10 border-info/20";
      default:
        return "badge-neutral";
    }
  };

  const getCompactUnitStyle = (state: string) => {
    switch (state) {
      case "AVAILABLE":
        return "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm";
      case "RESERVED":
        return "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-500 hover:text-white hover:border-amber-500 shadow-sm";
      case "SOLD":
        return "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-500 hover:text-white hover:border-rose-500 shadow-sm";
      case "COMMON_AREA":
        return "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-500 hover:text-white hover:border-blue-500 shadow-sm";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-500 hover:text-white shadow-sm";
    }
  };

  const openDetailsModal = (unit: Unit) => {
    setSelectedUnit(unit);
    setSelectedImageUrl(null);
    setImageCopied(false);
    // For non-SuperAdmin roles, auto-select the first tab that has content
    if (!isSuperAdmin) {
      if (unit.photosFurnished.length > 0) setActiveDetailTab("furnished");
      else if (unit.photosUnfurnished.length > 0) setActiveDetailTab("unfurnished");
      else if (unit.photosPlans.length > 0) setActiveDetailTab("plans");
      else if (unit.photosBalcony.length > 0) setActiveDetailTab("balcony");
      else if (unit.gallery.length > 0) setActiveDetailTab("gallery");
      else setActiveDetailTab("brochure");
    } else {
      setActiveDetailTab("furnished");
    }
    setIsDetailsModalOpen(true);
  };

  // Filtered units for Table View & General query matching
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchQuery =
        u.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.type && u.type.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchQuery;
    });
  }, [units, searchQuery]);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in relative min-h-screen pb-20">
      {/* Toast Notification */}
      {notification && (
        <div className="toast toast-top toast-end z-[100] top-20 right-6">
          <div
            className={`alert shadow-lg ${
              notification.type === "success" ? "alert-success text-white" : "alert-error text-white"
            }`}
          >
            <div>
              {notification.type === "success" ? (
                <Check className="w-5 h-5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white backdrop-blur-md p-4 rounded-xl shadow-sm border border-base-200">
        <div>
          <h1 className="text-2xl font-bold font-primary text-brand-orange flex items-center gap-2">
            <Building className="w-6 h-6 text-brand-orange animate-pulse" />
            Módulo de Unidades y Plantas
          </h1>
          <p className="text-gray-500 text-sm font-secondary">
            Gestiona los pisos, planos y estados de las unidades inmobiliarias.
          </p>
        </div>

        {/* View togglers & actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="join bg-base-200 p-1 rounded-lg">
            <button
              onClick={() => setActiveView("grid")}
              className={`join-item btn btn-sm border-none shadow-none hover:bg-base-300 ${
                activeView === "grid" ? "bg-white text-brand-orange font-bold" : "text-gray-500"
              }`}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Grilla
            </button>
            <button
              onClick={() => setActiveView("table")}
              className={`join-item btn btn-sm border-none shadow-none hover:bg-base-300 ${
                activeView === "table" ? "bg-white text-brand-orange font-bold" : "text-gray-500"
              }`}
            >
              <TableProperties className="w-4 h-4 mr-1" />
              Tabla
            </button>
            <button
              onClick={() => setActiveView("kanban")}
              className={`join-item btn btn-sm border-none shadow-none hover:bg-base-300 ${
                activeView === "kanban" ? "bg-white text-brand-orange font-bold" : "text-gray-500"
              }`}
            >
              <Kanban className="w-4 h-4 mr-1" />
              Kanban
            </button>
          </div>

          {/* Search Box (For Table/Kanban filtering) */}
          {activeView !== "grid" && (
            <input
              type="text"
              placeholder="Buscar unidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm w-44"
            />
          )}

          {/* Add Floor Trigger */}
          {isSuperAdmin && (
            <button onClick={openAddFloorModal} className="btn btn-sm btn-warning bg-brand-orange hover:bg-brand-dark-orange text-white">
              <Plus className="w-4 h-4 mr-1" />
              Añadir Planta
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------
          1. GRID VIEW - Floor-by-floor view
          ---------------------------------------------------- */}
      {activeView === "grid" && (
        <div className="flex flex-col gap-4">
          {floors.length === 0 ? (
            <div className="card bg-base-100 border border-base-200 shadow-sm p-12 text-center flex flex-col items-center">
              <Building className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-bold font-primary text-gray-700">No hay plantas</h3>
              <p className="text-gray-500 text-sm mt-2 max-w-lg">
                Actualmente no hay plantas creadas en tu proyecto. Haz click en añadir planta para empezar a configurar las plantas.
              </p>
              {isSuperAdmin && (
                <button onClick={openAddFloorModal} className="btn btn-warning bg-brand-orange text-white mt-6">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Planta
                </button>
              )}
            </div>
          ) : (
            floors.map((floor) => {
              const floorUnits = units.filter((u) => u.floorId === floor.id);

              return (
                <div
                  key={floor.id}
                  className="card bg-base-100 border border-base-200 shadow-sm overflow-hidden"
                >
                  {/* Floor Row: Flex layout aligning floor details on the left, units center-right, and controls far right */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center gap-4 min-h-[76px]">
                    
                    {/* Left: Floor Info */}
                    <div className="flex items-center gap-3 min-w-[200px] md:max-w-[240px] shrink-0">
                      <div className="p-2.5 rounded-lg bg-brand-orange/10 text-brand-orange shrink-0">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold font-primary text-gray-800 text-base leading-tight">
                          {floor.name}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5 whitespace-nowrap">
                          Nivel: {floor.level} • Tipo: {floor.type}
                        </p>
                      </div>
                    </div>

                    {/* Center/Right: Units flex-wrap row */}
                    <div className="flex flex-row flex-wrap gap-2 items-center flex-1 py-1">
                      {floorUnits.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">
                          Sin unidades asignadas
                        </span>
                      ) : (
                        floorUnits.map((unit) => (
                          <div
                            key={unit.id}
                            onClick={() => openDetailsModal(unit)}
                            className={`px-3 py-1.5 rounded-lg border font-semibold font-primary text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center min-w-[64px] text-center relative group ${getCompactUnitStyle(
                              unit.state
                            )}`}
                          >
                            <span>{unit.identifier}</span>
                            
                            {/* Floating controls on hover (Super Admin Only) */}
                            {isSuperAdmin && (
                              <div
                                className="absolute -top-3.5 -right-2 hidden group-hover:flex items-center gap-0.5 bg-white border border-base-300 rounded-md p-0.5 shadow-md z-10 animate-fade-in"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => openEditUnitModal(unit, e)}
                                  className="p-1 rounded text-gray-500 hover:text-brand-orange hover:bg-base-100 transition-colors"
                                  title="Editar Unidad"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => confirmDeleteUnit(unit, e)}
                                  className="p-1 rounded text-gray-500 hover:text-error hover:bg-base-100 transition-colors"
                                  title="Eliminar Unidad"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}

                      {/* Add Unit dotted placeholder button inside the row */}
                      {isSuperAdmin && (
                        <button
                          onClick={() => openAddUnitModal(floor.id)}
                          className="border border-dashed border-gray-300 hover:border-brand-orange hover:text-brand-orange text-gray-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                          title="Añadir Unidad"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Añadir</span>
                        </button>
                      )}
                    </div>

                    {/* Far Right: Floor Admin Controls */}
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1 border-t md:border-t-0 md:border-l pt-2 md:pt-0 md:pl-3 border-base-200 shrink-0 ml-auto justify-end">
                        <button
                          onClick={(e) => openEditFloorModal(floor, e)}
                          className="btn btn-ghost btn-circle btn-sm text-gray-500 hover:text-brand-orange hover:bg-base-200"
                          title="Editar Planta"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => confirmDeleteFloor(floor, e)}
                          className="btn btn-ghost btn-circle btn-sm text-gray-500 hover:text-error hover:bg-base-200"
                          title="Eliminar Planta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ----------------------------------------------------
          2. TABLE VIEW - Full searchable report
          ---------------------------------------------------- */}
      {activeView === "table" && (
        <div className="bg-white rounded-xl shadow-sm border border-base-200 overflow-hidden">
          {filteredUnits.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No se encontraron unidades con los criterios especificados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-md w-full">
                <thead>
                  <tr className="bg-base-200/50">
                    <th>Unidad</th>
                    <th>Planta</th>
                    <th>Tipo Planta</th>
                    <th>Tipo Unidad</th>
                    <th>Hab.</th>
                    <th>Baños</th>
                    <th>Área</th>
                    <th>Estado</th>
                    {isSuperAdmin && <th className="text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map((unit) => {
                    const floor = floors.find((f) => f.id === unit.floorId);
                    return (
                      <tr
                        key={unit.id}
                        onClick={() => openDetailsModal(unit)}
                        className="hover:bg-base-100/50 cursor-pointer transition-colors"
                      >
                        <td className="font-bold text-gray-900">{unit.identifier}</td>
                        <td>{floor ? floor.name : "N/A"}</td>
                        <td>
                          <span className="text-xs text-gray-500">{floor ? floor.type : "N/A"}</span>
                        </td>
                        <td>{unit.type || "Flat"}</td>
                        <td>{unit.bedrooms}</td>
                        <td>{unit.bathrooms}</td>
                        <td>{unit.areaSqm} m²</td>
                        <td>
                          <span className={`badge badge-sm border ${getStateColor(unit.state)}`}>
                            {getStateLabel(unit.state)}
                          </span>
                        </td>
                        {isSuperAdmin && (
                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={(e) => openEditUnitModal(unit, e)}
                                className="btn btn-ghost btn-xs text-gray-500 hover:text-brand-orange"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => confirmDeleteUnit(unit, e)}
                                className="btn btn-ghost btn-xs text-gray-500 hover:text-error"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------
          3. KANBAN VIEW - Column state management
          ---------------------------------------------------- */}
      {activeView === "kanban" && (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 items-start`}>
          {(isSuperAdmin 
            ? (["AVAILABLE", "RESERVED", "SOLD", "COMMON_AREA"] as const)
            : (["AVAILABLE", "RESERVED", "SOLD"] as const)
          ).map((columnState) => {
            const columnUnits = filteredUnits.filter((u) => u.state === columnState);

            return (
              <div
                key={columnState}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const unitId = e.dataTransfer.getData("text/plain");
                  if (unitId) handleStatusChange(unitId, columnState);
                }}
                className="bg-base-200 p-4 rounded-xl border border-base-300 min-h-[500px] flex flex-col gap-4"
              >
                {/* Column Header */}
                <div className="flex justify-between items-center border-b pb-2 border-base-300">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      columnState === "AVAILABLE"
                        ? "bg-success"
                        : columnState === "RESERVED"
                        ? "bg-warning"
                        : columnState === "SOLD"
                        ? "bg-error"
                        : "bg-info"
                    }`} />
                    <h3 className="font-bold text-gray-800 text-sm">
                      {getStateLabel(columnState)}
                    </h3>
                  </div>
                  <span className="badge badge-sm font-semibold">{columnUnits.length}</span>
                </div>

                {/* Column Body Cards */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                  {columnUnits.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-12 border-2 border-dashed border-base-300 rounded-lg">
                      Arrastra unidades aquí
                    </div>
                  ) : (
                    columnUnits.map((unit) => {
                      const floor = floors.find((f) => f.id === unit.floorId);
                      return (
                        <div
                          key={unit.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", unit.id);
                          }}
                          onClick={() => openDetailsModal(unit)}
                          className="bg-white p-4 rounded-lg shadow-sm border border-base-300 hover:shadow cursor-grab active:cursor-grabbing hover:border-brand-orange/30 group transition-all"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="font-bold text-gray-900 font-primary text-sm block">
                                {unit.identifier}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {floor ? floor.name : "Nivel N/A"}
                              </span>
                            </div>
                            <span className="text-[10px] bg-base-100 border px-1.5 py-0.5 rounded text-gray-500 font-medium">
                              {unit.type || "Flat"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center mt-4 text-[10px] text-gray-400 border-t pt-2">
                            <span className="flex items-center gap-0.5">
                              <Bed className="w-3 h-3 text-gray-400" />
                              {unit.bedrooms}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Bath className="w-3 h-3 text-gray-400" />
                              {unit.bathrooms}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Maximize className="w-3 h-3 text-gray-400" />
                              {unit.areaSqm} m²
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: ADD / EDIT FLOOR (SUPER ADMIN ONLY)
          ---------------------------------------------------- */}
      {isFloorModalOpen && isSuperAdmin && (
        <div className="modal modal-open z-50">
          <div className="modal-box max-w-md bg-white">
            <button
              onClick={() => setIsFloorModalOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-lg font-primary text-gray-900 border-b pb-2 mb-4">
              {floorEditing ? "Editar Planta" : "Añadir Nueva Planta"}
            </h3>

            <form onSubmit={handleFloorSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold text-xs">Nombre de la Planta</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Piso 5, Terraza Principal"
                  value={floorForm.name}
                  onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
                  className="input input-bordered w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-xs">Tipo de Planta</span>
                  </label>
                  <select
                    value={floorForm.type}
                    onChange={(e) => setFloorForm({ ...floorForm, type: e.target.value })}
                    className="select select-bordered w-full"
                  >
                    <option value="Planta Baja">Planta Baja</option>
                    <option value="Piso">Piso</option>
                    <option value="Terraza">Terraza</option>
                    <option value="Sótano">Sótano</option>
                    <option value="Azotea">Azotea</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-xs">Número de Nivel / Piso</span>
                  </label>
                  <input
                    type="number"
                    required
                    disabled={floorForm.type !== "Piso"}
                    value={floorForm.level}
                    onChange={(e) => setFloorForm({ ...floorForm, level: Number(e.target.value) })}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold text-xs">Ruta Imagen de la Planta</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: images/floor-plans/piso-5.webp"
                  value={floorForm.imagePath}
                  onChange={(e) => setFloorForm({ ...floorForm, imagePath: e.target.value })}
                  className="input input-bordered w-full"
                />
              </div>

              <div className="modal-action border-t pt-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFloorModalOpen(false)}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-warning bg-brand-orange text-white"
                >
                  {isPending && <span className="loading loading-spinner loading-xs" />}
                  {floorEditing ? "Guardar Cambios" : "Crear Planta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: CONFIRM DELETE FLOOR
          ---------------------------------------------------- */}
      {isDeleteFloorConfirmOpen && floorToDelete && isSuperAdmin && (
        <div className="modal modal-open z-50">
          <div className="modal-box bg-white">
            <h3 className="font-bold text-lg text-error flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              ¿Confirmar eliminación de planta?
            </h3>
            <p className="py-4 text-gray-600 text-sm">
              Estás a punto de eliminar la planta <strong>{floorToDelete.name}</strong>. Esta acción
              no se puede deshacer y se ejecuta mediante borrado lógico (soft delete).
            </p>

            {/* Check related units warning */}
            {units.filter((u) => u.floorId === floorToDelete.id).length > 0 && (
              <div className="alert alert-warning text-warning bg-warning/10 border-warning/20 text-xs py-2 my-2 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>¡Importante!:</strong> Esta planta contiene{" "}
                  <strong>
                    {units.filter((u) => u.floorId === floorToDelete.id).length} unidades
                  </strong>{" "}
                  asociadas. Al eliminar la planta, todas estas unidades también se eliminarán del sistema.
                </span>
              </div>
            )}

            <div className="modal-action border-t pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteFloorConfirmOpen(false);
                  setFloorToDelete(null);
                }}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteFloor}
                disabled={isPending}
                className="btn btn-error text-white"
              >
                {isPending && <span className="loading loading-spinner loading-xs" />}
                Eliminar Planta y Dependencias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: ADD / EDIT UNIT (SUPER ADMIN ONLY)
          ---------------------------------------------------- */}
      {isUnitModalOpen && isSuperAdmin && (
        <div className="modal modal-open z-50">
          <div className="modal-box max-w-xl bg-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsUnitModalOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-lg font-primary text-gray-900 border-b pb-2 mb-4">
              {unitEditing ? `Editar Unidad: ${unitEditing.identifier}` : "Añadir Nueva Unidad"}
            </h3>

            <form onSubmit={handleUnitSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-xs">Identificador / Código</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Apt 501"
                    value={unitForm.identifier}
                    onChange={(e) => setUnitForm({ ...unitForm, identifier: e.target.value })}
                    className="input input-bordered w-full"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-xs">Tipo de Unidad</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Flat, Dúplex, Loft"
                    value={unitForm.type}
                    onChange={(e) => setUnitForm({ ...unitForm, type: e.target.value })}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="form-control col-span-2">
                  <label className="label">
                    <span className="label-text font-bold text-xs">Estado Inicial</span>
                  </label>
                  <select
                    value={unitForm.state}
                    onChange={(e) => setUnitForm({ ...unitForm, state: e.target.value })}
                    className="select select-bordered w-full"
                  >
                    <option value="AVAILABLE">Disponible</option>
                    <option value="RESERVED">Apartado</option>
                    <option value="SOLD">Vendido</option>
                    {isSuperAdmin && <option value="COMMON_AREA">Área Común</option>}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-xs">Dormitorios</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={unitForm.bedrooms}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, bedrooms: Number(e.target.value) })
                    }
                    className="input input-bordered w-full"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-xs">Baños</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={unitForm.bathrooms}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, bathrooms: Number(e.target.value) })
                    }
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-xs">Área Construida (m²)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={unitForm.areaSqm}
                    onChange={(e) => setUnitForm({ ...unitForm, areaSqm: Number(e.target.value) })}
                    className="input input-bordered w-full"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold text-xs">Enlace Recorrido Virtual 3D</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://my.matterport.com/show/..."
                    value={unitForm.tourUrl}
                    onChange={(e) => setUnitForm({ ...unitForm, tourUrl: e.target.value })}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              {/* Photo lists inputs */}
              <div className="border-t border-base-200 pt-3 space-y-4">
                <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                  Galerías de Fotos (Ingresar una URL por línea)
                </h4>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-[11px] text-gray-500">
                      Fotos de Unidad Amoblada
                    </span>
                  </label>
                  <textarea
                    placeholder="https://images.example.com/furnished1.jpg&#10;https://images.example.com/furnished2.jpg"
                    value={unitForm.photosFurnishedText}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, photosFurnishedText: e.target.value })
                    }
                    rows={2}
                    className="textarea textarea-bordered font-mono text-xs w-full"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-[11px] text-gray-500">
                      Fotos de Unidad Sin Amoblar
                    </span>
                  </label>
                  <textarea
                    placeholder="https://images.example.com/empty1.jpg&#10;https://images.example.com/empty2.jpg"
                    value={unitForm.photosUnfurnishedText}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, photosUnfurnishedText: e.target.value })
                    }
                    rows={2}
                    className="textarea textarea-bordered font-mono text-xs w-full"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-[11px] text-gray-500">
                      Planos / Medidas
                    </span>
                  </label>
                  <textarea
                    placeholder="https://images.example.com/plan.jpg"
                    value={unitForm.photosPlansText}
                    onChange={(e) => setUnitForm({ ...unitForm, photosPlansText: e.target.value })}
                    rows={2}
                    className="textarea textarea-bordered font-mono text-xs w-full"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-[11px] text-gray-500">
                      Fotos Vista Balcón
                    </span>
                  </label>
                  <textarea
                    placeholder="https://images.example.com/balcony.jpg"
                    value={unitForm.photosBalconyText}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, photosBalconyText: e.target.value })
                    }
                    rows={2}
                    className="textarea textarea-bordered font-mono text-xs w-full"
                  />
                </div>
              </div>

              <div className="modal-action border-t pt-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-warning bg-brand-orange text-white"
                >
                  {isPending && <span className="loading loading-spinner loading-xs" />}
                  {unitEditing ? "Guardar Cambios" : "Crear Unidad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: CONFIRM DELETE UNIT
          ---------------------------------------------------- */}
      {isDeleteUnitConfirmOpen && unitToDelete && isSuperAdmin && (
        <div className="modal modal-open z-50">
          <div className="modal-box bg-white">
            <h3 className="font-bold text-lg text-error flex items-center gap-2">
              <Trash2 className="w-6 h-6" />
              ¿Confirmar eliminación de unidad?
            </h3>
            <p className="py-4 text-gray-600 text-sm">
              ¿Estás seguro de que deseas eliminar la unidad{" "}
              <strong>{unitToDelete.identifier}</strong>? Se aplicará borrado lógico (soft delete).
            </p>

            <div className="modal-action border-t pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteUnitConfirmOpen(false);
                  setUnitToDelete(null);
                }}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteUnit}
                disabled={isPending}
                className="btn btn-error text-white"
              >
                {isPending && <span className="loading loading-spinner loading-xs" />}
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: UNIT DETAILS VIEWER & MEDIA TAB PANEL
          ---------------------------------------------------- */}
      {isDetailsModalOpen && selectedUnit && (
        <div className="modal modal-open z-[60]">
          <div className="modal-box max-w-4xl bg-white max-h-[90vh] overflow-y-auto p-6">
            {/* Header info */}
            <div className="flex justify-between items-start gap-4 border-b pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-orange/10 rounded-xl text-brand-orange shrink-0">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl font-primary text-gray-900">
                    Detalles de Unidad: {selectedUnit.identifier}
                  </h3>
                  <span className="text-xs text-gray-500">
                    Tipo: {selectedUnit.type || "Flat"} • Planta:{" "}
                    {floors.find((f) => f.id === selectedUnit.floorId)?.name || "N/A"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="btn btn-sm btn-circle btn-ghost"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Specs Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-base-200/50 p-3 rounded-lg border text-center">
                <span className="text-[10px] text-gray-400 block uppercase">Estado</span>
                <span className={`badge badge-sm border font-bold mt-1 ${getStateColor(selectedUnit.state)}`}>
                  {getStateLabel(selectedUnit.state)}
                </span>
              </div>
              <div className="bg-base-200/50 p-3 rounded-lg border text-center flex flex-col justify-center items-center">
                <span className="text-[10px] text-gray-400 block uppercase">Dormitorios</span>
                <span className="font-bold text-gray-800 text-sm flex items-center gap-1 mt-0.5">
                  <Bed className="w-4 h-4 text-gray-500" /> {selectedUnit.bedrooms || 0}
                </span>
              </div>
              <div className="bg-base-200/50 p-3 rounded-lg border text-center flex flex-col justify-center items-center">
                <span className="text-[10px] text-gray-400 block uppercase">Baños</span>
                <span className="font-bold text-gray-800 text-sm flex items-center gap-1 mt-0.5">
                  <Bath className="w-4 h-4 text-gray-500" /> {selectedUnit.bathrooms || 0}
                </span>
              </div>
              <div className="bg-base-200/50 p-3 rounded-lg border text-center flex flex-col justify-center items-center">
                <span className="text-[10px] text-gray-400 block uppercase">Área Total</span>
                <span className="font-bold text-gray-800 text-sm flex items-center gap-1 mt-0.5">
                  <Maximize className="w-4 h-4 text-gray-500" /> {selectedUnit.areaSqm || 0} m²
                </span>
              </div>
            </div>

            {/* Media Tabs Header */}
            <div className="tabs tabs-bordered w-full mb-4">
              {(isSuperAdmin || selectedUnit.photosFurnished.length > 0) && (
                <button
                  onClick={() => {
                    setActiveDetailTab("furnished");
                    setSelectedImageUrl(null);
                    setImageCopied(false);
                  }}
                  className={`tab ${activeDetailTab === "furnished" ? "tab-active border-brand-orange text-brand-orange font-bold" : "text-gray-500"}`}
                >
                  Amoblado
                </button>
              )}
              {(isSuperAdmin || selectedUnit.photosUnfurnished.length > 0) && (
                <button
                  onClick={() => {
                    setActiveDetailTab("unfurnished");
                    setSelectedImageUrl(null);
                    setImageCopied(false);
                  }}
                  className={`tab ${activeDetailTab === "unfurnished" ? "tab-active border-brand-orange text-brand-orange font-bold" : "text-gray-500"}`}
                >
                  Sin Amoblar
                </button>
              )}
              {(isSuperAdmin || selectedUnit.photosPlans.length > 0) && (
                <button
                  onClick={() => {
                    setActiveDetailTab("plans");
                    setSelectedImageUrl(null);
                    setImageCopied(false);
                  }}
                  className={`tab ${activeDetailTab === "plans" ? "tab-active border-brand-orange text-brand-orange font-bold" : "text-gray-500"}`}
                >
                  Planos / Medidas
                </button>
              )}
              {(isSuperAdmin || selectedUnit.photosBalcony.length > 0) && (
                <button
                  onClick={() => {
                    setActiveDetailTab("balcony");
                    setSelectedImageUrl(null);
                    setImageCopied(false);
                  }}
                  className={`tab ${activeDetailTab === "balcony" ? "tab-active border-brand-orange text-brand-orange font-bold" : "text-gray-500"}`}
                >
                  Vista Balcón
                </button>
              )}
              {(isSuperAdmin || selectedUnit.gallery.length > 0) && (
                <button
                  onClick={() => {
                    setActiveDetailTab("gallery");
                    setSelectedImageUrl(null);
                    setImageCopied(false);
                  }}
                  className={`tab ${activeDetailTab === "gallery" ? "tab-active border-brand-orange text-brand-orange font-bold" : "text-gray-500"}`}
                >
                  Galería
                </button>
              )}
              <button
                onClick={() => {
                  setActiveDetailTab("brochure");
                  setSelectedImageUrl(null);
                  setImageCopied(false);
                }}
                className={`tab ${activeDetailTab === "brochure" ? "tab-active border-brand-orange text-brand-orange font-bold" : "text-gray-500"}`}
              >
                Brochure
              </button>
            </div>

            {/* Media Tabs Body */}
            <div className="bg-base-200 p-4 rounded-xl min-h-[300px] border flex flex-col justify-center items-center w-full">
               {/* Tab: Furnished */}
               {activeDetailTab === "furnished" && (
                 <div className="w-full">
                   {selectedUnit.photosFurnished.length === 0 ? (
                     <div className="text-gray-400 text-center py-12">No hay fotos de la unidad amoblada disponibles.</div>
                   ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {selectedUnit.photosFurnished.map((url, idx) => {
                         const isSelected = selectedImageUrl === url;
                         return (
                           <div
                             key={idx}
                             onClick={() => {
                               if (selectedImageUrl === url) {
                                 setSelectedImageUrl(null);
                                 setImageCopied(false);
                               } else {
                                 setSelectedImageUrl(url);
                                 setImageCopied(false);
                               }
                             }}
                             className={`relative aspect-video rounded-lg overflow-hidden border bg-white cursor-pointer transition-all duration-300 ${
                               isSelected
                                 ? "border-brand-orange ring-2 ring-brand-orange/40 shadow-[0_0_15px_rgba(245,156,29,0.45)] scale-[0.98]"
                                 : "border-base-300 shadow-sm hover:border-brand-orange/40"
                             }`}
                           >
                             <img src={getAssetUrl(url)} alt={`Amoblado ${idx + 1}`} className="w-full h-full object-cover" />
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
               )}
 
               {/* Tab: Unfurnished */}
               {activeDetailTab === "unfurnished" && (
                 <div className="w-full">
                   {selectedUnit.photosUnfurnished.length === 0 ? (
                     <div className="text-gray-400 text-center py-12">No hay fotos sin amoblar disponibles.</div>
                   ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {selectedUnit.photosUnfurnished.map((url, idx) => {
                         const isSelected = selectedImageUrl === url;
                         return (
                           <div
                             key={idx}
                             onClick={() => {
                               if (selectedImageUrl === url) {
                                 setSelectedImageUrl(null);
                                 setImageCopied(false);
                               } else {
                                 setSelectedImageUrl(url);
                                 setImageCopied(false);
                               }
                             }}
                             className={`relative aspect-video rounded-lg overflow-hidden border bg-white cursor-pointer transition-all duration-300 ${
                               isSelected
                                 ? "border-brand-orange ring-2 ring-brand-orange/40 shadow-[0_0_15px_rgba(245,156,29,0.45)] scale-[0.98]"
                                 : "border-base-300 shadow-sm hover:border-brand-orange/40"
                             }`}
                           >
                             <img src={getAssetUrl(url)} alt={`Sin Amoblar ${idx + 1}`} className="w-full h-full object-cover" />
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
               )}
 
               {/* Tab: Plans */}
               {activeDetailTab === "plans" && (
                 <div className="w-full">
                   {selectedUnit.photosPlans.length === 0 ? (
                     <div className="text-gray-400 text-center py-12">No hay imágenes de planos o medidas disponibles.</div>
                   ) : (
                     <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
                       {selectedUnit.photosPlans.map((url, idx) => {
                         const isSelected = selectedImageUrl === url;
                         return (
                           <div
                             key={idx}
                             onClick={() => {
                               if (selectedImageUrl === url) {
                                 setSelectedImageUrl(null);
                                 setImageCopied(false);
                               } else {
                                 setSelectedImageUrl(url);
                                 setImageCopied(false);
                               }
                             }}
                             className={`relative aspect-auto rounded-lg overflow-hidden border bg-white p-2 cursor-pointer transition-all duration-300 ${
                               isSelected
                                 ? "border-brand-orange ring-2 ring-brand-orange/40 shadow-[0_0_15px_rgba(245,156,29,0.45)] scale-[0.98]"
                                 : "border-base-300"
                             }`}
                           >
                             <img src={getAssetUrl(url)} alt={`Planos ${idx + 1}`} className="max-h-[400px] mx-auto object-contain" />
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
               )}
 
               {/* Tab: Balcony */}
               {activeDetailTab === "balcony" && (
                 <div className="w-full">
                   {selectedUnit.photosBalcony.length === 0 ? (
                     <div className="text-gray-400 text-center py-12">No hay fotos de la vista del balcón disponibles.</div>
                   ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {selectedUnit.photosBalcony.map((url, idx) => {
                         const isSelected = selectedImageUrl === url;
                         return (
                           <div
                             key={idx}
                             onClick={() => {
                               if (selectedImageUrl === url) {
                                 setSelectedImageUrl(null);
                                 setImageCopied(false);
                               } else {
                                 setSelectedImageUrl(url);
                                 setImageCopied(false);
                               }
                             }}
                             className={`relative aspect-video rounded-lg overflow-hidden border bg-white cursor-pointer transition-all duration-300 ${
                               isSelected
                                 ? "border-brand-orange ring-2 ring-brand-orange/40 shadow-[0_0_15px_rgba(245,156,29,0.45)] scale-[0.98]"
                                 : "border-base-300 shadow-sm hover:border-brand-orange/40"
                             }`}
                           >
                             <img src={getAssetUrl(url)} alt={`Balcón ${idx + 1}`} className="w-full h-full object-cover" />
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
               )}
 
               {/* Tab: Gallery */}
               {activeDetailTab === "gallery" && (
                 <div className="w-full">
                   {selectedUnit.gallery.length === 0 ? (
                     <div className="text-gray-400 text-center py-12">No hay imágenes de galería disponibles.</div>
                   ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {selectedUnit.gallery.map((url, idx) => {
                         const isSelected = selectedImageUrl === url;
                         return (
                           <div
                             key={idx}
                             onClick={() => {
                               if (selectedImageUrl === url) {
                                 setSelectedImageUrl(null);
                                 setImageCopied(false);
                               } else {
                                 setSelectedImageUrl(url);
                                 setImageCopied(false);
                               }
                             }}
                             className={`relative aspect-video rounded-lg overflow-hidden border bg-white cursor-pointer transition-all duration-300 ${
                               isSelected
                                 ? "border-brand-orange ring-2 ring-brand-orange/40 shadow-[0_0_15px_rgba(245,156,29,0.45)] scale-[0.98]"
                                 : "border-base-300 shadow-sm hover:border-brand-orange/40"
                             }`}
                           >
                             <img src={getAssetUrl(url)} alt={`Galería ${idx + 1}`} className="w-full h-full object-cover" />
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
               )}
 
               {/* Selected Image Sharing panel (rendered at the bottom of all image tabs) */}
               {activeDetailTab !== "brochure" && selectedImageUrl && (
                 <div className="mt-4 p-4 bg-orange-50 border border-brand-orange/20 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in w-full text-left">
                   <div className="flex items-center gap-2.5">
                     <div className="w-10 h-10 rounded-lg overflow-hidden border border-brand-orange/20 bg-white shrink-0 shadow-sm">
                       <img src={getAssetUrl(selectedImageUrl)} className="w-full h-full object-cover" alt="Selected thumbnail" />
                     </div>
                     <div>
                       <p className="text-xs font-bold text-gray-700 font-primary">Compartir imagen seleccionada</p>
                       <p className="text-[10px] text-gray-500 font-secondary mt-0.5 truncate max-w-[150px] sm:max-w-[200px]">
                         {selectedImageUrl.split("/").pop()}
                       </p>
                     </div>
                   </div>
                   
                   <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
                     {/* Copy Image Link */}
                     <button
                       onClick={() => {
                         const absUrl = getAbsoluteAssetUrl(selectedImageUrl);
                         navigator.clipboard.writeText(absUrl)
                           .then(() => {
                             setImageCopied(true);
                             setTimeout(() => setImageCopied(false), 2000);
                           });
                       }}
                       className="btn btn-sm btn-outline btn-neutral flex items-center gap-1.5"
                     >
                       {imageCopied ? (
                         <>
                           <Check className="w-3.5 h-3.5 text-success" />
                           Copiado
                         </>
                       ) : (
                         <>
                           <Copy className="w-3.5 h-3.5" />
                           Copiar Enlace
                         </>
                       )}
                     </button>
 
                     {/* WhatsApp Share Image */}
                     <a
                       href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                         `Hola, te comparto esta imagen de la unidad ${selectedUnit.identifier} del Showroom Mar de Java: ${getAbsoluteAssetUrl(selectedImageUrl)}`
                       )}`}
                       target="_blank"
                       rel="noreferrer"
                       className="btn btn-sm btn-success text-white flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 border-0"
                     >
                       <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" fill="currentColor">
                         <path d="M12.031 2c-5.516 0-9.99 4.474-9.99 9.99 0 1.764.46 3.48 1.332 4.988l-1.42 5.185 5.306-1.392c1.458.796 3.1 1.21 4.773 1.21 5.515 0 9.99-4.473 9.99-9.99 0-5.517-4.475-9.99-9.99-9.99zM17.56 16.5c-.244.688-1.22 1.272-1.688 1.353-.424.073-.974.135-2.775-.61-2.3-1.01-3.765-3.344-3.882-3.498-.117-.153-.94-1.25-.94-2.385 0-1.135.59-1.692.802-1.92.213-.227.467-.285.62-.285.155 0 .31.002.443.01.144.007.337-.054.527.404.195.474.67 1.637.728 1.75.058.115.097.25.02.404-.076.155-.115.253-.23.385-.115.132-.244.296-.348.398-.115.11-.237.23-.102.463.136.232.6 1.012 1.288 1.625.886.79 1.632 1.032 1.862 1.15.23.116.364.098.5-.058.136-.156.59-.688.748-.92.16-.233.32-.195.538-.115.22.08 1.388.654 1.63.774.24.12.4.18.46.28.06.1.06.58-.184 1.268z" />
                       </svg>
                       WhatsApp
                     </a>
 
                     {/* Email Share Image */}
                     <a
                       href={`mailto:?subject=${encodeURIComponent(
                         `Imagen de la unidad ${selectedUnit.identifier} - Showroom Mar de Java`
                       )}&body=${encodeURIComponent(
                         `Hola,\n\nTe comparto esta imagen de la unidad ${selectedUnit.identifier} del Showroom Mar de Java:\n\n${getAbsoluteAssetUrl(selectedImageUrl)}\n\nSaludos!`
                       )}`}
                       className="btn btn-sm btn-outline btn-neutral flex items-center gap-1.5"
                     >
                       <Mail className="w-3.5 h-3.5" />
                       Correo
                     </a>
                   </div>
                 </div>
               )}

              {/* Tab: Brochure */}
              {activeDetailTab === "brochure" && (
                <div className="w-full flex flex-col justify-center items-center py-6 text-center">
                  {loadingBrochure ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <span className="loading loading-spinner text-primary loading-md"></span>
                      <p className="text-sm text-gray-500 mt-2">Cargando brochure...</p>
                    </div>
                  ) : !unitBrochureUrl ? (
                    <div className="w-full max-w-md flex flex-col items-center gap-4">
                      <div className="text-gray-400">Brochure digital no configurado para esta unidad.</div>

                      {/* Carga directa del brochure de esta unidad, para no tener
                          que ir al módulo Brochure a asociarlo a mano. */}
                      {isSupervisor && (
                        <div className="w-full border-2 border-dashed border-base-300 rounded-xl p-5 flex flex-col items-center gap-3 bg-base-100">
                          <input
                            id="unit-brochure-input"
                            type="file"
                            accept="application/pdf"
                            className="file-input file-input-bordered file-input-sm w-full"
                            disabled={uploadingUnitBrochure}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadUnitBrochure(file);
                              e.target.value = "";
                            }}
                          />
                          {uploadingUnitBrochure ? (
                            <span className="text-xs text-gray-500 flex items-center gap-2">
                              <span className="loading loading-spinner loading-xs" />
                              Subiendo brochure...
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Solo PDF. Quedará asociado a la unidad {selectedUnit?.identifier}.
                            </span>
                          )}
                          {unitBrochureError && (
                            <span className="text-xs text-error">{unitBrochureError}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full max-w-3xl flex flex-col gap-4">
                      <div className="relative w-full h-[500px] rounded-xl overflow-hidden shadow-md border-2 border-base-300 bg-white">
                        <iframe
                          src={getAssetUrl(unitBrochureUrl)}
                          className="w-full h-full border-none"
                          title="Vista Previa de Brochure"
                        />
                      </div>
                      <div className="flex flex-wrap justify-center gap-3">
                        <a
                          href={getAssetUrl(unitBrochureUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-warning bg-brand-orange hover:bg-brand-dark-orange text-white flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir Brochure
                        </a>

                        {/* Copy Link */}
                        <button
                          onClick={handleCopyLink}
                          className="btn btn-outline btn-neutral flex items-center gap-2"
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4 text-success animate-scale-in" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copiar Enlace
                            </>
                          )}
                        </button>

                        {/* WhatsApp sharing */}
                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                            `Hola, te comparto el brochure de la unidad ${selectedUnit.identifier} del Showroom Mar de Java: ${getAbsoluteAssetUrl(unitBrochureUrl)}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-success text-white flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-0"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.031 2c-5.516 0-9.99 4.474-9.99 9.99 0 1.764.46 3.48 1.332 4.988l-1.42 5.185 5.306-1.392c1.458.796 3.1 1.21 4.773 1.21 5.515 0 9.99-4.473 9.99-9.99 0-5.517-4.475-9.99-9.99-9.99zM17.56 16.5c-.244.688-1.22 1.272-1.688 1.353-.424.073-.974.135-2.775-.61-2.3-1.01-3.765-3.344-3.882-3.498-.117-.153-.94-1.25-.94-2.385 0-1.135.59-1.692.802-1.92.213-.227.467-.285.62-.285.155 0 .31.002.443.01.144.007.337-.054.527.404.195.474.67 1.637.728 1.75.058.115.097.25.02.404-.076.155-.115.253-.23.385-.115.132-.244.296-.348.398-.115.11-.237.23-.102.463.136.232.6 1.012 1.288 1.625.886.79 1.632 1.032 1.862 1.15.23.116.364.098.5-.058.136-.156.59-.688.748-.92.16-.233.32-.195.538-.115.22.08 1.388.654 1.63.774.24.12.4.18.46.28.06.1.06.58-.184 1.268z" />
                          </svg>
                          WhatsApp
                        </a>

                        {/* Email sharing */}
                        <a
                          href={`mailto:?subject=${encodeURIComponent(
                            `Brochure de la unidad ${selectedUnit.identifier} - Showroom Mar de Java`
                          )}&body=${encodeURIComponent(
                            `Hola,\n\nTe comparto el brochure de la unidad ${selectedUnit.identifier} del Showroom Mar de Java:\n\n${getAbsoluteAssetUrl(unitBrochureUrl)}\n\nSaludos!`
                          )}`}
                          className="btn btn-outline btn-neutral flex items-center gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          Correo
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Change State dropdown & Super Admin Edit option inside details modal */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-t pt-4 mt-6 gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-bold text-gray-500 uppercase">Cambiar Estado:</span>
                <select
                  value={selectedUnit.state}
                  onChange={(e) => handleStatusChange(selectedUnit.id, e.target.value)}
                  className="select select-bordered select-sm text-gray-800"
                >
                  <option value="AVAILABLE">Disponible</option>
                  <option value="RESERVED">Apartado</option>
                  <option value="SOLD">Vendido</option>
                  {isSuperAdmin && <option value="COMMON_AREA">Área Común</option>}
                </select>
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                {isSuperAdmin && (
                  <button
                    onClick={(e) => {
                      setIsDetailsModalOpen(false);
                      openEditUnitModal(selectedUnit, e);
                    }}
                    className="btn btn-sm btn-outline border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Editar Información
                  </button>
                )}
                <button onClick={() => setIsDetailsModalOpen(false)} className="btn btn-sm btn-ghost">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
