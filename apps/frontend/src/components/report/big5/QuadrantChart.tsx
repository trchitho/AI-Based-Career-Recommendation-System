/**
 * QuadrantChart - Interactive donut chart for behavioral facets
 * 
 * Features:
 * - Hover on slice: slice zooms + highlights, corresponding card highlights, others dim
 * - Hover on card: corresponding slice highlights, others dim
 * - Default state: ALL slices/cards normal, NO auto-highlight
 * - Legend: horizontal row, label names only (no %)
 * - Color mapping: FIXED by label name (consistent across all tests)
 * - Position: FIXED order (not sorted by percent)
 * - Print-optimized
 */

import { useState } from 'react';
import { FacetLabel } from '../../../services/reportService';

interface QuadrantChartProps {
    labels: FacetLabel[];
    size?: number;
    onHoverLabel?: (labelName: string | null) => void;
    hoveredLabel?: string | null;
}

interface ColorDef {
    bg: string;
    border: string;
}

// Fixed color palette by LABEL NAME - consistent across all tests
// Each label always gets the same color regardless of percentage
// Colors: Purple, Blue, Green, Amber (in fixed order per facet)
const LABEL_COLORS: Record<string, ColorDef> = {
    // Problem-Solving facet labels (order: innovator, humanitarian, caretaker, pragmatist)
    'innovator': { bg: 'rgba(139, 92, 246, 0.85)', border: '#8B5CF6' },      // Purple
    'humanitarian': { bg: 'rgba(59, 130, 246, 0.75)', border: '#3B82F6' },   // Blue
    'caretaker': { bg: 'rgba(16, 185, 129, 0.75)', border: '#10B981' },      // Green
    'pragmatist': { bg: 'rgba(245, 158, 11, 0.75)', border: '#F59E0B' },     // Amber

    // Motivation facet labels (order: ambitious, excitable, dutiful, casual)
    'ambitious': { bg: 'rgba(139, 92, 246, 0.85)', border: '#8B5CF6' },      // Purple
    'excitable': { bg: 'rgba(59, 130, 246, 0.75)', border: '#3B82F6' },      // Blue
    'dutiful': { bg: 'rgba(16, 185, 129, 0.75)', border: '#10B981' },        // Green
    'casual': { bg: 'rgba(245, 158, 11, 0.75)', border: '#F59E0B' },         // Amber

    // Interaction facet labels (order: gregarious, dominant, supportive, independent)
    'gregarious': { bg: 'rgba(139, 92, 246, 0.85)', border: '#8B5CF6' },     // Purple
    'dominant': { bg: 'rgba(59, 130, 246, 0.75)', border: '#3B82F6' },       // Blue
    'supportive': { bg: 'rgba(16, 185, 129, 0.75)', border: '#10B981' },     // Green
    'independent': { bg: 'rgba(245, 158, 11, 0.75)', border: '#F59E0B' },    // Amber

    // Communication facet labels (order: inspiring, informative, insightful, concise)
    'inspiring': { bg: 'rgba(139, 92, 246, 0.85)', border: '#8B5CF6' },      // Purple
    'informative': { bg: 'rgba(59, 130, 246, 0.75)', border: '#3B82F6' },    // Blue
    'insightful': { bg: 'rgba(16, 185, 129, 0.75)', border: '#10B981' },     // Green
    'concise': { bg: 'rgba(245, 158, 11, 0.75)', border: '#F59E0B' },        // Amber

    // Teamwork facet labels (order: taskmaster, empath, improviser, cooperator)
    'taskmaster': { bg: 'rgba(139, 92, 246, 0.85)', border: '#8B5CF6' },     // Purple
    'empath': { bg: 'rgba(59, 130, 246, 0.75)', border: '#3B82F6' },         // Blue
    'improviser': { bg: 'rgba(16, 185, 129, 0.75)', border: '#10B981' },     // Green
    'cooperator': { bg: 'rgba(245, 158, 11, 0.75)', border: '#F59E0B' },     // Amber

    // Task Management facet labels (order: director, visionary, inspector, responder)
    'director': { bg: 'rgba(139, 92, 246, 0.85)', border: '#8B5CF6' },       // Purple
    'visionary': { bg: 'rgba(59, 130, 246, 0.75)', border: '#3B82F6' },      // Blue
    'inspector': { bg: 'rgba(16, 185, 129, 0.75)', border: '#10B981' },      // Green
    'responder': { bg: 'rgba(245, 158, 11, 0.75)', border: '#F59E0B' },      // Amber
};

// Fixed order for each facet (labels will always appear in this order)
const FACET_LABEL_ORDER: Record<string, string[]> = {
    'problemSolving': ['innovator', 'humanitarian', 'caretaker', 'pragmatist'],
    'motivation': ['ambitious', 'excitable', 'dutiful', 'casual'],
    'interaction': ['gregarious', 'dominant', 'supportive', 'independent'],
    'communication': ['inspiring', 'informative', 'insightful', 'concise'],
    'teamwork': ['taskmaster', 'empath', 'improviser', 'cooperator'],
    'taskManagement': ['director', 'visionary', 'inspector', 'responder'],
};

const DEFAULT_COLOR: ColorDef = { bg: 'rgba(156, 163, 175, 0.75)', border: '#9CA3AF' };

// Get color by label name (FIXED - consistent across all tests)
const getColorByLabelName = (labelName: string): ColorDef => {
    const lowerName = labelName.toLowerCase();
    return LABEL_COLORS[lowerName] || DEFAULT_COLOR;
};

// Get fixed order for labels based on facet type
const getFixedOrderLabels = (labels: FacetLabel[]): FacetLabel[] => {
    // Detect facet type from label names
    const labelNames = labels.map(l => l.name.toLowerCase());

    for (const [, order] of Object.entries(FACET_LABEL_ORDER)) {
        if (order.some(name => labelNames.includes(name))) {
            // Sort labels according to fixed order
            return [...labels].sort((a, b) => {
                const aIndex = order.indexOf(a.name.toLowerCase());
                const bIndex = order.indexOf(b.name.toLowerCase());
                return aIndex - bIndex;
            });
        }
    }

    // Fallback: return as-is
    return labels;
};

const QuadrantChart = ({
    labels,
    size = 160,
    onHoverLabel,
    hoveredLabel
}: QuadrantChartProps) => {
    const [internalHover, setInternalHover] = useState<string | null>(null);

    // Use external hover if provided, otherwise internal
    const activeHover = hoveredLabel !== undefined ? hoveredLabel : internalHover;

    // Use FIXED order for labels (not sorted by percent)
    const orderedLabels = getFixedOrderLabels(labels);

    // Calculate angles for each segment based on percentages
    const total = orderedLabels.reduce((sum, l) => sum + l.percent, 0) || 1;
    let currentAngle = -90; // Start from top

    const segments = orderedLabels.map((label) => {
        const angle = (label.percent / total) * 360;
        const startAngle = currentAngle;
        currentAngle += angle;
        // Get color by label NAME (fixed, consistent across all tests)
        const color = getColorByLabelName(label.name);

        return {
            ...label,
            startAngle,
            endAngle: currentAngle,
            color,
        };
    });

    const center = size / 2;
    const radius = size / 2 - 6;
    const innerRadius = radius * 0.28;

    // Convert polar to cartesian
    const polarToCartesian = (angle: number, r: number) => {
        const rad = (angle * Math.PI) / 180;
        return {
            x: center + r * Math.cos(rad),
            y: center + r * Math.sin(rad),
        };
    };

    // Create SVG arc path (donut style)
    const createArc = (startAngle: number, endAngle: number, outerR: number, innerR: number) => {
        const outerStart = polarToCartesian(startAngle, outerR);
        const outerEnd = polarToCartesian(endAngle, outerR);
        const innerStart = polarToCartesian(startAngle, innerR);
        const innerEnd = polarToCartesian(endAngle, innerR);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;

        return `
            M ${outerStart.x} ${outerStart.y}
            A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}
            L ${innerEnd.x} ${innerEnd.y}
            A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}
            Z
        `;
    };

    const handleSliceHover = (labelName: string | null) => {
        if (onHoverLabel) {
            onHoverLabel(labelName);
        } else {
            setInternalHover(labelName);
        }
    };

    return (
        <div className="flex flex-col items-center">
            {/* SVG Chart */}
            <svg
                width={size}
                height={size}
                className="drop-shadow-sm print:drop-shadow-none"
                viewBox={`0 0 ${size} ${size}`}
            >
                {segments.map((segment) => {
                    const isHovered = activeHover === segment.name;
                    const isOtherHovered = activeHover !== null && activeHover !== segment.name;
                    const segmentColor = segment.color;

                    return (
                        <path
                            key={segment.name}
                            d={createArc(
                                segment.startAngle,
                                segment.endAngle,
                                isHovered ? radius + 4 : radius,
                                innerRadius
                            )}
                            fill={segmentColor.bg}
                            stroke={segmentColor.border}
                            strokeWidth={isHovered ? 2 : 1}
                            opacity={isOtherHovered ? 0.4 : 1}
                            className="transition-all duration-200 cursor-pointer"
                            onMouseEnter={() => handleSliceHover(segment.name)}
                            onMouseLeave={() => handleSliceHover(null)}
                        />
                    );
                })}

                {/* Center circle with white background */}
                <circle
                    cx={center}
                    cy={center}
                    r={innerRadius - 1}
                    fill="white"
                    className="dark:fill-gray-800"
                />
            </svg>

            {/* Legend - horizontal row, label names only (no %), in fixed order */}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 print:mt-1.5">
                {orderedLabels.map((label) => {
                    // Get color by label NAME (fixed, consistent)
                    const legendColor = getColorByLabelName(label.name);
                    const isHovered = activeHover === label.name;
                    const isOtherHovered = activeHover !== null && activeHover !== label.name;

                    return (
                        <div
                            key={label.name}
                            className={`flex items-center gap-1 cursor-pointer transition-opacity duration-200 ${isOtherHovered ? 'opacity-40' : 'opacity-100'}`}
                            onMouseEnter={() => handleSliceHover(label.name)}
                            onMouseLeave={() => handleSliceHover(null)}
                        >
                            <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-200 ${isHovered ? 'scale-125' : ''}`}
                                style={{ backgroundColor: legendColor.border }}
                            />
                            <span className={`text-[10px] font-medium text-gray-600 dark:text-gray-400 capitalize print:text-[8px] ${isHovered ? 'font-bold' : ''}`}>
                                {label.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default QuadrantChart;
