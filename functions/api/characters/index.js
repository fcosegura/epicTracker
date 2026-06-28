import { jsonResponse } from '../utils.js';

// GET /api/characters - Obtener todas las unidades del usuario
export async function onRequestGet(context) {
    const { env, data } = context;
    const db = env.DB;
    const user = data.user;

    if (!db) {
        return jsonResponse({ 
            error: 'Base de datos D1 no enlazada en Cloudflare. Sigue las instrucciones para crear el binding "DB".' 
        }, 500);
    }

    try {
        const { results } = await db.prepare(
            "SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC"
        ).bind(user.id).all();
        
        return jsonResponse(results || []);
    } catch (e) {
        return jsonResponse({ error: `Fallo al consultar base de datos D1: ${e.message}` }, 500);
    }
}

// POST /api/characters - Crear una nueva unidad
export async function onRequestPost(context) {
    const { request, env, data } = context;
    const db = env.DB;
    const user = data.user;

    if (!db) {
        return jsonResponse({ 
            error: 'Base de datos D1 no enlazada en Cloudflare. Sigue las instrucciones para crear el binding "DB".' 
        }, 500);
    }

    try {
        const body = await request.json();
        
        // Validaciones básicas
        if (!body.name || typeof body.name !== 'string') {
            return jsonResponse({ error: 'El nombre es requerido y debe ser texto' }, 400);
        }
        
        const rarity = parseInt(body.rarity) || 5;
        const awaken = parseInt(body.awaken_level) || 0;
        const element = body.element || 'Fuego';
        const storage = body.storage || 'Inventario Principal';
        
        const id = `char-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        
        await db.prepare(
            `INSERT INTO characters (id, user_id, name, rarity, awaken_level, element, storage, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, user.id, body.name.trim(), rarity, awaken, element, storage, now, now).run();
        
        const newChar = {
            id,
            user_id: user.id,
            name: body.name.trim(),
            rarity,
            awaken_level: awaken,
            element,
            storage,
            created_at: now,
            updated_at: now
        };
        
        return jsonResponse(newChar, 201);
    } catch (e) {
        return jsonResponse({ error: `Error al crear personaje en D1: ${e.message}` }, 500);
    }
}
