import { signJWT, parseCookies, getJwtSecret, isDevelopment } from '../utils.js';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const secret = getJwtSecret(env);
    const clearState = 'oauth_state=; Path=/api/auth; Max-Age=0; HttpOnly; SameSite=Lax; Secure';

    if (!secret) {
        return new Response("Configuración incompleta: JWT_SECRET ausente o demasiado corto.", { status: 500 });
    }

    if (!code) {
        return new Response("Falta el parámetro 'code' de autorización", { status: 400 });
    }

    let userPayload = null;

    // --- MODO DESARROLLO (MOCK) ---
    if (code === 'mock_dev_code' && isDevelopment(env)) {
        userPayload = {
            id: 'dev-user-999',
            username: 'dev_trainer',
            name: 'Entrenador Dev',
            avatar: 'https://github.com/identicons/dev.png',
            exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 días
        };
    } 
    // --- MODO REAL (GITHUB OAUTH) ---
    else {
        // Verificar `state` contra la cookie emitida en /api/auth/login
        const expectedState = parseCookies(request)['oauth_state'];
        const state = url.searchParams.get('state');
        if (!expectedState || !state || state !== expectedState) {
            return new Response("Parámetro 'state' inválido o ausente", {
                status: 400,
                headers: { 'Set-Cookie': clearState }
            });
        }

        const clientId = env.GITHUB_CLIENT_ID;
        const clientSecret = env.GITHUB_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
            return new Response("Configuración incompleta: GITHUB_CLIENT_ID o GITHUB_CLIENT_SECRET ausentes en el servidor.", { status: 500 });
        }

        try {
            // 1. Intercambiar código por Access Token
            const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code
                })
            });

            const tokenData = await tokenResponse.json();
            if (tokenData.error) {
                return new Response(`Error de OAuth de GitHub: ${tokenData.error_description || tokenData.error}`, { status: 400 });
            }

            const accessToken = tokenData.access_token;

            // 2. Obtener datos del usuario de GitHub
            const userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'User-Agent': 'CloudflarePages-GameTracker'
                }
            });

            if (!userResponse.ok) {
                return new Response("No se pudieron obtener los datos de usuario de GitHub", { status: 500 });
            }

            const githubUser = await userResponse.json();

            // 3. Crear el payload para el JWT
            userPayload = {
                id: githubUser.id.toString(),
                username: githubUser.login,
                name: githubUser.name || githubUser.login,
                avatar: githubUser.avatar_url,
                exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
            };
        } catch (e) {
            return new Response(`Error interno de conexión durante la autenticación: ${e.message}`, { status: 500 });
        }
    }

    // 4. Firmar el JWT y establecer la cookie
    const token = await signJWT(userPayload, secret);
    
    // Cookie de sesión segura de 30 días
    const cookie = `session_token=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict; Secure`;
    
    // Redirigir de vuelta a los ajustes
    const headers = new Headers({ 'Location': `${url.origin}/#settings` });
    headers.append('Set-Cookie', cookie);
    headers.append('Set-Cookie', clearState);
    return new Response(null, { status: 302, headers });
}
