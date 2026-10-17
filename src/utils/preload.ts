
export const preloadImages = (urls: string[]): Promise<void> => {
  return new Promise((resolve) => {
    let loaded = 0;
    const total = urls.length;
    if (total === 0) {
      resolve();
      return;
    }

    // Safety timeout: if images take longer than 8s, just proceed
    const timeoutId = setTimeout(() => {
        console.warn("Image buffer preload timeout - proceeding anyway");
        resolve();
    }, 8000);

    const checkComplete = () => {
        loaded++;
        if (loaded === total) {
            clearTimeout(timeoutId);
            resolve();
        }
    };

    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
      img.onload = checkComplete;
      img.onerror = () => {
        console.warn(`Failed to preload image: ${url}`);
        checkComplete();
      };
    });
  });
};

// Share a single warm-up per URL across menus, hover handlers and the store.
// Keep only a few live media elements and release buffers on expiry/eviction.
interface VideoPreload {
  promise: Promise<void>;
  dispose: () => void;
}
const videoPreloads = new Map<string, VideoPreload>();
const MAX_PRELOADED_VIDEOS = 8;

export const preloadVideo = (url: string): Promise<void> => {
  if (!url || typeof document === 'undefined') return Promise.resolve();
  const key = new URL(url, document.baseURI).href;
  // A mounted player may already be fetching this URL. Wait for that player
  // instead of starting a second offscreen download (and never dispose it).
  const player = Array.from(document.querySelectorAll('video')).find(video =>
    video.currentSrc === key || video.src === key
  );
  if (player) {
    if (player.readyState >= 3) return Promise.resolve();
    return new Promise<void>(resolve => {
      const finish = () => {
        clearTimeout(timeout);
        player.removeEventListener('canplay', finish);
        player.removeEventListener('error', finish);
        resolve();
      };
      const timeout = setTimeout(finish, 6000);
      player.addEventListener('canplay', finish, { once: true });
      player.addEventListener('error', finish, { once: true });
    });
  }
  const existing = videoPreloads.get(key);
  if (existing) return existing.promise;

  if (videoPreloads.size >= MAX_PRELOADED_VIDEOS) {
    const oldest = videoPreloads.entries().next().value;
    if (oldest) oldest[1].dispose();
  }

  const video = document.createElement('video');
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  let expiry: ReturnType<typeof setTimeout>;
  const clearVideo = () => {
    video.oncanplay = null;
    video.onerror = null;
    video.pause();
    video.removeAttribute('src');
    video.load();
  };
  const dispose = () => {
    clearTimeout(timeout);
    clearTimeout(expiry);
    clearVideo();
    videoPreloads.delete(key);
    resolve();
  };
  const finish = (ready: boolean) => {
    clearTimeout(timeout);
    video.oncanplay = null;
    video.onerror = null;
    if (!ready) clearVideo();
    // Failed warm-ups get a short cooldown rather than a permanent success.
    expiry = setTimeout(dispose, ready ? 60_000 : 5_000);
    resolve();
  };
  videoPreloads.set(key, { promise, dispose });
  video.preload = 'auto';
  video.playsInline = true;
  video.muted = true;
  video.oncanplay = () => finish(true);
  video.onerror = () => finish(false);
  const timeout = setTimeout(() => finish(false), 6000);
  video.src = key;
  video.load();
  return promise;
};
