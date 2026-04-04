/* --- code/features/a11y/a11y.js --- */

import * as debug from '../../debug/debug.js';
import * as data from '../../services/data.js';

// Exportamos el estado para que el modal pueda leerlo/escribirlo
export let _prefs = { ...data.A11Y.DEFAULTS };

let _modalModule = null;
let _isModalLoading = false;

export function initA11y() {
    debug.log('a11y', debug.DEBUG_LEVELS.BASIC, 
        'Inicializando motor core de accesibilidad (Silencioso)...');

    _loadPreferences();
    _applyPreferences();
}

function _loadPreferences() {
    try {
        const saved = localStorage.getItem(data.A11Y.STORAGE_KEY);
        if (saved) {
            _prefs = { ...data.A11Y.DEFAULTS, ...JSON.parse(saved) };
        }
    } catch (e) {
        debug.logWarn('a11y', 'Error leyendo localStorage', e);
    }
}

// 🟢 Expuesta para que el Modal (cuando se cargue) pueda guardar los cambios
export function _savePreferences(newPrefs, forceResize = false) {
    _prefs = { ..._prefs, ...newPrefs };
    try {
        localStorage.setItem(data.A11Y.STORAGE_KEY, JSON.stringify(_prefs));
        
        _applyPreferences(forceResize);
        debug.log('a11y', debug.DEBUG_LEVELS.BASIC, 
            'Preferencias guardadas desde UI.');

    } catch (e) {
        debug.logWarn('a11y', 'Error guardando en localStorage', e);
    }
}

/**
 * Aplica las variables CSS al :root
 */
export function _applyPreferences(forceResize = false) {
    const root = document.documentElement;
    
    // 🟢 1. Familia: Usar data-attribute para que style-fonts.css haga el trabajo
    document.body.setAttribute('data-font', _prefs.fontType || 'atkinson');

    // 2. Escala
    const scale = _prefs.fontSizePct / 100;
    root.style.setProperty('--font-scale', scale);

    // 3. Espaciado
    root.style.setProperty('--line-height-base', _prefs.lineHeight);
    root.style.setProperty('--paragraph-spacing', `${_prefs.paragraphSpacing}em`);

    root.style.setProperty('--letter-spacing-base', _prefs.letterSpacing);
    root.style.setProperty('--word-spacing-base', _prefs.wordSpacing);

    // 🟢 Aplicar Tema al body (El CSS se encargará del resto)
    document.body.setAttribute('data-theme', _prefs.theme || 'default');

    // 🟢 LAZY LOAD: Inyección de Temas Manuales
    // Si elige algo distinto a "Sistema", inyectamos el CSS sin media queries para forzarlo
    const themeCSSMap = {
        'light': 'styles/themes/style-theme-scheme-light.css',
        'dark': 'styles/themes/style-theme-scheme-dark.css',
        'contrast': 'styles/themes/style-theme-contrast.css',
        'forced': 'styles/themes/style-theme-forced-colors.css',
        'yellow': 'styles/themes/style-theme-yellow.css'
    };

    if (_prefs.theme !== 'default' && themeCSSMap[_prefs.theme]) {
        // 1. Inyectamos el tema base elegido
        if (window.App) window.App._injectCSS(themeCSSMap[_prefs.theme], 'vortex-css-manual-theme');
        
        // 2. DETECCIÓN DE MÓVIL PARA EL PARCHE DE ALTO CONTRASTE
        // Usamos la API moderna primero, y caemos al RegEx clásico si es un navegador antiguo/Safari
        const isMobileOS = navigator.userAgentData?.mobile || 
                           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (_prefs.theme === 'forced' && isMobileOS) {
            // Es un móvil en alto contraste: bajamos el parche de colores HEX
            if (window.App) 
                window.App._injectCSS(
                    'styles/themes/style-theme-forced-colors-mobile.css', 'vortex-css-forced-mobile'
                );
        } else {
            // Si no es móvil o cambió de tema, purgamos el parche
            const mobileForcedLink = document.getElementById('vortex-css-forced-mobile');
            if (mobileForcedLink) mobileForcedLink.remove();
        }

    } else {
        // Si vuelve a "Sistema", borramos la inyección manual para que actúen las media queries del index.html
        const manualThemeLink = document.getElementById('vortex-css-manual-theme');
        if (manualThemeLink) manualThemeLink.remove();
        
        const mobileForcedLink = document.getElementById('vortex-css-forced-mobile');
        if (mobileForcedLink) mobileForcedLink.remove();
    }

    // 🟢 Aplicar Reducción de movimiento
    document.body.setAttribute('data-reduced-motion', _prefs.reduceMotion ? 'true' : 'false');
    
    // LAZY LOAD: Forzar reducción de movimiento aunque el OS no lo pida
    if (_prefs.reduceMotion) {
        if (window.App) window.App._injectCSS('styles/base/style-reduce-motion.css', 'vortex-css-reduce-motion');
    } else {
        const rmLink = document.getElementById('vortex-css-reduce-motion');
        if (rmLink) rmLink.remove();
    }

    // 🟢 Atributos para la atenuación
    document.body.setAttribute('data-no-block-opacity', _prefs.noBlockOpacity ? 'true' : 'false');
    document.body.setAttribute('data-no-mask-opacity', _prefs.noMaskOpacity ? 'true' : 'false');
    document.body.setAttribute('data-no-zone-opacity', _prefs.noZoneOpacity ? 'true' : 'false');

    // ⭐️ Disparar evento de resize SOLO si lo solicitamos explícitamente
    if (forceResize) {
        window.dispatchEvent(new Event('resize'));
    }
}

// 🟢 EL PUENTE ASÍNCRONO HACIA LA UI
export async function openModal(appInstance) {
    if (_isModalLoading) return;
    
    try {
        if (!_modalModule) {
            _isModalLoading = true;
            appInstance.blockUI(); // Pantalla de carga si la red es lenta
            
            // Inyectamos su CSS pesado
            await appInstance._injectCSS('styles/components/style-a11y.css', 'vortex-css-a11y');
            
            // Descargamos la lógica del DOM
            _modalModule = await import('./a11y-modal.js');
            
            appInstance.unblockUI();
            _isModalLoading = false;
        }
        
        // Delegamos la apertura al módulo diferido, pasándole el core
        _modalModule.showA11yModal(appInstance, this);
        
    } catch (e) {
        debug.logError('a11y', 'Fallo descargando la UI de Accesibilidad', e);
        
        appInstance.unblockUI();
        _isModalLoading = false;
    }
}

/* --- code/features/a11y/a11y.js --- */