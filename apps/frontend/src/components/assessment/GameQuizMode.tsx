// This file has been replaced with PersonalityGarden
// Import and re-export the new component for backward compatibility
import PersonalityGardenFlow from './PersonalityGarden/PersonalityGardenFlow';
import { Question, QuestionResponse } from '../../types/assessment';

interface GameQuizModeProps {
  questions: Question[];
  onComplete: (responses: QuestionResponse[]) => void;
  onCancel: () => void;
  assessmentSessionId?: number;
}

// Wrapper component to maintain compatibility
const GameQuizMode = ({ questions, onComplete, onCancel, assessmentSessionId }: GameQuizModeProps) => {
  return (
    <PersonalityGardenFlow
      questions={questions}
      onComplete={onComplete}
      onCancel={onCancel}
      assessmentSessionId={assessmentSessionId}
    />
  );
};

/* OLD ANIMATED QUIZ CODE - REPLACED WITH PERSONALITY GARDEN
const GameQuizModeOld = ({ questions, onComplete, onCancel }: GameQuizModeProps) => {
  // Old code commented out - see end of file
};
*/

export default GameQuizMode;
