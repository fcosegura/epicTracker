import { verifyJWT, parseCookies, jsonResponse, getJwtSecret } from './api/utils.js';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const secret = getJwtSecret(env);

    // La app y la API comparten origen: no se emiten cabeceras CORS, así que
    // los navegadores bloquean el acceso desde otros orígenes.
    if (url.pathname.startsWith('/api/') && !secret) {
        return jsonResponse({ error: 'Configuración del servidor incompleta' }, 500);
    }

    const cookies = parseCookies(request);
    const sessionToken = cookies['session_token'];

    // Proteger Endpoints de Personajes
    if (url.pathname.startsWith('/api/characters')) {
        if (!sessionToken) {
            return jsonResponse({ error: 'No autorizado: falta sesión' }, 401);
        }

        const user = await verifyJWT(sessionToken, secret);
        if (!user) {
            // Eliminar la cookie si ya venció o es inválida
            return jsonResponse({ error: 'Sesión inválida o expirada' }, 401, {
                'Set-Cookie': 'session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure'
            });
        }

        // Almacenar el usuario en los metadatos del contexto de la petición
        context.data.user = user;
    } 
    // Verificar estado para /api/auth/status sin rechazar
    else if (url.pathname === '/api/auth/status') {
        if (sessionToken) {
            const user = await verifyJWT(sessionToken, secret);
            if (user) {
                context.data.user = user;
            }
        }
    }

    // Continuar al siguiente middleware o función
    return context.next();
}
