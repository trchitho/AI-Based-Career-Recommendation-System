/**
 * RIASECPage7Guidance - Choosing the Right Career page
 * 
 * Shows career guidance content dynamically based on user's top interests
 * Based on Truity Career Personality Profiler format
 */

import { ScoreItem } from '../../../services/reportService';

interface RIASECPage7GuidanceProps {
    scores?: ScoreItem[];
}

// Dynamic content based on interest type
const INTEREST_GUIDANCE: Record<string, {
    coreNeeds: string[];
    preferredTasks: string[];
    keyQuestions: string[];
}> = {
    realistic: {
        coreNeeds: [
            'Work with my hands to create tangible, practical results',
            'Use tools, machines, or physical skills in my daily work',
            'See the concrete outcomes of my efforts',
            'Work independently with minimal supervision',
        ],
        preferredTasks: [
            'Building, constructing, or crafting things',
            'Repairing or maintaining equipment',
            'Operating machinery or tools',
            'Working outdoors or with nature',
            'Physical labor or athletic activities',
            'Making something tangible and useful',
        ],
        keyQuestions: [
            'Will this career allow me to work with my hands?',
            'Will I see tangible results from my work?',
            'Does this career involve practical, real-world problem solving?',
            'Will I have opportunities to work independently?',
        ],
    },
    investigative: {
        coreNeeds: [
            'Research and analyze complex problems',
            'Use logic and reason to form conclusions',
            'Develop expertise in my field',
            'Work independently on intellectual challenges',
        ],
        preferredTasks: [
            'Researching scientific principles and theories',
            'Gathering and analyzing data',
            'Developing and testing hypotheses',
            'Using logic and reason to form conclusions',
            'Reading and learning to increase knowledge',
            'Applying expertise to devise innovative solutions',
        ],
        keyQuestions: [
            'Will this career allow me to research and analyze?',
            'Will I be challenged intellectually in this role?',
            'Does this career value expertise and knowledge?',
            'Will I have opportunities for continuous learning?',
        ],
    },
    artistic: {
        coreNeeds: [
            'Use my creative talents to do something original and unique',
            'Express my ideas, feelings and experiences',
            'Experience my senses through art, design, music, or drama',
            'Follow my inspiration to create what is authentic to me',
        ],
        preferredTasks: [
            'Working with forms, colors, patterns, or visual elements',
            'Working with aesthetic or expressive media',
            'Creating a visually appealing presentation or design',
            'Coming up with original ideas with few guidelines',
            'Working on what inspires you at the moment',
            'Being imaginative, creative, and original',
        ],
        keyQuestions: [
            'Will this career allow me to be creative and original?',
            'Will I be able to express myself authentically?',
            'Does this career take advantage of my creative talents?',
            'Will I work in aesthetically pleasing environments?',
        ],
    },
    social: {
        coreNeeds: [
            'Help others improve their lives and well-being',
            'Work cooperatively with others toward shared goals',
            'Make a positive difference in my community',
            'Build meaningful relationships through my work',
        ],
        preferredTasks: [
            'Teaching or training others',
            'Counseling or advising people',
            'Caring for others\' physical or emotional needs',
            'Working as part of a team',
            'Communicating and building relationships',
            'Serving the community or helping those in need',
        ],
        keyQuestions: [
            'Will this career allow me to help others directly?',
            'Will I work closely with people in this role?',
            'Does this career make a positive impact on others?',
            'Will I be part of a supportive, cooperative team?',
        ],
    },
    enterprising: {
        coreNeeds: [
            'Use my charisma and powers of persuasion to motivate and influence other people',
            'Set exciting goals and take risks to achieve success',
            'Increase my power and standing within my field',
            'Promote novel ideas and impact key decisions to make my mark on the world',
        ],
        preferredTasks: [
            'Selling products or services',
            'Leading or managing a team',
            'Pitching ideas or initiatives',
            'Starting a new business or other venture',
            'Speaking in front of groups of people',
            'Influencing people to your way of thinking',
        ],
        keyQuestions: [
            'Will this career allow me to influence and motivate other people?',
            'Will I feel powerful and important in this career?',
            'Will this career allow me to take risks and pursue exciting achievements?',
            'Will this career give me a platform to share my ideas and persuade others?',
        ],
    },
    conventional: {
        coreNeeds: [
            'Work in a structured, organized environment',
            'Complete tasks with precision and accuracy',
            'Follow established procedures and systems',
            'Achieve stability and predictability in my work',
        ],
        preferredTasks: [
            'Organizing and managing data or information',
            'Following established procedures',
            'Working with numbers and calculations',
            'Maintaining accurate records',
            'Processing information systematically',
            'Ensuring quality and accuracy in work',
        ],
        keyQuestions: [
            'Will this career provide structure and stability?',
            'Will I work with data, systems, or processes?',
            'Does this career value accuracy and attention to detail?',
            'Will I have clear expectations and procedures to follow?',
        ],
    },
};

const RIASECPage7Guidance = ({ scores }: RIASECPage7GuidanceProps) => {
    // Get top 2 interests to generate dynamic content
    const sortedScores = scores ? [...scores].sort((a, b) => b.score - a.score) : [];
    const topInterest = sortedScores[0]?.trait?.toLowerCase() || 'enterprising';
    const secondInterest = sortedScores[1]?.trait?.toLowerCase() || 'artistic';

    // Combine guidance from top 2 interests (with fallback)
    const fallback = INTEREST_GUIDANCE['enterprising'];
    const topGuidance = INTEREST_GUIDANCE[topInterest] || fallback;
    const secondGuidance = INTEREST_GUIDANCE[secondInterest] || fallback;

    // Mix content from both interests
    const coreNeeds = [...(topGuidance?.coreNeeds || []).slice(0, 2), ...(secondGuidance?.coreNeeds || []).slice(0, 2)];
    const preferredTasks = [...(topGuidance?.preferredTasks || []).slice(0, 3), ...(secondGuidance?.preferredTasks || []).slice(0, 3)];
    const keyQuestions = [...(topGuidance?.keyQuestions || []).slice(0, 2), ...(secondGuidance?.keyQuestions || []).slice(0, 2)];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Title */}
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-4 print:text-xl print:mb-3">
                Choosing the Right Career
            </h2>

            {/* Intro */}
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-5 leading-relaxed print:text-xs print:mb-4">
                Now that you've reviewed some possible careers, you may be wondering where to go next. This section is designed to give you a roadmap that you can use to navigate forward as you explore your career possibilities.
            </p>

            {/* Core Needs Section */}
            <div className="mb-5 print:mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 print:text-sm">
                    Your Core Needs
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 print:text-[10px]">
                    Below are the factors that are most likely to be important to you in a career. If a career has most of these factors, you will find the day-to-day work satisfying.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 print:text-xs">
                    {coreNeeds.slice(0, 4).map((need, i) => (
                        <li key={i}>• {need}</li>
                    ))}
                </ul>
            </div>

            {/* Preferred Tasks Section */}
            <div className="mb-5 print:mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 print:text-sm">
                    Your Preferred Tasks
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 print:text-[10px]">
                    One of the most important aspects of job satisfaction is the extent to which your daily work fits with your preferred types of activities.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 grid grid-cols-2 gap-x-4 print:text-xs">
                    {preferredTasks.slice(0, 6).map((task, i) => (
                        <li key={i}>• {task}</li>
                    ))}
                </ul>
            </div>

            {/* Key Questions Section */}
            <div className="mb-5 print:mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 print:text-sm">
                    Your Key Questions
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 print:text-[10px]">
                    As you explore careers, ask these questions that are personal to your interests:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 print:text-xs">
                    {keyQuestions.slice(0, 4).map((q, i) => (
                        <li key={i}>• {q}</li>
                    ))}
                </ul>
            </div>

            {/* What Makes Your Ideal Career */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 print:p-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 print:text-sm">
                    What Makes Your Ideal Career?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed print:text-xs">
                    In choosing a career, you want to be mindful of the factors that are most important to you. Many of these factors will be based on your interests and personality, but some will be unique to you. An ideal career should satisfy your most fundamental motivations to work. To understand what sort of career will be satisfying, you must understand the factors that create satisfaction for you.
                </p>
            </div>
        </div>
    );
};

export default RIASECPage7Guidance;
