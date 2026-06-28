export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const origin = url.origin;
    
    const clientId = env.GITHUB_CLIENT_ID;
    
    // Si no está configurada la variable en Cloudflare, usamos un flujo de pruebas Mock
    if (!clientId) {
        console.warn("GITHUB_CLIENT_ID no configurado. Redirigiendo a modo Mock de desarrollo.");
        return Response.redirect(`${origin}/api/auth/callback?code=mock_dev_code`, 302);
    }
    
    const redirectUri = `${origin}/api/auth/callback`;
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user`;
    
    return Response.redirect(githubUrl, 302);
}
