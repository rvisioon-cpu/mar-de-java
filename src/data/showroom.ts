export interface ShowroomConfig {
  initialRoom: string;
  initialFloor: number;
  initialFace: number;
  initialTimeOfDay: 'day' | 'night';
  idleTimeBeforeHint: number;
  structureImage: string;
  opening: {
    poster: string;
    video: string;
    idlePoster: string;
    idleVideo: string;
    logo: string;
  };
}

export const showroomConfig: ShowroomConfig = {
  initialRoom: 'Lobby',
  initialFloor: 9,
  initialFace: 0,
  initialTimeOfDay: 'day',
  idleTimeBeforeHint: 10000,
  structureImage: "/building/structure.png",
  opening: {
    poster: 'building/photos/0.1.webp',
    video: 'building/videos/0.1.mp4',
    idlePoster: 'building/photos/0.2.webp',
    idleVideo: 'building/videos/cover-loop.mp4',
    logo: 'identity/identity_logo_white.png',
  },
};
