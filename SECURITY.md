# 🔐 Guía de Seguridad - epicTracker

## Variables de Entorno Requeridas

Debes configurar estas variables en **Cloudflare Pages → Settings → Environment Variables**:

### **CRÍTICAS (Requeridas para producción):**

1. **JWT_SECRET** ⚠️
   - Una cadena aleatoria larga (mínimo 32 caracteres)
   - Ejemplo: `your-super-secret-random-string-here-min-32-chars`
   - Se usa para firmar y verificar tokens JWT
   - Si falta o tiene menos de 32 caracteres, la API responde 500 y no se emiten sesiones

2. **GITHUB_CLIENT_ID**
   - Obtenido de: GitHub → Settings → Developer settings → OAuth Apps
   - Tu aplicación OAuth de GitHub

3. **GITHUB_CLIENT_SECRET**
   - Obtenido de: GitHub → Settings → Developer settings → OAuth Apps
   - **NUNCA** lo compartas públicamente

### **RECOMENDADO:**

4. **ENVIRONMENT** 
   - Valores: `production` o `development`
   - Solo `development` habilita el login mock (`mock_dev_code`); cualquier otro valor o ausencia lo desactiva
   - Sin `GITHUB_CLIENT_ID` fuera de desarrollo, el login falla en vez de usar el mock

## Cambios de Seguridad Realizados

✅ **JWT_SECRET obligatorio** - No hay valor por defecto
✅ **Mock mode desactivado en producción** - Solo en desarrollo
✅ **Sin CORS** - La API es same-origin; no se emiten cabeceras `Access-Control-*`
✅ **OAuth `state`** - Aleatorio, ligado a una cookie de 10 min, validado en el callback
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
- [ ] ENVIRONMENT sin definir o `production` (nunca `development` en producción)

## Notas

- Las cookies tienen expiración de **30 días**
- El token JWT también expira en **30 días**
- No se almacenan contraseñas (solo GitHub OAuth)
- Los datos del usuario se almacenan en Cloudflare D1 (por usuario ID)
