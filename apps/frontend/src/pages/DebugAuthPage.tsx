/**
 * Debug Auth Page - Kiểm tra authentication
 */
import React, { useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { getAccessToken } from '../utils/auth';

export const DebugAuthPage: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const [tokenInfo, setTokenInfo] = useState<any>(null);

    useEffect(() => {
        const token = getAccessToken();
        if (token) {
            try {
                // Decode JWT token (base64)
                const parts = token.split('.');
                if (parts.length === 3) {
                    if (typeof parts[1] === 'string') {
                        const payload = JSON.parse(atob(parts[1]));
                        setTokenInfo(payload);
                    }
                }
            } catch (error) {
                console.error('Error decoding token:', error);
            }
        }
    }, []);

    const token = getAccessToken();

    return (
        <MainLayout>
            <div className="min-h-screen bg-gray-50 py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg shadow-lg p-8">
                        <h1 className="text-3xl font-bold mb-6">🔍 Debug Authentication</h1>

                        {/* Auth Status */}
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold mb-3">Auth Status</h2>
                            <div className="bg-gray-50 p-4 rounded">
                                <p className="mb-2">
                                    <strong>Authenticated:</strong>{' '}
                                    <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                                        {isAuthenticated ? '✅ Yes' : '❌ No'}
                                    </span>
                                </p>
                                <p>
                                    <strong>Has Token:</strong>{' '}
                                    <span className={token ? 'text-green-600' : 'text-red-600'}>
                                        {token ? '✅ Yes' : '❌ No'}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold mb-3">User Info</h2>
                            <div className="bg-gray-50 p-4 rounded">
                                {user ? (
                                    <pre className="text-sm overflow-auto">
                                        {JSON.stringify(user, null, 2)}
                                    </pre>
                                ) : (
                                    <p className="text-gray-500">No user data</p>
                                )}
                            </div>
                        </div>

                        {/* Token Info */}
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold mb-3">Token Info</h2>
                            <div className="bg-gray-50 p-4 rounded">
                                {token ? (
                                    <>
                                        <p className="mb-2 text-sm">
                                            <strong>Token (first 50 chars):</strong>
                                            <br />
                                            <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                                                {token.substring(0, 50)}...
                                            </code>
                                        </p>
                                        {tokenInfo && (
                                            <div className="mt-4">
                                                <strong>Decoded Payload:</strong>
                                                <pre className="text-xs overflow-auto mt-2 bg-gray-200 p-2 rounded">
                                                    {JSON.stringify(tokenInfo, null, 2)}
                                                </pre>
                                                {tokenInfo.exp && (
                                                    <p className="mt-2 text-sm">
                                                        <strong>Expires:</strong>{' '}
                                                        {new Date(tokenInfo.exp * 1000).toLocaleString()}
                                                        {' '}
                                                        {tokenInfo.exp * 1000 < Date.now() && (
                                                            <span className="text-red-600">(EXPIRED!)</span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-gray-500">No token found</p>
                                )}
                            </div>
                        </div>

                        {/* LocalStorage Keys */}
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold mb-3">LocalStorage Keys</h2>
                            <div className="bg-gray-50 p-4 rounded">
                                <ul className="space-y-1 text-sm">
                                    <li>
                                        <code>accessToken</code>:{' '}
                                        {localStorage.getItem('accessToken') ? '✅ Exists' : '❌ Not found'}
                                    </li>
                                    <li>
                                        <code>token</code>:{' '}
                                        {localStorage.getItem('token') ? '✅ Exists' : '❌ Not found'}
                                    </li>
                                    <li>
                                        <code>refreshToken</code>:{' '}
                                        {localStorage.getItem('refreshToken') ? '✅ Exists' : '❌ Not found'}
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Actions */}
                        <div>
                            <h2 className="text-xl font-semibold mb-3">Actions</h2>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Refresh Page
                                </button>
                                <button
                                    onClick={() => {
                                        localStorage.clear();
                                        window.location.reload();
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    Clear LocalStorage
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default DebugAuthPage;
