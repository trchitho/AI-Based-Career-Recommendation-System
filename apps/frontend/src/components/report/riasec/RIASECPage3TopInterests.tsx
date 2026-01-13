/**
 * RIASECPage3TopInterests - Your Top Interests page
 * 
 * Shows detailed info for top 2 interests with:
 * - Top Job Tasks
 * - Your Core Values
 * - Key Personality Traits
 * - Detailed description
 * - Sample Jobs, Career Fields, Areas of Study
 */

import { ScoreItem } from '../../../services/reportService';

interface RIASECPage3TopInterestsProps {
    scores: ScoreItem[];
}

// RIASEC display names
const INTEREST_NAMES: Record<string, string> = {
    realistic: 'Building',
    investigative: 'Thinking',
    artistic: 'Creating',
    social: 'Helping',
    enterprising: 'Persuading',
    conventional: 'Organizing',
};

// Detailed data for each interest type
const INTEREST_DATA: Record<string, {
    topTasks: string[];
    coreValues: string[];
    traits: string[];
    description: string;
    satisfyText: string;
    sampleJobs: string[];
    careerFields: string[];
    areasOfStudy: string[];
}> = {
    realistic: {
        topTasks: ['Building', 'Repairing', 'Operating machinery', 'Working outdoors', 'Physical labor'],
        coreValues: ['Practicality', 'Independence', 'Physical skill', 'Tangible results', 'Nature'],
        traits: ['Practical', 'Mechanical', 'Athletic', 'Hands-on', 'Straightforward'],
        description: 'Because you are a Builder, you will often gravitate to roles that allow you to work with your hands, tools, or machines. You will find a natural home in jobs that produce tangible results, and will enjoy any role where you can see the physical outcome of your work.',
        satisfyText: 'To satisfy your interest in Building, look for a career that allows you to work with physical objects and see concrete results. You will be happiest when you can use your hands and body to create, repair, or operate.',
        sampleJobs: ['Carpenter', 'Electrician', 'Mechanic', 'Engineer', 'Farmer'],
        careerFields: ['Construction', 'Manufacturing', 'Agriculture', 'Transportation', 'Engineering'],
        areasOfStudy: ['Engineering', 'Agriculture', 'Culinary Arts', 'Aviation', 'Trades'],
    },
    investigative: {
        topTasks: ['Researching', 'Analyzing', 'Problem-solving', 'Experimenting', 'Theorizing'],
        coreValues: ['Knowledge', 'Discovery', 'Logic', 'Independence', 'Expertise'],
        traits: ['Analytical', 'Curious', 'Intellectual', 'Reserved', 'Precise'],
        description: 'Because you are a Thinker, you will often gravitate to roles that allow you to research, analyze, and solve complex problems. You will find a natural home in academic, scientific, or technical environments where you can pursue knowledge and understanding.',
        satisfyText: 'To satisfy your interest in Thinking, look for a career that allows you to investigate, analyze, and solve problems. You will be happiest when you can use your intellect to discover new knowledge or develop innovative solutions.',
        sampleJobs: ['Scientist', 'Researcher', 'Doctor', 'Professor', 'Data Analyst'],
        careerFields: ['Science', 'Technology', 'Healthcare', 'Academia', 'Research'],
        areasOfStudy: ['Sciences', 'Mathematics', 'Medicine', 'Computer Science', 'Engineering'],
    },
    artistic: {
        topTasks: ['Creating', 'Designing', 'Performing', 'Writing', 'Expressing'],
        coreValues: ['Creativity', 'Originality', 'Self-expression', 'Beauty', 'Independence'],
        traits: ['Creative', 'Imaginative', 'Expressive', 'Unconventional', 'Sensitive'],
        description: 'Because you are a Creator, you will often gravitate to roles that allow you to use your creative talents and express yourself artistically. You will find a natural home in environments that value originality and allow you to produce unique work.',
        satisfyText: 'To satisfy your interest in Creating, look for a career that allows you freedom to express yourself. You will be happiest when you can imagine, envision, experiment, and create.',
        sampleJobs: ['Artist', 'Designer', 'Writer', 'Musician', 'Architect'],
        careerFields: ['Arts', 'Design', 'Media', 'Entertainment', 'Architecture'],
        areasOfStudy: ['Fine Arts', 'Design', 'Music', 'Theater', 'Creative Writing'],
    },
    social: {
        topTasks: ['Teaching', 'Counseling', 'Helping', 'Caring', 'Communicating'],
        coreValues: ['Service', 'Cooperation', 'Empathy', 'Community', 'Making a difference'],
        traits: ['Helpful', 'Friendly', 'Empathetic', 'Patient', 'Cooperative'],
        description: 'Because you are a Helper, you will often gravitate to roles that allow you to assist, teach, or care for others. You will find a natural home in cooperative environments where you can make a positive impact on people\'s lives.',
        satisfyText: 'To satisfy your interest in Helping, look for a career that allows you to work closely with people and contribute to their well-being. You will be happiest when you can see the positive impact of your work on others.',
        sampleJobs: ['Teacher', 'Counselor', 'Nurse', 'Social Worker', 'Therapist'],
        careerFields: ['Education', 'Healthcare', 'Social Services', 'Counseling', 'Human Resources'],
        areasOfStudy: ['Education', 'Psychology', 'Nursing', 'Social Work', 'Counseling'],
    },
    enterprising: {
        topTasks: ['Managing', 'Deciding', 'Strategizing', 'Selling', 'Motivating'],
        coreValues: ['Influence', 'Leadership', 'Risk-Taking', 'Achievement', 'Initiative'],
        traits: ['Assertive', 'Energetic', 'Confident', 'Ambitious', 'Adventurous'],
        description: 'Because you are a Persuader, you will often gravitate to roles that allow you to sell, lead, influence, motivate, and direct other people. You will find a natural home in the business world, but will enjoy any role where you can set a course of action and use your ingenuity and influence to achieve your goals.',
        satisfyText: 'To satisfy your interest in Persuading, look for a career where you can take the lead to start and carry out initiatives, act quickly and decisively to set a course, and use your charisma to influence others.',
        sampleJobs: ['Executive', 'Attorney', 'Sales Manager', 'Entrepreneur', 'Financial Advisor'],
        careerFields: ['Sales', 'Marketing', 'Entrepreneurship', 'Management', 'Legal'],
        areasOfStudy: ['Business Administration', 'Marketing', 'Law', 'Communications', 'Political Science'],
    },
    conventional: {
        topTasks: ['Organizing', 'Processing', 'Recording', 'Calculating', 'Filing'],
        coreValues: ['Accuracy', 'Stability', 'Efficiency', 'Order', 'Reliability'],
        traits: ['Organized', 'Detail-oriented', 'Reliable', 'Methodical', 'Careful'],
        description: 'Because you are an Organizer, you will often gravitate to roles that allow you to manage data, information, and processes. You will find a natural home in structured environments where you can complete tasks with precision and accuracy.',
        satisfyText: 'To satisfy your interest in Organizing, look for a career that allows you to work with data and systems in a structured environment. You will be happiest when you can bring order and efficiency to your work.',
        sampleJobs: ['Accountant', 'Administrator', 'Analyst', 'Banker', 'Office Manager'],
        careerFields: ['Finance', 'Accounting', 'Administration', 'Banking', 'Insurance'],
        areasOfStudy: ['Accounting', 'Finance', 'Business Administration', 'Information Systems'],
    },
};

const RIASECPage3TopInterests = ({ scores }: RIASECPage3TopInterestsProps) => {
    // Get top 2 interests
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    const top2 = sortedScores.slice(0, 2);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Title */}
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 print:text-2xl print:mb-3">
                Your Top Interests
            </h2>

            {/* Top 2 Interest Sections */}
            <div className="flex-1 space-y-6 overflow-auto print:space-y-4">
                {top2.map((item, index) => {
                    const traitKey = item.trait.toLowerCase();
                    const displayName = INTEREST_NAMES[traitKey] || item.trait;
                    const data = INTEREST_DATA[traitKey];

                    if (!data) return null;

                    return (
                        <div key={item.trait} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0 print:pb-4">
                            {/* Interest Header */}
                            <p className="text-base text-gray-700 dark:text-gray-300 mb-3 leading-relaxed print:text-sm">
                                Your {index === 0 ? 'top' : 'second'} interest area is <span className="font-bold text-gray-900 dark:text-white text-lg">{displayName}</span>. {data.description}
                            </p>

                            {/* Three Columns: Tasks, Values, Traits */}
                            <div className="grid grid-cols-3 gap-6 my-4 print:gap-4 print:my-3">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 print:text-xs">
                                        Top Job Tasks
                                    </h4>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 print:text-xs">
                                        {data.topTasks.map((task, i) => (
                                            <li key={i}>• {task}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 print:text-xs">
                                        Your Core Values
                                    </h4>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 print:text-xs">
                                        {data.coreValues.map((value, i) => (
                                            <li key={i}>• {value}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 print:text-xs">
                                        Key Personality Traits
                                    </h4>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 print:text-xs">
                                        {data.traits.map((trait, i) => (
                                            <li key={i}>• {trait}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed print:text-xs">
                                {data.description}
                            </p>

                            {/* Satisfy Text */}
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed print:text-xs">
                                {data.satisfyText}
                            </p>

                            {/* Sample Jobs, Career Fields, Areas of Study */}
                            <div className="grid grid-cols-3 gap-6 mt-3 print:gap-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 print:text-[10px]">
                                        Sample Jobs
                                    </h4>
                                    <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 print:text-[10px]">
                                        {data.sampleJobs.map((job, i) => (
                                            <li key={i}>• {job}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 print:text-[10px]">
                                        Career Fields
                                    </h4>
                                    <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 print:text-[10px]">
                                        {data.careerFields.map((field, i) => (
                                            <li key={i}>• {field}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 print:text-[10px]">
                                        Areas of Study
                                    </h4>
                                    <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 print:text-[10px]">
                                        {data.areasOfStudy.map((area, i) => (
                                            <li key={i}>• {area}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RIASECPage3TopInterests;
