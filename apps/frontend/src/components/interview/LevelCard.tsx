import React from 'react';
import { CareerLevel } from '../../services/interviewService';

interface LevelCardProps {
    level: CareerLevel;
    isSelected: boolean;
    onSelect: (level: CareerLevel) => void;
}

const LevelCard: React.FC<LevelCardProps> = ({ level, isSelected, onSelect }) => {
    return (
        <div className="h-full w-full">
            <button
                onClick={() => onSelect(level)}
                className={`
                    w-full h-full min-h-[160px] p-4 rounded-xl border-2 text-left 
                    transition-all duration-300 flex flex-col justify-between
                    group relative overflow-hidden
                    ${isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'
                    }
                `}
            >
                {/* Header Section - Fixed Height */}
                <div className="flex-shrink-0 mb-3">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <h4 className={`
                                font-semibold text-base mb-2 leading-tight line-clamp-2
                                transition-colors duration-300
                                ${isSelected
                                    ? 'text-blue-900'
                                    : 'text-gray-900 group-hover:text-blue-700'
                                }
                            `}>
                                {level.name}
                            </h4>
                            <div className="flex items-center gap-2">
                                <span className={`
                                    inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                    transition-all duration-300
                                    ${isSelected
                                        ? 'bg-blue-200 text-blue-800'
                                        : 'bg-gray-100 text-gray-700 group-hover:bg-blue-100 group-hover:text-blue-700'
                                    }
                                `}>
                                    Cấp {level.seniority_level}
                                </span>
                                {isSelected && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                )}
                            </div>
                        </div>

                        {/* Selection Indicator */}
                        <div className={`
                            flex-shrink-0 ml-3 transition-all duration-300
                            ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                        `}>
                            <div className={`
                                w-3 h-3 rounded-full transition-all duration-300
                                ${isSelected
                                    ? 'bg-blue-500 scale-110'
                                    : 'bg-blue-400 animate-bounce'
                                }
                            `}></div>
                        </div>
                    </div>
                </div>

                {/* Description Section - Flexible Height */}
                <div className="flex-1 flex items-start">
                    {level.description && (
                        <p className={`
                            text-sm leading-relaxed line-clamp-3
                            transition-colors duration-300
                            ${isSelected
                                ? 'text-blue-800'
                                : 'text-gray-600 group-hover:text-gray-700'
                            }
                        `}>
                            {level.description}
                        </p>
                    )}
                </div>

                {/* Hover Tooltip */}
                <div className="
                    absolute left-1/2 bottom-full mb-3 w-80 max-w-sm
                    bg-gray-900 text-white text-sm rounded-xl px-4 py-3
                    opacity-0 group-hover:opacity-100 transition-all duration-300
                    pointer-events-none z-30 shadow-2xl
                    transform -translate-x-1/2 translate-y-2 group-hover:translate-y-0
                ">
                    {/* Tooltip Header */}
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-600">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="font-semibold text-blue-300">{level.name}</span>
                        <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">
                            Cấp {level.seniority_level}
                        </span>
                    </div>

                    {/* Full Description */}
                    {level.description && (
                        <div className="text-gray-200 leading-relaxed mb-2">
                            {level.description}
                        </div>
                    )}

                    {/* Group Info */}
                    {level.group_name && (
                        <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600">
                            <span className="text-gray-300">Nhóm nghề:</span>{' '}
                            <span className="text-blue-300 font-medium">{level.group_name}</span>
                        </div>
                    )}

                    {/* Click Hint */}
                    <div className="text-xs text-blue-300 mt-2 pt-2 border-t border-gray-600 text-center">
                        <span className="opacity-75">👆 Click để chọn cấp bậc này</span>
                    </div>

                    {/* Tooltip Arrow */}
                    <div className="
                        absolute top-full left-1/2 transform -translate-x-1/2
                        w-0 h-0 border-l-8 border-r-8 border-t-8
                        border-transparent border-t-gray-900
                    "></div>
                </div>

                {/* Selected Glow Effect */}
                {isSelected && (
                    <div className="
                        absolute inset-0 rounded-xl
                        bg-gradient-to-r from-blue-400/20 to-blue-600/20
                        animate-pulse pointer-events-none
                    "></div>
                )}
            </button>
        </div>
    );
};

export default LevelCard;