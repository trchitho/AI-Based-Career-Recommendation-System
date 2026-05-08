import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CareersByGroupPage from './CareersByGroupPage';
import CareerRedirectPage from './CareerRedirectPage';

const CareerRouterPage = () => {
    const { param } = useParams<{ param: string }>();
    const location = useLocation();
    const [isOnetCode, setIsOnetCode] = useState<boolean | null>(null);
    const [isRoadmapUrl, setIsRoadmapUrl] = useState(false);

    useEffect(() => {
        if (!param) {
            setIsOnetCode(false);
            return;
        }

        // Check if this is a roadmap URL
        const isRoadmap = location.pathname.endsWith('/roadmap');
        setIsRoadmapUrl(isRoadmap);

        // Check if param looks like an onet_code (format: XX-XXXX.XX or XX-XXXX-XX)
        const onetCodePattern = /^\d{2}-\d{4}[\.\-]\d{2}$/;

        if (onetCodePattern.test(param)) {
            console.log(`🔍 Detected ONET code: ${param}${isRoadmap ? ' (roadmap)' : ''}`);
            setIsOnetCode(true);
        } else {
            console.log(`🔍 Detected group slug: ${param}${isRoadmap ? ' (roadmap)' : ''}`);
            setIsOnetCode(false);
        }
    }, [param, location.pathname]);

    if (isOnetCode === null) {
        return (
            <div className="min-h-screen bg-surface-primary dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-blue-600 mb-4 animate-spin mx-auto"></div>
                    <p className="text-gray-500 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    if (isOnetCode) {
        // Render redirect component with onetCode (handles both career detail and roadmap)
        return <CareerRedirectPage isRoadmap={isRoadmapUrl} />;
    } else {
        // Render careers by group page with groupSlug (roadmap not applicable here)
        return <CareersByGroupPage />;
    }
};

export default CareerRouterPage;