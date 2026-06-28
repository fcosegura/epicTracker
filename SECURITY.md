# 🔐 Guía de Seguridad - epicTracker

## Variables de Entorno Requeridas

Debes configurar estas variables en **Cloudflare Pages → Settings → Environment Variables**:

### **CRÍTICAS (Requeridas para producción):**

1. **JWT_SECRET** ⚠️
   - Una cadena aleatoria larga (mínimo 32 caracteres)
   - Ejemplo: `your-super-secret-random-string-here-min-32-chars`
   - Se usa para firmar y verificar tokens JWT
   - **NO debe ser el valor por defecto**

2. **GITHUB_CLIENT_ID**
   - Obtenido de: GitHub → Settings → Developer settings → OAuth Apps
   - Tu aplicación OAuth de GitHub

3. **GITHUB_CLIENT_SECRET**
   - Obtenido de: GitHub → Settings → Developer settings → OAuth Apps
   - **NUNCA** lo compartas públicamente

### **RECOMENDADO:**

4. **ENVIRONMENT** 
   - Valores: `production` o `development`
   - En desarrollo: permite modo mock
   - En producción: desactiva mock, requiere GitHub real

## Cambios de Seguridad Realizados

✅ **JWT_SECRET obligatorio** - No hay valor por defecto
✅ **Mock mode desactivado en producción** - Solo en desarrollo
✅ **CORS restringido** - Solo de `https://epictracker.pages.dev`
✅ **SameSite=Strict** - Protección máxima contra CSRF
✅ **HttpOnly + Secure** - Cookie no accesible desde JS

## Flujo de Autenticación

```
Usuario → "Iniciar Sesión" → GitHub OAuth → JWT + Cookie HttpOnly → Autorizado
```

## Checklist Antes de Deploy

- [ ] JWT_SECRET configurado en Cloudflare ✓
- [ ] GITHUB_CLIENT_ID configurado
- [ ] GITHUB_CLIENT_SECRET configurado
- [ ] ENVIRONMENT = production
- [ ] Dominio configurado como `epictracker.pages.dev` (o tu dominio)
- [ ] CORS Origin actualizado si usas dominio personalizado

## Notas

- Las cookies tienen expiración de **30 días**
- El token JWT también expira en **30 días**
- No se almacenan contraseñas (solo GitHub OAuth)
- Los datos del usuario se almacenan en Cloudflare D1 (por usuario ID)
