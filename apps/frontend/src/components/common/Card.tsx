import { ReactNode, FC } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
}

interface CardHeaderProps {
    children: ReactNode;
    className?: string;
}

interface CardContentProps {
    children: ReactNode;
    className?: string;
}

interface CardTitleProps {
    children: ReactNode;
    className?: string;
}

export const Card: FC<CardProps> = ({ children, className = '' }) => {
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}>
            {children}
        </div>
    );
};

export const CardHeader: FC<CardHeaderProps> = ({ children, className = '' }) => {
    return (
        <div className={`p-6 pb-4 ${className}`}>
            {children}
        </div>
    );
};

export const CardContent: FC<CardContentProps> = ({ children, className = '' }) => {
    return (
        <div className={`p-6 pt-0 ${className}`}>
            {children}
        </div>
    );
};

export const CardTitle: FC<CardTitleProps> = ({ children, className = '' }) => {
    return (
        <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>
            {children}
        </h3>
    );
};