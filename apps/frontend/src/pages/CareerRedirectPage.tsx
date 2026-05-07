import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import api from '../lib/api';

interface CareerLookupResponse {
    onet_code: string;
    group_slug: string;
    career_slug: string;
    title: string;
    redirect_url: string;
}

interface CareerRedirectPageProps {
    isRoadmap?: boolean;
}

const CareerRedirectPage = ({ isRoadmap = false }: CareerRedirectPageProps) => {
    const { param, onetCode } = useParams<{ param?: string; onetCode?: string }>();
    const actualOnetCode = onetCode || param;
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const lookupCareer = async () => {
            if (!actualOnetCode) {
                setError('Invalid career code');
                setLoading(false);
                return;
            }

            try {
                console.log(`🔄 Looking up career group for ${actualOnetCode}${isRoadmap ? ' (roadmap)' : ''}...`);
                const response = await api.get<CareerLookupResponse>(`/api/career-system/lookup/${actualOnetCode}`);

                console.log(`✅ Found career: ${response.data.title} in group: ${response.data.group_slug}`);

                // Build redirect URL based on whether this is a roadmap request
                const baseRedirectUrl = response.data.redirect_url;
                const finalRedirectUrl = isRoadmap ? `${baseRedirectUrl}/roadmap` : baseRedirectUrl;

                console.log(`🔄 Redirecting to: ${finalRedirectUrl}`);
                setRedirectUrl(finalRedirectUrl);
            } catch (err: any) {
                console.error(`❌ Career lookup failed for ${actualOnetCode}:`, err);

                if (err.response?.status === 404) {
                    setError(`Career with code ${actualOnetCode} not found`);
                } else {
                    setError('Failed to lookup career information');
                }
            } finally {
                setLoading(false);
            }
        };

        lookupCareer();
    }, [actualOnetCode, isRoadmap]);

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-primary dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-blue-600 mb-4 animate-spin mx-auto"></div>
                    <p className="text-gray-500 font-medium">
                        Looking up career {isRoadmap ? 'roadmap' : 'information'}...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-surface-primary dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Career Not Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">{error}</p>
                    <a
                        href="/careers"
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                        Back to Career Fields
                    </a>
                </div>
            </div>
        );
    }

    if (redirectUrl) {
        return <Navigate to={redirectUrl} replace />;
    }

    return null;
};

export default CareerRedirectPage;