import { jsonResponse } from '../utils.js';

export async function onRequestPost(context) {
    // Borrar la cookie de sesión estableciendo Max-Age=0 y Path=/
    return jsonResponse({ success: true, message: "Sesión cerrada" }, 200, {
        'Set-Cookie': 'session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure'
    });
}
