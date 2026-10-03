"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Edit, MapPin, Search, Loader2, ToggleLeft, ToggleRight, X, Compass, Upload, Image as ImageIcon, Check, AlertTriangle } from "lucide-react";
import { 
  createLocation, 
  updateLocation, 
  deleteLocation 
} from "@/app/actions/locations";
import { uploadMedia } from "@/app/actions/media";

type LocationItem = {
  id: string;
  name: string;
  category: string;
  imagePath: string;
  longitude: number;
  latitude: number;
  isActive: boolean;
  createdAt: Date | null;
};

interface MapDashboardProps {
  initialLocations: LocationItem[];
}

const CATEGORIES = [
  "Finanzas",
  "Salud y bienestar",
  "Comercio",
  "Restaurantes",
  "Áreas verdes y Recreación",
  "Lifestyle",
  "Educación",
  "Proyectos",
  "Otros proyectos",
  "Otros"
];

// Presets grouped by category to help the administrator select icons easily
const ICON_PRESETS: Record<string, string[]> = {
  "Finanzas": [
    "icons/FINANZAS/bbva.png",
    "icons/FINANZAS/bcp.png",
    "icons/FINANZAS/cajeros.png",
    "icons/FINANZAS/interbank.png",
    "icons/FINANZAS/pichincha.png",
    "icons/FINANZAS/scotiabank.png"
  ],
  "Salud y bienestar": [
    "icons/SALUD_Y_BIENESTAR/inkafarma.png",
    "icons/SALUD_Y_BIENESTAR/mifarma.png",
    "icons/SALUD_Y_BIENESTAR/hospital.png",
    "icons/SALUD_Y_BIENESTAR/huron_azul.png"
  ],
  "Comercio": [
    "icons/COMERCIO/tambo.png",
    "icons/COMERCIO/oxxo.png",
    "icons/COMERCIO/tailoy.png",
    "icons/COMERCIO/mercado.png",
    "icons/COMERCIO/plaza_san_miguel.png",
    "icons/COMERCIO/tottus.png",
    "icons/COMERCIO/organa.png"
  ],
  "Restaurantes": [
    "icons/RESTAURANTES/norkys.png",
    "icons/RESTAURANTES/villa_chicken.png",
    "icons/RESTAURANTES/bolivariano.png",
    "icons/RESTAURANTES/bembos.png",
    "icons/RESTAURANTES/master_kong.png"
  ],
  "Áreas verdes y Recreación": [
    "icons/AREAS_VERDES_Y_RECREACION/parque_1.png",
    "icons/AREAS_VERDES_Y_RECREACION/parque_2.png",
    "icons/AREAS_VERDES_Y_RECREACION/parque_3.png",
    "icons/AREAS_VERDES_Y_RECREACION/parque_6.png",
    "icons/AREAS_VERDES_Y_RECREACION/parque_7.png"
  ],
  "Lifestyle": [
    "icons/LIFESTYLE/smartfit.png",
    "icons/LIFESTYLE/estadio.png"
  ],
  "Educación": [
    "icons/EDUCACION/colegio_1.png",
    "icons/EDUCACION/preescolar_2.png",
    "icons/EDUCACION/preescolar_4.png",
    "icons/EDUCACION/san_martin.png",
    "icons/EDUCACION/pacifico.png",
    "icons/EDUCACION/peruano_japones.png"
  ],
  "Proyectos": [
    "ICONOS/otros-proyectos/logo-bujele.png"
  ],
  "Otros proyectos": [
    "ICONOS/otros-proyectos/logo-bujele.png"
  ]
};

export default function MapDashboard({ initialLocations }: MapDashboardProps) {
  const [locations, setLocations] = useState<LocationItem[]>(initialLocations);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState("");
  
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Finanzas");
  const [imagePath, setImagePath] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Custom icon upload states
  const [iconMode, setIconMode] = useState<"preset" | "upload">("preset");
  const [iconFile, setIconFile] = useState<File | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered locations list
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategoryFilter ? loc.category === selectedCategoryFilter : true;
      return matchesSearch && matchesCategory;
    });
  }, [locations, searchTerm, selectedCategoryFilter]);

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setEditingId("");
    setName("");
    setCategory("Finanzas");
    setImagePath("icons/FINANZAS/interbank.png");
    setLat("-12.075");
    setLng("-77.067");
    setIsActive(true);
    setIconMode("preset");
    setIconFile(null);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (loc: LocationItem) => {
    setModalMode("edit");
    setEditingId(loc.id);
    setName(loc.name);
    setCategory(loc.category);
    setImagePath(loc.imagePath);
    setLat(loc.latitude.toString());
    setLng(loc.longitude.toString());
    setIsActive(loc.isActive);
    setIconMode(loc.imagePath && (loc.imagePath.startsWith("http") || loc.imagePath.startsWith("/") || loc.imagePath.startsWith("media/")) ? "upload" : "preset");
    setIconFile(null);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("El nombre es requerido.");
      return;
    }

    const latitudeNum = parseFloat(lat);
    const longitudeNum = parseFloat(lng);

    if (isNaN(latitudeNum) || latitudeNum < -90 || latitudeNum > 90) {
      setFormError("Latitud inválida (debe estar entre -90 y 90).");
      return;
    }

    if (isNaN(longitudeNum) || longitudeNum < -180 || longitudeNum > 180) {
      setFormError("Longitud inválida (debe estar entre -180 y 180).");
      return;
    }

    setIsSaving(true);

    try {
      let finalImagePath = imagePath;

      // Handle custom icon upload
      if (iconMode === "upload" && iconFile) {
        const formData = new FormData();
        formData.append("file", iconFile);
        formData.append("title", `Icon for ${name}`);
        formData.append("category", "EXTRA");
        
        const uploadedMedia = await uploadMedia(formData);
        finalImagePath = uploadedMedia.url; // Use uploaded R2 media URL as icon path
      }

      if (modalMode === "create") {
        const newLoc = await createLocation(name, category, finalImagePath || null, longitudeNum, latitudeNum, isActive);
        setLocations((prev) => [
          ...prev,
          {
            id: newLoc.id,
            name: newLoc.name,
            category: newLoc.category,
            imagePath: newLoc.imagePath || "",
            longitude: newLoc.longitude,
            latitude: newLoc.latitude,
            isActive: newLoc.isActive,
            createdAt: newLoc.createdAt,
          },
        ]);
      } else {
        const updatedLoc = await updateLocation(editingId, name, category, finalImagePath || null, longitudeNum, latitudeNum, isActive);
        setLocations((prev) =>
          prev.map((l) =>
            l.id === editingId
              ? {
                  ...l,
                  name: updatedLoc.name,
                  category: updatedLoc.category,
                  imagePath: updatedLoc.imagePath || "",
                  longitude: updatedLoc.longitude,
                  latitude: updatedLoc.latitude,
                  isActive: updatedLoc.isActive,
                }
              : l
          )
        );
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Error al guardar el punto de interés.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (loc: LocationItem) => {
    try {
      await updateLocation(loc.id, loc.name, loc.category, loc.imagePath || null, loc.longitude, loc.latitude, !loc.isActive);
      setLocations((prev) =>
        prev.map((l) => (l.id === loc.id ? { ...l, isActive: !loc.isActive } : l))
      );
    } catch (err: any) {
      showNotification("error", err.message || "Error al alternar estado.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este punto de interés?")) return;

    try {
      await deleteLocation(id);
      setLocations((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      showNotification("error", err.message || "Error al eliminar el punto.");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto animate-fade-in pb-12 font-secondary">
      {notification && (
        <div className="toast toast-top toast-end z-[100]">
          <div className={`alert shadow-lg ${notification.type === "success" ? "alert-success text-white" : "alert-error text-white"}`}>
            <div>
              {notification.type === "success" ? <Check className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
              <span>{notification.message}</span>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="border-b pb-5 border-base-300 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-primary text-brand-orange flex items-center gap-2">
            <MapPin className="w-6 h-6 text-brand-orange animate-pulse" />
            Mapa Interactivo
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona los puntos de interés cercanos y categorías que se muestran en el mapa.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="btn bg-brand-orange hover:bg-brand-dark-orange text-white border-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Punto
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-base-100 p-4 rounded-xl border border-base-200 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            className="input input-bordered w-full pl-9 pr-4 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Category Filter */}
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            className="select select-bordered text-sm w-full sm:w-48"
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Points of Interest List Table */}
      <div className="bg-base-100 rounded-xl shadow-sm border border-base-200 overflow-hidden">
        {filteredLocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-center">
            <MapPin size={48} className="text-base-300 mb-2" />
            <p className="text-sm font-semibold">No se encontraron puntos de interés</p>
            <p className="text-xs text-gray-400 mt-1">Prueba a ajustar tus filtros de búsqueda o crea uno nuevo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="table w-full text-sm">
              <thead>
                <tr className="bg-base-200/50 text-gray-600">
                  <th>Nombre / Ícono</th>
                  <th>Categoría</th>
                  <th>Coordenadas (Lat / Lng)</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-base-200/30 transition-colors">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-base-100 border p-1.5 shadow-sm flex items-center justify-center shrink-0">
                          {loc.imagePath ? (
                            <img 
                              src={`/${loc.imagePath}`} 
                              alt={loc.name} 
                              className="w-full h-full object-contain"
                              onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                          ) : (
                            <MapPin className="text-gray-400" size={18} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{loc.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]">{loc.imagePath || 'Sin ícono'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-outline border-base-300 text-gray-600 text-xs font-semibold px-2.5 py-1">
                        {loc.category}
                      </span>
                    </td>
                    <td>
                      <div className="text-xs font-semibold text-gray-500 font-mono">
                        <p>Lat: {loc.latitude.toFixed(6)}</p>
                        <p>Lng: {loc.longitude.toFixed(6)}</p>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(loc)}
                        className="focus:outline-none"
                        title={loc.isActive ? "Hacer inactivo" : "Hacer activo"}
                      >
                        {loc.isActive ? (
                          <span className="text-xs text-green-600 font-bold flex items-center gap-0.5">
                            <ToggleRight className="w-5 h-5 fill-green-200 text-green-600" /> Activo
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <ToggleLeft className="w-5 h-5 text-gray-400" /> Inactivo
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="text-right">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => handleOpenEditModal(loc)}
                          className="btn btn-ghost btn-xs text-brand-orange hover:bg-orange-50 p-1 rounded"
                          title="Editar punto"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(loc.id)}
                          className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50 p-1 rounded"
                          title="Eliminar punto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-xl bg-base-100 p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-lg font-primary text-gray-800">
              {modalMode === "create" ? "Nuevo Punto de Interés" : "Editar Punto de Interés"}
            </h3>

            <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-gray-600">Nombre del Lugar</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. BCP Pueblo Libre"
                    className="input input-bordered w-full text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Category */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-gray-600">Categoría</span>
                  </label>
                  <select 
                    className="select select-bordered text-sm w-full"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      // Update default icon preset when category changes if creating a new one
                      if (modalMode === "create" && ICON_PRESETS[e.target.value]) {
                        setImagePath(ICON_PRESETS[e.target.value][0]);
                      }
                    }}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Latitude */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-gray-600">Latitud</span>
                  </label>
                  <input
                    type="text"
                    placeholder="-12.07592"
                    className="input input-bordered w-full text-sm font-mono"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    required
                  />
                </div>

                {/* Longitude */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-gray-600">Longitud</span>
                  </label>
                  <input
                    type="text"
                    placeholder="-77.067632"
                    className="input input-bordered w-full text-sm font-mono"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Icon Selection Mode Selector */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold text-xs text-gray-600">Origen del Ícono</span>
                </label>
                <div className="tabs tabs-boxed flex bg-base-200 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setIconMode("preset")}
                    className={`flex-1 tab py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                      iconMode === "preset" ? "bg-white text-brand-orange shadow-sm font-bold" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Presets Locales
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconMode("upload")}
                    className={`flex-1 tab py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                      iconMode === "upload" ? "bg-white text-brand-orange shadow-sm font-bold" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Subir Ícono Propio
                  </button>
                </div>
              </div>

              {iconMode === "preset" ? (
                <>
                  {/* Icon Image Path */}
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-bold text-xs text-gray-600">Ruta del Ícono / Imagen (Ej. icons/FINANZAS/bcp.png)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="icons/FINANZAS/interbank.png"
                      className="input input-bordered w-full text-sm font-mono"
                      value={imagePath}
                      onChange={(e) => setImagePath(e.target.value)}
                    />
                  </div>

                  {/* Icon Presets Selector based on chosen category */}
                  {ICON_PRESETS[category] && (
                    <div className="bg-base-200/55 p-3.5 rounded-lg border border-base-200 flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1">
                        <Compass size={12} /> Sugerencias de íconos para "{category}":
                      </span>
                      <div className="flex gap-3 overflow-x-auto py-1 scrollbar-thin">
                        {ICON_PRESETS[category].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setImagePath(preset)}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border bg-base-100 shadow-sm transition-all shrink-0 hover:border-brand-orange ${
                              imagePath === preset 
                                ? 'border-brand-orange ring-1 ring-brand-orange bg-orange-50/20' 
                                : 'border-base-200'
                            }`}
                          >
                            <div className="w-8 h-8 flex items-center justify-center">
                              <img src={`/${preset}`} alt="preset icon" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-[9px] text-gray-600 font-mono">{preset.split('/').pop()?.split('.')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Icon Upload Field */
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-xs text-gray-600">Subir Archivo de Ícono (Recomendado .png transparente)</span>
                  </label>
                  <input
                    type="file"
                    className="file-input file-input-bordered w-full text-sm"
                    onChange={(e) => setIconFile(e.target.files?.[0] || null)}
                    accept="image/*"
                    required={modalMode === "create" && !imagePath}
                  />
                  {imagePath && (imagePath.startsWith("http") || imagePath.startsWith("/") || imagePath.startsWith("media/")) && (
                    <div className="mt-2 text-xs text-gray-500 flex flex-col gap-1">
                      <span>Ícono subido actual:</span>
                      <div className="w-10 h-10 bg-white rounded-full p-1 border shadow-sm flex items-center justify-center">
                        <img 
                          src={imagePath.startsWith("http") || imagePath.startsWith("/") ? imagePath : `/${imagePath}`} 
                          alt="Icono actual" 
                          className="w-full h-full object-contain" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Is Active */}
              <div className="form-control flex-row items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="poi-active-check"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="poi-active-check" className="label-text text-sm font-semibold text-gray-700 cursor-pointer">
                  Punto de Interés Activo (Visible en el mapa interactivo)
                </label>
              </div>

              {formError && <div className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-md">{formError}</div>}

              <div className="modal-action gap-2 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="btn btn-ghost text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="btn bg-brand-orange hover:bg-brand-dark-orange text-white border-0 text-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
