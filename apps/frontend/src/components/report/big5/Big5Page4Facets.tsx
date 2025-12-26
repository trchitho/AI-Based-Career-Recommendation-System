/**
 * Big5Page4Facets - Page 4: Interaction + Communication
 * 
 * Two facets per page with standardized layout
 * Vertically centered with equal spacing
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
        <div className="h-full flex flex-col">
            {/* Page Header - Larger font */}
            <div className="mb-6 print:mb-4 flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white print:text-xl">
                    Behavioral Patterns: Interaction & Communication
                </h2>
                <p className="text-base text-gray-500 dark:text-gray-400 print:text-sm mt-1">
                    How you engage with others and express your ideas
                </p>
            </div>

            {/* Facets Container - Centered vertically with equal spacing */}
            <div className="flex-1 flex flex-col justify-center gap-8 print:gap-6">
                {/* Facet 1: Interaction */}
                {interactionFacet && (
                    <FacetSection facet={interactionFacet} />
                )}

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0" />

                {/* Facet 2: Communication */}
                {communicationFacet && (
                    <FacetSection facet={communicationFacet} />
                )}
            </div>
        </div>
    );
};

export default Big5Page4Facets;
