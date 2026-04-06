/* --- code/services/i18n.js --- */

import * as debug from '../debug/debug.js';
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

        debug.log('i18n', debug.DEBUG_LEVELS.BASIC, 
            `Textos cargados para idioma: ${lang}`);

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

    if (!_loadedStrings || !key) {
        debug.logWarn('i18n', `Intento de leer clave sin cargar strings: ${key}`);
        
        return `[${key}]`;
    }
    console.log(`Buscando clave: ${key}`);

    const value = key.split('.').reduce((obj, property) => {
        return (obj && obj[property] !== undefined) ? obj[property] : undefined;
    }, _loadedStrings);

    console.log(`Valor recuperado: ${value}`);
    
    // Si no se encuentra o el resultado no es una cadena, devolvemos la clave
    return (typeof value === 'string') ? value : `[${key}]`;
}

/**
 * Aplica los textos al DOM una vez cargados.
 * @param {VortexSpiraApp} appInstance - La instancia de la aplicación.
 */
export function applyStrings(appInstance) {
    if (!_loadedStrings) return;

    debug.log('i18n', debug.DEBUG_LEVELS.BASIC, 
        'Aplicando textos al DOM...');

    document.title = getString('page.title'); 

    // Mapeo ID -> Clave JSON (Actualizado a Jerárquico)
    const elementsById = {
        'main-header-title': 'header.title',
        'main-header-subtitle': 'header.subtitle',
        'info-adicional-titulo-ayuda': 'help.title',
        'info-adicional-ayuda-gira': 'help.rotate',
        'info-adicional-ayuda-vuelve': 'help.back'
    };

    for (const id in elementsById) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = getString(elementsById[id]);
            
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

    // 🟢 Traducir etiquetas ARIA dinámicas
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        const translated = getString(key);
        if (translated) {
            el.setAttribute('aria-label', translated);
            el.setAttribute('title', translated);
        }
    });

    // 🟢 HOT SWAP: Textos Visuales Internos del Menú (Fat Buttons en Desktop)
    const menuVisualTextsById = {
        'menu-btn-a11y': 'menu.aria.a11yBtn',
        'menu-btn-lang': 'menu.aria.langBtn',
        'menu-btn-linkedin': 'menu.aria.linkedin',
        'menu-btn-github': 'menu.aria.landing',
        'menu-btn-about': 'menu.aria.about',
        'menu-btn-feedback': 'menu.aria.feedback' 
    };

    for (const id in menuVisualTextsById) {
        // Buscamos específicamente el span con la clase .menu-text dentro de cada botón
        const textSpan = document.querySelector(`#${id} .menu-text`);
        if (textSpan) {
            textSpan.textContent = getString(menuVisualTextsById[id]);
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
/* --- code/services/i18n.js --- */