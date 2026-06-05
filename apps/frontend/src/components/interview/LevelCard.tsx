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
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(level)}
            className={`
                w-full h-full min-h-[160px] p-4 rounded-2xl border-2 text-left
                transition-all duration-200 flex flex-col
                group relative overflow-hidden
                ${isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100'
                    : 'border-gray-200 bg-white hover:border-indigo-400 hover:shadow-md'
                }
            `}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm leading-tight mb-1.5 ${
                        isSelected ? 'text-indigo-900' : 'text-gray-900'
                    }`}>
                        {level.name}
                    </h4>
                    <span className={`
                        inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                        ${isSelected
                            ? 'bg-indigo-200 text-indigo-800'
                            : 'bg-gray-100 text-gray-600'
                        }
                    `}>
                        Cấp {level.seniority_level}
                    </span>
                </div>

                {/* Radio check */}
                <div className={`
                    flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                    ${isSelected
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-gray-300 bg-white group-hover:border-indigo-400'
                    }
                `}>
                    {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Description */}
            {level.description && (
                <p className={`text-xs leading-relaxed mt-1 line-clamp-3 ${
                    isSelected ? 'text-indigo-700' : 'text-gray-600'
                }`}>
                    {level.description}
                </p>
            )}
        </motion.button>
    );
};

export default LevelCard;
