/* --- code/data.js --- */
import * as debug from './debug.js';

export const A11Y = {
    STORAGE_KEY: 'vortex_a11y_prefs_v1',
    DEFAULTS: {
        fontType: 'atkinson',      
        fontSizePct: 100,      
        lineHeight: 1.5,       
        paragraphSpacing: 1.5,
        reduceMotion: false,
        theme: 'default'
    },
    SPACING_MAP: { // Mapeo para el slider de espaciado: Valor -> [AlturaLinea, Etiqueta]
        1: { val: 1.0, labelKey: 'modal.spacing.compact' },
        2: { val: 1.5, labelKey: 'modal.spacing.normal' },
        3: { val: 2, labelKey: 'modal.spacing.wide' },
        4: { val: 2.5, labelKey: 'modal.spacing.extraWide' }
    }
};

export const MEDIA = {
    LOGO: {
        OBRAS: '🚧',
        CARPETA: '📂',
        CURSO: '📚',
        VOLVER: '↩',
        BUY: '🛒',
        DISABLED: '🔒',
        A11Y: '🫆​',
        I18N: '🌐'
    },
    URL: {
        LINKEDIN: "https://www.linkedin.com/in/diego-gonzalez-fernandez",
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
        MOBILE: 260, // Equivale a 18.75em
        TABLET: 450, // Equivale a 28.125em
        DESKTOP: 600 // Equivale a 37.5em
    },
    MAX_WIDTH: {
        MOBILE: 600,
        TABLET_PORTRAIT: 800,
        TABLET_LANDSCAPE: 1023.99
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
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');

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
            debug.log('data', debug.DEBUG_LEVELS.DEEP, 'Insertando enlace en Header');

            // 2. HEADER LOGO: Creamos el enlace y el span con la clase CSS
            // El CSS .header-logo se encarga de pintar el SVG con máscaras.
            const logoLink = document.createElement('a');
            logoLink.href = MEDIA.URL.WEBPAGE;
            logoLink.target = "_self";

            logoLink.setAttribute('aria-label', appInstance.getString('header.aria.logoLink'));
            
            // Elemento vacío que recibirá el estilo CSS del logo
            const logoDiv = document.createElement('span');
            logoDiv.className = 'header-logo'; 
            
            logoLink.appendChild(logoDiv);

            // Insertamos al principio del H1 (antes del texto del título)
            h1.insertBefore(logoLink, h1.firstChild);

            // 3. DEBUG ICON (OBRAS): Solo insertamos el span con la clase
            if (!debug.IS_PRODUCTION) {
                debug.log('data', debug.DEBUG_LEVELS.DEEP, 'Insertando Icono de Obras');

                const obrasSpan = document.createElement('span');
                obrasSpan.className = 'icon-obras-header'; // CSS pinta el icono
                wrapper.insertBefore(obrasSpan, h1);
            }
        }

        // 3. CONTENEDOR DE CONTROLES (I18N + A11Y)
        // Creamos un wrapper para agrupar los botones a la derecha
        let controls = wrapper.querySelector('.header-controls');
        if (!controls) {
            controls = document.createElement('div');
            controls.className = 'header-controls';
            
            // Si el botón A11y ya existe, lo movemos dentro
            const btnA11y = document.getElementById('btn-config-accesibilidad');
            if (btnA11y && btnA11y.parentNode === wrapper) {
                wrapper.insertBefore(controls, btnA11y); // Insertamos contenedor donde estaba el botón
                controls.appendChild(btnA11y); // Movemos el botón dentro
            } else {
                wrapper.appendChild(controls);
            }
        }

        // 🟢 BOTÓN IDIOMA (Solo si enableI18n es true)
        if (enableI18n) {
            let btnLang = document.getElementById('btn-lang-toggle');
            if (!btnLang) {
                btnLang = document.createElement('button');
                btnLang.id = 'btn-lang-toggle';
                btnLang.tabIndex = 0;
                
                const iconSpan = document.createElement('span');
                iconSpan.className = 'lang-icon-bg';
                
                const textSpan = document.createElement('span');
                textSpan.className = 'lang-text';
                textSpan.setAttribute('aria-hidden', 'true');
                
                btnLang.appendChild(iconSpan);
                btnLang.appendChild(textSpan);
                
                controls.appendChild(btnLang);
                
                btnLang.onclick = () => appInstance.toggleLanguage();
            }

            const currentLang = localStorage.getItem('vortex_lang') || 'es';
            const textSpan = btnLang.querySelector('.lang-text');
            if (textSpan) textSpan.textContent = currentLang.toUpperCase();
            
            const langLabel = currentLang === 'es' 
                ? appInstance.getString('header.aria.langBtn') || "Idioma actual: Español. Cambiar a Inglés." 
                : appInstance.getString('header.aria.langBtn') || "Current language: English. Switch to Spanish.";
            btnLang.setAttribute('aria-label', langLabel);
        }


        // 5. BOTÓN A11Y: Limpiamos y configuramos
        const btnA11y = document.getElementById('btn-config-accesibilidad');
        if (btnA11y) {
            debug.log('data', debug.DEBUG_LEVELS.DEEP, 
                        'Estableciendo texto aria-label del botón a11y.');
            
            btnA11y.innerHTML = ''; 
            // El listener de click se añade en injectFooterContent o data.js global?
            // Mejor añadirlo aquí si no está
            btnA11y.onclick = () => {
                import('./a11y.js').then(module => module.openModal());
            };
        }
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
            
            <a href="${MEDIA.URL.LICENSE}" target="_top" 
                aria-label="${appInstance.getString('footer.aria.license')}" class="footer-license-link">
                <img src="${MEDIA.URL.LICENSE_IMG_SRC}" width=88 height=31 alt="Creative Commons License"/>
            </a>
            <span class="footer-separator-author">|</span>
            <span class="footer-author-text">
                ${appInstance.getString('footer.author')}
            </span> 
            <span class="footer-separator">|</span>
            
            <div class="footer-social-container">
                <a href="${MEDIA.URL.LINKEDIN}" target="_blank" 
                    aria-label="${appInstance.getString('footer.aria.linkedin')}" class="footer-social-link link-linkedin">
                </a>

                <a href="${MEDIA.URL.DEV_DIARY}" target="_blank" 
                    aria-label="${appInstance.getString('footer.aria.github')}" class="footer-social-link link-github">
                </a>

                <a href="${MEDIA.URL.LANDING_PAGE}" target="_blank" 
                    aria-label="${appInstance.getString('footer.aria.landing')}" class="footer-social-link link-fire">
                </a>
            </div>

            <span class="footer-separator">|</span> 
            <span class="footer-version">v${appInstance.getString('meta.version')}</span>
        `;
    }
}
/* --- code/data.js --- */