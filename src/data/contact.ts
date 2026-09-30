export interface ContactConfig {
  title: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  officeHours: string;
  mapUrl: string;
  mapCoordinates: {
    lat: number;
    lng: number;
  };
  social: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    whatsapp?: string;
  };
  form: {
    labels: {
      name: string;
      lastName: string;
      docNumber: string;
      email: string;
      phone: string;
      preference: string;
      schedule: string;
      terms: string;
      auth: string;
    }
  }
}

export const contactConfig: ContactConfig = {
  title: "Agenda una visita",
  description: "Estamos listos para ayudarte a encontrar tu próximo hogar. Déjanos tus datos y nos pondremos en contacto contigo a la brevedad.",
  address: "Calle Mar de Java 175\nUrb. Neptuno, Surco, Lima",
  phone: "+51 907 123 221",
  email: "ventas@inmobiliariabuleje.pe",
  officeHours: "Lunes a Domingo de 10:00 am a 6:00 pm",
  mapUrl: "https://www.google.com/maps?q=-12.079162,-76.97538&z=17&output=embed",
  mapCoordinates: {
    lat: -12.079162,
    lng: -76.97538
  },
  social: {
    facebook: "https://facebook.com/bulejeinmobiliaria",
    instagram: "https://instagram.com/inmobiliaria.buleje",
    tiktok: "https://tiktok.com/@inmobiliaria.buleje",
    whatsapp: "https://wa.me/51907123221"
  },
  form: {
    labels: {
      name: "Nombres",
      lastName: "Apellidos",
      docNumber: "Número de documento",
      email: "Email",
      phone: "Celular",
      preference: "Deseo ser contactado por",
      schedule: "Horario de preferencia",
      terms: "Acepto las Políticas de Privacidad y Términos y Condiciones",
      auth: "Autorizo a actividades de prospección comercial"
    }
  }
};
