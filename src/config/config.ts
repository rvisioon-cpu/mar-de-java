export interface ConfigProps {
  appName: string;
  appDescription: string;
  domainName: string;
  resend: {
    fromNoReply: string;
    fromAdmin: string;
    supportEmails: string[];
  };
  colors: {
    theme: "light" | "dark";
    main: string;
  };
  auth: {
    loginUrl: string;
    callbackUrl: string;
  };
  company: {
    name: string;
    address: string;
    buildingName: string;
    buildingAddress: string;
    email: string;
    website: string;
    // Provincia/departamento donde opera la inmobiliaria. Aparece en el
    // encabezado de las páginas legales ("ubicada en ..., Lima, Perú"): no
    // todos los proyectos están en Lima, así que no se puede fijar en el texto.
    city: string;
    country: string;
    // Teléfono de la inmobiliaria para las páginas legales. Si queda vacío, la
    // fila del teléfono no se pinta en lugar de mostrar un campo hueco.
    phone?: string;
    maquetaUrl?: string;
    buildingSocials: {
      facebook: string;
      instagram: string;
      // Opcional: si la cuenta no existe se omite y el ícono no se renderiza.
      tiktok?: string;
    };
    realStateName: string;
    realStateSlogan: string;
    realStateWebsite: string;
    realStateSocials: {
      facebook: string;
      instagram: string;
      tiktok?: string;
    };
    developer: string;
    developerSlogan: string;
    developerWebsite: string;
    developerSocials: {
      facebook: string;
      instagram: string;
      tiktok?: string;
    };
  };
}

const config: ConfigProps = {
  appName: "Mar de Java",
  appDescription: "Experiencia virtual de Mar de Java.",
  domainName: "inmobiliariabuleje.pe",
  // Dominio verificado en Resend. Cualquier remitente debe pertenecer a él o
  // el envío es rechazado.
  resend: {
    fromNoReply: `Mar de Java <no-reply@rmpromotorainmobiliaria.com>`,
    fromAdmin: `Mar de Java <admin@rmpromotorainmobiliaria.com>`,
    // Buzón que recibe los formularios de contacto. Es un dominio distinto al
    // de envío: Resend solo exige el dominio verificado en el remitente.
    supportEmails: ["ventas@inmobiliariabuleje.pe", "gerencia_comercial@inmobiliariiabuleje.pe"],
  },
  colors: {
    theme: "light",
    main: "#10356D", // Brand main color (Mar de Java navy)
  },
  auth: {
    loginUrl: "/api/auth/signin",
    callbackUrl: "/dashboard",
  },
  company: {
    name: "Grupo Inmobiliario Buleje",
    address: "Calle Mar de Java 175, Urb. Neptuno, Surco, Lima, Perú",
    buildingName: "Mar de Java",
    buildingAddress: "Calle Mar de Java 175, Urb. Neptuno, Surco, Lima",
    email: "ventas@inmobiliariabuleje.pe",
    website: "https://inmobiliariabuleje.pe",
    city: "Lima",
    country: "Perú",
    phone: "907 123 221",
    buildingSocials: {
      facebook: "https://facebook.com/bulejeinmobiliaria",
      instagram: "https://instagram.com/inmobiliaria.buleje",
      tiktok: "https://tiktok.com/@inmobiliaria.buleje"
    },
    realStateName: "Grupo Inmobiliario Buleje",
    realStateSlogan: "Constructora e Inmobiliaria",
    realStateWebsite: "https://inmobiliariabuleje.pe",
    realStateSocials: {
      facebook: "https://facebook.com/bulejeinmobiliaria",
      instagram: "https://instagram.com/inmobiliaria.buleje",
      tiktok: "https://tiktok.com/@inmobiliaria.buleje"
    },
    developer: "Rvisioon",
    developerSlogan: "Creamos experiencias visuales que conectan, inspiran y venden.",
    developerWebsite: "https://rvisioon.pe/",
    developerSocials: {
      facebook: "https://www.facebook.com/profile.php?id=61585009776159",
      instagram: "https://www.instagram.com/rvisioon/",
      tiktok: "https://www.tiktok.com/@rvisioon"
    }
  }
};

export default config;
