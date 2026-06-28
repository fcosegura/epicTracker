import { jsonResponse } from '../utils.js';

// GET /api/characters/[id] - Obtener detalle de una unidad específica
export async function onRequestGet(context) {
    const { env, data, params } = context;
    const db = env.DB;
    const user = data.user;
    const id = params.id;

    if (!db) {
        return jsonResponse({ error: 'Base de datos D1 no enlazada en el servidor' }, 500);
    }

    try {
        const result = await db.prepare(
            "SELECT * FROM characters WHERE id = ? AND user_id = ?"
        ).bind(id, user.id).first();
        
        if (!result) {
            return jsonResponse({ error: 'Personaje no encontrado' }, 404);
        }
        
        return jsonResponse(result);
    } catch (e) {
        return jsonResponse({ error: `Error en base de datos: ${e.message}` }, 500);
    }
}

// PUT /api/characters/[id] - Actualizar estadísticas del personaje
export async function onRequestPut(context) {
    const { request, env, data, params } = context;
    const db = env.DB;
    const user = data.user;
    const id = params.id;

    if (!db) {
        return jsonResponse({ error: 'Base de datos D1 no enlazada en el servidor' }, 500);
    }

    try {
        const body = await request.json();
        
        if (!body.name || typeof body.name !== 'string') {
            return jsonResponse({ error: 'El nombre es obligatorio' }, 400);
        }
        
        const rarity = parseInt(body.rarity) || 5;
        const awaken = parseInt(body.awaken_level) || 0;
        const element = body.element || 'Fuego';
        const storage = body.storage || 'Inventario Principal';
        const now = new Date().toISOString();
        
        const result = await db.prepare(
            `UPDATE characters 
             SET name = ?, rarity = ?, awaken_level = ?, element = ?, storage = ?, updated_at = ?
             WHERE id = ? AND user_id = ?`
        ).bind(body.name.trim(), rarity, awaken, element, storage, now, id, user.id).run();
        
        if (result.meta?.changes === 0) {
            return jsonResponse({ error: 'Personaje no encontrado o no autorizado para editar' }, 404);
        }
        
        return jsonResponse({ success: true, message: 'Personaje actualizado correctamente' });
    } catch (e) {
        return jsonResponse({ error: `Error al actualizar personaje en D1: ${e.message}` }, 500);
    }
}

// DELETE /api/characters/[id] - Eliminar personaje
export async function onRequestDelete(context) {
    const { env, data, params } = context;
    const db = env.DB;
    const user = data.user;
    const id = params.id;

    if (!db) {
        return jsonResponse({ error: 'Base de datos D1 no enlazada en el servidor' }, 500);
    }

    try {
        const result = await db.prepare(
            "DELETE FROM characters WHERE id = ? AND user_id = ?"
        ).bind(id, user.id).run();
        
        if (result.meta?.changes === 0) {
            return jsonResponse({ error: 'Personaje no encontrado o no autorizado para eliminar' }, 404);
        }
        
        return jsonResponse({ success: true, message: 'Personaje eliminado con éxito' });
    } catch (e) {
        return jsonResponse({ error: `Error al eliminar personaje en D1: ${e.message}` }, 500);
    }
}
