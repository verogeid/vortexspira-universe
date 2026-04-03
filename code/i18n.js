/* --- code/i18n.js --- */

import * as debug from './debug/debug.js';
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
        const url = `./data/strings/strings_${lang}.json`;
        debug.log('i18n', debug.DEBUG_LEVELS.BASIC, 
            `Intentando cargar textos: ${url}`);
        
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

/* 🟢 MODIFICADO: Soporte para claves anidadas (dot notation) manteniendo tu gestión de errores */
export function getString(key) {
    if (!_loadedStrings) {
        debug.logWarn('i18n', `Intento de leer clave sin cargar strings: ${key}`);
        
        return `[${key}]`;
    }

    const keys = key.split('.');
    let value = _loadedStrings;
    
    for (const k of keys) {
        if (value && value[k] !== undefined) {
            value = value[k];
        } else {
            debug.logWarn('i18n', `Clave no encontrada: ${key}`);

            return `[${key}]`;
        }
    }
    return value;
}

/**
 * Aplica los textos al DOM una vez cargados.
 * @param {VortexSpiraApp} appInstance - La instancia de la aplicación.
 */
export function applyStrings(appInstance) {
    if (!_loadedStrings) return;

    debug.log('i18n', debug.DEBUG_LEVELS.BASIC, 'Aplicando textos al DOM...');

    document.title = getString('page.title'); 

    // Mapeo ID -> Clave JSON (Actualizado a Jerárquico)
    const elementsById = {
        'main-header-title': 'header.title',
        'info-adicional-titulo-ayuda': 'help.title',
        'info-adicional-ayuda-gira': 'help.rotate',
        'info-adicional-ayuda-vuelve': 'help.back'
    };

    for (const id in elementsById) {
        const el = document.getElementById(id);
        if (el) {
            let content = getString(elementsById[id]);
            
            // Lógica especial para subtítulo dentro del H1
            if (id === 'main-header-title') {
                const subtitle = getString('header.subtitle');
                content = `<span class="title-text-clamp">
                               ${content}
                               <small id="main-header-subtitle">
                                   ${subtitle}
                               </small>
                           </span>`;
            }
            el.innerHTML = content;
        }
    }

    const linksById = {
        'info-adicional-link-landing': { key: 'about.landing', url: data.MEDIA.URL.LANDING_PAGE },
        'info-adicional-link-diary': { key: 'about.diary', url: data.MEDIA.URL.DEV_DIARY }
    };

    for (const id in linksById) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = getString(linksById[id].key);
            el.setAttribute('href', linksById[id].url);
        }
    }

    const attributes = {
        'vista-central': { 
            'aria-label': 'nav.aria.region' },
        'card-volver-fija-elemento': { 
            'aria-label': 'nav.aria.backBtn', 'title': 'nav.aria.backBtn' },
        'menu-btn-a11y': { 
            'aria-label': 'menu.aria.a11yBtn', 'title': 'menu.aria.a11yBtn' },
        'menu-btn-lang': { 
            'aria-label': 'menu.aria.langBtn', 'title': 'menu.aria.langBtn' },
        'menu-btn-about': { 
            'aria-label': 'menu.aria.about', 'title': 'menu.aria.about' },
        'menu-link-linkedin': { 
            'aria-label': 'menu.aria.linkedin', 'title': 'menu.aria.linkedin' },
        'menu-link-github': { 
            'aria-label': 'menu.aria.github', 'title': 'menu.aria.github' },
        'menu-link-landing': { 
            'aria-label': 'menu.aria.landing', 'title': 'menu.aria.landing' },
        'menu-link-license': { 
            'aria-label': 'menu.aria.license', 'title': 'menu.aria.license' }
    };

    for (const id in attributes) {
        const el = document.getElementById(id);
        if (el) {
            for (const attr in attributes[id]) {
                el.setAttribute(attr, getString(attributes[id][attr]));
            }
        }
    }

    // 🟢 Actualizar dinámicamente la insignia visual (ES/EN) del botón de idiomas
    const langTextSpan = document.querySelector('#menu-btn-lang .lang-text');
    if (langTextSpan) {
        langTextSpan.textContent = _currentLang.toUpperCase();
    }

    // Footer (Si se maneja aquí y no dinámicamente)
    const footerCopy = document.querySelector('.footer-copyright');
    if (footerCopy) footerCopy.textContent = getString('footer.copyright');
    
    const footerAuth = document.querySelector('.footer-author-text');
    if (footerAuth) footerAuth.innerHTML = getString('footer.author');
}
/* --- code/i18n.js --- */