import Elysia, { t } from 'elysia';
import { verifyTurnstile } from '../utils/turnstile';
import { getEnv } from '../utils/di';

export function TurnstileService() {
    const env = getEnv();
    return new Elysia({ aot: false })
        .group('/turnstile', (app) =>
            app.post('/verify', async ({ cookie, body: { token }, set }) => {
                const pass = await verifyTurnstile(token);
                if (!pass) {
                    set.status = 400;
                    return 'Turnstile verification failed';
                }
                try {
                    const url = new URL(env.FRONTEND_URL);
                    const parts = url.hostname.split('.');
                    const domain = parts.slice(-2).join('.');
                    cookie['turnstile_verified'].set({
                        value: 'true',
                        path: '/',
                        domain: '.' + domain,
                        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
                        sameSite: 'lax',
                        secure: true,
                    });
                } catch {
                    cookie['turnstile_verified'].set({
                        value: 'true',
                        path: '/',
                        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
                        sameSite: 'lax',
                        secure: true,
                    });
                }
                return 'OK';
            }, {
                body: t.Object({ token: t.String() })
            })
        );
}
