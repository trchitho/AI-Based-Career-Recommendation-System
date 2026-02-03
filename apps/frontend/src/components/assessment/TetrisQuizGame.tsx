import { useState, useEffect } from 'react';
import { Question, QuestionResponse } from '../../types/assessment';
import PuzzleGameIntro from './PuzzleGameIntro';

interface TetrisQuizGameProps {
  questions: Question[];
  onComplete: (responses: QuestionResponse[]) => void;
  onCancel: () => void;
}

interface GridCell {
  filled: boolean;
  text: string;
  emoji?: string | undefined;
  value: string | number;
  questionId: string;
  color: string;
}

interface CompletedAnswer {
  questionText: string;
  answer: string;
  emoji?: string | undefined;
  timestamp: number;
}

type PieceShape = 'I' | 'O' | 'T' | 'L' | 'Z';
type PowerUpType = 'bomb' | 'rocket' | 'nuclear';

const PIECE_SHAPES: Record<PieceShape, { coords: [number, number][]; width: number; height: number }> = {
  I: { coords: [[0, 0], [0, 1], [0, 2], [0, 3]], width: 4, height: 1 }, // Horizontal line: 4 wide, 1 tall
  O: { coords: [[0, 0], [0, 1], [1, 0], [1, 1]], width: 2, height: 2 }, // Square: 2x2
  T: { coords: [[0, 1], [1, 0], [1, 1], [1, 2]], width: 3, height: 2 }, // T-shape: 3 wide, 2 tall
  L: { coords: [[0, 0], [0, 1], [0, 2], [1, 2]], width: 3, height: 2 }, // L-shape: 3 wide, 2 tall
  Z: { coords: [[0, 0], [0, 1], [1, 1], [1, 2]], width: 3, height: 2 }, // Z-shape: 3 wide, 2 tall
};

const GRID_ROWS = 18; // Balanced height
const GRID_COLS = 28; // Balanced width  
const CELL_SIZE = 28; // Good visibility

// Sound Effects using Web Audio API
const playLineClearSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create a satisfying "pop" sound with rising pitch
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    console.log('Audio not supported');
  }
};

const playPowerUpSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create explosion sound with multiple frequencies
    const createExplosion = (freq: number, delay: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + delay);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + delay + 0.3);
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.3);
      
      oscillator.start(audioContext.currentTime + delay);
      oscillator.stop(audioContext.currentTime + delay + 0.3);
    };
    
    // Create layered explosion effect
    createExplosion(200, 0);
    createExplosion(150, 0.05);
    createExplosion(100, 0.1);
  } catch (e) {
    console.log('Audio not supported');
  }
};

const TetrisQuizGame = ({ questions, onComplete, onCancel }: TetrisQuizGameProps) => {
  const [showIntro, setShowIntro] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [grid, setGrid] = useState<(GridCell | null)[][]>(
    Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null))
  );
  const [responses, setResponses] = useState<Map<string, string | number>>(new Map());
  const [completedAnswers, setCompletedAnswers] = useState<CompletedAnswer[]>([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [bombs, setBombs] = useState(0); // Start with 0
  const [rockets, setRockets] = useState(0); // Start with 0
  const [nuclear, setNuclear] = useState(0); // Easter egg item
  const [combo, setCombo] = useState(0); // Combo counter
  const [maxCombo, setMaxCombo] = useState(0); // Track max combo
  const [easterEggCount, setEasterEggCount] = useState(0); // Track how many times earned (max 2)
  const [nextEasterEggCombo, setNextEasterEggCombo] = useState(3); // First at 3, then 4
  const [showEasterEggNotif, setShowEasterEggNotif] = useState(false); // Notification
  const [draggedPiece, setDraggedPiece] = useState<{
    text: string;
    emoji?: string | undefined;
    value: string | number;
    color: string;
    shape: PieceShape;
    rotation: number;
  } | null>(null);
  const [draggedPowerUp, setDraggedPowerUp] = useState<PowerUpType | null>(null);
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set()); // For explosion effect
  const [showVictoryModal, setShowVictoryModal] = useState(false); // Victory modal
  const [finalResponses, setFinalResponses] = useState<QuestionResponse[]>([]); // Store final responses
  const [pieceRotations, setPieceRotations] = useState<Record<number, number>>({}); // Track rotation for each piece (0-3)
  const [currentQuestionShapes, setCurrentQuestionShapes] = useState<PieceShape[]>([]); // Store shapes for current question

  const currentQuestion = questions[currentIndex];
  const progress = currentQuestion ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const tetrisColors: Record<PieceShape, string> = {
    I: 'from-cyan-500 to-cyan-700',
    O: 'from-yellow-500 to-yellow-700',
    T: 'from-purple-500 to-purple-700',
    L: 'from-orange-500 to-orange-700',
    Z: 'from-red-500 to-red-700',
  };

  const shapes: PieceShape[] = ['I', 'O', 'T', 'L', 'Z'];

  // Generate shuffled shapes when question changes
  useEffect(() => {
    if (currentQuestion) {
      const shuffledShapes = [...shapes].sort(() => Math.random() - 0.5);
      setCurrentQuestionShapes(shuffledShapes);
    }
  }, [currentQuestion?.id]); // Only re-run when question ID changes

  // Rotate piece coordinates 90 degrees clockwise
  const rotatePieceCoords = (coords: [number, number][], times: number = 1): [number, number][] => {
    let rotated = coords;
    for (let i = 0; i < times % 4; i++) {
      // Rotate 90 degrees clockwise: (x, y) -> (y, -x)
      // But we need to normalize to keep in positive space
      rotated = rotated.map(([row, col]) => [col, -row] as [number, number]);
      
      // Normalize to start from (0, 0)
      const minRow = Math.min(...rotated.map(([r]) => r));
      const minCol = Math.min(...rotated.map(([, c]) => c));
      rotated = rotated.map(([r, c]) => [r - minRow, c - minCol] as [number, number]);
    }
    return rotated;
  };

  // Get rotated piece shape data
  const getRotatedPieceShape = (shape: PieceShape, rotation: number) => {
    const originalShape = PIECE_SHAPES[shape];
    const rotatedCoords = rotatePieceCoords(originalShape.coords, rotation);
    
    // Calculate new width and height
    const maxRow = Math.max(...rotatedCoords.map(([r]) => r));
    const maxCol = Math.max(...rotatedCoords.map(([, c]) => c));
    
    return {
      coords: rotatedCoords,
      width: maxCol + 1,
      height: maxRow + 1,
    };
  };

  // Check and clear completed rows AND columns (Tetris mechanic)
  const checkAndClearRows = (currentGrid: (GridCell | null)[][]) => {
    const completedRows: number[] = [];
    const completedCols: number[] = [];
    
    // Find all completed rows
    currentGrid.forEach((row, rowIndex) => {
      if (row.every(cell => cell !== null)) {
        completedRows.push(rowIndex);
      }
    });

    // Find all completed columns
    for (let colIndex = 0; colIndex < GRID_COLS; colIndex++) {
      const columnFilled = currentGrid.every(row => row[colIndex] !== null);
      if (columnFilled) {
        completedCols.push(colIndex);
      }
    }

    const totalCleared = completedRows.length + completedCols.length;

    if (totalCleared > 0) {
      console.log('Completed rows:', completedRows, 'Completed cols:', completedCols);
      
      // Play line clear sound effect
      playLineClearSound();
      
      // Increment combo streak (each clear adds to combo)
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo > maxCombo) {
        setMaxCombo(newCombo);
      }

      // Check for Easter Egg (Nuclear Power) - can earn when combo reaches 3 or 4
      if (easterEggCount < 2 && newCombo >= nextEasterEggCombo) {
        setNuclear(prev => prev + 1);
        setEasterEggCount(prev => prev + 1);
        setShowEasterEggNotif(true);
        
        // Next easter egg requires higher combo (4 after first one at 3)
        if (easterEggCount === 0) {
          setNextEasterEggCombo(4); // Second one needs combo 4
        }
        
        // Hide notification after 3 seconds
        setTimeout(() => setShowEasterEggNotif(false), 3000);
      }
      
      // Award bonus points for clearing (150 per line)
      const bonusPoints = totalCleared * 150;
      const bonusXP = totalCleared * 80;
      setScore(prev => prev + bonusPoints);
      setXp(prev => prev + bonusXP);

      // Show explosion effect
      const cellsToExplode = new Set<string>();
      completedRows.forEach(rowIndex => {
        for (let col = 0; col < GRID_COLS; col++) {
          cellsToExplode.add(`${rowIndex}-${col}`);
        }
      });
      completedCols.forEach(colIndex => {
        for (let row = 0; row < GRID_ROWS; row++) {
          cellsToExplode.add(`${row}-${colIndex}`);
        }
      });
      setClearingCells(cellsToExplode);

      // Clear after animation
      setTimeout(() => {
        setClearingCells(new Set());
        
        // Clear rows
        let newGrid = currentGrid.filter((_, index) => !completedRows.includes(index));
        
        // Add empty rows at the top
        const emptyRows = Array(completedRows.length)
          .fill(null)
          .map(() => Array(GRID_COLS).fill(null));
        
        newGrid = [...emptyRows, ...newGrid];

        // Clear columns
        if (completedCols.length > 0) {
          newGrid = newGrid.map(row => 
            row.map((cell, colIndex) => 
              completedCols.includes(colIndex) ? null : cell
            )
          );
        }
        
        setGrid(newGrid);
      }, 500);
    }
  };

  const handleDragStart = (piece: { 
    text: string; 
    emoji?: string | undefined; 
    value: string | number; 
    color: string;
    shape: PieceShape;
  }, index: number) => {
    const rotation = pieceRotations[index] || 0;
    setDraggedPiece({ ...piece, rotation });
    setDraggedPowerUp(null);
  };

  const handlePowerUpDragStart = (type: PowerUpType) => {
    setDraggedPowerUp(type);
    setDraggedPiece(null);
  };

  const handleDragEnd = () => {
    setDraggedPiece(null);
    setDraggedPowerUp(null);
    setHoveredCell(null);
  };

  const handleDragOver = (e: React.DragEvent, rowIndex: number, colIndex: number) => {
    e.preventDefault();
    
    if (!draggedPiece && !draggedPowerUp) return;
    
    // Simple approach: just use the hovered cell directly
    // canPlacePiece will validate if it's valid
    setHoveredCell([rowIndex, colIndex]);
  };

  const canPlacePiece = (rowIndex: number, colIndex: number, shape: PieceShape, rotation: number = 0): boolean => {
    const shapeData = getRotatedPieceShape(shape, rotation);
    
    // Check all cells of the piece
    for (const [dr, dc] of shapeData.coords) {
      const newRow = rowIndex + dr;
      const newCol = colIndex + dc;
      
      // Check if out of bounds
      if (newRow < 0 || newRow >= GRID_ROWS || newCol < 0 || newCol >= GRID_COLS) {
        console.log(`Out of bounds: row ${newRow}, col ${newCol}`);
        return false;
      }
      
      // Check if cell is already filled
      const row = grid[newRow];
      if (!row) {
        console.log(`Row ${newRow} is undefined`);
        return false;
      }
      
      const cell = row[newCol];
      if (cell !== null && cell !== undefined) {
        console.log(`Cell at ${newRow},${newCol} is already filled`);
        return false;
      }
    }
    
    console.log(`Can place ${shape} at ${rowIndex},${colIndex} with rotation ${rotation}`);
    return true;
  };

  const usePowerUp = (rowIndex: number, colIndex: number, type: PowerUpType) => {
    if (type === 'bomb' && bombs <= 0) return;
    if (type === 'rocket' && rockets <= 0) return;
    if (type === 'nuclear' && nuclear <= 0) return;

    // Play power-up explosion sound effect
    playPowerUpSound();

    const newGrid: (GridCell | null)[][] = grid.map(row => [...row]);
    
    if (type === 'nuclear') {
      // Nuclear clears EVERYTHING with massive explosion
      const allCells = new Set<string>();
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (newGrid[r]?.[c] !== null) {
            allCells.add(`${r}-${c}`);
          }
        }
      }
      
      // Show massive explosion effect
      setClearingCells(allCells);
      
      setTimeout(() => {
        setClearingCells(new Set());
        // Clear entire grid
        const emptyGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
        setGrid(emptyGrid);
      }, 800); // Longer animation for nuclear
      
      setNuclear(prev => prev - 1);
    } else {
      // Regular bomb/rocket logic with explosion effect
      const size = type === 'bomb' ? 2 : 4;
      
      // Show explosion effect first
      const cellsToExplode = new Set<string>();
      for (let r = rowIndex; r < Math.min(rowIndex + size, GRID_ROWS); r++) {
        for (let c = colIndex; c < Math.min(colIndex + size, GRID_COLS); c++) {
          cellsToExplode.add(`${r}-${c}`);
        }
      }
      setClearingCells(cellsToExplode);
      
      // Clear area after explosion animation
      setTimeout(() => {
        setClearingCells(new Set());
        
        const updatedGrid: (GridCell | null)[][] = grid.map(row => [...row]);
        for (let r = rowIndex; r < Math.min(rowIndex + size, GRID_ROWS); r++) {
          for (let c = colIndex; c < Math.min(colIndex + size, GRID_COLS); c++) {
            const targetRow = updatedGrid[r];
            if (targetRow) {
              targetRow[c] = null;
            }
          }
        }
        setGrid(updatedGrid);
      }, 500); // Match the explosion animation duration

      if (type === 'bomb') {
        setBombs(prev => prev - 1);
      } else {
        setRockets(prev => prev - 1);
      }
    }

    setDraggedPowerUp(null);
    setHoveredCell(null);
    setCombo(0); // Reset combo when using power-up
  };

  const handleDrop = (rowIndex: number, colIndex: number) => {
    // Handle power-up drop
    if (draggedPowerUp) {
      usePowerUp(rowIndex, colIndex, draggedPowerUp);
      return;
    }

    if (!draggedPiece || !currentQuestion) return;
    
    // Use the adjusted hover position (from snap-to-grid)
    const dropRow = hoveredCell ? hoveredCell[0] : rowIndex;
    const dropCol = hoveredCell ? hoveredCell[1] : colIndex;
    
    const rotation = draggedPiece.rotation || 0;
    
    if (!canPlacePiece(dropRow, dropCol, draggedPiece.shape, rotation)) {
      setDraggedPiece(null);
      setHoveredCell(null);
      return;
    }

    const shapeData = getRotatedPieceShape(draggedPiece.shape, rotation);
    const newGrid: (GridCell | null)[][] = grid.map(row => [...row]);
    
    for (const [dr, dc] of shapeData.coords) {
      const newRow = dropRow + dr;
      const newCol = dropCol + dc;
      
      if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS) {
        const targetRow = newGrid[newRow];
        if (targetRow) {
          targetRow[newCol] = {
            filled: true,
            text: draggedPiece.text,
            emoji: draggedPiece.emoji,
            value: draggedPiece.value,
            questionId: currentQuestion.id,
            color: draggedPiece.color,
          };
        }
      }
    }

    setGrid(newGrid);

    // Check for completed rows and clear them (Tetris style!)
    checkAndClearRows(newGrid);

    const newResponses = new Map(responses);
    const isNewAnswer = !newResponses.has(currentQuestion.id);
    newResponses.set(currentQuestion.id, draggedPiece.value);
    setResponses(newResponses);

    // Only add to completed answers if this is a new question answer
    if (isNewAnswer) {
      const newAnswer: CompletedAnswer = {
        questionText: currentQuestion.question_text,
        answer: draggedPiece.text,
        emoji: draggedPiece.emoji,
        timestamp: Date.now(),
      };
      setCompletedAnswers(prev => [...prev, newAnswer]);
    }

    const shapePoints: Record<PieceShape, number> = {
      I: 50, O: 50, T: 60, L: 60, Z: 70,
    };
    const points = shapePoints[draggedPiece.shape];
    const newXp = xp + points;
    setScore(prev => prev + points);
    setXp(newXp);
    
    // Level up every 400 XP (balanced progression)
    const oldLevel = Math.floor(xp / 400) + 1;
    const newLevel = Math.floor(newXp / 400) + 1;
    
    if (newLevel > oldLevel) {
      setLevel(newLevel);
      // Award power-ups on level up: 2 bombs + 1 rocket
      setBombs(prev => prev + 2);
      setRockets(prev => prev + 1);
    }

    setDraggedPiece(null);
    setHoveredCell(null);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        // Reset rotations for new question
        setPieceRotations({});
      } else {
        // Last question completed - show victory modal
        const responseArray: QuestionResponse[] = Array.from(newResponses.entries()).map(
          ([questionId, answer]) => ({ questionId, answer })
        );
        setFinalResponses(responseArray);
        setShowVictoryModal(true);
      }
    }, 1000);
  };

  const getPieces = (): Array<{ 
    text: string; 
    emoji?: string | undefined; 
    value: string | number; 
    color: string;
    shape: PieceShape;
  }> => {
    if (!currentQuestion || currentQuestionShapes.length === 0) return [];

    // Use the pre-shuffled shapes from state (won't change on re-render)
    const shuffledShapes = currentQuestionShapes;

    if (currentQuestion.question_type === 'SCALE') {
      const labels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
      const emojis = ['😟', '🙁', '😐', '🙂', '😊'];
      return [1, 2, 3, 4, 5].map((value, index) => {
        const shape = shuffledShapes[index % shuffledShapes.length] || 'O';
        return {
          text: labels[index] || '',
          emoji: emojis[index],
          value: value,
          color: tetrisColors[shape],
          shape: shape,
        };
      });
    } else if (currentQuestion.options) {
      return currentQuestion.options.map((option, index) => {
        const shape = shuffledShapes[index % shuffledShapes.length] || 'O';
        return {
          text: option,
          emoji: undefined,
          value: option,
          color: tetrisColors[shape],
          shape: shape,
        };
      });
    }
    return [];
  };

  const pieces = getPieces();

  const renderTetrisPiece = (shape: PieceShape, color: string, cellSize: number = 28, cellGap: number = 3, rotation: number = 0) => {
    const shapeData = getRotatedPieceShape(shape, rotation);
    
    // Calculate total dimensions
    const totalWidth = shapeData.width * cellSize + (shapeData.width - 1) * cellGap;
    const totalHeight = shapeData.height * cellSize + (shapeData.height - 1) * cellGap;
    
    return (
      <div 
        className="relative inline-block"
        style={{
          width: `${totalWidth}px`,
          height: `${totalHeight}px`,
        }}
      >
        {shapeData.coords.map(([row, col], idx) => (
          <div
            key={idx}
            className={`absolute bg-gradient-to-br ${color} rounded border-2 border-white/50 shadow-lg`}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              top: `${row * (cellSize + cellGap)}px`,
              left: `${col * (cellSize + cellGap)}px`,
            }}
          >
            <div className="absolute inset-1 bg-white/30 rounded-sm"></div>
          </div>
        ))}
      </div>
    );
  };

  if (showIntro) {
    return (
      <PuzzleGameIntro
        onStart={() => setShowIntro(false)}
        onCancel={onCancel}
      />
    );
  }

  // Victory Modal - Show when all questions completed
  if (showVictoryModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2">
        <div className="relative max-w-md w-full bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-xl shadow-2xl border-4 border-yellow-400 dark:border-yellow-600 overflow-hidden">
          {/* Confetti Background Effect */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-3 left-3 text-2xl animate-bounce">🎉</div>
            <div className="absolute top-5 right-5 text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎊</div>
            <div className="absolute bottom-5 left-5 text-xl animate-bounce" style={{ animationDelay: '0.4s' }}>⭐</div>
            <div className="absolute bottom-3 right-3 text-2xl animate-bounce" style={{ animationDelay: '0.6s' }}>🏆</div>
            <div className="absolute top-1/2 left-1/4 text-lg animate-spin" style={{ animationDuration: '3s' }}>✨</div>
            <div className="absolute top-1/3 right-1/4 text-lg animate-spin" style={{ animationDuration: '4s' }}>💫</div>
          </div>

          {/* Content */}
          <div className="relative z-10 p-4 text-center">
            {/* Trophy Icon */}
            <div className="mb-2 animate-bounce">
              <div className="text-3xl mb-1">🏆</div>
              <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 dark:from-yellow-400 dark:via-orange-400 dark:to-red-400 drop-shadow-lg">
                CONGRATULATIONS!
              </div>
            </div>

            {/* Completion Message */}
            <div className="mb-3">
              <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">
                🎮 You've Completed All {questions.length} Questions! 🎮
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Amazing job! Let's see your achievements!
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Final Score */}
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-2.5 shadow-xl border-2 border-yellow-300 transform hover:scale-105 transition-all">
                <div className="text-lg mb-0.5">⭐</div>
                <div className="text-[10px] font-bold text-yellow-900 uppercase mb-0.5">Final Score</div>
                <div className="text-xl font-black text-white drop-shadow-lg">{score}</div>
              </div>

              {/* Final Level */}
              <div className="bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg p-2.5 shadow-xl border-2 border-cyan-300 transform hover:scale-105 transition-all">
                <div className="text-lg mb-0.5">🎯</div>
                <div className="text-[10px] font-bold text-cyan-900 uppercase mb-0.5">Final Level</div>
                <div className="text-xl font-black text-white drop-shadow-lg">{level}</div>
              </div>

              {/* Total XP */}
              <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg p-2.5 shadow-xl border-2 border-purple-300 transform hover:scale-105 transition-all">
                <div className="text-lg mb-0.5">💎</div>
                <div className="text-[10px] font-bold text-purple-900 uppercase mb-0.5">Total XP</div>
                <div className="text-xl font-black text-white drop-shadow-lg">{xp}</div>
              </div>

              {/* Max Combo */}
              <div className="bg-gradient-to-br from-red-400 to-orange-500 rounded-lg p-2.5 shadow-xl border-2 border-red-300 transform hover:scale-105 transition-all">
                <div className="text-lg mb-0.5">🔥</div>
                <div className="text-[10px] font-bold text-red-900 uppercase mb-0.5">Max Combo</div>
                <div className="text-xl font-black text-white drop-shadow-lg">{maxCombo}x</div>
              </div>
            </div>

            {/* Special Achievements */}
            {(maxCombo >= 5 || level >= 5 || nuclear > 0 || score >= 5000) && (
              <div className="mb-3 bg-white/50 dark:bg-gray-800/50 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-xs font-bold text-gray-800 dark:text-white mb-1.5">
                  🌟 Special Achievements 🌟
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {maxCombo >= 5 && (
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg">
                      🔥 Combo Master ({maxCombo}x)
                    </div>
                  )}
                  {level >= 5 && (
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg">
                      🎯 Level Champion (Lv.{level})
                    </div>
                  )}
                  {nuclear > 0 && (
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg animate-pulse">
                      ☢️ Nuclear Unlocked!
                    </div>
                  )}
                  {score >= 5000 && (
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg">
                      💰 High Scorer ({score})
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={() => {
                setShowVictoryModal(false);
                onComplete(finalResponses);
              }}
              className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white font-black text-sm py-2.5 px-4 rounded-lg shadow-2xl transform hover:scale-105 transition-all duration-200 border-4 border-green-400 hover:border-green-300"
            >
              ✨ View My Analysis ✨
            </button>

            <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-2">
              Click to see your detailed personality and career analysis
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="text-white text-center p-8">Loading questions...</div>;
  }

  return (
    <div className="w-full h-screen mx-auto overflow-hidden px-2 py-2 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-full h-full mx-auto flex flex-col gap-2">
        {/* Stats Bar - Top */}
        <div className="w-full flex items-center justify-between bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-2xl p-4 shadow-2xl border-2 border-gray-300 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Level</div>
              <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400 drop-shadow-lg">{level}</div>
            </div>
            <div className="w-px h-12 bg-gray-400 dark:bg-gray-700"></div>
            <div className="flex flex-col">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">XP Progress</div>
              <div className="w-40 h-3 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-400 dark:border-gray-600">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${((xp % 400) / 400) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{xp % 400} / 400 XP</div>
            </div>
            <div className="w-px h-12 bg-gray-400 dark:bg-gray-700"></div>
            <div className="flex flex-col items-center">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Combo</div>
              <div className={`text-3xl font-black drop-shadow-lg transition-all duration-300 ${
                combo >= 5 ? 'text-red-600 dark:text-red-400 animate-pulse' : 
                combo >= 3 ? 'text-orange-600 dark:text-orange-400' : 
                'text-gray-600 dark:text-gray-400'
              }`}>
                {combo}x
              </div>
              {maxCombo > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">Max: {maxCombo}x</div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Score</div>
              <div className="text-3xl font-black text-yellow-600 dark:text-yellow-400 drop-shadow-lg">{score}</div>
            </div>
            <div className="w-px h-12 bg-gray-400 dark:bg-gray-700"></div>
            <div className="text-center">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Progress</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{currentIndex + 1}/{questions.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{Math.round(progress)}%</div>
            </div>
          </div>
        </div>

        {/* Easter Egg Notification */}
        {showEasterEggNotif && (
          <div className="fixed top-20 right-6 z-50 animate-slide-in">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl shadow-2xl border-2 border-purple-400 flex items-center gap-3">
              <span className="text-4xl animate-bounce">☢️</span>
              <div>
                <div className="font-bold text-lg">Easter Egg Unlocked!</div>
                <div className="text-sm text-purple-100">Nuclear Power obtained!</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Layout - Horizontal layout */}
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Left Column - Stats & Power-ups */}
          <div className="col-span-2 space-y-3 overflow-y-auto">
            {/* Stats Vertical */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 shadow-xl border-2 border-gray-300 dark:border-gray-700 space-y-4">
              <div className="text-center">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Level</div>
                <div className="text-4xl font-black text-cyan-600 dark:text-cyan-400 drop-shadow-lg">{level}</div>
              </div>
              <div className="h-px bg-gray-400 dark:bg-gray-700"></div>
              <div>
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 text-center">XP Progress</div>
                <div className="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-400 dark:border-gray-600">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${((xp % 400) / 400) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">{xp % 400} / 400 XP</div>
              </div>
              <div className="h-px bg-gray-400 dark:bg-gray-700"></div>
              <div className="text-center">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Combo</div>
                <div className={`text-4xl font-black drop-shadow-lg transition-all duration-300 ${
                  combo >= 5 ? 'text-red-600 dark:text-red-400 animate-pulse' : 
                  combo >= 3 ? 'text-orange-600 dark:text-orange-400' : 
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {combo}x
                </div>
                {maxCombo > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">Max: {maxCombo}x</div>
                )}
              </div>
              <div className="h-px bg-gray-400 dark:bg-gray-700"></div>
              <div className="text-center">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Score</div>
                <div className="text-4xl font-black text-yellow-600 dark:text-yellow-400 drop-shadow-lg">{score}</div>
              </div>
              <div className="h-px bg-gray-400 dark:bg-gray-700"></div>
              <div className="text-center">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Progress</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{currentIndex + 1}/{questions.length}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{Math.round(progress)}%</div>
              </div>
            </div>
          </div>

          {/* Center Column - Grid & Pieces */}
          <div className="col-span-7 space-y-3 flex flex-col min-h-0">
            {/* Tetris Grid */}
            <div className="flex justify-center relative">
              <div className="absolute -top-3 right-4 bg-gradient-to-br from-yellow-400 to-orange-500 px-3 py-1 rounded-lg shadow-xl border-2 border-yellow-300 z-30">
                <div className="text-white font-black text-sm drop-shadow-lg">⭐ {score}</div>
              </div>
            <div 
              className="relative bg-black rounded-lg shadow-2xl"
              style={{
                width: `${GRID_COLS * CELL_SIZE}px`,
                height: `${GRID_ROWS * CELL_SIZE}px`,
                border: '4px solid #2a2a2a',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)',
              }}
            >
              <div 
                className="relative bg-gray-900/50 dark:bg-black/80"
                style={{
                  width: `${GRID_COLS * CELL_SIZE}px`,
                  height: `${GRID_ROWS * CELL_SIZE}px`,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
                  gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_SIZE}px)`,
                  gap: '0px',
                }}
              >
                {grid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const cellKey = `${rowIndex}-${colIndex}`;
                    const isClearing = clearingCells.has(cellKey);
                    
                    return (
                      <div
                        key={cellKey}
                        onDragOver={(e) => handleDragOver(e, rowIndex, colIndex)}
                        onDrop={() => handleDrop(rowIndex, colIndex)}
                        className={`relative transition-all duration-200 ${
                          cell ? `bg-gradient-to-br ${cell.color}` : 'bg-gray-800/50 dark:bg-gray-900/50'
                        } ${isClearing ? 'animate-pulse bg-yellow-400' : ''}`}
                        style={{
                          width: `${CELL_SIZE}px`,
                          height: `${CELL_SIZE}px`,
                          border: cell ? '2px solid rgba(255,255,255,0.4)' : '1px solid rgba(100,116,139,0.3)',
                          boxShadow: isClearing 
                            ? '0 0 20px rgba(255, 215, 0, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.8)' 
                            : cell ? 'inset 0 0 10px rgba(255,255,255,0.3)' : 'none',
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Cell content - stays within bounds */}
                        {cell && !isClearing && (
                          <>
                            <div className="absolute inset-1 bg-white/30 rounded-sm"></div>
                            {cell.emoji && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-lg drop-shadow-lg">{cell.emoji}</div>
                              </div>
                            )}
                          </>
                        )}
                        {/* Explosion effect */}
                        {isClearing && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-2xl animate-ping">💥</div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Preview overlay - Show at exact placement position with outline style */}
              {hoveredCell && draggedPiece && (
                <div className="absolute inset-0 pointer-events-none z-20">
                  {getRotatedPieceShape(draggedPiece.shape, draggedPiece.rotation || 0).coords.map(([dr, dc], idx) => {
                    // Show preview at EXACT placement position
                    const previewRow = hoveredCell[0] + dr;
                    const previewCol = hoveredCell[1] + dc;
                    
                    // Skip if preview would be out of bounds
                    if (previewRow < 0 || previewRow >= GRID_ROWS || previewCol < 0 || previewCol >= GRID_COLS) {
                      return null;
                    }
                    
                    // Check if can place with rotation
                    const canPlace = canPlacePiece(hoveredCell[0], hoveredCell[1], draggedPiece.shape, draggedPiece.rotation || 0);
                    
                    return (
                      <div
                        key={idx}
                        className={`absolute rounded-lg transition-all duration-100 ${
                          canPlace
                            ? 'border-4 border-green-400 bg-green-400/30'
                            : 'border-4 border-red-400 bg-red-400/30'
                        }`}
                        style={{
                          width: `${CELL_SIZE}px`,
                          height: `${CELL_SIZE}px`,
                          top: `${previewRow * CELL_SIZE}px`,
                          left: `${previewCol * CELL_SIZE}px`,
                          boxShadow: canPlace 
                            ? '0 0 30px rgba(74, 222, 128, 1), inset 0 0 20px rgba(74, 222, 128, 0.5)' 
                            : '0 0 30px rgba(248, 113, 113, 1), inset 0 0 20px rgba(248, 113, 113, 0.5)',
                        }}
                      >
                        {/* Animated pulse ring */}
                        <div className={`absolute inset-0 rounded-lg animate-ping ${canPlace ? 'bg-green-400/40' : 'bg-red-400/40'}`}></div>
                        {/* Inner bright center */}
                        <div className={`absolute inset-2 rounded ${canPlace ? 'bg-green-300/60' : 'bg-red-300/60'}`}></div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Power-up preview overlay */}
              {hoveredCell && draggedPowerUp && (
                <div className="absolute inset-0 pointer-events-none z-20">
                  {Array.from({ length: draggedPowerUp === 'bomb' ? 2 : 4 }).map((_, r) =>
                    Array.from({ length: draggedPowerUp === 'bomb' ? 2 : 4 }).map((_, c) => {
                      const previewRow = hoveredCell[0] + r;
                      const previewCol = hoveredCell[1] + c;
                      
                      if (previewRow < 0 || previewRow >= GRID_ROWS || previewCol < 0 || previewCol >= GRID_COLS) {
                        return null;
                      }
                      
                      return (
                        <div
                          key={`${r}-${c}`}
                          className="absolute bg-orange-400/70 border-2 border-orange-300 rounded shadow-lg"
                          style={{
                            width: `${CELL_SIZE}px`,
                            height: `${CELL_SIZE}px`,
                            top: `${previewRow * CELL_SIZE}px`,
                            left: `${previewCol * CELL_SIZE}px`,
                          }}
                        />
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Available Pieces - Below grid */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent"></div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                🎮 Drag a Piece to Answer
              </p>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-600 to-transparent"></div>
            </div>
            
            {/* Horizontal pieces layout */}
            <div className="flex justify-center items-center gap-3 flex-wrap">
              {pieces.map((piece, index) => {
                const rotation = pieceRotations[index] || 0;
                const shapeData = getRotatedPieceShape(piece.shape, rotation);
                const cellSize = 20;
                const gap = 2;
                const totalWidth = shapeData.width * cellSize + (shapeData.width - 1) * gap;
                const totalHeight = shapeData.height * cellSize + (shapeData.height - 1) * gap;
                
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-1"
                  >
                    {/* Piece container with rotation button */}
                    <div className="relative">
                      {/* Rotate button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPieceRotations(prev => ({
                            ...prev,
                            [index]: ((prev[index] || 0) + 1) % 4
                          }));
                        }}
                        className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg transform hover:scale-110 transition-all duration-200 border-2 border-white dark:border-gray-700"
                        title="Rotate piece (Right-click also works)"
                      >
                        ↻
                      </button>
                      
                      <div
                        draggable
                        onDragStart={() => handleDragStart(piece, index)}
                        onDragEnd={handleDragEnd}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setPieceRotations(prev => ({
                            ...prev,
                            [index]: ((prev[index] || 0) + 1) % 4
                          }));
                        }}
                        className={`flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 transition-all duration-200 bg-gray-200 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg border-2 border-gray-300 dark:border-gray-700 hover:border-cyan-500 shadow-lg p-3 ${
                          draggedPiece?.value === piece.value ? 'opacity-20' : 'opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-center" style={{ width: `${totalWidth}px`, height: `${totalHeight}px` }}>
                          {renderTetrisPiece(piece.shape, piece.color, cellSize, gap, rotation)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Text below */}
                    <div className={`text-center w-[100px] bg-gray-200 dark:bg-gray-800/90 backdrop-blur-sm rounded-md p-1 border border-gray-300 dark:border-gray-700 hover:border-cyan-500 shadow-md transition-all duration-200 ${
                      draggedPiece?.value === piece.value ? 'opacity-20' : 'opacity-100'
                    }`}>
                      {piece.emoji && <div className="text-lg">{piece.emoji}</div>}
                      <div className="text-gray-900 dark:text-white font-bold text-xs leading-tight">
                        {piece.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Question & Power-ups */}
        <div className="col-span-3 space-y-3 flex flex-col min-h-0">
          {/* Question Card - Large and prominent */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-700 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                <span className="text-2xl">❓</span>
                <span>Question {currentIndex + 1} / {questions.length}</span>
              </div>
              <span className="text-gray-400 dark:text-gray-600">•</span>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                {currentQuestion.test_type === 'RIASEC' ? '🎯 Career' : '🧠 Personality'}
              </span>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-5 border-2 border-blue-300 dark:border-blue-600 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-relaxed">
                {currentQuestion.question_text}
              </h3>
            </div>
          </div>

          {/* Power-ups */}
          <div className="space-y-2">
            {/* Bomb */}
            <div
              draggable={bombs > 0}
              onDragStart={() => handlePowerUpDragStart('bomb')}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700 shadow-md ${
                bombs > 0 ? 'cursor-grab hover:border-orange-400 dark:hover:border-orange-500' : 'opacity-40 cursor-not-allowed'
              } transition-all duration-200`}
            >
              <span className="text-2xl">💣</span>
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 dark:text-white font-semibold text-xs">Bomb</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">2x2</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-7 h-7 flex items-center justify-center text-gray-900 dark:text-white font-bold text-xs">
                {bombs}
              </div>
            </div>

            {/* Rocket */}
            <div
              draggable={rockets > 0}
              onDragStart={() => handlePowerUpDragStart('rocket')}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700 shadow-md ${
                rockets > 0 ? 'cursor-grab hover:border-blue-400 dark:hover:border-blue-500' : 'opacity-40 cursor-not-allowed'
              } transition-all duration-200`}
            >
              <span className="text-2xl">🚀</span>
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 dark:text-white font-semibold text-xs">Rocket</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">4x4</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-7 h-7 flex items-center justify-center text-gray-900 dark:text-white font-bold text-xs">
                {rockets}
              </div>
            </div>

            {/* Nuclear Power - Easter Egg */}
            {nuclear > 0 && (
              <div
                draggable={nuclear > 0}
                onDragStart={() => handlePowerUpDragStart('nuclear')}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-2 border-2 border-purple-400 shadow-xl cursor-grab hover:scale-105 transition-all duration-200 animate-pulse"
              >
                <span className="text-2xl">☢️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-xs">Nuclear</div>
                  <div className="text-purple-100 text-xs">ALL!</div>
                </div>
                <div className="bg-white/30 rounded-full w-7 h-7 flex items-center justify-center text-white font-black text-xs">
                  {nuclear}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completed Answers - Bottom Center */}
      <div className="mt-3">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 shadow-2xl border-2 border-gray-300 dark:border-gray-700">
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <span className="flex-1">Completed Answers</span>
            <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/50 px-3 py-1 rounded-full">
              {completedAnswers.length}/{questions.length}
            </span>
          </h3>
          
          <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
            {completedAnswers.length === 0 ? (
              <div className="col-span-3 text-center py-4">
                <div className="text-4xl mb-2 animate-bounce">🎯</div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Drag pieces to answer!
                </p>
              </div>
            ) : (
              completedAnswers.map((answer, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 border-2 border-green-400 dark:border-green-500/30 rounded-lg p-2 animate-slide-in shadow-md hover:shadow-lg transition-all duration-200"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded flex items-center justify-center text-white font-black text-xs shadow-md">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {answer.emoji && <span className="text-base">{answer.emoji}</span>}
                      <span className="font-bold text-gray-900 dark:text-white text-xs ml-1">
                        {answer.answer}
                      </span>
                    </div>
                    <div className="text-green-600 dark:text-green-400 text-sm">✓</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={onCancel}
          className="w-full max-w-4xl mx-auto block mt-3 px-4 py-3 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 hover:from-gray-400 hover:to-gray-500 dark:hover:from-gray-600 dark:hover:to-gray-700 text-gray-900 dark:text-white rounded-lg font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-gray-400 dark:border-gray-600"
        >
          ← Back to Menu
        </button>
      </div>

      <style>{`
        @keyframes slide-in {
          0% { opacity: 0; transform: translateX(20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #059669);
          border-radius: 10px;
        }
      `}</style>
    </div>
    </div>
  );
};

export default TetrisQuizGame;
