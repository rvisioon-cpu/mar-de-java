"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Sparkles, Send, Loader2, RefreshCw, Check, CheckSquare } from "lucide-react";
import dynamic from "next/dynamic";
import { getAssetUrl } from "@/utils/assets";

// Cargar el editor de Konva dinámicamente desactivando el SSR
const TemplateEditor = dynamic(
  () => import("./TemplateEditor"),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 border border-dashed border-base-300 rounded-2xl gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider animate-pulse">
          Cargando mesa de diseño interactiva...
        </p>
      </div>
    )
  }
);

interface AIGeneratorProps {
  socialContentId: string;
  template: {
    platformLabel: string;
    typeLabel: string;
    width: number;
    height: number;
    aspectRatio: string;
  };
  referenceUrls: string[];
  initialMessages: { id: string; sender: string; text: string; createdAt: any }[];
  modo: "manual" | "ia" | null;
  templateLayout?: { version: number; texts: Array<{ text: string; color: string; fontSize: number; x: number; y: number }> } | null;
  onBackToMedia: () => void;
  onFinish: () => void;
  /** Avisa al módulo para que recargue el contador mensual de imágenes. */
  onQuotaChange?: () => void;
}

export default function AIGenerator({
  socialContentId,
  template,
  referenceUrls,
  initialMessages,
  modo,
  templateLayout,
  onBackToMedia,
  onFinish,
  onQuotaChange
}: AIGeneratorProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState("");
  // OpenAI es el único motor disponible; Gemini queda deshabilitado en la UI
  // (su código se conserva en el backend para reactivarlo en el futuro).
  const engine = "openai";
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Flujo 2 (IA): Si la imagen generada ha sido aprobada para edición
  const isManualMode = modo === "manual";
  const [isApproved, setIsApproved] = useState(isManualMode);

  // En modo manual el foco es el canvas: el asistente IA es opcional y se abre bajo demanda
  const [showAssistant, setShowAssistant] = useState(!isManualMode);

  // URL de la imagen que servirá de fondo para el lienzo
  const [canvasBgUrl, setCanvasBgUrl] = useState<string>(isManualMode && referenceUrls && referenceUrls.length > 0 ? referenceUrls[0] : "");
  
  // Imagen en previsualización de generación (Fase 1 del Estudio IA)
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");

  // Textos sugeridos por la IA para inyectar en el Canvas
  const [initialTexts, setInitialTexts] = useState<Array<{ text: string; color: string; fontSize: number }>>([]);

  // Rol de cada referencia (subject/composition/style) para el flujo IA.
  // Por defecto "subject": preservar el edificio real es la prioridad.
  const [refTypes, setRefTypes] = useState<Record<string, "subject" | "composition" | "style">>({});

  useEffect(() => {
    setRefTypes((prev) => {
      const next = { ...prev };
      for (const url of referenceUrls) {
        if (!next[url]) next[url] = "subject";
      }
      return next;
    });
  }, [referenceUrls]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Inicializar chat con mensaje de bienvenida
  useEffect(() => {
    if (messages.length === 0) {
      if (isManualMode) {
        setMessages([
          {
            id: "welcome-manual",
            sender: "AI",
            text: `¡Hola! Soy tu asistente de copys. Los medios que seleccionaste ya están en la mesa de trabajo. Pídeme ideas de textos publicitarios (ej: "dame un copy de urgencia para la venta") y los colocaré directamente sobre el lienzo.`,
            createdAt: new Date()
          }
        ]);
      } else {
        setMessages([
          {
            id: "welcome-ia",
            sender: "AI",
            text: `¡Bienvenido al Estudio Creativo IA! He recibido tu render de referencia. ¿Qué modificaciones o concepto te gustaría generar? Escríbeme (ej: "Haz que este edificio se vea al atardecer") para renderizar la imagen base de fondo.`,
            createdAt: new Date()
          }
        ]);
      }
    }
  }, [messages.length, isManualMode]);

  // Desplazar chat al fondo
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Enviar mensaje al LLM
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;

    const userPrompt = inputText.trim();
    setInputText("");

    // Agregar mensaje del usuario de inmediato
    const userMsgId = Date.now().toString();
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: "USER",
        text: userPrompt,
        createdAt: new Date()
      }
    ]);

    setIsGenerating(true);

    try {
      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: userPrompt,
          referenceUrls,
          // Referencias tipadas (subject/composition/style) para el flujo IA
          references: referenceUrls.map((url) => ({ url, type: refTypes[url] || "subject" })),
          width: template.width,
          height: template.height,
          aspectRatio: template.aspectRatio,
          socialContentId,
          engine,
          modo: isManualMode ? "manual" : "ia" // Indica al backend si genera imagen (ia) o copy en JSON (manual)
        })
      });

      const data = await response.json();

      // 429: se agotó el tope mensual de imágenes. No es un fallo técnico, así
      // que se muestra el aviso del servidor en el chat en vez de un error.
      if (response.status === 429 && data?.quotaExceeded) {
        setMessages(prev => [
          ...prev,
          { id: `ai-${Date.now()}`, sender: "AI", text: data.error, createdAt: new Date() }
        ]);
        onQuotaChange?.();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      if (data.success) {
        if (isManualMode) {
          // --- MODO MANUAL: IA genera sugerencias de copy (JSON) ---
          if (data.texts && data.texts.length > 0) {
            setInitialTexts(data.texts);
          }
          
          setMessages(prev => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              sender: "AI",
              text: data.aiResponse || "He redactado estas propuestas y las he colocado sobre el lienzo interactivo.",
              createdAt: new Date()
            }
          ]);
        } else {
          // --- MODO ESTUDIO IA: IA genera imagen de fondo ---
          if (data.resultUrl) {
            setPreviewImageUrl(data.resultUrl);
          }
          
          setMessages(prev => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              sender: "AI",
              text: data.aiResponse || "¡Listo! He procesado tu solicitud de renderizado. Revisa la imagen generada en el lienzo central.",
              createdAt: new Date()
            }
          ]);
          onQuotaChange?.();
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-error-${Date.now()}`,
          sender: "AI",
          text: "Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.",
          createdAt: new Date()
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Guardar la imagen final exportada desde el Canvas en R2
  const handleSaveCanvas = async (imageBase64: string) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/content/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          socialContentId,
          imageBase64
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save final composed image");
      }

      const data = await response.json();
      if (data.success) {
        onFinish();
      }
    } catch (err) {
      console.error("Error saving canvas composition:", err);
      alert("Ocurrió un error al subir el diseño final a la nube. Por favor intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Aprobar la imagen generada por IA y pasar a edición con Canvas
  const handleApproveImage = () => {
    if (!previewImageUrl) return;
    setCanvasBgUrl(previewImageUrl);
    setIsApproved(true);
  };

  // Reiniciar la imagen generada para volver al bucle de IA
  const handleRejectImage = () => {
    setPreviewImageUrl("");
    setMessages(prev => [
      ...prev,
      {
        id: `reject-${Date.now()}`,
        sender: "AI",
        text: "Entendido, reinicié la imagen. Escríbeme qué cambios o detalles te gustaría corregir para generar una nueva versión.",
        createdAt: new Date()
      }
    ]);
  };

  // Relación de Aspecto visual
  const getAspectRatioClass = (ratio: string) => {
    switch (ratio) {
      case "9:16":
        return "aspect-[9/16] h-[340px]";
      case "16:9":
      case "1.91:1":
        return "aspect-[16/9] w-full max-h-[220px]";
      case "4:3":
        return "aspect-[4/3] w-[280px]";
      case "3:4":
        return "aspect-[3/4] h-[300px]";
      case "1:1":
      default:
        return "aspect-[1/1] w-[260px]";
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto animate-fade-in font-secondary">
      {/* Cabecera y Navegación */}
      <div className="flex flex-col gap-2">
        <button 
          onClick={onBackToMedia}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-orange font-semibold self-start transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Medios
        </button>
        <div className="flex justify-between items-center border-b pb-4 border-base-200">
          <div>
            <h1 className="text-xl font-bold font-primary text-gray-800">
              Crear Contenido Final / {template.platformLabel} {template.typeLabel}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Modo: {isManualMode ? "Composición Manual" : "Estudio IA"} — {isApproved ? "Editor Interactivo de Canvas" : "Bucle de Generación IA"}
            </p>
          </div>
          {isApproved && (
            <button
              onClick={() => setShowAssistant(prev => !prev)}
              className={`btn btn-sm gap-1.5 text-xs border ${
                showAssistant
                  ? "bg-orange-50 text-brand-orange border-brand-orange/30 hover:bg-orange-100"
                  : "btn-outline border-base-300 text-gray-600 hover:border-brand-orange hover:text-brand-orange"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {showAssistant ? "Ocultar Asistente IA" : "Asistente IA"}
            </button>
          )}
        </div>
      </div>

      {/* Grid Principal: Diseño condicional */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* CASO A: IMAGEN DE IA APROBADA (O MODO MANUAL) -> EDITOR INTERACTIVO DE CANVAS COMPLETO */}
        {isApproved ? (
          <>
            {/* Panel de Chat con Asistente de IA (40% de ancho, opcional) */}
            {showAssistant && (
            <div className="lg:col-span-4 bg-base-100 rounded-2xl shadow-xs border border-base-200 p-6 flex flex-col h-[580px] animate-fade-in">
              <div className="flex items-center justify-between border-b pb-3 border-base-200 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-50 text-brand-orange rounded">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold font-primary text-gray-800">Asistente de Copy (IA)</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400">Motor:</span>
                  <span className="badge badge-xs bg-orange-50 text-brand-orange border-brand-orange/20 font-bold px-2 py-1.5">OpenAI</span>
                </div>
              </div>

              {/* Chat history */}
              <div className="flex-1 overflow-y-auto pr-2 mb-4 scrollbar-thin flex flex-col gap-4">
                {messages.map((msg) => {
                  const isAI = msg.sender === "AI";
                  return (
                    <div 
                      key={msg.id}
                      className={`chat ${isAI ? "chat-start" : "chat-end animate-fade-in"}`}
                    >
                      <div className="chat-image avatar">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                          isAI ? "bg-brand-orange text-white" : "bg-gray-200 text-gray-700"
                        }`}>
                          {isAI ? "IA" : "U"}
                        </div>
                      </div>
                      <div className="chat-header text-[10px] text-gray-400 mb-0.5 ml-1">
                        {isAI ? "Asistente Mar de Java" : "Usuario"}
                      </div>
                      <div className={`chat-bubble text-xs leading-relaxed max-w-[85%] ${
                        isAI ? "bg-gray-100 text-gray-800" : "bg-brand-orange text-white"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}

                {isGenerating && (
                  <div className="chat chat-start">
                    <div className="chat-image avatar">
                      <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-xs">
                        IA
                      </div>
                    </div>
                    <div className="chat-bubble bg-gray-100 text-gray-800 text-xs flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
                      <span>Sugiriendo copys...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Form Input */}
              <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0 border-t pt-4 border-base-200">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Pide ideas o copys para colocar en el canvas..."
                  className="input input-bordered w-full text-xs focus:border-brand-orange"
                  disabled={isGenerating}
                />
                <button
                  type="submit"
                  disabled={isGenerating || !inputText.trim()}
                  className="btn bg-brand-orange hover:bg-brand-dark-orange text-white border-0 px-4"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
            )}

            {/* Panel de Diseño: Canvas de Konva (a pantalla completa si el asistente está oculto) */}
            <div className={`${showAssistant ? "lg:col-span-6" : "lg:col-span-10"} bg-base-100 rounded-2xl shadow-sm border border-base-200 p-6 flex flex-col min-h-[580px]`}>
              {/* En modo manual se cargan todos los medios seleccionados; en modo IA, la imagen aprobada */}
              <TemplateEditor
                mediaUrls={isManualMode ? referenceUrls : (canvasBgUrl ? [canvasBgUrl] : [])}
                aspectRatio={template.aspectRatio}
                targetWidth={template.width}
                targetHeight={template.height}
                initialTexts={initialTexts}
                templateLayout={templateLayout}
                showMediaBar={isManualMode}
                onSave={handleSaveCanvas}
                isSaving={isSaving}
              />
            </div>
          </>
        ) : (
          /* CASO B: ESTUDIO IA SIN APROBAR AÚN (BUCLE DE GENERACIÓN DE IMAGEN BASE) */
          <>
            {/* Panel de Chat de Generación (40% de ancho) */}
            <div className="lg:col-span-4 bg-base-100 rounded-2xl shadow-sm border border-base-200 p-6 flex flex-col h-[520px]">
              <div className="flex items-center justify-between border-b pb-3 border-base-200 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-50 text-brand-orange rounded animate-pulse">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold font-primary text-gray-800 font-bold">Generador Concepto IA</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400">Motor:</span>
                  <span className="badge badge-xs bg-orange-50 text-brand-orange border-brand-orange/20 font-bold px-2 py-1.5">OpenAI</span>
                </div>
              </div>

              {/* Chat history */}
              <div className="flex-1 overflow-y-auto pr-2 mb-4 scrollbar-thin flex flex-col gap-4">
                {messages.map((msg) => {
                  const isAI = msg.sender === "AI";
                  return (
                    <div 
                      key={msg.id}
                      className={`chat ${isAI ? "chat-start" : "chat-end animate-fade-in"}`}
                    >
                      <div className="chat-image avatar">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                          isAI ? "bg-brand-orange text-white" : "bg-gray-200 text-gray-700"
                        }`}>
                          {isAI ? "IA" : "U"}
                        </div>
                      </div>
                      <div className="chat-header text-[10px] text-gray-400 mb-0.5 ml-1">
                        {isAI ? "Renderizador IA" : "Usuario"}
                      </div>
                      <div className={`chat-bubble text-xs leading-relaxed max-w-[85%] ${
                        isAI ? "bg-gray-100 text-gray-800" : "bg-brand-orange text-white"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}

                {isGenerating && (
                  <div className="chat chat-start">
                    <div className="chat-image avatar">
                      <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-xs">
                        IA
                      </div>
                    </div>
                    <div className="chat-bubble bg-gray-100 text-gray-800 text-xs flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
                      <span>Renderizando nueva imagen base...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Form Input */}
              <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0 border-t pt-4 border-base-200">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder='Ej: "Haz que este render se vea al atardecer..."'
                  className="input input-bordered w-full text-xs focus:border-brand-orange"
                  disabled={isGenerating}
                />
                <button
                  type="submit"
                  disabled={isGenerating || !inputText.trim()}
                  className="btn bg-brand-orange hover:bg-brand-dark-orange text-white border-0 px-4"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Panel Central: Previsualizador del render generado (60% de ancho) */}
            <div className="lg:col-span-6 bg-base-100 rounded-2xl shadow-sm border border-base-200 p-6 flex flex-col justify-between h-[520px]">
              <div>
                <h2 className="text-sm font-bold font-primary text-gray-800 mb-1">Previsualización del Render Base</h2>
                <p className="text-[10px] text-gray-400 mb-5">
                  Proporción: {template.width}x{template.height} px ({template.aspectRatio})
                </p>

                {/* Referencias cargadas */}
                {referenceUrls.length > 0 && (
                  <div className="mb-5 border border-base-200 rounded-xl p-3 bg-gray-50/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Imágenes de referencia
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
                      {referenceUrls.map((url, i) => (
                        <div key={i} className="shrink-0">
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-base-200 bg-white">
                            <img 
                              src={getAssetUrl(url)} 
                              alt={`Referencia ${i + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-2xl border border-base-200 p-4 flex items-center justify-center h-[340px] overflow-hidden">
                  <div className={`relative bg-white shadow-md border border-gray-200 flex items-center justify-center overflow-hidden transition-all duration-500 ${getAspectRatioClass(template.aspectRatio)}`}>
                    {previewImageUrl ? (
                      <img 
                        src={getAssetUrl(previewImageUrl)} 
                        alt="Render IA Generado" 
                        className="w-full h-full object-cover animate-fade-in" 
                      />
                    ) : (
                      /* Referencias iniciales con blur */
                      <div className="w-full h-full relative bg-gray-100 flex items-center justify-center p-2">
                        <div className="absolute inset-0 filter blur-xl opacity-60 grid grid-cols-2 gap-1 p-2">
                          {referenceUrls.slice(0, 4).map((url, idx) => (
                            <img key={idx} src={getAssetUrl(url)} alt="Reference Blur" className="w-full h-full object-cover" />
                          ))}
                        </div>
                        <div className="z-10 text-center p-4">
                          <div className="w-12 h-12 rounded-full border border-dashed border-gray-300 flex items-center justify-center mx-auto mb-2 bg-white/90">
                            <Sparkles className="w-5 h-5 text-brand-orange animate-pulse" />
                          </div>
                          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wider bg-white/80 px-2 py-1 rounded shadow-sm inline-block">
                            Estudio IA Activo
                          </p>
                          <p className="text-[9px] text-gray-400 mt-1.5 px-3 max-w-[200px] mx-auto bg-white/60 rounded">
                            Ingresa instrucciones de cambios en el chat de la izquierda para renderizar el fondo.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de decisión obligatorios cuando hay una imagen generada */}
              {previewImageUrl && (
                <div className="flex gap-4 border-t pt-4 border-base-200 animate-fade-in shrink-0">
                  <button
                    onClick={handleRejectImage}
                    disabled={isGenerating}
                    className="btn btn-sm btn-outline border-base-300 hover:bg-base-100 flex-1 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Reintentar / Ajustar
                  </button>
                  <button
                    onClick={handleApproveImage}
                    className="btn btn-sm bg-green-600 hover:bg-green-700 border-0 text-white flex-1 text-xs"
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-1" />
                    Aprobar y Editar
                  </button>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
