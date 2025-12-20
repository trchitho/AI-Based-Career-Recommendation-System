/**
 * Big5Page3Facets - Page 3: Problem-Solving + Motivation
 * 
 * Two facets per page with standardized layout
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
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Header */}
            <div className="mb-4 print:mb-3 flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white print:text-base">
                    Behavioral Patterns: Thinking & Motivation
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 print:text-[10px]">
                    How you approach problems and what drives you to work
                </p>
            </div>

            {/* Facets Container */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Facet 1: Problem-Solving */}
                {problemSolvingFacet && (
                    <FacetSection facet={problemSolvingFacet} />
                )}

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-3 print:my-2 flex-shrink-0" />

                {/* Facet 2: Motivation */}
                {motivationFacet && (
                    <FacetSection facet={motivationFacet} />
                )}
            </div>
        </div>
    );
};

export default Big5Page3Facets;
