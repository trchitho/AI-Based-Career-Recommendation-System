/**
 * Big5Page3Facets - Page 3: Problem-Solving + Motivation
 * 
 * Two facets per page with standardized layout
 * Vertically centered with equal spacing
 */

import { Facet } from '../../../services/reportService';
import FacetSection from './FacetSection';

interface Big5Page3FacetsProps {
    facets: Facet[];
}

const Big5Page3Facets = ({ facets }: Big5Page3FacetsProps) => {
    const problemSolvingFacet = facets.find(f => f.name === 'problemSolving');
    const motivationFacet = facets.find(f => f.name === 'motivation');

    return (
        <div className="h-full flex flex-col">
            {/* Page Header - Larger font */}
            <div className="mb-6 print:mb-4 flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white print:text-xl">
                    Mẫu Hành Vi: Tư Duy & Động Lực
                </h2>
                <p className="text-base text-gray-500 dark:text-gray-400 print:text-sm mt-1">
                    Cách bạn tiếp cận vấn đề và điều gì thúc đẩy bạn làm việc
                </p>
            </div>

            {/* Facets Container - Centered vertically with equal spacing */}
            <div className="flex-1 flex flex-col justify-center gap-8 print:gap-6">
                {/* Facet 1: Problem-Solving */}
                {problemSolvingFacet && (
                    <FacetSection facet={problemSolvingFacet} />
                )}

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0" />

                {/* Facet 2: Motivation */}
                {motivationFacet && (
                    <FacetSection facet={motivationFacet} />
                )}
            </div>
        </div>
    );
};

export default Big5Page3Facets;
