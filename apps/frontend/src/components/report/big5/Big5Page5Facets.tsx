/**
 * Big5Page5Facets - Page 5: Teamwork + Task Management
 * 
 * Two facets per page with standardized layout
 */

import { Facet } from '../../../services/reportService';
import FacetSection from './FacetSection';

interface Big5Page5FacetsProps {
    facets: Facet[];
}

const Big5Page5Facets = ({ facets }: Big5Page5FacetsProps) => {
    const teamworkFacet = facets.find(f => f.name === 'teamwork');
    const taskManagementFacet = facets.find(f => f.name === 'taskManagement');

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Header */}
            <div className="mb-4 print:mb-3 flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white print:text-base">
                    Behavioral Patterns: Teamwork & Task Management
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 print:text-[10px]">
                    How you collaborate with others and manage your work
                </p>
            </div>

            {/* Facets Container */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Facet 1: Teamwork */}
                {teamworkFacet && (
                    <FacetSection facet={teamworkFacet} />
                )}

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-3 print:my-2 flex-shrink-0" />

                {/* Facet 2: Task Management */}
                {taskManagementFacet && (
                    <FacetSection facet={taskManagementFacet} />
                )}
            </div>
        </div>
    );
};

export default Big5Page5Facets;
