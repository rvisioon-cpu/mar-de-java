export interface LocationFeature {
  type: "Feature";
  properties: {
    nombre: string;
    categoria?: string;
    imagen?: string;
    [key: string]: any;
  };
  geometry: {
    coordinates: [number, number];
    type: "Point";
  };
  id: string;
}

export interface LocationCollection {
  features: LocationFeature[];
}

export const PROJECT_LOCATION = {
  name: "Mar de Java",
  coordinates: [-76.97538, -12.079162] as [number, number],
  markerImage: "ICONOS/proyecto/logo-proyecto.png",
};

export const OTHER_PROJECTS_CATEGORY = "Proyectos";

export const locationsData: LocationCollection = {
  features: [
    {
      type: "Feature",
      properties: {
        nombre: "Interbank",
        categoria: "Finanzas",
        imagen: "icons/FINANZAS/interbank.png"
      },
      geometry: {
        coordinates: [
          -77.064667,
          -12.077828
        ],
        type: "Point"
      },
      id: "0d6dd416b022ec425411c6e6440e3dfd"
    },
    // Add more features as needed or load from external JSON in real app
  ]
};
