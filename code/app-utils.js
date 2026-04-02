/* --- code/app-utils.js --- */

import * as debug from './debug/debug.js';
import * as data from './data.js';

// Variable global para almacenar el módulo una vez descargado
let _mainMenuModule = null;
let _isMenuLoading = false;

// 🟢 LAZY LOAD: Precarga en segundo plano
export async function preloadMainMenu(appInstance) {
    if (_mainMenuModule) return;
    try {
        appInstance._injectCSS('styles/style-menu.css', 'vortex-css-menu');
        _mainMenuModule = await import('./main-menu.js');

        debug.log('app_utils', debug.DEBUG_LEVELS.BASIC, 
            '📦 Menú precargado en background');

    } catch (e) {
        debug.logError('app_utils', 'Fallo precargando menú', e);
    }
}

// 🟢 LAZY LOAD: Apertura real al hacer clic
export async function openMainMenu(appInstance, enableI18n, btnElement) {
    if (_isMenuLoading) return;
    
    try {
        if (!_mainMenuModule) {
            _isMenuLoading = true;
            appInstance.blockUI(); // Muro de cristal si la red es lenta
            appInstance._injectCSS('styles/style-menu.css', 'vortex-css-menu');
            _mainMenuModule = await import('./main-menu.js');
            appInstance.unblockUI();
            _isMenuLoading = false;
        }
        
        // 1. Inyectamos el DOM del desplegable usando tu función original
        _mainMenuModule.initMainMenu(appInstance, document.getElementById('header-content-wrapper'), enableI18n);
        
        // 2. Forzamos la apertura llamando a tu toggleMenu
        _mainMenuModule.toggleMenu(false);
        
    } catch (e) {
        debug.logError('app_utils', 'Fallo abriendo menú dinámico', e);
        appInstance.unblockUI();
        _isMenuLoading = false;
    }
}

export async function loadData(lang) {
    try {
        const filename = `./data/cursos_${lang}.json`;

        debug.log('app_utils', debug.DEBUG_LEVELS.BASIC, 
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
            debug.log('app_utils', debug.DEBUG_LEVELS.BASIC, 
                '🧪 MODO DEV ACTIVO');

            dataSelected = fullJson.dev || [];
        } else {
            dataSelected = fullJson.prod || [];
        }

        return { navegacion: dataSelected };

    } catch (e) {
        debug.logError('app_utils', "Error crítico cargando cursos.", e);

        throw e;
    }
}

export function injectHeaderContent(appInstance, enableI18n = false) {
    const header = document.getElementById('app-header');
    const wrapper = document.getElementById('header-content-wrapper');

    if (header && wrapper) {
        const h1 = header.querySelector('h1');

        if (h1) {
            let logoLink = h1.querySelector('a');
            
            if (!logoLink) {
                logoLink = document.createElement('a');
                logoLink.href = data.MEDIA.URL.WEBPAGE;
                logoLink.target = "_self";
                
                const logoDiv = document.createElement('span');
                logoDiv.className = 'header-logo'; 
                logoLink.appendChild(logoDiv);
                
                h1.insertBefore(logoLink, h1.firstChild);
            }
            
            const txtLogoLink = appInstance.getString('header.aria.logoLink');
            logoLink.setAttribute('aria-label', txtLogoLink);
            logoLink.setAttribute('title', txtLogoLink);

            if (!debug.IS_PRODUCTION) {
                let obrasSpan = wrapper.querySelector('.icon-obras-header');
                if (!obrasSpan) {
                    obrasSpan = document.createElement('span');
                    obrasSpan.className = 'icon-obras-header'; 
                    wrapper.insertBefore(obrasSpan, h1);
                }
            }
        }

        // 🟢 INYECCIÓN SÍNCRONA DEL BOTÓN ORIGINAL
        // Extraído directamente de tu main-menu.js
        let controls = wrapper.querySelector('.header-controls');
        if (!controls) {
            controls = document.createElement('div');
            controls.className = 'header-controls';
            wrapper.appendChild(controls);
        }

        let btnMainMenu = document.getElementById('btn-main-menu');
        if (!btnMainMenu) {
            btnMainMenu = document.createElement('button');
            btnMainMenu.id = 'btn-main-menu';
            btnMainMenu.setAttribute('aria-expanded', 'false');
            btnMainMenu.setAttribute('aria-controls', 'main-menu-dropdown');
            btnMainMenu.setAttribute('aria-label', appInstance.getString('header.aria.menuBtn') || 'Menú');
            btnMainMenu.setAttribute('title', appInstance.getString('header.aria.menuBtn') || 'Menú');
            btnMainMenu.tabIndex = 0;
            
            const iconHamburger = document.createElement('span');
            iconHamburger.className = 'icon-hamburger';
            iconHamburger.setAttribute('aria-hidden', 'true');
            btnMainMenu.appendChild(iconHamburger);
            controls.appendChild(btnMainMenu);

            // Al hacer clic, iniciamos la carga perezosa
            btnMainMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                openMainMenu(appInstance, enableI18n, btnMainMenu);
            });
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
            <span class="footer-separator-author">|</span>
            <span class="footer-author-text">
                ${appInstance.getString('footer.author')}
            </span> 
            <span class="footer-separator">|</span>
            <span class="footer-version">v${appInstance.getString('meta.version')}.build:${appInstance.getString('meta.build')}</span>
        `;
    }
}

// 🟢 MOTOR SEO DINÁMICO E INYECCIÓN DE JSON-LD PARA BOTS/IAs
export function updateSEO(appInstance, curso = null) {
    const currentLang = localStorage.getItem('vortex_lang') || 'es';
    document.documentElement.lang = currentLang;

    let title = appInstance.getString('page.title') || 'VortexSpira EdTech';
    let desc = appInstance.getString('seo.description') || '';

    if (curso) {
        title = `${curso.titulo} | VortexSpira EdTech`;
        debug.log('app_utils', debug.DEBUG_LEVELS.BASIC, 
            `Actualizando SEO para curso: ${curso}`);
            
        desc = curso.descripcion.replace(/<[^>]*>?/gm, ' ')
                                .replace(/\s+/g, ' ').trim().substring(0, 155) + '...';
    }

    document.title = title;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = desc;

    let schemaScript = document.getElementById('vortex-json-ld');
    if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.id = 'vortex-json-ld';
        schemaScript.type = 'application/ld+json';
        document.head.appendChild(schemaScript);
    }

    // 1. ESQUEMA BASE: Organización (Textos puros desde i18n)
    const orgSchema = {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        "@id": "https://www.vortexspira.com/#organization",
        "name": "VortexSpira EdTech",
        "alternateName": "VortexSpira",
        "url": "https://www.vortexspira.com",
        "logo": "https://www.vortexspira.com/logo.png",
        "description": appInstance.getString('seo.org.description'),
        "sameAs": [
            "https://www.linkedin.com/company/vortexspira"
        ],
        "accessibilityAPI": "ARIA",
        "accessibilityControl": ["fullKeyboardControl", "fullMouseControl", "fullTouchControl"],
        "accessibilityFeature": ["highContrastDisplay", "largePrint", "structuralNavigation", "displayTransformability", "readingGuidance", "ttsMarkup", "synchronizedAudioText"],
        "accessibilityHazard": ["noFlashingHazard", "noMotionSimulationHazard"],
        "accessibilitySummary": appInstance.getString('seo.org.accessibilitySummary')
    };

    let jsonLdArray = [orgSchema];

    if (curso) {
        // 2. ESTADO CURSO
        const courseSchema = {
            "@context": "https://schema.org",
            "@type": "Course",
            "@id": `https://www.vortexspira.com/?id=${curso.id}#course`,
            "name": curso.titulo,
            "description": curso.descripcion.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim(),
            "provider": { "@id": "https://www.vortexspira.com/#organization" },
            "inLanguage": currentLang === 'en' ? "en-US" : "es-ES"
        };
        jsonLdArray.push(courseSchema);

    } else {
        // 3. ESTADO CATÁLOGO
        const websiteSchema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": "https://www.vortexspira.com/#website",
            "name": "VortexSpira EdTech",
            "url": "https://www.vortexspira.com/",
            "description": desc,
            "publisher": { "@id": "https://www.vortexspira.com/#organization" },
            "inLanguage": currentLang === 'en' ? "en-US" : "es-ES"
        };
        jsonLdArray.push(websiteSchema);

        let itemListElements = [];
        let currentPosition = 1;

        // 🟢 FIX ARQUITECTURA: Adaptado a tu estructura real (subsecciones y cursos)
        const extractCourses = (items) => {
            if (!items) return;
            for (const item of items) {
                // 🟢 FIX SEO: Solo indexamos si tiene título y NO está en obras
                if (item.titulo && item.enObras !== true) {
                    itemListElements.push({
                        "@type": "ListItem",
                        "position": currentPosition++,
                        "item": {
                            "@type": "Course",
                            "name": item.titulo,
                            "description": item.descripcion ? item.descripcion.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : "",
                            "url": `https://www.vortexspira.com/?id=${item.id}`
                        }
                    });
                }
                if (item.subsecciones) extractCourses(item.subsecciones);
                if (item.cursos) extractCourses(item.cursos);
            }
        };

        if (appInstance.STATE.fullData && appInstance.STATE.fullData.navegacion) {
            extractCourses(appInstance.STATE.fullData.navegacion);
        }

        if (itemListElements.length > 0) {
            const catalogSchema = {
                "@context": "https://schema.org",
                "@type": "ItemList",
                "@id": "https://www.vortexspira.com/#catalog",
                "name": appInstance.getString('seo.catalog.name'),
                "description": appInstance.getString('seo.catalog.description'),
                "itemListElement": itemListElements
            };
            jsonLdArray.push(catalogSchema);
        }
    }

    schemaScript.textContent = JSON.stringify(jsonLdArray, null, 2);
}

let _detailsModulesPromise = null;

// 🟢 LAZY LOAD: Apertura directa (Bloquea UI si la red es lenta)
export function loadDetailsModules(appInstance) {
    if (!_detailsModulesPromise) {
        _detailsModulesPromise = (async () => {
            // Muro de cristal para evitar dobles clics
            appInstance.blockUI(); 
            
            // Inyectamos el CSS pesado de Detalles
            appInstance._injectCSS('styles/style-details.css', 'vortex-css-details');
            appInstance._injectCSS('styles/style-media-details.css', 'vortex-css-media-details');
            
            try {
                // Descargamos los módulos JavaScript dinámicamente
                const [render, keyboard] = await Promise.all([
                    import('./render-details.js'),
                    import('./nav-keyboard-details.js')
                ]);
                
                appInstance.unblockUI();
                debug.log('app_utils', debug.DEBUG_LEVELS.BASIC, 
                    '📦 Módulos de Detalles cargados y listos');
                
                return { render, keyboard };
            } catch (e) {
                appInstance.unblockUI();
                debug.logError('app_utils', 'Fallo descargando detalles', e);
                _detailsModulesPromise = null; // Permitimos reintentar si falló la red
                return null;
            }
        })();
    }
    return _detailsModulesPromise;
}

// 🟢 LAZY LOAD: Precarga silenciosa (Fondo)
export function preloadDetailsModules(appInstance) {
    if (!_detailsModulesPromise) {
        _detailsModulesPromise = (async () => {
            appInstance._injectCSS('styles/style-details.css', 'vortex-css-details');
            appInstance._injectCSS('styles/style-media-details.css', 'vortex-css-media-details');
            try {
                const [render, keyboard] = await Promise.all([
                    import('./render-details.js'),
                    import('./nav-keyboard-details.js')
                ]);
                debug.log('app_utils', debug.DEBUG_LEVELS.BASIC, 
                    '📦 Detalles precargados en background');

                return { render, keyboard };
            } catch (e) {
                debug.logError('app_utils', 'Fallo precargando detalles en idle', e);
                _detailsModulesPromise = null; 
                return null;
            }
        })();
    }
    return _detailsModulesPromise;
}

/* --- code/app-utils.js --- */