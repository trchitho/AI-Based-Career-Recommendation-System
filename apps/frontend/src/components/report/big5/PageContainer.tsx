/**
 * PageContainer - Fixed-size page container for print-ready reports
 * 
 * Features:
 * - A4 aspect ratio (narrower width, taller height)
 * - Consistent padding for UI and print
 * - Page break controls for print
 * - Same dimensions for all pages
 */

import { ReactNode } from 'react';

interface PageContainerProps {
    children: ReactNode;
    pageNo: number;
    pageKey: string;
    className?: string;
}

const PageContainer = ({ children, pageNo, pageKey, className = '' }: PageContainerProps) => {
    return (
        <div
            data-page={pageNo}
            data-page-key={pageKey}
            className={`
                report-page
                bg-white dark:bg-gray-800
                w-full max-w-[1400px] mx-auto
                min-h-[1000px]
                p-12
                mb-6
                rounded-lg
                shadow-md
                box-border
                overflow-hidden
                
                /* Print styles - A4 exact */
                print:shadow-none
                print:rounded-none
                print:mb-0
                print:p-[15mm]
                print:min-h-[297mm]
                print:max-h-[297mm]
                print:h-[297mm]
                print:max-w-none
                print:w-[210mm]
                print:overflow-hidden
                print:box-border
                print:break-after-page
                print:break-inside-avoid
                
                ${className}
            `}
        >
            <div className="h-full flex flex-col">
                {children}
            </div>
        </div>
    );
};

export default PageContainer;
