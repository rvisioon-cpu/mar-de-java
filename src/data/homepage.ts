export interface HomepageData {
  hero: {
    logo: string;
    button: string;
  };
  intro: {
    poster: string;
    video: string;
  };
  slides: {
    text: string;
    highlight?: string;
  }[];
}

export const homepageData: HomepageData = {
  hero: {
    logo: "/identity/identity_logo_white.png",
    button: "Entrar"
  },
  intro: {
    poster: "homepage/intro.webp",
    video: "homepage/intro_video.mp4"
  },
  slides: [
    {
      text: "{{highlight}} Mar de Java es un proyecto residencial de solo 10 departamentos, diseñado para quienes valoran la privacidad, el confort y los acabados premium.",
      highlight: "Exclusividad en cada detalle"
    },
    {
      text: "{{highlight}} Vive en una ubicación estratégica cercana al Jockey Plaza, la Universidad de Lima y los principales servicios de la ciudad.",
      highlight: "Una ubicación que lo conecta todo"
    },
    {
      text: "{{highlight}} Un proyecto exclusivo que combina arquitectura sofisticada, distribuciones funcionales y acabados cuidadosamente seleccionados para elevar tu experiencia de vida.",
      highlight: "Diseño premium, estilo único"
    },
    {
      text: "{{highlight}} Con únicamente 10 unidades y 14 estacionamientos simples y dobles, Mar de Java ofrece una propuesta residencial privada, moderna y diferenciada.",
      highlight: "Un edificio boutique para pocos"
    },
    {
      text: "{{highlight}} Flats y dúplex de diseño contemporáneo, acabados premium y una ubicación privilegiada se unen en un proyecto pensado para disfrutar cada espacio.",
      highlight: "La sofisticación de vivir bien"
    }
  ]
};
