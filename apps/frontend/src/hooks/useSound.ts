import { useRef, useCallback } from 'react';

/**
 * Custom hook để phát âm thanh
 * @param soundUrl - Đường dẫn đến file âm thanh
 * @param options - Tùy chọn cho âm thanh (volume, loop)
 */
export const useSound = (soundUrl: string, options?: { volume?: number; loop?: boolean }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Khởi tạo audio element
  const initAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(soundUrl);
      audioRef.current.volume = options?.volume ?? 0.5;
      audioRef.current.loop = options?.loop ?? false;
    }
    return audioRef.current;
  }, [soundUrl, options?.volume, options?.loop]);

  // Phát âm thanh
  const play = useCallback(() => {
    const audio = initAudio();
    audio.currentTime = 0; // Reset về đầu
    audio.play().catch((error) => {
      console.error('Error playing sound:', error);
    });
  }, [initAudio]);

  // Dừng âm thanh
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Pause âm thanh
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // Cleanup khi component unmount
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  return { play, stop, pause, cleanup };
};
