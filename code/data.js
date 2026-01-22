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
    DEV_DIARY: "https://github.com/verogeid/vortexspira",
    WEBPAGE: "https://www.vortexspira.com"
}

// MÍNIMO VITAL: ¿Necesitamos al menos 250px para ver algo útil?
export const MIN_CONTENT_HEIGHT = 250;

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
    NEEDED_SLIDES_TO_LOOP: _SLIDES_PER_VIEW * 2 + 1
}

export function createVortexSpiraSVG(primaryColor, accentColor = COLOR.SECONDARY, className = '') {
    return `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" viewBox="-331 132.8 296.2 296.2" height="40" style="vertical-align: middle; margin-right: 10px;"><g><path id="XMLID_150_" fill="${accentColor}" d="M-242.5,261.2c31.6,9.9,57.2,15.2,65.9,13.4c-3.2-3.9-5.9-7-11.8-7.6c-26.5-2.6-52.7-6.8-76-21.3c-8.9-5.5-18.1-10.4-27.4-15.2c-10.4-5.6-20.8-11.2-29.2-19.8c-14.3-14.7-13.2-30.9,3-43.6c15.5-12.2,33.9-18.3,52.5-23.4c20.5-5.6,41.5-9.2,62.8-10c18.8-0.7,37.6-1.2,56.4-0.8c12.6,0.3,25.3,2.4,37.8,4.2c-8.5-0.3-16.9-0.8-25.4-1.1c-42.6-1.6-84.5,2.5-124.9,16.5c-10.8,3.8-21.4,9.5-30.8,16.1c-13.9,9.8-16,24.2-6.6,35.9c2.9,3.6,6.4,6.9,10.1,9.6c15.8,11.7,34.1,18.1,52.7,23.1c10.8,2.9,21.7,5,32.6,7.4c0.9,0.2,1.8,0,2.4,0.6c-16.4-5-33-9.7-49.3-15.3c-8.8-3-16.8-8-23-15.4c-7.1-8.6-6.9-17.8,0.7-26c7.8-8.4,17.7-13.5,28.1-17.6c19.5-7.6,39.8-11.6,60.5-13.9c20.5-2.2,40.9-2.5,61.4-0.7c24.1,2.1,47.9,5.8,69.7,17.4c1.9,1,3.8,2.2,5.3,3.7c0.8,0.7,1.5,2.6,1.1,3.3c-3.9,6.2-5.6,14-12.8,17.9c-3.8,2.1-7.1,4.9-9.9,6.9c0.6-4.6,2.1-9.6,1.7-14.4c-0.4-5-3.8-8.8-9-12.5c8.3,14.6,5.5,24.4-8.6,34.2c-9.2,6.4-19.6,10.1-30.4,12c-9.6,1.7-19.5,2.4-29.2,2.4c-4.7,0-9.7-1.9-14.1-4.1c-4.5-2.2-4.7-7.2-1.4-11c5.2-6,20.5-8.7,27.5-4.9c3.8,2,3.9,4.1,0.4,6.6c-5.7,4-14,3.8-19.4-0.6c-2.6,2.7-0.9,4.9,1.4,5.7c4.3,1.4,9,2.5,13.5,2.6c9.6,0.1,18.8-2.2,26.9-7.5c4.7-3.1,9.2-6.6,8.7-13c-0.4-6.2-5.3-9-10.2-11.3c-9.7-4.6-20.3-5.7-30.7-5.4c-16.6,0.4-32.7,3.8-47.5,11.8c-3.9,2.1-7.6,4.6-12.3,7.5c1.5,0.2,2,0.4,2.3,0.2c17.7-11.7,37.4-16,58-15.9c7.7,0,15.3,2.3,22.9,3.8c2,0.4,4,1.6,5.8,2.8c6.8,4.3,7.3,8.2,1.7,15c-0.3-6.4-4.7-10.3-8.9-13.1c-4.5-3-10.2-4.8-15.6-5.7c-9.2-1.6-18.3,0.6-26.5,5c-7.1,3.8-14.5,7.5-20.6,12.6c-12.1,10.2-14.9,23.5-9.2,38.3c6,15.6,17.4,26.6,30.9,35.6c24.9,16.5,52.5,26.2,81.5,32.1c9.4,1.9,18.9,3.2,28.2,5.9c-10.7-1.3-21.3-2.6-32-3.9c-0.5-0.1-1-0.2-1.5-0.3c-6.1-1.8-11-1.2-16.6,3.3c-9.9,7.9-22.4,10-34.7,10.9c-15.5,1.2-30.5-1.3-44.7-7.9c-6.1-2.8-11.2-6.9-15.1-12.6c-4.1-6-9.1-11.4-14.2-17.7c24.3,11.2,49.4,13.6,75.2,10.3c-4.6-2.6-8.7-5.7-14.6-5.6c-22.6,0.6-44.8-1.7-65.6-11.5c-3.8-1.8-7.4-4.4-10.7-7.2C-229.7,272.8-236,266.9-242.5,261.2z"></path><path fill="${primaryColor}" d="M-178.8,249.3c47.8,1.9,94.2,3.6,136.2-22.2c-6.9,10.2-16.8,17.1-27.8,22.9c-15.6,8.3-32.4,12.6-49.7,15c-13.3,1.9-26.7,2.5-40.2,3.3c-2.5,0.1-5.9-1.4-7.6-3.3C-171.8,260.1-175.1,254.6-178.8,249.3z"></path><path fill="${primaryColor}" d="M-205.6,429c25.3-31.7,30.4-44.3,30.2-75.7c7.2,5.9,14.9,9.8,23.7,9.8c8.3,0,16.6-1.3,24.2-2C-136.5,378.2-186.3,421.8-205.6,429z"></path><path fill="${primaryColor}" d="M-34.8,210.1c-2.7,7-8.2,11.7-14.4,15.7c-15.1,9.8-32.1,14.2-49.5,17.7c-21.5,4.4-43.3,4.4-65.1,4.1c-4.6-0.1-9.3-0.6-13.9-1.1c-0.8-0.1-2-0.7-2.3-1.5c-3.8-8.3-3.8-24,7.5-32c0.6,1.6,1.6,3,1.5,4.4c-0.1,7.8,4.2,12.8,10.7,15.3c7.5,2.9,15.4,5.8,23.4,6.5c26.1,2.1,51-2.9,74.4-14.9C-53.2,219.7-44,214.9-34.8,210.1z"></path><path fill="${primaryColor}" d="M-59.8,248.9c-4.5,16.2-14.3,26.8-28.4,33.1c-11,4.9-22.7,8.2-34.1,12.1c-0.9,0.3-2.2,0.5-2.9,0.1c-9.7-5.3-19.3-10.6-28.7-16.9C-120.6,274-88.5,268.3-59.8,248.9z"></path><path fill="${primaryColor}" d="M-103,327.9c-12.8,29.7-37.6,34.5-63.2,26.4c-6.6-2.1-10.9-6.2-12.1-13.7c-0.9-5.5-3.3-10.7-5.2-16.3C-157.5,339.8-130.8,340.8-103,327.9z"></path><path fill="${primaryColor}" d="M-279.6,210.8c-13.9-9-13.3-25.3,1.8-36.1c11.3-8.1,24.1-12.9,37.4-16c11.3-8.1,24.1-12.9,37.4-16c12.5-2.9,25.1-4.9,37.7-7.3c0.8-0.1,1.6,0.1,2.5,0.7c-7.4,1.8-14.9,3.5-22.2,5.5c-16.2,4.4-31.7,10.2-45.2,20.4c-6.8,5.1-12.7,11.1-13.3,20.2C-281.2,202.3-280.1,206.6-279.6,210.8z"></path><path fill="${primaryColor}" d="M-76.2,282.6c-4,7.4-7.9,14.8-12.1,22c-0.6,1-2.9,1.7-4,1.4c-6.5-1.8-12.8-4-18.8-5.9C-99.7,294.3-88.3,288.6-76.2,282.6z"></path></g></svg>`;
}

export async function loadData(lang) {
    try {
        const filename = `./data/cursos_${lang}.json`;
        debug.log('data', debug.DEBUG_LEVELS.BASIC, `Cargando datos de cursos: ${filename}`);
        
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
            logoLink.setAttribute('aria-label', appInstance.getString('ariaSelfUrl'));
            
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
            debug.log('data', debug.DEBUG_LEVELS.DEEP, 'Estableciendo texto aria-label del botón a11y.');
            
            btnA11y.innerHTML = ''; // Vaciar emoji antiguo
            // Aseguramos que tenga label accesible ya que es visualmente un icono
            if (!btnA11y.getAttribute('aria-label')) {
                btnA11y.setAttribute('aria-label', 'Configuración de Accesibilidad');
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
                ${appInstance.getString('footerCopyright')}
            </span>
            
            <a href="${URL.LICENSE}" target="_top" 
                aria-label="${appInstance.getString('ariaLicense')}" class="footer-license-link">
                <img src="${URL.LICENSE_IMG_SRC}" width=88 height=31 alt="Creative Commons License"/>
            </a>
            <span class="footer-separator-author">|</span>
            <span class="footer-author-text">
                ${appInstance.getString('footerAuthor')}
            </span> 
            <span class="footer-separator">|</span>
            
            <div class="footer-social-container">
                <a href="${URL.LINKEDIN}" target="_blank" 
                    aria-label="${appInstance.getString('ariaLinkedIn')}" class="footer-social-link link-linkedin">
                </a>

                <a href="${URL.DEV_DIARY}" target="_blank" 
                    aria-label="${appInstance.getString('ariaGitHub')}" class="footer-social-link link-github">
                </a>

                <a href="${URL.LANDING_PAGE}" target="_blank" 
                    aria-label="${appInstance.getString('ariaLanding')}" class="footer-social-link link-fire">
                </a>
            </div>

            <span class="footer-separator">|</span> 
            <span class="footer-version">v${appInstance.getString('version')}</span>
        `;
    }
}
/* --- code/data.js --- */