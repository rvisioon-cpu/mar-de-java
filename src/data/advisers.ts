// ============================================================================
// Asesores que se muestran en "Elige tu asesor" de la página de contacto.
// Ojo: pese a lo que decía el encabezado anterior, esta lista SÍ se usa en
// producción — src/app/contact/page.tsx la importa directamente. Los usuarios
// de la tabla `users` (rol SELLER) son otra cosa: sirven para asignar citas
// en el calendario, no para este listado público.
// ============================================================================

export interface AdviserData {
  id: string;
  name: string;
  role: string;
  gender: 'male' | 'female';
  phone: string;
  email?: string;
  whatsappMessage: string;
}

export const advisersData: AdviserData[] = [
  {
    id: 'nicolas',
    name: "Nicolás Matamoros Bosleman",
    role: "Asesor de Ventas",
    gender: 'male',
    phone: "+51964281172",
    whatsappMessage: "Hola, vengo desde la web de Mar de Java, deseo más información."
  },
  {
    id: 'raul',
    name: "Raul Matamoros Vega",
    role: "Asesor de Ventas",
    gender: 'male',
    phone: "+51997171543",
    whatsappMessage: "Hola, vengo desde la web de Mar de Java, deseo más información."
  }
];
