export const VISIT_COOKIE = "mar_java_visit";
export const VISIT_TIMEOUT_SECONDS = 30 * 60;

export function isAnalyticsId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isPublicAnalyticsPath(path: unknown): path is string {
  if (typeof path !== "string" || path.length > 256) return false;
  return /^(?:\/(?:showroom|plantas|recorridos|galeria|ubicacion|video|maqueta|avance-de-obra|contact|politica-de-privacidad|terminos-y-condiciones)?|\/plantas\/(?:[1-6]|S1|S2)|\/unidad\/[a-zA-Z0-9_-]+)$/.test(path);
}

export function measuredDuration(duration: number | null): number {
  return typeof duration === "number" && Number.isFinite(duration) && duration > 0 ? duration : 0;
}
