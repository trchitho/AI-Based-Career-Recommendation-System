/**
 * Big5Page5Facets - Page 5: Teamwork + Task Management
 *
 * Two facets per page with standardized layout
 * Vertically centered with equal spacing
 */

import { Facet } from '../../../services/reportService';
import FacetSection from './FacetSection';

interface Big5Page5FacetsProps {
    facets: Facet[];
}

const Big5Page5Facets = ({ facets }: Big5Page5FacetsProps) => {
    const teamworkFacet = facets.find((f) => f.name === 'teamwork');
    const taskManagementFacet = facets.find((f) => f.name === 'taskManagement');

    return (
        <div className="h-full flex flex-col">
            {/* Page Header - Larger font */}
            <div className="mb-6 print:mb-4 flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white print:text-xl">
                    Behavioral Patterns: Teamwork & Task Management
                </h2>
                <p className="text-base text-gray-500 dark:text-gray-400 print:text-sm mt-1">
                    How you collaborate with others and manage your work
                </p>
            </div>

            {/* Facets Container - Centered vertically with equal spacing */}
            <div className="flex-1 flex flex-col justify-center gap-8 print:gap-6">
                {/* Facet 1: Teamwork */}
                {teamworkFacet && <FacetSection facet={teamworkFacet} />}

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0" />

                {/* Facet 2: Task Management */}
                {taskManagementFacet && <FacetSection facet={taskManagementFacet} />}
            </div>
        </div>
    );
};

export default Big5Page5Facets;
