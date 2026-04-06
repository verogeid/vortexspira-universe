/* --- code/services/app-utils.js --- */

import * as debug from '../debug/debug.js';
import * as data from './data.js';

// Variable global para almacenar el módulo una vez descargado
let _mainMenuModule = null;
let _isMenuLoading = false;

// Memoria caché para detalles
let _detailsCssPromise = null;
let _detailsJsPromise = null;

// Memoria caché dividida para el Menú
let _menuCssPromise = null;
let _menuJsPromise = null;

// 🟢 LAZY LOAD DEL MENÚ: Precarga modularizada (Lighthouse Friendly)
export function preloadMainMenu(appInstance, type = 'all') {
    
    if (type === 'all' || type === 'css') {
        if (!_menuCssPromise) {
            _menuCssPromise = (async () => {
                appInstance._injectCSS('styles/components/style-menu.css', 
                                       'vortex-css-menu');
                appInstance._injectCSS('styles/media/style-media-menu.css', 
                                       'vortex-css-media-menu');
                debug.log('app_utils', debug.DEBUG_LEVELS.DEEP, '🎨 CSS del Menú precargado');
            })();
        }
    }

    if (type === 'all' || type === 'js') {
        if (!_menuJsPromise) {
            _menuJsPromise = (async () => {
                try {
                    const menuModule = await import('../components/main-menu.js');

                    debug.log('app_utils', debug.DEBUG_LEVELS.BASIC, 
                        '📦 JS del Menú Principal cargado en memoria');

                    return menuModule;

                } catch (e) {
                    debug.logError('app_utils', 'Fallo cargando JS del menú', e);
                    _menuJsPromise = null; 
                    return null;
                }
            })();
        }
    }

    return type === 'css' ? _menuCssPromise : _menuJsPromise;
}

export async function loadMainMenu(appInstance) {
    // Cuando el usuario hace clic en el botón de hamburguesa
    return await preloadMainMenu(appInstance, 'all');
}

// 🟢 LAZY LOAD: Apertura real al hacer clic
export async function openMainMenu(appInstance, enableI18n, btnElement) {
    if (_isMenuLoading) return;
    
    try {
        if (!_mainMenuModule) {
            _isMenuLoading = true;
            appInstance.blockUI(); // Muro de cristal si la red es lenta
            appInstance._injectCSS('styles/components/style-menu.css', 'vortex-css-menu');
            _mainMenuModule = await import('../components/main-menu.js');
            appInstance.unblockUI();
            _isMenuLoading = false;
        }
        
        // 1. Inyectamos el DOM del desplegable (si ya está inyectado, la función lo ignora)
        _mainMenuModule.initMainMenu(
            appInstance, 
            document.getElementById('header-content-wrapper'), 
            enableI18n);

        // 2. Alternamos el estado
        _mainMenuModule.toggleMenu();
        
    } catch (e) {
        debug.logError('app_utils', 'Fallo abriendo menú dinámico', e);

        appInstance.unblockUI();
        _isMenuLoading = false;
    }
}

export async function loadData(lang) {
    try {
        const filename = `./data/courses/cursos_${lang}.json`;

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
            // 1. Recuperamos o creamos el Logo
            let logoLink = h1.querySelector('a');

            if (!logoLink) {
                logoLink = document.createElement('a');
                logoLink.href = data.MEDIA.URL.WEBPAGE;
                logoLink.target = "_self";
                const logoDiv = document.createElement('span');
                logoDiv.className = 'header-logo'; 
                logoLink.appendChild(logoDiv);
            }
            
            const content = appInstance.getString('header.title');
            const subtitle = appInstance.getString('header.subtitle');
            
            h1.innerHTML = ''; // Limpiamos para asegurar el orden Logo -> Texto
            h1.appendChild(logoLink);
            
            // Inyectamos el bloque de título y subtítulo (Lógica movida de i18n)
            const titleHtml = `<span class="title-text-clamp">
                                   ${content}
                                   <small id="main-header-subtitle">
                                       ${subtitle}
                                   </small>
                               </span>`;
            h1.insertAdjacentHTML('beforeend', titleHtml);
            
            const txtLogoObras = appInstance.getString('header.aria.obras');

            const txtLogoLink = appInstance.getString('header.aria.logoLink');
            logoLink.setAttribute('aria-label', txtLogoObras + '. ' + txtLogoLink);
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
            btnMainMenu.setAttribute('aria-label', appInstance.getString('header.aria.menuBtn'));
            btnMainMenu.setAttribute('title', appInstance.getString('header.aria.menuBtn'));
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

// 🟢 LAZY LOAD: Precarga modularizada (Lighthouse Friendly)
export function preloadDetailsModules(appInstance, type = 'all') {
    
    if (type === 'all' || type === 'css') {
        if (!_detailsCssPromise) {
            _detailsCssPromise = (async () => {
                appInstance._injectCSS('styles/components/style-details.css', 
                                       'vortex-css-details');
                appInstance._injectCSS('styles/media/style-media-details.css', 
                                       'vortex-css-media-details');
                debug.log('app_utils', debug.DEBUG_LEVELS.DEEP, '🎨 CSS de Detalles precargado');
            })();
        }
    }

    if (type === 'all' || type === 'js') {
        if (!_detailsJsPromise) {
            _detailsJsPromise = (async () => {
                try {
                    const [render, keyboard] = await Promise.all([
                        import('../render/render-details.js'),
                        import('../features/navigation/nav-keyboard-details.js')
                    ]);

                    debug.log('app_utils', debug.DEBUG_LEVELS.BASIC, 
                        '📦 JS de Detalles cargado en memoria');

                    return { render, keyboard };

                } catch (e) {
                    debug.logError('app_utils', 'Fallo cargando JS de detalles', e);
                    _detailsJsPromise = null; 
                    return null;
                }
            })();
        }
    }

    // El Orquestador necesita el objeto con los módulos JS al hacer clic
    return type === 'css' ? _detailsCssPromise : _detailsJsPromise;
}

export async function loadDetailsModules(appInstance) {
    // Cuando el usuario hace clic, pedimos 'all' para asegurar que ambos existan
    return await preloadDetailsModules(appInstance, 'all');
}

// ============================================================================
// 👻 GENERADOR DE NODOS FANTASMA (ABOUT)
// ============================================================================
export function buildAboutNode(appInstance) {
    const broadDesc = appInstance.getString('seo.org.description') + 
                      '. ' + 
                      appInstance.getString('seo.org.accessibilitySummary');
                    
    return {
        id: 'c-about',
        titulo: appInstance.getString('about.title'),
        descripcion: broadDesc.replace(/\. /g, '. <HR>'),
        enlaces: [
            { 
                "texto": "LinkedIn", 
                "url": "https://www.linkedin.com/company/vortexspira", 
                "type": "l" 
            },
            { 
                "texto": appInstance.getString('about.landing'), 
                "url": "https://subscribepage.io/vortexspira", 
                "type": "f" 
            }
        ]
    };
}

/* --- code/services/app-utils.js --- */