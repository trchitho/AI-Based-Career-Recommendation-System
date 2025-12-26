/**
 * FacetSection - A single facet with interactive donut chart and description cards
 *
 * Features:
 * - Chart on left, 4 cards on right (2x2 grid)
 * - Hover on slice: card highlights, others dim
 * - Hover on card: slice highlights, others dim
 * - DEFAULT STATE: ALL cards normal, NO auto-highlight (even for dominant)
 * - Color mapping: FIXED by label name (consistent across all tests)
 * - Position: FIXED order (not sorted by percent) - cards always in same position
 * - Facet-specific descriptions (Truity-style)
 * - Print-optimized
 * - CONSISTENT typography across all facets
 */

import { useState } from 'react';
import { Facet } from '../../../services/reportService';
import QuadrantChart from './QuadrantChart';

interface FacetSectionProps {
    facet: Facet;
}

// Fixed color palette by LABEL NAME - consistent across all tests
const LABEL_CARD_COLORS: Record<
    string,
    { bg: string; border: string; text: string; ring: string }
> = {
    // Problem-Solving facet labels
    innovator: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-300 dark:border-purple-700',
        text: 'text-purple-700 dark:text-purple-400',
        ring: 'ring-purple-400',
    },
    humanitarian: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-300 dark:border-blue-700',
        text: 'text-blue-700 dark:text-blue-400',
        ring: 'ring-blue-400',
    },
    caretaker: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-300 dark:border-green-700',
        text: 'text-green-700 dark:text-green-400',
        ring: 'ring-green-400',
    },
    pragmatist: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-300 dark:border-amber-700',
        text: 'text-amber-700 dark:text-amber-400',
        ring: 'ring-amber-400',
    },
    // Motivation facet labels
    ambitious: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-300 dark:border-purple-700',
        text: 'text-purple-700 dark:text-purple-400',
        ring: 'ring-purple-400',
    },
    excitable: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-300 dark:border-blue-700',
        text: 'text-blue-700 dark:text-blue-400',
        ring: 'ring-blue-400',
    },
    dutiful: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-300 dark:border-green-700',
        text: 'text-green-700 dark:text-green-400',
        ring: 'ring-green-400',
    },
    casual: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-300 dark:border-amber-700',
        text: 'text-amber-700 dark:text-amber-400',
        ring: 'ring-amber-400',
    },
    // Interaction facet labels
    gregarious: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-300 dark:border-purple-700',
        text: 'text-purple-700 dark:text-purple-400',
        ring: 'ring-purple-400',
    },
    dominant: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-300 dark:border-blue-700',
        text: 'text-blue-700 dark:text-blue-400',
        ring: 'ring-blue-400',
    },
    supportive: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-300 dark:border-green-700',
        text: 'text-green-700 dark:text-green-400',
        ring: 'ring-green-400',
    },
    independent: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-300 dark:border-amber-700',
        text: 'text-amber-700 dark:text-amber-400',
        ring: 'ring-amber-400',
    },
    // Communication facet labels
    inspiring: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-300 dark:border-purple-700',
        text: 'text-purple-700 dark:text-purple-400',
        ring: 'ring-purple-400',
    },
    informative: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-300 dark:border-blue-700',
        text: 'text-blue-700 dark:text-blue-400',
        ring: 'ring-blue-400',
    },
    insightful: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-300 dark:border-green-700',
        text: 'text-green-700 dark:text-green-400',
        ring: 'ring-green-400',
    },
    concise: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-300 dark:border-amber-700',
        text: 'text-amber-700 dark:text-amber-400',
        ring: 'ring-amber-400',
    },
    // Teamwork facet labels
    taskmaster: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-300 dark:border-purple-700',
        text: 'text-purple-700 dark:text-purple-400',
        ring: 'ring-purple-400',
    },
    empath: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-300 dark:border-blue-700',
        text: 'text-blue-700 dark:text-blue-400',
        ring: 'ring-blue-400',
    },
    improviser: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-300 dark:border-green-700',
        text: 'text-green-700 dark:text-green-400',
        ring: 'ring-green-400',
    },
    cooperator: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-300 dark:border-amber-700',
        text: 'text-amber-700 dark:text-amber-400',
        ring: 'ring-amber-400',
    },
    // Task Management facet labels
    director: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-300 dark:border-purple-700',
        text: 'text-purple-700 dark:text-purple-400',
        ring: 'ring-purple-400',
    },
    visionary: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-300 dark:border-blue-700',
        text: 'text-blue-700 dark:text-blue-400',
        ring: 'ring-blue-400',
    },
    inspector: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-300 dark:border-green-700',
        text: 'text-green-700 dark:text-green-400',
        ring: 'ring-green-400',
    },
    responder: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-300 dark:border-amber-700',
        text: 'text-amber-700 dark:text-amber-400',
        ring: 'ring-amber-400',
    },
};

// Fixed order for each facet (labels will always appear in this order)
const FACET_LABEL_ORDER: Record<string, string[]> = {
    problemSolving: ['innovator', 'humanitarian', 'caretaker', 'pragmatist'],
    motivation: ['ambitious', 'excitable', 'dutiful', 'casual'],
    interaction: ['gregarious', 'dominant', 'supportive', 'independent'],
    communication: ['inspiring', 'informative', 'insightful', 'concise'],
    teamwork: ['taskmaster', 'empath', 'improviser', 'cooperator'],
    taskManagement: ['director', 'visionary', 'inspector', 'responder'],
};

interface CardColor {
    bg: string;
    border: string;
    text: string;
    ring: string;
}

const DEFAULT_CARD: CardColor = {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    ring: 'ring-gray-400',
};

const getCardColorByName = (labelName: string): CardColor => {
    const lowerName = labelName.toLowerCase();
    return LABEL_CARD_COLORS[lowerName] || DEFAULT_CARD;
};


const getFixedOrderLabels = (
    facetName: string,
    labels: { name: string; percent: number; description: string }[]
): { name: string; percent: number; description: string }[] => {
    const order = FACET_LABEL_ORDER[facetName];
    if (!order) {
        const labelNames = labels.map((l) => l.name.toLowerCase());
        for (const [, fixedOrder] of Object.entries(FACET_LABEL_ORDER)) {
            if (fixedOrder.some((name) => labelNames.includes(name))) {
                return [...labels].sort((a, b) => {
                    const aIndex = fixedOrder.indexOf(a.name.toLowerCase());
                    const bIndex = fixedOrder.indexOf(b.name.toLowerCase());
                    return aIndex - bIndex;
                });
            }
        }
        return labels;
    }
    return [...labels].sort((a, b) => {
        const aIndex = order.indexOf(a.name.toLowerCase());
        const bIndex = order.indexOf(b.name.toLowerCase());
        return aIndex - bIndex;
    });
};

const FACET_DESCRIPTIONS: Record<string, string> = {
    problemSolving:
        'This chart illustrates your cognitive approach to problem-solving, reflecting how you analyze situations, generate solutions, and make decisions.',
    motivation:
        'This chart shows how you are motivated in your work, including the factors that drive you to work as well as your overall level of motivation.',
    interaction:
        'This chart reveals your interpersonal interaction style, showing how you engage with others in professional and social contexts.',
    communication:
        'This chart describes how you communicate your thoughts, experiences, and ideas to others.',
    teamwork:
        'This chart demonstrates your collaborative approach within team settings, indicating how you contribute to group dynamics.',
    taskManagement:
        'This chart depicts your approach to managing tasks and projects, revealing your organizational style and leadership tendencies.',
};

const FacetSection = ({ facet }: FacetSectionProps) => {
    const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

    const description =
        FACET_DESCRIPTIONS[facet.name] ||
        'This chart shows your behavioral pattern in this area.';

    const orderedLabels = getFixedOrderLabels(facet.name, facet.labels);

    return (
        <div className="facet-section flex flex-col print:break-inside-avoid">
            {/* Facet Title - Larger font */}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 print:text-base print:mb-1.5">
                {facet.title}
            </h3>
            {/* Facet Description - Larger font */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed print:text-xs print:mb-3">
                {description}
            </p>
            {/* Chart + Cards Layout */}
            <div className="flex flex-row gap-4 items-center print:gap-3">
                {/* Chart - Larger size */}
                <div className="flex-shrink-0">
                    <QuadrantChart
                        labels={facet.labels}
                        size={160}
                        hoveredLabel={hoveredLabel}
                        onHoverLabel={setHoveredLabel}
                    />
                </div>
                {/* Description Cards - Larger text */}
                <div className="flex-1 grid grid-cols-2 gap-2 print:gap-1.5">
                    {orderedLabels.map((label) => {
                        const isHovered = hoveredLabel === label.name;
                        const isOtherHovered =
                            hoveredLabel !== null && hoveredLabel !== label.name;
                        const cardColor = getCardColorByName(label.name);

                        return (
                            <div
                                key={label.name}
                                className={`p-3 rounded-lg border print:p-2 transition-all duration-200 cursor-pointer
                                    ${cardColor.bg} ${cardColor.border}
                                    ${isHovered ? `ring-2 ${cardColor.ring} scale-[1.02]` : ''}
                                    ${isOtherHovered ? 'opacity-40' : 'opacity-100'}
                                `}
                                onMouseEnter={() => setHoveredLabel(label.name)}
                                onMouseLeave={() => setHoveredLabel(null)}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <h4
                                        className={`font-bold uppercase text-xs print:text-[10px] ${cardColor.text}`}
                                    >
                                        {label.name}
                                    </h4>
                                    <span
                                        className={`text-xs font-semibold print:text-[10px] ${cardColor.text}`}
                                    >
                                        {label.percent}%
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug line-clamp-3 print:text-[9px]">
                                    {label.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FacetSection;
