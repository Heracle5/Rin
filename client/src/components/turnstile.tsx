import { useEffect, useRef, useState } from 'react';
import { client } from '../main';

interface TurnstileConfig {
    enabled: boolean;
    siteKey?: string;
}

interface TurnstileStatus {
    verified: boolean;
    needsVerification: boolean;
}

declare global {
    interface Window {
        turnstile?: {
            render: (element: string | HTMLElement, options: {
                sitekey: string;
                callback: (token: string) => void;
                theme?: string;
            }) => string;
            reset: (widgetId: string) => void;
        };
        onTurnstileLoad?: () => void;
    }
}

export function TurnstileProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<TurnstileConfig>({ enabled: false });
    const [, setStatus] = useState<TurnstileStatus>({ verified: true, needsVerification: false });
    const [loading, setLoading] = useState(true);
    const [showVerification, setShowVerification] = useState(false);

    useEffect(() => {
        checkTurnstileStatus();
    }, []);

    const checkTurnstileStatus = async () => {
        try {
            const configResponse = await client.api.turnstile.config.get();
            if (configResponse.data) {
                setConfig(configResponse.data);
                
                if (configResponse.data.enabled) {
                    const statusResponse = await client.api.turnstile.status.get();
                    if (statusResponse.data) {
                        setStatus(statusResponse.data);
                        setShowVerification(statusResponse.data.needsVerification);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to check Turnstile status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerificationSuccess = () => {
        setStatus({ verified: true, needsVerification: false });
        setShowVerification(false);
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg">正在检查安全状态...</div>
        </div>;
    }

    if (showVerification && config.enabled && config.siteKey) {
        return <TurnstileVerification 
            siteKey={config.siteKey} 
            onSuccess={handleVerificationSuccess}
        />;
    }

    return <>{children}</>;
}

function TurnstileVerification({ siteKey, onSuccess }: { siteKey: string; onSuccess: () => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [widgetId, setWidgetId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        loadTurnstileScript();
    }, []);

    const loadTurnstileScript = () => {
        if (document.getElementById('turnstile-script')) {
            initializeTurnstile();
            return;
        }

        const script = document.createElement('script');
        script.id = 'turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = initializeTurnstile;
        document.head.appendChild(script);
    };

    const initializeTurnstile = () => {
        if (window.turnstile && containerRef.current) {
            const id = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                callback: handleTurnstileCallback,
                theme: 'light',
            });
            setWidgetId(id);
        } else {
            setTimeout(initializeTurnstile, 100);
        }
    };

    const handleTurnstileCallback = async (token: string) => {
        setLoading(true);
        setError('');

        try {
            const response = await client.api.turnstile.verify.post({
                token: token
            });

            if (response.data?.success) {
                onSuccess();
            } else {
                setError('验证失败，请重试');
                if (window.turnstile && widgetId) {
                    window.turnstile.reset(widgetId);
                }
            }
        } catch (error) {
            console.error('Verification error:', error);
            setError('验证过程中发生错误，请重试');
            if (window.turnstile && widgetId) {
                window.turnstile.reset(widgetId);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 text-center">
                <div className="text-6xl mb-4">🛡️</div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">安全验证</h1>
                <p className="text-gray-600 mb-6">
                    为了保护网站免受恶意访问，请完成下方的人机验证。
                </p>
                
                <div className="flex justify-center mb-4">
                    <div ref={containerRef}></div>
                </div>
                
                {loading && (
                    <div className="text-blue-600 text-sm">
                        验证中，请稍候...
                    </div>
                )}
                
                {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
} 