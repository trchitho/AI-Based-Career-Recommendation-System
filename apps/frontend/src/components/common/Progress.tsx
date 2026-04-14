import { FC } from 'react';

interface ProgressProps {
    value: number;
    max?: number;
    className?: string;
}

export const Progress: FC<ProgressProps> = ({
    value,
    max = 100,
    className = ''
}) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div className={`relative w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 ${className}`}>
            <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
};