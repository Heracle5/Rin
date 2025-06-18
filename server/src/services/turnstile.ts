import Elysia, { t } from "elysia";
import { setup } from "../setup";
import { ServerConfig } from "../utils/cache";
import { getEnv } from "../utils/di";

export function TurnstileService() {
    return new Elysia({ aot: false })
        .use(setup())
        .group('/api', (group) =>
            group
                .get('/turnstile/config', async () => {
                    const env = getEnv();
                    const config = ServerConfig();
                    const enabled = await config.getOrDefault('turnstile.enabled', true);
                    
                    if (!enabled) {
                        return { enabled: false };
                    }

                    return {
                        enabled: true,
                        siteKey: env.TURNSTILE_SITE_KEY
                    };
                })
                .post('/turnstile/verify', async ({ body, set, headers }) => {
                    const { token } = body;
                    const env = getEnv();
                    const config = ServerConfig();
                    const enabled = await config.getOrDefault('turnstile.enabled', true);
                    const ip = headers['cf-connecting-ip'] || headers['x-forwarded-for'] || '';

                    if (!enabled) {
                        return { success: true };
                    }

                    if (!token) {
                        set.status = 400;
                        return { success: false, error: 'Missing token' };
                    }

                    const formData = new FormData();
                    formData.append('secret', env.TURNSTILE_SECRET_KEY);
                    formData.append('response', token);
                    if (ip) formData.append('remoteip', ip);

                    try {
                        const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                            method: 'POST',
                            body: formData,
                        });

                        const outcome = await result.json() as { success: boolean };
                        
                        if (!outcome.success) {
                            set.status = 401;
                            return { success: false, error: 'Verification failed' };
                        }

                        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
                        set.headers['Set-Cookie'] = `turnstile_verified=${Date.now()}; Path=/; Expires=${expires.toUTCString()}; HttpOnly; Secure; SameSite=Lax`;

                        return { success: true };
                    } catch (error) {
                        set.status = 500;
                        return { success: false, error: 'Verification error' };
                    }
                }, {
                    body: t.Object({
                        token: t.String()
                    })
                })
                .get('/turnstile/status', async ({ headers }) => {
                    const config = ServerConfig();
                    const enabled = await config.getOrDefault('turnstile.enabled', true);
                    
                    if (!enabled) {
                        return { verified: true, needsVerification: false };
                    }

                    const visitCookie = getCookieValue(headers.cookie, 'turnstile_verified');
                    if (!visitCookie) {
                        return { verified: false, needsVerification: true };
                    }

                    const timeout = await config.getOrDefault('turnstile.timeout', 3 * 60 * 60 * 1000);
                    const lastVerified = parseInt(visitCookie);
                    const now = Date.now();
                    
                    const needsVerification = (now - lastVerified) > timeout;
                    
                    return { 
                        verified: !needsVerification, 
                        needsVerification: needsVerification 
                    };
                })
        );
}

function getCookieValue(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name) {
            return cookieValue;
        }
    }
    return null;
}


 