/**
 * Videos for the "Proyectos" pins on the location map.
 *
 * Each project has a one-shot transition (the camera flying into the
 * building) followed by a seamless loop of the building itself. The files live
 * in R2 under `location/videos/proyectos/proyecto-N/`.
 *
 * Keyed by the POI id seeded from `mar_java_locations.json`
 * (`buleje-project-N`). Names are matched as a fallback in case the
 * administrator recreated a pin from the dashboard with a new id.
 */
export interface ProjectVideo {
  transition: string;
  loop: string;
}

const asset = (n: number, file: string) => `location/videos/proyectos/proyecto-${n}/${file}`;

const byNumber = (n: number): ProjectVideo => ({
  transition: asset(n, 'transition.mp4'),
  loop: asset(n, 'loop.mp4'),
});

const PROJECT_NUMBERS = [1, 2, 3, 4, 5];

const videosById: Record<string, ProjectVideo> = Object.fromEntries(
  PROJECT_NUMBERS.map(n => [`buleje-project-${n}`, byNumber(n)])
);

const videosByName: Record<string, ProjectVideo> = Object.fromEntries(
  PROJECT_NUMBERS.map(n => [`proyecto bujele ${n}`, byNumber(n)])
);

export function getProjectVideo(id?: string | null, name?: string | null): ProjectVideo | null {
  if (id && videosById[id]) return videosById[id];
  const key = name?.toLocaleLowerCase('es').trim();
  if (key && videosByName[key]) return videosByName[key];
  return null;
}
