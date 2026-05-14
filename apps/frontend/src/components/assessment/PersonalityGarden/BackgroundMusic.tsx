import { useState, useEffect, useRef } from 'react';

interface BackgroundMusicProps {
  isPlaying?: boolean;
  onAnswerSound?: boolean;
}

const BackgroundMusic: React.FC<BackgroundMusicProps> = ({ isPlaying = true, onAnswerSound = false }) => {
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const melodyIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load music preference from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem('pg_music_enabled');
    if (savedPreference !== null) {
      setIsMusicEnabled(savedPreference === 'true');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMusic();
    };
  }, []);

  // Control background music
  useEffect(() => {
    if (isMusicEnabled && isPlaying) {
      playBackgroundMusic();
    } else {
      stopMusic();
    }
    
    // Cleanup when dependencies change
    return () => {
      stopMusic();
    };
  }, [isMusicEnabled, isPlaying]);

  // Play answer sound
  useEffect(() => {
    if (onAnswerSound && isMusicEnabled) {
      playAnswerSound();
    }
  }, [onAnswerSound, isMusicEnabled]);

  const stopMusic = () => {
    // Clear interval
    if (melodyIntervalRef.current) {
      clearInterval(melodyIntervalRef.current);
      melodyIntervalRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const playBackgroundMusic = () => {
    // Stop any existing music first
    stopMusic();
    
    // Create new audio context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioContext = audioContextRef.current;
    
    const playNote = (frequency: number, startTime: number, duration: number, volume: number = 0.3) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    // Longer, cheerful melody - Happy garden theme (32 notes)
    const melody = [
      // Phrase 1 - Ascending joy
      { note: 523.25, duration: 0.3 }, // C5
      { note: 587.33, duration: 0.3 }, // D5
      { note: 659.25, duration: 0.3 }, // E5
      { note: 783.99, duration: 0.6 }, // G5
      { note: 659.25, duration: 0.3 }, // E5
      { note: 783.99, duration: 0.6 }, // G5
      
      // Phrase 2 - Playful bounce
      { note: 880.00, duration: 0.3 }, // A5
      { note: 783.99, duration: 0.3 }, // G5
      { note: 659.25, duration: 0.3 }, // E5
      { note: 587.33, duration: 0.3 }, // D5
      { note: 523.25, duration: 0.6 }, // C5
      { note: 587.33, duration: 0.3 }, // D5
      
      // Phrase 3 - Cheerful climb
      { note: 659.25, duration: 0.3 }, // E5
      { note: 698.46, duration: 0.3 }, // F5
      { note: 783.99, duration: 0.3 }, // G5
      { note: 880.00, duration: 0.6 }, // A5
      { note: 783.99, duration: 0.3 }, // G5
      { note: 880.00, duration: 0.6 }, // A5
      
      // Phrase 4 - Happy resolution
      { note: 1046.50, duration: 0.4 }, // C6 (high)
      { note: 880.00, duration: 0.3 }, // A5
      { note: 783.99, duration: 0.3 }, // G5
      { note: 659.25, duration: 0.3 }, // E5
      { note: 698.46, duration: 0.3 }, // F5
      { note: 659.25, duration: 0.3 }, // E5
      { note: 587.33, duration: 0.3 }, // D5
      { note: 523.25, duration: 0.8 }, // C5 (ending)
      
      // Phrase 5 - Energetic repeat
      { note: 783.99, duration: 0.2 }, // G5
      { note: 880.00, duration: 0.2 }, // A5
      { note: 1046.50, duration: 0.4 }, // C6
      { note: 880.00, duration: 0.2 }, // A5
      { note: 783.99, duration: 0.2 }, // G5
      { note: 659.25, duration: 0.4 }, // E5
      { note: 523.25, duration: 0.6 }, // C5
    ];

    // Bass line for depth
    const bassLine = [
      { note: 261.63, duration: 1.2 }, // C4
      { note: 293.66, duration: 1.2 }, // D4
      { note: 329.63, duration: 1.2 }, // E4
      { note: 349.23, duration: 1.2 }, // F4
      { note: 392.00, duration: 1.2 }, // G4
      { note: 349.23, duration: 1.2 }, // F4
      { note: 329.63, duration: 1.2 }, // E4
      { note: 261.63, duration: 1.2 }, // C4
    ];
    
    const playMelody = () => {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
      
      let time = audioContext.currentTime;
      
      // Play melody
      melody.forEach((note) => {
        playNote(note.note, time, note.duration, 0.3);
        time += note.duration + 0.05;
      });
      
      // Play bass line
      let bassTime = audioContext.currentTime;
      bassLine.forEach((note) => {
        playNote(note.note, bassTime, note.duration, 0.15);
        bassTime += note.duration;
      });
    };

    // Play first melody
    playMelody();
    
    // Repeat melody every 15 seconds
    melodyIntervalRef.current = setInterval(() => {
      if (isMusicEnabled && isPlaying && audioContextRef.current && audioContextRef.current.state !== 'closed') {
        playMelody();
      }
    }, 15000);
  };

  const playAnswerSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // Close after sound finishes
    setTimeout(() => {
      audioContext.close();
    }, 500);
  };

  const toggleMusic = () => {
    const newState = !isMusicEnabled;
    setIsMusicEnabled(newState);
    localStorage.setItem('pg_music_enabled', String(newState));
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <button
        onClick={toggleMusic}
        className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-2 border-gray-300 dark:border-gray-600"
        title={isMusicEnabled ? 'Tắt nhạc' : 'Bật nhạc'}
      >
        {isMusicEnabled ? (
          <span className="text-2xl">🔊</span>
        ) : (
          <span className="text-2xl">🔇</span>
        )}
      </button>
    </div>
  );
};

export default BackgroundMusic;
