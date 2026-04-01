/* --- code/app-utils.js --- */

import * as debug from './debug/debug.js';
import * as data from './data.js';
import * as main_menu from './main-menu.js';

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
            // 2. HEADER LOGO: Comprobamos si ya existe para no duplicarlo al cambiar de idioma
            let logoLink = h1.querySelector('a');
            
            if (!logoLink) {
                debug.log('app_utils', debug.DEBUG_LEVELS.DEEP, 
                    'Insertando enlace en Header');

                logoLink = document.createElement('a');
                logoLink.href = data.MEDIA.URL.WEBPAGE;
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
                    debug.log('app_utils', debug.DEBUG_LEVELS.DEEP, 
                        'Insertando Icono de Obras');

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

/* --- code/app-utils.js --- */