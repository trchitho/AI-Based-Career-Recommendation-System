/**
 * FacetSection - A single facet with interactive donut chart and description cards
 * 
 * Features:
 * - Chart on left, 4 cards on right (2x2 grid)
 * - Hover on slice: card highlights, others dim
 * - Hover on card: slice highlights, others dim
 * - DEFAULT STATE: ALL cards normal, NO auto-highlight (even for dominant)
 * - Color mapping: 1-1 with chart by sorted percent order
 * - Facet-specific descriptions (Truity-style)
 * - Print-optimized
 */

import { useState } from 'react';
import { Facet } from '../../../services/reportService';
import QuadrantChart from './QuadrantChart';

interface FacetSectionProps {
    facet: Facet;
}

// Color palette matching QuadrantChart - by sorted index
const CARD_COLORS = [
    { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-400', ring: 'ring-purple-400' },
    { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-400', ring: 'ring-blue-400' },
    { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-400', ring: 'ring-green-400' },
    { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-400', ring: 'ring-amber-400' },
];

interface CardColor {
    bg: string;
    border: string;
    text: string;
    ring: string;
}

const DEFAULT_CARD: CardColor = { bg: 'bg-gray-50 dark:bg-gray-800/50', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-700 dark:text-gray-300', ring: 'ring-gray-400' };

// Get card color by index - always returns CardColor
const getCardColor = (index: number): CardColor => {
    const color = CARD_COLORS[index];
    return color !== undefined ? color : DEFAULT_CARD;
};

// Facet-specific descriptions - Truity-style, career psychology language
const FACET_DESCRIPTIONS: Record<string, string> = {
    problemSolving:
        "This chart illustrates your cognitive approach to problem-solving, reflecting how you analyze situations, generate solutions, and make decisions. Your pattern indicates the balance between creative innovation and practical methodology in your thinking style.",
    motivation:
        "This chart shows how you are motivated in your work, including the factors that drive you to work as well as your overall level of motivation to work. Understanding your motivational pattern helps identify environments where you naturally thrive.",
    interaction:
        "This chart reveals your interpersonal interaction style, showing how you engage with others in professional and social contexts. Your pattern reflects the balance between social engagement and independent work preferences.",
    communication:
        "This chart describes how you communicate your thoughts, experiences, and ideas to others. Your pattern reflects both the information you choose to communicate and your communication style, from inspiring to concise.",
    teamwork:
        "This chart demonstrates your collaborative approach within team settings, indicating how you contribute to group dynamics and collective goals. Your pattern shows the balance between cooperation and task-focused contributions.",
    taskManagement:
        "This chart depicts your approach to managing tasks and projects, revealing your organizational style and leadership tendencies. Your pattern indicates preferences for structure, detail orientation, and adaptability in work management.",
};

const FacetSection = ({ facet }: FacetSectionProps) => {
    const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

    const description = FACET_DESCRIPTIONS[facet.name] ||
        "This chart shows your behavioral pattern in this area. The larger a section, the more that style describes you.";

    // Sort labels by percent descending - MUST match QuadrantChart sorting
    const sortedLabels = [...facet.labels].sort((a, b) => b.percent - a.percent);

    // Create map from label name to sorted index
    const labelToIndexMap = new Map<string, number>();
    sortedLabels.forEach((label, index) => {
        labelToIndexMap.set(label.name, index);
    });

    return (
        <div className="facet-section mb-6 print:mb-4 print:break-inside-avoid">
            {/* Facet Title */}
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5 print:text-sm">
                {facet.title}
            </h3>

            {/* Facet-specific Description */}
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-relaxed print:text-[10px] print:mb-2 print:leading-snug">
                {description}
            </p>

            {/* Chart + Cards Layout - Always horizontal */}
            <div className="flex flex-row gap-4 items-start print:gap-3">
                {/* Chart - Fixed size, left side */}
                <div className="flex-shrink-0">
                    <QuadrantChart
                        labels={facet.labels}
                        size={150}
                        hoveredLabel={hoveredLabel}
                        onHoverLabel={setHoveredLabel}
                    />
                </div>

                {/* Description Cards - 2x2 Grid, right side, sorted by percent */}
                <div className="flex-1 grid grid-cols-2 gap-2 print:gap-1.5">
                    {sortedLabels.map((label, index) => {
                        const isHovered = hoveredLabel === label.name;
                        const isOtherHovered = hoveredLabel !== null && hoveredLabel !== label.name;

                        // Get color by sorted index (matches chart slice color)
                        const cardColor = getCardColor(index);

                        return (
                            <div
                                key={label.name}
                                className={`p-2.5 rounded-lg border print:p-1.5 transition-all duration-200 cursor-pointer
                                    ${cardColor.bg} ${cardColor.border}
                                    ${isHovered ? `ring-2 ${cardColor.ring} scale-[1.02]` : ''}
                                    ${isOtherHovered ? 'opacity-40' : 'opacity-100'}
                                `}
                                onMouseEnter={() => setHoveredLabel(label.name)}
                                onMouseLeave={() => setHoveredLabel(null)}
                            >
                                {/* Label Header */}
                                <div className="flex items-center justify-between mb-0.5">
                                    <h4 className={`font-bold uppercase text-[11px] print:text-[9px] ${cardColor.text}`}>
                                        {label.name}
                                    </h4>
                                    <span className={`text-[11px] font-semibold print:text-[9px] ${cardColor.text}`}>
                                        {label.percent}%
                                    </span>
                                </div>

                                {/* Label Description */}
                                <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-tight line-clamp-2 print:text-[8px]">
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
