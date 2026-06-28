import { verifyJWT, parseCookies, jsonResponse } from './api/utils.js';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const secret = env.JWT_SECRET || 'secret-jwt-game-tracker-fallback';

    // Manejar opciones preflight (CORS) de forma global si es necesario
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400',
            }
        });
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
                'Set-Cookie': 'session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
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
    const response = await context.next();
    
    // Adjuntar cabeceras CORS básicas
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
}
