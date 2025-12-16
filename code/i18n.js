// --- code/i18n.js ---

import * as debug from './debug.js';
import * as data from './data.js';

export const STRINGS = {
    'es': {
        'version': '1.1.35',

        // Meta y Títulos
        'pageTitle': 'VortexSpira® Universe: Selector de Cursos',
        'headerTitle': 'VortexSpira® Universe',
        'headerSubtitle': 'Audio-Aprendizaje Técnico Inmersivo',

        // Botones y Controles
        'btnBack': '↩ Volver', 

        // Labels de Accesibilidad (ARIA)
        'ariaSelfUrl': 'URL de VortexSpira',
        'ariaNavRegion': 'Navegación principal de cursos',
        'ariaBackLevel': 'Volver al nivel anterior', 
        'ariaLicense': 'Descripción de la licencia CC BY-NC-ND 4.0',
        'ariaLinkedIn': 'Perfil de LinkedIn de Diego González Fernández',

        // Breadcrumb
        'breadcrumbRoot': 'Nivel Raíz',

        // Ayuda Rápida
        'helpTitle': 'Ayuda Rápida:',
        'helpRotate': '<b>Gira</b>: Arrastra, usa la rueda del ratón o las flechas del teclado.',
        'helpBack': '<b>Vuelve</b>: Pulsa [Esc] o el botón "Volver".',
        
        // "Acerca de"
        'aboutTitle': 'Acerca de VortexSpira®',
        'aboutSummary': 'Plataforma de audio-aprendizaje inmersivo diseñada para ingenieros, con foco en la accesibilidad cognitiva y cero ansiedad.',
        'aboutLinkLanding': 'Visita la Landing Page',
        'aboutLinkDiary': 'Lee el Dev Diary en GitHub',

        // Footer
        'footerCopyright': '&copy;2025 VortexSpira®',
        'footerAuthor': 'Desarrollado por Diego González Fernández',

        // Notificaciones (Toast)
        'toastErrorId': 'Curso no encontrado. Pruebe a buscarlo manualmente.'
    }
};

let currentLang = 'es'; 

export function getString(key) {
    if (!STRINGS[currentLang] || !STRINGS[currentLang][key]) {
        debug.logError('i18n', `Clave no encontrada: ${key}`);
        return `[${key}]`;
    }
    return STRINGS[currentLang][key];
}

/**
 * Función de inyección de textos y enlaces.
 * @param {VortexSpiraApp} appInstance - La instancia de la aplicación (para acceso al DOM).
 */
export function applyStrings(appInstance) {
    debug.log('i18n', debug.DEBUG_LEVELS.BASIC, 'Aplicando textos (i18n)...');

    document.documentElement.lang = currentLang;
    document.title = getString('pageTitle'); 

    const elementsById = {
        'main-header-title': 'headerTitle',
        'btn-volver-navegacion': 'btnBack',
        'info-adicional-titulo-ayuda': 'helpTitle',
        'info-adicional-ayuda-gira': 'helpRotate',
        'info-adicional-ayuda-vuelve': 'helpBack',
        'info-adicional-titulo-acerca': 'aboutTitle',
        'info-adicional-summary': 'aboutSummary'
    };

    for (const id in elementsById) {
        const el = document.getElementById(id);
        if (el) {
            let content = getString(elementsById[id]);
            
            // ⭐️ FIX CLAVE: Lógica de subtítulo para el H1 ⭐️
            if (id === 'main-header-title') {
                const subtitle = getString('headerSubtitle'); // Obtenemos el subtítulo
                content = `${content}<small id="main-header-subtitle">${subtitle}</small>`;
            }
            // ⭐️ FIN FIX CLAVE ⭐️

            el.innerHTML = content;
        } else {
            debug.logWarn('i18n', `Elemento no encontrado por ID: #${id}`);
        }
    }

    const linksById = {
        'info-adicional-link-landing': { key: 'aboutLinkLanding', url: data.LANDING_PAGE_URL },
        'info-adicional-link-diary': { key: 'aboutLinkDiary', url: data.DEV_DIARY_URL }
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
                const key = attributes[id][attr];
                el.setAttribute(attr, getString(key));
            }
        }
    }
}

// --- code/i18n.js ---