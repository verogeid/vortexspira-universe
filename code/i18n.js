/* --- code/i18n.js --- */

import * as debug from './debug.js';
import * as data from './data.js';

let _currentLang = 'es';
let _loadedStrings = null;

// Idioma por defecto (fallback)
const DEFAULT_LANG = 'es';

/**
 * Detecta el idioma del navegador (ej: "en-US" -> "en").
 */
export function detectBrowserLanguage() {
    const lang = navigator.language || navigator.userLanguage; 
    return lang ? lang.split('-')[0].toLowerCase() : DEFAULT_LANG;
}

/**
 * Carga el fichero de strings correspondiente.
 * Retorna true si tuvo éxito, false si falló.
 */
export async function loadStrings(lang) {
    try {
        const url = `./data/strings_${lang}.json`;
        debug.log('i18n', debug.DEBUG_LEVELS.BASIC, `Intentando cargar textos: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        _loadedStrings = await response.json();
        _currentLang = lang;
        
        document.documentElement.lang = _currentLang;
        debug.log('i18n', debug.DEBUG_LEVELS.BASIC, `Textos cargados para idioma: ${lang}`);
        return true;
    } catch (e) {
        debug.logWarn('i18n', `Fallo al cargar strings_${lang}.json.`, e);
        return false;
    }
}

export function getCurrentLang() {
    return _currentLang;
}

export function getString(key) {
    if (!_loadedStrings || !_loadedStrings[key]) {
        debug.logWarn('i18n', `Clave no encontrada: ${key}`);
        return `[${key}]`;
    }
    return _loadedStrings[key];
}

/**
 * Aplica los textos al DOM una vez cargados.
 * @param {VortexSpiraApp} appInstance - La instancia de la aplicación.
 */
export function applyStrings(appInstance) {
    if (!_loadedStrings) return;

    debug.log('i18n', debug.DEBUG_LEVELS.BASIC, 'Aplicando textos al DOM...');
    document.title = getString('pageTitle'); 

    // Mapeo ID -> Clave JSON
    const elementsById = {
        'main-header-title': 'headerTitle',
        'info-adicional-titulo-ayuda': 'helpTitle',
        'info-adicional-ayuda-gira': 'helpRotate',
        'info-adicional-ayuda-vuelve': 'helpBack'
    };

    for (const id in elementsById) {
        const el = document.getElementById(id);
        if (el) {
            let content = getString(elementsById[id]);
            
            // Lógica especial para subtítulo dentro del H1
            if (id === 'main-header-title') {
                const subtitle = getString('headerSubtitle');
                content = `${content}<small id="main-header-subtitle">${subtitle}</small>`;
            }
            el.innerHTML = content;
        }
    }

    const linksById = {
        'info-adicional-link-landing': { key: 'aboutLinkLanding', url: data.URL.LANDING_PAGE },
        'info-adicional-link-diary': { key: 'aboutLinkDiary', url: data.URL.DEV_DIARY }
    };

    for (const id in linksById) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = getString(linksById[id].key);
            el.setAttribute('href', linksById[id].url);
        }
    }

    const attributes = {
        'vista-central': { 'aria-label': 'ariaNavRegion' },
        'card-volver-fija-elemento': { 'aria-label': 'ariaBackLevel' }
    };

    for (const id in attributes) {
        const el = document.getElementById(id);
        if (el) {
            for (const attr in attributes[id]) {
                el.setAttribute(attr, getString(attributes[id][attr]));
            }
        }
    }
}
/* --- code/i18n.js --- */