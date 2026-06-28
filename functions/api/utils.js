// Funciones de utilidad para Cloudflare Pages Functions

// --- FIRMA DE JWT (HMAC SHA-256 NATIVO) ---
export async function signJWT(payload, secret) {
    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = btoa(JSON.stringify(header))
        .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const encodedPayload = btoa(JSON.stringify(payload))
        .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    
    const tokenInput = `${encodedHeader}.${encodedPayload}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    
    const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(tokenInput)
    );
    
    // Convertir firma a Base64URL
    const signatureArray = Array.from(new Uint8Array(signature));
    const encodedSignature = btoa(String.fromCharCode.apply(null, signatureArray))
        .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        
    return `${tokenInput}.${encodedSignature}`;
}

// --- VERIFICACIÓN DE JWT (HMAC SHA-256 NATIVO) ---
export async function verifyJWT(token, secret) {
    try {
        if (!token) return null;
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const [header, payload, signature] = parts;
        const tokenInput = `${header}.${payload}`;
        
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        
        const key = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        );
        
        // Decodificar Base64URL a bytes
        const base64Signature = signature.replace(/-/g, "+").replace(/_/g, "/");
        const paddedBase64 = base64Signature.padEnd(base64Signature.length + (4 - base64Signature.length % 4) % 4, '=');
        
        const signatureBytes = new Uint8Array(
            atob(paddedBase64)
                .split("")
                .map(c => c.charCodeAt(0))
        );
        
        const isValid = await crypto.subtle.verify(
            "HMAC",
            key,
            signatureBytes,
            encoder.encode(tokenInput)
        );
        
        if (!isValid) return null;
        
        const base64Payload = payload.replace(/-/g, "+").replace(/_/g, "/");
        const paddedPayload = base64Payload.padEnd(base64Payload.length + (4 - base64Payload.length % 4) % 4, '=');
        const decodedPayload = JSON.parse(atob(paddedPayload));
        
        // Validar expiración (exp)
        if (decodedPayload.exp && Date.now() / 1000 > decodedPayload.exp) {
            return null;
        }
        
        return decodedPayload;
    } catch (e) {
        console.error('Error al verificar JWT:', e);
        return null;
    }
}

// --- PARSEO DE COOKIES ---
export function parseCookies(request) {
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = {};
    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        if (parts.length >= 2) {
            const name = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            cookies[name] = decodeURIComponent(value);
        }
    });
    return cookies;
}

// --- GENERADOR DE RESPUESTAS JSON ---
export function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    });
}
