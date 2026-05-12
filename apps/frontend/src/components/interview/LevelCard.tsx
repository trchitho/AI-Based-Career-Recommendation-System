import React from 'react';
import { motion } from 'framer-motion';
import { CareerLevel } from '../../services/interviewService';

interface LevelCardProps {
    level: CareerLevel;
    isSelected: boolean;
    onSelect: (level: CareerLevel) => void;
}

const LevelCard: React.FC<LevelCardProps> = ({ level, isSelected, onSelect }) => {
    return (
        <motion.button
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(level)}
            className={`
                w-full h-full min-h-[150px] p-4 rounded-2xl border-2 text-left 
                transition-all duration-300 flex flex-col justify-between
                group relative overflow-hidden
                ${isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 ring-2 ring-indigo-400/20'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/60 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md hover:bg-indigo-50/20'
                }
            `}
        >
            {/* Header Section */}
            <div className="flex-shrink-0 mb-2">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h4 className={`font-bold text-sm mb-1.5 leading-tight transition-colors duration-300 ${
                            isSelected
                                ? 'text-indigo-900 dark:text-indigo-200'
                                : 'text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300'
                        }`}>
                            {level.name}
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className={`
                                inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                transition-all duration-300
                                ${isSelected
                                    ? 'bg-indigo-200 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                                    : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-700 dark:group-hover:text-indigo-300'
                                }
                            `}>
                                Cấp {level.seniority_level}
                            </span>
                            {isSelected && (
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            )}
                        </div>
                    </div>

                    {/* Check indicator */}
                    <div className={`
                        flex-shrink-0 ml-2 w-5 h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center
                        ${isSelected
                            ? 'border-indigo-500 bg-indigo-500'
                            : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'
                        }
                    `}>
                        {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="flex-1 flex items-start">
                {level.description && (
                    <p className={`
                        text-xs leading-relaxed line-clamp-3
                        transition-colors duration-300
                        ${isSelected
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                        }
                    `}>
                        {level.description}
                    </p>
                )}
            </div>

            {/* Selected glow overlay */}
            {isSelected && (
                <div className="absolute inset-0 rounded-2xl ring-2 ring-indigo-500/30 pointer-events-none" />
            )}

            {/* Hover tooltip */}
            {level.group_name && (
                <div className="
                    absolute left-1/2 bottom-full mb-3 w-72 max-w-xs
                    bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-xl px-3 py-2.5
                    opacity-0 group-hover:opacity-100 transition-all duration-300
                    pointer-events-none z-30 shadow-2xl
                    -translate-x-1/2 translate-y-2 group-hover:translate-y-0
                ">
                    <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-gray-600">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                        <span className="font-semibold text-indigo-300">{level.name}</span>
                    </div>
                    {level.description && (
                        <p className="text-gray-200 mb-1.5 leading-relaxed">{level.description}</p>
                    )}
                    <p className="text-gray-400 text-[10px]">
                        <span className="text-gray-300">Nhóm nghề:</span>{' '}
                        <span className="text-indigo-300 font-medium">{level.group_name}</span>
                    </p>
                    {/* Arrow */}
                    <div className="
                        absolute top-full left-1/2 -translate-x-1/2
                        w-0 h-0 border-l-8 border-r-8 border-t-8
                        border-transparent border-t-gray-900 dark:border-t-gray-800
                    " />
                </div>
            )}
        </motion.button>
    );
};

export default LevelCard;