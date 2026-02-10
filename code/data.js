/* --- code/data.js --- */
import * as debug from './debug.js';

export const LOGO = {
    OBRAS: '🚧',
    CARPETA: '📂',
    CURSO: '📚',
    VOLVER: '↩',
    BUY: '🛒',
    DISABLED: '🔒',
    A11Y: '🫆​',
    I18N: '🌐'
}

export const COLOR = {
    PRIMARY: '#999',
    SECONDARY: '#F89707',
    FOOTER_ICON: '#888'
}

export const URL = {
    LINKEDIN: "https://www.linkedin.com/in/diego-gonzalez-fernandez",
    LICENSE: "http://creativecommons.org/licenses/by-nc-nd/4.0/",
    LICENSE_IMG_SRC: "https://licensebuttons.net/l/by-nc-nd/4.0/88x31.png",
    LANDING_PAGE: "https://subscribepage.io/vortexspira",
    DEV_DIARY: "https://github.com/verogeid/vortexspira-devdiary",
    WEBPAGE: "https://www.vortexspira.com"
}

// MÍNIMO VITAL: ¿Necesario para ver algo útil?
export const MIN_CONTENT_HEIGHT = {
    MOBILE: 260, // Equivale a 18.75em
    TABLET: 450, // Equivale a 28.125em
    DESKTOP: 600 // Equivale a 37.5em
}

export const MAX_WIDTH = {
    MOBILE: 600,
    TABLET_PORTRAIT: 800,
    TABLET_LANDSCAPE: 1023.99
}

const _SLIDES_PER_VIEW = 3;

export const SWIPER = {
    SLIDE_SPEED: 400, // en ms
    CARD_GAP_PX: 15,
    ELEMENTS_PER_COLUMN_TABLET: 2,
    ELEMENTS_PER_COLUMN_DESKTOP: 3,
    SLIDES_PER_VIEW: _SLIDES_PER_VIEW,
    NEEDED_SLIDES_TO_LOOP: _SLIDES_PER_VIEW * 3 + 2
}

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

export function injectHeaderContent(appInstance) {
    const header = document.getElementById('app-header');
    const wrapper = document.getElementById('header-content-wrapper');

    if (header && wrapper) {
        const h1 = header.querySelector('h1');

        if (h1) {
            debug.log('data', debug.DEBUG_LEVELS.DEEP, 'Insertando enlace en Header');

            // 2. HEADER LOGO: Creamos el enlace y el span con la clase CSS
            // El CSS .header-logo se encarga de pintar el SVG con máscaras.
            const logoLink = document.createElement('a');
            logoLink.href = URL.WEBPAGE;
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

        // 4. BOTÓN A11Y: Limpiamos contenido
        // Como ahora tiene una máscara CSS, no debe tener texto/emoji dentro para no ensuciar.
        const btnA11y = document.getElementById('btn-config-accesibilidad');
        if (btnA11y) {
            debug.log('data', debug.DEBUG_LEVELS.DEEP, 
                        'Estableciendo texto aria-label del botón a11y.');
            
            btnA11y.innerHTML = ''; // Vaciar emoji antiguo
            // Aseguramos que tenga label accesible ya que es visualmente un icono
            if (!btnA11y.getAttribute('aria-label')) {
                // Si i18n no lo puso (race condition), poner fallback o esperar a applyStrings
                // Lo dejamos vacío aquí porque applyStrings ya se encarga de esto correctamente
                // btnA11y.setAttribute('aria-label', 'Configuración de Accesibilidad');
            }
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
            
            <a href="${URL.LICENSE}" target="_top" 
                aria-label="${appInstance.getString('footer.aria.license')}" class="footer-license-link">
                <img src="${URL.LICENSE_IMG_SRC}" width=88 height=31 alt="Creative Commons License"/>
            </a>
            <span class="footer-separator-author">|</span>
            <span class="footer-author-text">
                ${appInstance.getString('footer.author')}
            </span> 
            <span class="footer-separator">|</span>
            
            <div class="footer-social-container">
                <a href="${URL.LINKEDIN}" target="_blank" 
                    aria-label="${appInstance.getString('footer.aria.linkedin')}" class="footer-social-link link-linkedin">
                </a>

                <a href="${URL.DEV_DIARY}" target="_blank" 
                    aria-label="${appInstance.getString('footer.aria.github')}" class="footer-social-link link-github">
                </a>

                <a href="${URL.LANDING_PAGE}" target="_blank" 
                    aria-label="${appInstance.getString('footer.aria.landing')}" class="footer-social-link link-fire">
                </a>
            </div>

            <span class="footer-separator">|</span> 
            <span class="footer-version">v${appInstance.getString('meta.version')}</span>
        `;
    }
}
/* --- code/data.js --- */