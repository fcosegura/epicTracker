import { jsonResponse } from '../utils.js';

export async function onRequest(context) {
    const { data } = context;
    
    if (data.user) {
        return jsonResponse({ user: data.user });
    }
    
    return jsonResponse({ user: null, message: "No autenticado" }, 401);
}
