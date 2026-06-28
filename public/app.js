// Estado Global de la Aplicación
let state = {
    characters: [],
    user: null,
    isOnline: navigator.onLine,
    activePage: 'search',
    pendingUnitToAdd: null // Guarda la unidad temporalmente mientras se muestra el warning
};

// Configuración de endpoints de API
const API_BASE = '/api';

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initRouter();
    initLiquidMenu();
    initAutocomplete();
    initForms();
    initAuthStatus();
    
    // Registrar Service Worker para soporte PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registrado:', reg.scope))
            .catch(err => console.error('Error de Service Worker:', err));
    }
    
    // Listeners de conexión
    window.addEventListener('online', () => updateOnlineStatus(true));
    window.addEventListener('offline', () => updateOnlineStatus(false));
    updateOnlineStatus(navigator.onLine);
    
    // Carga inicial
    loadData();
});

// --- ENRUTADOR (ROUTER) ---
function initRouter() {
    const handleRoute = () => {
        const hash = window.location.hash || '#search';
        
        // Limpiar estilos activos de páginas y links de navegación
        document.querySelectorAll('.app-page').forEach(page => page.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));
        
        if (hash === '#search') {
            state.activePage = 'search';
            document.getElementById('search-page').classList.add('active');
            document.getElementById('nav-btn-search').classList.add('active');
            renderCharactersList();
        } else if (hash === '#add') {
            state.activePage = 'add';
            document.getElementById('add-page').classList.add('active');
            document.getElementById('nav-btn-add').classList.add('active');
            resetAddForm();
        } else if (hash.startsWith('#character/')) {
            state.activePage = 'detail';
            document.getElementById('detail-page').classList.add('active');
            const id = hash.split('/')[1];
            loadCharacterDetail(id);
        } else if (hash === '#settings') {
            state.activePage = 'settings';
            document.getElementById('settings-page').classList.add('active');
            document.getElementById('nav-btn-settings').classList.add('active');
        }
        
        updateBubblePosition();
    };

    window.addEventListener('hashchange', handleRoute);
    handleRoute(); // Ejecutar en carga
}

// --- LIQUID NAVIGATION MENU ---
function initLiquidMenu() {
    // Escucha clics en elementos de navegación para re-posicionar burbuja
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            // Animación suave de escala al hacer click
            item.style.transform = 'scale(0.95)';
            setTimeout(() => item.style.transform = '', 200);
        });
    });
    
    // Escuchar redimensiones para ajustar burbuja
    window.addEventListener('resize', updateBubblePosition);
}

function updateBubblePosition() {
    const activeLink = document.querySelector(`.nav-item[href="#${state.activePage}"]`);
    if (!activeLink) return;
    
    const bubble = document.querySelector('.liquid-bubble-bg');
    const navBar = document.querySelector('.liquid-nav-wrapper');
    
    const activeRect = activeLink.getBoundingClientRect();
    const navRect = navBar.getBoundingClientRect();
    
    // Ajustar burbuja al tamaño del item con un padding interno
    const paddingHorizontal = 10;
    const paddingVertical = 6;
    
    const bubbleWidth = activeRect.width - (paddingHorizontal * 2);
    const bubbleHeight = activeRect.height - (paddingVertical * 2);
    const leftPos = activeRect.left - navRect.left + paddingHorizontal;
    const topPos = activeRect.top - navRect.top + paddingVertical;
    
    bubble.style.width = `${bubbleWidth}px`;
    bubble.style.height = `${bubbleHeight}px`;
    bubble.style.left = `${leftPos}px`;
    bubble.style.top = `${topPos}px`;
}

// --- MANEJO DE DATOS Y SINCRONIZACIÓN ---
async function loadData() {
    try {
        if (state.isOnline) {
            const res = await fetch(`${API_BASE}/characters`);
            if (res.status === 200) {
                state.characters = await res.json();
                saveLocalBackup(state.characters);
            } else if (res.status === 401) {
                // No autenticado: cargar local
                loadLocalBackup();
            } else {
                throw new Error('Error al obtener datos del servidor');
            }
        } else {
            loadLocalBackup();
        }
    } catch (e) {
        console.warn('Fallo al conectar con Cloudflare, usando almacenamiento offline local:', e);
        loadLocalBackup();
    }
    
    if (state.activePage === 'search') {
        renderCharactersList();
    }
}

function loadLocalBackup() {
    const local = localStorage.getItem('unit_tracker_characters');
    state.characters = local ? JSON.parse(local) : [];
}

function saveLocalBackup(data) {
    localStorage.setItem('unit_tracker_characters', JSON.stringify(data));
}

// --- BÚSQUEDA Y FILTRADO ---
function renderCharactersList() {
    const grid = document.getElementById('units-grid');
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const filterRarity = document.getElementById('filter-rarity').value;
    const filterElement = document.getElementById('filter-element').value;
    
    // Filtrar la lista local
    const filtered = state.characters.filter(char => {
        const matchesQuery = !query || 
            char.name.toLowerCase().includes(query) || 
            char.element.toLowerCase().includes(query) || 
            char.storage.toLowerCase().includes(query);
            
        const matchesRarity = !filterRarity || char.rarity === parseInt(filterRarity);
        const matchesElement = !filterElement || char.element === filterElement;
        
        return matchesQuery && matchesRarity && matchesElement;
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>No se encontraron personajes que coincidan con los filtros.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filtered.map(char => {
        const stars = '⭐'.repeat(char.rarity);
        return `
            <div class="unit-card" data-element="${char.element}" onclick="window.location.hash = '#character/${char.id}'">
                <div class="unit-card-left">
                    <div class="unit-name">${escapeHtml(char.name)}</div>
                    <div class="unit-details">
                        <span class="badge badge-element" data-element="${char.element}">${getElementEmoji(char.element)} ${char.element}</span>
                        <span class="badge badge-storage">${escapeHtml(char.storage)}</span>
                    </div>
                </div>
                <div class="unit-card-right">
                    <div class="unit-rarity-stars">${stars}</div>
                    ${char.awaken_level > 0 ? `<span class="badge awaken-badge">+${char.awaken_level}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// --- AUTOCOMPLETADO INTERACTIVO ---
function initAutocomplete() {
    const input = document.getElementById('add-name');
    const suggestionsBox = document.getElementById('autocomplete-suggestions');
    
    input.addEventListener('input', () => {
        const value = input.value.trim().toLowerCase();
        if (!value) {
            suggestionsBox.classList.add('hidden');
            return;
        }
        
        // Obtener nombres únicos existentes en el estado local de personajes
        const names = [...new Set(state.characters.map(c => c.name))];
        const matches = names.filter(name => name.toLowerCase().includes(value)).slice(0, 5);
        
        if (matches.length === 0) {
            suggestionsBox.classList.add('hidden');
            return;
        }
        
        suggestionsBox.innerHTML = matches.map(name => {
            const originalChar = state.characters.find(c => c.name === name);
            return `
                <div class="suggestion-item" data-name="${escapeHtml(name)}">
                    <span>${escapeHtml(name)}</span>
                    <span class="suggest-meta">${originalChar.element} • ${originalChar.rarity}★</span>
                </div>
            `;
        }).join('');
        
        suggestionsBox.classList.remove('hidden');
    });
    
    // Seleccionar sugerencia
    suggestionsBox.addEventListener('click', (e) => {
        const item = e.target.closest('.suggestion-item');
        if (!item) return;
        
        const selectedName = item.dataset.name;
        input.value = selectedName;
        suggestionsBox.classList.add('hidden');
        
        // Autorellenar otros campos para facilidad si el personaje ya existe
        const match = state.characters.find(c => c.name === selectedName);
        if (match) {
            document.getElementById('add-rarity').value = match.rarity;
            document.getElementById('add-element').value = match.element;
            document.getElementById('add-storage').value = match.storage;
            showToast(`Auto-rellenado basado en ${selectedName}`, 'info');
        }
    });
    
    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            suggestionsBox.classList.add('hidden');
        }
    });
}

// --- FORMULARIOS Y ADVERTENCIA DE DUPLICADOS ---
function initForms() {
    // Formulario de Añadir
    const addForm = document.getElementById('add-unit-form');
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('add-name').value.trim();
        const rarity = parseInt(document.getElementById('add-rarity').value);
        const awaken = parseInt(document.getElementById('add-awaken').value);
        const element = document.getElementById('add-element').value;
        const storage = document.getElementById('add-storage').value;
        
        if (!name) {
            showToast('Por favor, ingresa un nombre.', 'error');
            return;
        }
        
        const characterData = { name, rarity, awaken_level: awaken, element, storage };
        
        // Comprobar duplicado de nombre exacto (Case sensitive / insensitve)
        const isDuplicate = state.characters.some(c => c.name.toLowerCase() === name.toLowerCase());
        
        if (isDuplicate) {
            // Mostrar Advertencia
            state.pendingUnitToAdd = characterData;
            document.getElementById('duplicate-char-name').innerText = `"${name}"`;
            document.getElementById('duplicate-modal').classList.remove('hidden');
        } else {
            // Guardar directamente
            await saveNewCharacter(characterData);
        }
    });
    
    // Botones del Modal de Advertencia
    document.getElementById('modal-confirm-btn').addEventListener('click', async () => {
        document.getElementById('duplicate-modal').classList.add('hidden');
        if (state.pendingUnitToAdd) {
            await saveNewCharacter(state.pendingUnitToAdd);
            state.pendingUnitToAdd = null;
        }
    });
    
    document.getElementById('modal-cancel-btn').addEventListener('click', () => {
        document.getElementById('duplicate-modal').classList.add('hidden');
        state.pendingUnitToAdd = null;
    });

    // Formulario de Edición (Detalle)
    const editForm = document.getElementById('edit-unit-form');
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('edit-id').value;
        const name = document.getElementById('edit-name').value.trim();
        const rarity = parseInt(document.getElementById('edit-rarity').value);
        const awaken = parseInt(document.getElementById('edit-awaken').value);
        const element = document.getElementById('edit-element').value;
        const storage = document.getElementById('edit-storage').value;
        
        if (!name) {
            showToast('El nombre no puede estar vacío.', 'error');
            return;
        }
        
        const updatedData = { name, rarity, awaken_level: awaken, element, storage };
        
        await saveEditCharacter(id, updatedData);
    });

    // Botón de Eliminar
    document.getElementById('delete-btn').addEventListener('click', async () => {
        const id = document.getElementById('edit-id').value;
        const name = document.getElementById('edit-name').value;
        
        if (confirm(`¿Estás seguro de que deseas eliminar a ${name}?`)) {
            await deleteCharacter(id);
        }
    });
    
    // Listeners de búsqueda instantánea
    document.getElementById('search-input').addEventListener('input', renderCharactersList);
    document.getElementById('filter-rarity').addEventListener('change', renderCharactersList);
    document.getElementById('filter-element').addEventListener('change', renderCharactersList);
}

function resetAddForm() {
    document.getElementById('add-unit-form').reset();
    document.getElementById('autocomplete-suggestions').classList.add('hidden');
}

// Cargar personaje en la vista de detalle
function loadCharacterDetail(id) {
    const char = state.characters.find(c => c.id === id);
    if (!char) {
        showToast('Personaje no encontrado.', 'error');
        window.location.hash = '#search';
        return;
    }
    
    document.getElementById('edit-id').value = char.id;
    document.getElementById('edit-name').value = char.name;
    document.getElementById('edit-rarity').value = char.rarity;
    document.getElementById('edit-awaken').value = char.awaken_level;
    document.getElementById('edit-element').value = char.element;
    document.getElementById('edit-storage').value = char.storage;
}

// --- OPERACIONES CRUD API / LOCAL STORAGE ---

async function saveNewCharacter(unit) {
    const tempId = generateUUID();
    const newUnit = { ...unit, id: tempId, created_at: new Date().toISOString() };
    
    // 1. Guardado optimista local
    state.characters.unshift(newUnit);
    saveLocalBackup(state.characters);
    renderCharactersList();
    
    // Limpiar formulario y volver a búsqueda
    resetAddForm();
    window.location.hash = '#search';
    
    // 2. Intento de guardado en Cloudflare D1
    if (state.isOnline && state.user) {
        try {
            const res = await fetch(`${API_BASE}/characters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(unit)
            });
            if (res.status === 201) {
                const savedServerUnit = await res.json();
                // Actualizar ID temporal con el oficial del servidor
                const index = state.characters.findIndex(c => c.id === tempId);
                if (index !== -1) {
                    state.characters[index] = savedServerUnit;
                    saveLocalBackup(state.characters);
                    renderCharactersList();
                }
                showToast('Personaje guardado en la nube.', 'success');
            } else {
                throw new Error('Servidor rechazó el guardado');
            }
        } catch (e) {
            console.error('Error al guardar en el servidor:', e);
            showToast('Personaje guardado localmente (se sincronizará luego).', 'info');
        }
    } else {
        showToast('Guardado en memoria local (Sin sesión en la nube).', 'info');
    }
}

async function saveEditCharacter(id, updatedData) {
    // 1. Guardado optimista local
    const index = state.characters.findIndex(c => c.id === id);
    if (index === -1) return;
    
    const previousState = { ...state.characters[index] };
    state.characters[index] = { ...previousState, ...updatedData, id, updated_at: new Date().toISOString() };
    saveLocalBackup(state.characters);
    
    window.location.hash = '#search';
    showToast('Cambios guardados localmente.', 'success');
    
    // 2. Intento en servidor
    if (state.isOnline && state.user) {
        try {
            const res = await fetch(`${API_BASE}/characters/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            if (res.status !== 200) throw new Error('Fallo del servidor');
            showToast('Sincronizado con Cloudflare D1.', 'success');
        } catch (e) {
            console.error('Error al actualizar en la nube:', e);
            showToast('Actualizado localmente (sin conexión a la nube).', 'info');
        }
    }
}

async function deleteCharacter(id) {
    const index = state.characters.findIndex(c => c.id === id);
    if (index === -1) return;
    
    // Eliminar localmente
    state.characters.splice(index, 1);
    saveLocalBackup(state.characters);
    
    window.location.hash = '#search';
    showToast('Personaje eliminado.', 'success');
    
    // Intento en servidor
    if (state.isOnline && state.user) {
        try {
            const res = await fetch(`${API_BASE}/characters/${id}`, {
                method: 'DELETE'
            });
            if (res.status !== 200) throw new Error('Fallo del servidor');
            showToast('Eliminado de Cloudflare D1.', 'success');
        } catch (e) {
            console.error('Error al eliminar en la nube:', e);
        }
    }
}

// --- AUTENTICACIÓN Y MOCK ---
async function initAuthStatus() {
    const container = document.getElementById('auth-section');
    const headerPill = document.getElementById('user-status-indicator');
    
    try {
        if (!state.isOnline) {
            showOfflineAuthUI();
            return;
        }
        
        const res = await fetch(`${API_BASE}/auth/status`);
        if (res.status === 200) {
            const data = await res.json();
            state.user = data.user;
            
            // UI de sesión activa
            container.innerHTML = `
                <div class="auth-box">
                    <div class="auth-user-info">
                        <img class="auth-avatar" src="${state.user.avatar || 'https://github.com/identicons/'+state.user.username+'.png'}" alt="Avatar">
                        <div class="auth-details">
                            <span class="auth-username">${escapeHtml(state.user.name || state.user.username)}</span>
                            <span class="auth-status">Sesión Iniciada con GitHub</span>
                        </div>
                    </div>
                    <button id="logout-btn" class="btn btn-secondary" style="padding: 8px 12px; font-size: 0.8rem;">Salir</button>
                </div>
            `;
            
            headerPill.innerHTML = `
                <span class="status-dot online"></span>
                <span class="user-name">${escapeHtml(state.user.username)}</span>
            `;
            
            document.getElementById('logout-btn').addEventListener('click', logout);
        } else {
            // Sin sesión activa
            state.user = null;
            showLoggedOutUI();
        }
    } catch (e) {
        console.warn('Error al verificar estado de autenticación:', e);
        showOfflineAuthUI();
    }
}

function showLoggedOutUI() {
    const container = document.getElementById('auth-section');
    const headerPill = document.getElementById('user-status-indicator');
    
    container.innerHTML = `
        <div style="text-align: center; padding: 10px 0;">
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 15px;">Inicia sesión con tu cuenta de GitHub para sincronizar todos tus datos en la base de datos distribuida D1.</p>
            <a href="${API_BASE}/auth/login" class="btn btn-primary glow-btn-purple" style="display: inline-block; text-decoration: none;">Conectar con GitHub</a>
        </div>
    `;
    
    headerPill.innerHTML = `
        <span class="status-dot offline"></span>
        <span class="user-name">Invitado</span>
    `;
}

function showOfflineAuthUI() {
    const container = document.getElementById('auth-section');
    container.innerHTML = `
        <div class="auth-box">
            <span style="font-size: 0.9rem; color: var(--text-secondary);">Modo Offline. Los datos se guardan de forma local en este dispositivo.</span>
        </div>
    `;
}

async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch(e) {}
    
    state.user = null;
    showToast('Sesión cerrada correctamente.', 'info');
    initAuthStatus();
    loadData(); // Recargar datos locales
}

// --- UTILERÍAS ---
function updateOnlineStatus(online) {
    state.isOnline = online;
    const dot = document.querySelector('.status-dot');
    const userLabel = document.querySelector('.user-name');
    
    if (online) {
        dot?.classList.remove('offline');
        dot?.classList.add('online');
        initAuthStatus();
    } else {
        dot?.classList.remove('online');
        dot?.classList.add('offline');
        if (!state.user) {
            userLabel.innerText = 'Invitado (Local)';
        }
        showOfflineAuthUI();
    }
}

function generateUUID() {
    return 'char-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
}

function getElementEmoji(element) {
    const emojis = {
        'Fuego': '🔥',
        'Agua': '💧',
        'Viento': '🍃',
        'Luz': '✨',
        'Oscuridad': '👁️'
    };
    return emojis[element] || '❓';
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}

// Toast Notifications Helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = `
        <span>${icon} ${message}</span>
        <span class="toast-close">✕</span>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove
    const removeTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(removeTimeout);
        toast.remove();
    });
}
