import { isDevelopment } from '../utils.js';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const origin = url.origin;

    const clientId = env.GITHUB_CLIENT_ID;

    if (!clientId) {
        // El flujo mock solo existe en desarrollo explícito
        if (isDevelopment(env)) {
            console.warn("GITHUB_CLIENT_ID no configurado. Redirigiendo a modo Mock de desarrollo.");
            return Response.redirect(`${origin}/api/auth/callback?code=mock_dev_code`, 302);
        }
        return new Response("Configuración incompleta: falta GITHUB_CLIENT_ID.", { status: 500 });
    }

    // `state` aleatorio atado a este navegador mediante cookie, para evitar login CSRF
    const stateBytes = crypto.getRandomValues(new Uint8Array(24));
    const state = Array.from(stateBytes, b => b.toString(16).padStart(2, '0')).join('');

    const redirectUri = `${origin}/api/auth/callback`;
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user&state=${state}`;

    return new Response(null, {
        status: 302,
        headers: {
            'Location': githubUrl,
            // Lax: la cookie debe viajar en la redirección de vuelta desde GitHub
            'Set-Cookie': `oauth_state=${state}; Path=/api/auth; Max-Age=600; HttpOnly; SameSite=Lax; Secure`
        }
    });
}
