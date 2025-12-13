/**
 * Big5Page4Facets - Page 4: Interaction + Communication
 * 
 * Two facets per page with standardized layout
 */

import { Facet } from '../../../services/reportService';
import FacetSection from './FacetSection';

interface Big5Page4FacetsProps {
    facets: Facet[];
}

const Big5Page4Facets = ({ facets }: Big5Page4FacetsProps) => {
    const interactionFacet = facets.find(f => f.name === 'interaction');
    const communicationFacet = facets.find(f => f.name === 'communication');

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Header */}
            <div className="mb-4 print:mb-3 flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white print:text-base">
                    Behavioral Patterns: Interaction & Communication
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 print:text-[10px]">
                    How you engage with others and express your ideas
                </p>
            </div>

            {/* Facets Container */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Facet 1: Interaction */}
                {interactionFacet && (
                    <FacetSection facet={interactionFacet} />
                )}

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-3 print:my-2 flex-shrink-0" />

                {/* Facet 2: Communication */}
                {communicationFacet && (
                    <FacetSection facet={communicationFacet} />
                )}
            </div>
        </div>
    );
};

export default Big5Page4Facets;
