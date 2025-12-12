/**
 * QuadrantChart - Interactive donut chart for behavioral facets
 * 
 * Features:
 * - Hover on slice: slice zooms + highlights, corresponding card highlights, others dim
 * - Hover on card: corresponding slice highlights, others dim
 * - Default state: ALL slices/cards normal, NO auto-highlight
 * - Legend: horizontal row, label names only (no %)
 * - Color mapping: 1-1 between slice and card by sorted index
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

// Fixed color palette - maps 1-1 with sorted labels by index
const COLORS: ColorDef[] = [
    { bg: 'rgba(139, 92, 246, 0.85)', border: '#8B5CF6' },   // Purple (index 0 = highest %)
    { bg: 'rgba(59, 130, 246, 0.75)', border: '#3B82F6' },   // Blue (index 1)
    { bg: 'rgba(16, 185, 129, 0.75)', border: '#10B981' },   // Green (index 2)
    { bg: 'rgba(245, 158, 11, 0.75)', border: '#F59E0B' },   // Amber (index 3 = lowest %)
];

const DEFAULT_COLOR: ColorDef = { bg: 'rgba(156, 163, 175, 0.75)', border: '#9CA3AF' };

// Get color by sorted index (NOT by label name) - always returns ColorDef
const getColorByIndex = (index: number): ColorDef => {
    const color = COLORS[index];
    return color !== undefined ? color : DEFAULT_COLOR;
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

    // Sort labels by percent descending for consistent display
    // This sorted order determines color assignment (index 0 = purple, etc.)
    const sortedLabels = [...labels].sort((a, b) => b.percent - a.percent);

    // Create a map from label name to its sorted index (for color lookup)
    const labelToIndexMap = new Map<string, number>();
    sortedLabels.forEach((label, index) => {
        labelToIndexMap.set(label.name, index);
    });

    // Calculate angles for each segment based on percentages
    const total = sortedLabels.reduce((sum, l) => sum + l.percent, 0) || 1;
    let currentAngle = -90; // Start from top

    const segments = sortedLabels.map((label, index) => {
        const angle = (label.percent / total) * 360;
        const startAngle = currentAngle;
        currentAngle += angle;
        const color = getColorByIndex(index);

        return {
            ...label,
            startAngle,
            endAngle: currentAngle,
            color,
            colorIndex: index,
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

            {/* Legend - horizontal row, label names only (no %), centered */}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 print:mt-1.5">
                {sortedLabels.map((label, index) => {
                    const legendColor = getColorByIndex(index);
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
