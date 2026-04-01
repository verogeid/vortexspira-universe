/* --- code/debug.diagnostics.js --- */

import * as debug from './debug.js';

export function _setupFocusTracker() {
    if (debug.DEBUG_CONFIG.global_focus < debug.DEBUG_LEVELS.DEEP) 
        return;

    document.addEventListener('focusin', () => {
        debug.log('global_focus', debug.DEBUG_LEVELS.DEEP, 'Foco movido a:', {
            tag: document.activeElement.tagName,
            id: document.activeElement.id,
            class: document.activeElement.className,
            focusable: document.activeElement.tabIndex
        });
    });
}

export function _setupFocusMethodInterceptor() {
    if (debug.DEBUG_CONFIG.global_focus < debug.DEBUG_LEVELS.DEEP) 
        return;

    const originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function(...args) {
        debug.log('global_focus', debug.DEBUG_LEVELS.DEEP, 
                    `Solicitado .focus() sobre:`, this);

        debug.logTrace('global_focus', 'Origen de la solicitud de foco:');

        return originalFocus.apply(this, args);
    };
}

export function _setupGlobalClickListener() {
    if (debug.DEBUG_CONFIG.global_mouse < debug.DEBUG_LEVELS.DEEP) 
        return;

    document.addEventListener('click', function(e) {
        if (typeof log === 'function') {
            const targetElement = e.target;
            const closestCard = targetElement.closest('.card');

            debug.logGroupCollapsed('global_mouse', debug.DEBUG_LEVELS.DEEP, 
                                    '❌ CLIC GLOBAL CAPTURADO ❌');

            debug.log('global_mouse', debug.DEBUG_LEVELS.DEEP, 
                        'Origen (e.target):', 
                        targetElement.tagName, 
                        targetElement.id, 
                        targetElement.className);

            if (closestCard) {
                debug.log('global_mouse', debug.DEBUG_LEVELS.DEEP, 
                            'Elemento Clicado es una Tarjeta.', 
                            'Card ID:', closestCard.dataset.id);
            }
            debug.logGroupEnd('global_mouse', debug.DEBUG_LEVELS.DEEP);
        }
    }, true);
}

export function _setupKeyTracker() {
    if (debug.DEBUG_CONFIG.global_key < debug.DEBUG_LEVELS.DEEP) 
        return;

    document.addEventListener('keydown', (e) => {
        debug.log('global_key', debug.DEBUG_LEVELS.DEEP, `⌨️ TECLA PULSADA: [${e.key}]`, {
            focusEn: document.activeElement.tagName,
            id: document.activeElement.id,
            class: document.activeElement.className,
            tabIndex: document.activeElement.tabIndex
        });
    }, true);
}

/**
 * DIAGNÓSTICO: Analiza los tamaños de fuente y dimensiones reales.
 * Detecta vista detalle vs menú mediante clases activas.
 */
export function runFontDiagnostics() {
    if (debug.DEBUG_CONFIG.global_font < debug.DEBUG_LEVELS.BASIC) return;

    debug.logGroupCollapsed('global_font', debug.DEBUG_LEVELS.BASIC, 
        "%c📊 DIAGNÓSTICO DE TAMAÑOS REALES", 
        "background: #222; color: #bada55; font-size: 16px; padding: 4px; border-radius: 4px;");

    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const scale = parseFloat(rootStyle.getPropertyValue('--font-scale')) || 1;
    
    const viewportWidth = window.visualViewport ? 
                window.visualViewport.width : 
                window.innerWidth;
    const viewportHeight = window.visualViewport ? 
                window.visualViewport.height : 
                window.innerHeight;

    // 1. Datos del Entorno
    debug.logGroupCollapsed('global_font', debug.DEBUG_LEVELS.BASIC, "🌍 Entorno");

    debug.log('global_font', debug.DEBUG_LEVELS.BASIC, 
                `Viewport: %c${viewportWidth}px x ${viewportHeight}px`, 
                "color: cyan; font-weight: bold;");

    debug.log('global_font', debug.DEBUG_LEVELS.BASIC, 
                `Layout Mode (body): %c${document.body.getAttribute('data-layout')}`, 
                "color: magenta; font-weight: bold;");

    debug.log('global_font', debug.DEBUG_LEVELS.BASIC, 
                `Safe Mode (body): %c${document.body.getAttribute('data-safe-mode')}`, 
                "color: orange; font-weight: bold;");

    debug.log('global_font', debug.DEBUG_LEVELS.BASIC, 
                `Escala Usuario (A11y): %c${scale}x (${scale * 100}%)`, 
                "color: yellow; font-weight: bold;");

    debug.log('global_font', debug.DEBUG_LEVELS.BASIC, 
                `Tamaño base '1rem': %c${parseFloat(rootStyle.fontSize)}px`, 
                "color: white; background: red; font-weight: bold; padding: 2px;");

    debug.logGroupEnd('global_font', debug.DEBUG_LEVELS.BASIC);

    // Función auxiliar: Busca el PRIMER elemento VISIBLE que coincida
    function medir(selector, nombre) {
        const elements = document.querySelectorAll(selector);
        let el = null;
        
        // Buscamos el primero que sea visible (tenga offsetParent)
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].offsetParent !== null) {
                el = elements[i];
                break;
            }
        }

        if (!el) {
            // logWarn('global_font', `❌ ${nombre}: No encontrado visible.`);
            return false;
        }

        const st = getComputedStyle(el);
        const fontSize = parseFloat(st.fontSize);
        const width = el.offsetWidth;
        const height = el.offsetHeight;

        debug.logGroupCollapsed('global_font', debug.DEBUG_LEVELS.BASIC, `📏 ${nombre}`);

        debug.log('global_font', debug.DEBUG_LEVELS.BASIC, 
                    `Selector: ${selector}`);

        debug.log('global_font', debug.DEBUG_LEVELS.BASIC, 
                    `Font-Size: %c${fontSize.toFixed(1)}px`, 
                    "color: #ff5555; font-weight: bold; font-size: 1.1em");

        debug.log('global_font', debug.DEBUG_LEVELS.BASIC, 
                    `Dimensiones: ${width}px (ancho) x ${height}px (alto)`);

        debug.log('global_font', debug.DEBUG_LEVELS.BASIC, 
                    `Line-Height: ${st.lineHeight}`);

        debug.logGroupEnd('global_font', debug.DEBUG_LEVELS.BASIC);

        return true;
    }

    // 2. Elementos Comunes
    debug.log('global_font', debug.DEBUG_LEVELS.BASIC, 
                "%c⬇️ ELEMENTOS VISIBLES ⬇️", 
                "color: #ccc; margin-top: 10px;");

    medir("header h1", "Título Header");
    
    // 3. DETECCIÓN DE CONTEXTO
    // Verificamos si los contenedores de detalle tienen la clase .active
    const mobileDetail = document.getElementById('vista-detalle-mobile');
    const desktopDetail = document.getElementById('vista-detalle-desktop');
    
    const isDetailActive = (mobileDetail && mobileDetail.classList.contains('active')) || 
                           (desktopDetail && desktopDetail.classList.contains('active'));

    if (isDetailActive) {
        debug.log('global_font', debug.DEBUG_LEVELS.BASIC, 
                    "%c📄 VISTA DE DETALLE DETECTADA", 
                    "background: #004400; color: #fff; padding: 2px;");
        
        const titleFound = medir(".detail-title-slide", "Título del Detalle");
        const textFound = medir(".detail-text-fragment p", "Párrafo del Detalle");
        const btnFound = medir(".detail-action-btn", "Botón de Acción");
        
        if (!titleFound && !textFound) {
            debug.logWarn('global_font', "Vista detalle activa, pero no encuentro contenido visible (¿Scroll/Swiper?)");
        }

    } else {
        debug.log('global_font', debug.DEBUG_LEVELS.BASIC, 
                    "%c🃏 VISTA DE MENÚ (CARDS) DETECTADA", 
                    "background: #440044; color: #fff; padding: 2px;");
        
        // Excluimos las tarjetas de relleno para no medir fantasmas
        const cardFound = medir(".card:not([data-tipo='relleno'])", "Tarjeta de Contenido");
        
        if (cardFound) {
            medir(".card h3", "Título Tarjeta");
            medir(".card p", "Descripción Tarjeta");
        } else {
            debug.logWarn('global_font', "No encuentro tarjetas de contenido visibles.");
        }
    }

    // 4. FOOTER
    debug.logGroupCollapsed('global_font', debug.DEBUG_LEVELS.BASIC, 
                            "%c⬇️ FOOTER ⬇️", 
                            "color: #ccc; margin-top: 10px;");

    medir("footer", "Footer Container");
    medir(".footer-copyright", "Texto Copyright");
    medir(".footer-social-link", "Icono Social");

    debug.logGroupEnd('global_font', debug.DEBUG_LEVELS.BASIC);
}

/**
 * DIAGNÓSTICO FORENSE (CSI): Detecta qué elemento está tapando la pantalla
 * y verifica el estado crítico de layout (Footer, Safe Mode, Overflow).
 */
export function runLayoutDiagnostics() {
    if (debug.DEBUG_CONFIG.global_layout < debug.DEBUG_LEVELS.BASIC) return;
    
    debug.logGroupCollapsed('global_layout', debug.DEBUG_LEVELS.BASIC, 
                            "%c🕵️‍♂️ CSI: INSPECCIÓN DE OBSTRUCCIÓN", 
                            "background: #000; color: #0f0; font-size: 16px; padding: 5px;");

    // 1. ¿QUÉ HAY EN EL PUNTO DE CORTE?
    const x = (window.visualViewport ? 
                window.visualViewport.width : 
                window.innerWidth) / 2;

    const y = (window.visualViewport ? 
                window.visualViewport.height : 
                window.innerHeight) - 50;

    const elementoCulpable = document.elementFromPoint(x, y);

    debug.logGroupCollapsed('global_layout', debug.DEBUG_LEVELS.BASIC, 
                            "📍 Punto de Inspección (Fondo Pantalla)");

    debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                `Coordenadas: ${x}px, ${y}px`);

    if (elementoCulpable) {
        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    "Elemento detectado:", elementoCulpable);

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    "ID:", elementoCulpable.id);

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    "Clases:", elementoCulpable.className);

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    "Tag:", elementoCulpable.tagName);

        const st = getComputedStyle(elementoCulpable);
        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    "Color de Fondo:", st.backgroundColor);

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    "Z-Index:", st.zIndex);

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    "Position:", st.position);
    } else {
        debug.logWarn('global_layout', "⚠️ Nada detectado (¿Canvas vacío?)");
    }
    debug.logGroupEnd('global_layout', debug.DEBUG_LEVELS.BASIC);

    /* ⭐️ DIAGNÓSTICO DE HEADER ⭐️ */
    const header = document.getElementById('app-header');
    if (header) {
        const rect = header.getBoundingClientRect();
        const st = getComputedStyle(header);
        const varHeight = document.documentElement.style.getPropertyValue('--header-height-real');
        
        debug.logGroupCollapsed('global_layout', debug.DEBUG_LEVELS.BASIC, 
                                "🎩 Estado del Header");
        
        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `OffsetHeight (Entero): ${header.offsetHeight}px`);

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `BoundingRect (Exacto): %c${rect.height.toFixed(2)}px`, 
                    "color: cyan; font-weight: bold;");

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `Bottom Position: ${rect.bottom.toFixed(2)}px (Límite visual)`);

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `Var CSS (--header-height-real): ${varHeight || 
                    'No definida'}`);
        
        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `Position: ${st.position}`);
                    
        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `Z-Index: ${st.zIndex}`);
        
        if (st.position === 'fixed' || st.position === 'sticky') {
            debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                        "⚠️ Header está FIJO/STICKY. ¿Está tapando contenido?");
        }
        
        debug.logGroupEnd('global_layout', debug.DEBUG_LEVELS.BASIC);
    } else {
        debug.logError('global_layout', "❌ Header no encontrado (#app-header)");
    }

    // 2. ESTADO DEL FOOTER
    const footer = document.querySelector('footer');
    if (footer) {
        const st = getComputedStyle(footer);

        debug.logGroupCollapsed('global_layout', debug.DEBUG_LEVELS.BASIC, 
                                "🦶 Estado del Footer");
        
        // Check de posición peligroso
        const posMsg = `Position: ${st.position}`;
        const posColor = st.position === 'fixed' ? "color: red; font-weight: bold" : "color: green";

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `%c${posMsg}`, posColor);
        
        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `Display: ${st.display}`);

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `Z-Index: ${st.zIndex}`);

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `Height: ${st.height}`);

        debug.logGroupEnd('global_layout', debug.DEBUG_LEVELS.BASIC);
    }

    // 3. ESTADO DEL CONTENEDOR DE DETALLE
    // Detectamos cuál está activo
    const detalleMobile = document.getElementById('vista-detalle-mobile');
    const detalleDesktop = document.getElementById('vista-detalle-desktop');
    const detalleActivo = (detalleMobile && getComputedStyle(detalleMobile).display !== 'none') ? detalleMobile : detalleDesktop;

    if (detalleActivo) {
        const st = getComputedStyle(detalleActivo);

        debug.logGroupCollapsed('global_layout', debug.DEBUG_LEVELS.BASIC, 
                                `📄 Contenedor Detalle (${detalleActivo.id})`);
        
        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `Height: ${st.height}`);
        
        const overflowMsg = `Overflow-Y: ${st.overflowY}`;
        const overflowColor = st.overflowY === 'hidden' ? "color: red; font-weight: bold" : "color: green";

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `%c${overflowMsg}`, overflowColor);
        
        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `Padding-Bottom: ${st.paddingBottom}`);
                    
        debug.logGroupEnd('global_layout', debug.DEBUG_LEVELS.BASIC);
    } else {
        debug.logWarn('global_layout', "No se encontró contenedor de detalle activo.");
    }
    
    // 4. VERIFICACIÓN DE info-adicional
    const info = document.getElementById('info-adicional');
    if (info) {
        const style = window.getComputedStyle(info);
        const isVisible = style.display !== 'none';
        const layout = document.body.getAttribute('data-layout');

        debug.logGroupCollapsed('global_layout', debug.DEBUG_LEVELS.BASIC, 
                                `ℹ️ Panel Info Adicional:`);

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `Display Computado: ${style.display}`);

        debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                    `Visibilidad Real: ${isVisible ? '✅ VISIBLE' : '❌ OCULTO'}`);
        
        if (!isVisible) {
            if (debug.DEBUG_CONFIG.global_layout >= debug.DEBUG_LEVELS.BASIC) {
                debug.logWarn('global_layout', 
                                `⚠️ El panel está oculto por reglas CSS de [${layout}].`);

                if (layout === 'tablet-portrait') {
                    debug.logWarn('global_layout', 
                                    `(En Portrait el grid es de 2 columnas y no hay sitio para el panel)`);
                }
            }
        }
        debug.logGroupEnd('global_layout', debug.DEBUG_LEVELS.BASIC);
    } else {
        if (debug.DEBUG_CONFIG.global_layout >= debug.DEBUG_LEVELS.BASIC) {
            debug.logError('global_layout', "❌ No se encuentra el elemento #info-adicional");
        }
    }

    // 4. VERIFICACIÓN DE SAFE MODE
    const safeMode = document.body.getAttribute('data-safe-mode');
    const safeMsg = `🛡️ Safe Mode Activo: ${safeMode}`;
    const safeColor = safeMode === 'true' ? "color: green; font-weight: bold" : "color: red; font-weight: bold";
    
    debug.log('global_layout', debug.DEBUG_LEVELS.BASIC, 
                `%c${safeMsg}`, safeColor);
    
    debug.logGroupEnd('global_layout', debug.DEBUG_LEVELS.BASIC);
}

/**
 * Función para "espiar" cambios en una propiedad de estado crítica.
 * Útil para diagnosticar cambios inesperados en flags  
 * @param {*} stateObj 
 * @param {*} propName 
 */
export function _watchFlag(stateObj, propName) {
    if (debug.DEBUG_CONFIG.global < debug.DEBUG_LEVELS.DEEP) return;

    let value = stateObj[propName];
    Object.defineProperty(stateObj, propName, {
        get: () => value,
        set: (newValue) => {
            if (value !== newValue) {
                debug.logTrace('global', 
                    `Flag [${propName}] cambiado: ${value} -> ${newValue}`);

                value = newValue;
            }
        },
        configurable: true
    });
}

/* --- code/debug.diagnostics.js --- */