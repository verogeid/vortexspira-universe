/* --- code/data.js --- */
import * as debug from './debug.js';
import * as main_menu from './main-menu.js';

export const A11Y = {
    STORAGE_KEY: 'vortex_a11y_prefs_v1',
    DEFAULTS: {
        fontType: 'atkinson', 

        fontSizePct: 100,  

        lineHeight: 1.5,       
        paragraphSpacing: 1.5,

        letterSpacing: '0em',
        wordSpacing: '0em',

        theme: 'default',

        reduceMotion: false,

        noBlockOpacity: false, 
        noMaskOpacity: false,
        noZoneOpacity: false
    },
    SPACING_MAP: { // Mapeo para el slider de espaciado: Valor -> [AlturaLinea, Etiqueta]
        1: { val: 1.0, labelKey: 'modal.spacing.compact' },
        2: { val: 1.5, labelKey: 'modal.spacing.normal' },
        3: { val: 2, labelKey: 'modal.spacing.wide' },
        4: { val: 2.5, labelKey: 'modal.spacing.extraWide' }
    },
    LETTER_SPACING_MAP: {
        1: { letter: '0em', word: '0em', labelKey: 'modal.spacing.normal' },
        2: { letter: '0.12em', word: '0.16em', labelKey: 'modal.spacing.wide' },
        3: { letter: '0.20em', word: '0.25em', labelKey: 'modal.spacing.extraWide' }
    }
};

export const MEDIA = {
    URL: {
        LINKEDIN: "https://www.linkedin.com/company/vortexspira",
        LICENSE: "http://creativecommons.org/licenses/by-nc-nd/4.0/",
        LICENSE_IMG_SRC: "https://licensebuttons.net/l/by-nc-nd/4.0/88x31.png",
        LANDING_PAGE: "https://subscribepage.io/vortexspira",
        DEV_DIARY: "https://github.com/verogeid/vortexspira-devdiary",
        WEBPAGE: "https://www.vortexspira.com"
    }
};

export const VIEWPORT = {
    // MÍNIMO VITAL: ¿Necesario para ver algo útil?
    MIN_CONTENT_HEIGHT: {
        MOBILE: 200, // Equivale a 18.75em
        TABLET: 450, // Equivale a 28.125em
        DESKTOP: 600 // Equivale a 37.5em
    },
    MAX_WIDTH: {
        MOBILE: 600,
        TABLET_PORTRAIT: 800,
        TABLET_LANDSCAPE: 1023.99
    },
    DETAILS: {
        minLinesHeight: 1
    }
}

export const SWIPER = {
    prefersReducedMotion: function() {
        // 🟢 Comprueba si está marcado en el modal (data-attribute) O en el sistema operativo
        const manualOverride = document.body.getAttribute('data-reduced-motion') === 'true';

        const osPreference = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        return manualOverride || osPreference;
    },
    get SLIDE_SPEED() { 
        return this.prefersReducedMotion() ? 0 : 400; 
    },
    get SLIDES_PER_VIEW() {
        return 3;
    },
    get NEEDED_SLIDES_TO_LOOP() {
        return this.SLIDES_PER_VIEW * 3 + 2; 
    },
    get scrollBehavior () {
        return this.prefersReducedMotion() ? 'auto' : 'smooth';
    },
    CARD_GAP_PX: 15,
    ELEMENTS_PER_COLUMN_TABLET: 2,
    ELEMENTS_PER_COLUMN_DESKTOP: 3,
};

export async function loadData(lang) {
    try {
        const filename = `./data/cursos_${lang}.json`;

        debug.log('data', debug.DEBUG_LEVELS.BASIC, 
                    `Cargando datos de cursos: ${filename}`);
        
        const response = await fetch(filename); 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Lógica de filtrado de modos (Producción vs Marketing)
        const fullJson = await response.json();
        const url = new URL(window.location);
        const mode = url.searchParams.get('mode');

        let dataSelected;
        if (mode === 'dev') {
            debug.log('data', debug.DEBUG_LEVELS.BASIC, '🧪 MODO DEV ACTIVO');

            dataSelected = fullJson.dev || [];
        } else {
            dataSelected = fullJson.prod || [];
        }

        return { navegacion: dataSelected };

    } catch (e) {
        debug.logError('data', "Error crítico cargando cursos.", e);

        throw e;
    }
}

export function injectHeaderContent(appInstance, enableI18n = false) {
    const header = document.getElementById('app-header');
    const wrapper = document.getElementById('header-content-wrapper');

    if (header && wrapper) {
        const h1 = header.querySelector('h1');

        if (h1) {
            // 2. HEADER LOGO: Comprobamos si ya existe para no duplicarlo al cambiar de idioma
            let logoLink = h1.querySelector('a');
            
            if (!logoLink) {
                debug.log('data', debug.DEBUG_LEVELS.DEEP, 'Insertando enlace en Header');
                logoLink = document.createElement('a');
                logoLink.href = MEDIA.URL.WEBPAGE;
                logoLink.target = "_self";
                
                const logoDiv = document.createElement('span');
                logoDiv.className = 'header-logo'; 
                logoLink.appendChild(logoDiv);
                
                h1.insertBefore(logoLink, h1.firstChild);
            }
            
            // Siempre actualizamos el aria-label en caliente para los cambios de idioma
            const txtLogoLink = appInstance.getString('header.aria.logoLink')
            logoLink.setAttribute('aria-label', txtLogoLink);
            logoLink.setAttribute('title', txtLogoLink);

            // 3. DEBUG ICON (OBRAS): Solo insertamos si no existe previamente
            if (!debug.IS_PRODUCTION) {
                let obrasSpan = wrapper.querySelector('.icon-obras-header');
                
                if (!obrasSpan) {
                    debug.log('data', debug.DEBUG_LEVELS.DEEP, 'Insertando Icono de Obras');
                    obrasSpan = document.createElement('span');
                    obrasSpan.className = 'icon-obras-header'; // CSS pinta el icono
                    wrapper.insertBefore(obrasSpan, h1);
                }
            }
        }

        // 🟢 DELEGACIÓN ARQUITECTÓNICA: 
        // Pasamos la responsabilidad del menú, el teclado y la UI a su propio componente
        main_menu.initMainMenu(appInstance, wrapper, enableI18n);
    }
}

export function injectFooterContent(appInstance) {
    const footerContent = document.getElementById('footer-content');

    if (footerContent) {
        // Usamos appInstance.getString para TODO, incluidos los ARIA labels nuevos
        footerContent.innerHTML = `
            <span class="footer-copyright">
                ${appInstance.getString('footer.copyright')}
            </span>
            <span class="footer-separator-author">|</span>
            <span class="footer-author-text">
                ${appInstance.getString('footer.author')}
            </span> 
            <span class="footer-separator">|</span>
            <span class="footer-version">v${appInstance.getString('meta.version')}.build:${appInstance.getString('meta.build')}</span>
        `;
    }
}
/* --- code/data.js --- */