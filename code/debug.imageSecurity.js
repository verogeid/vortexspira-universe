/* --- code/debug.imageSecurity.js --- */

import * as debug from './debug.js';

/**
 * Módulo de Auditoría de Seguridad de Imágenes (Versión Clean Evidence).
 * Corrige visualización de tabla y agrupa errores de red.
 * INCLUYE: Detección de TIFF, BMP, WebP, JPEG, PNG, ICO, SVG.
 */

/**
 * En APP.JS, añadir:
 *     import * as debug_imageSecurity from './debug.imageSecurity.js';
 * * Y dentro de la función init():
 *     // Exponer a consola para uso manual
 *     debug_imageSecurity.setupSecurityShorthands();
 *
 *     // Activar escaneo automático basado en configuración
 *     debug_imageSecurity._setupAutoSecurityScan(debug_imageSecurity.runImageSecurityAudit);
 */

// --- ESTADO INTERNO DEL MÓDULO ---
let isAuditing = false;
const scannedCache = new Map();
let auditTimer = null; // Para el control de estabilización

/**
 * Función principal que realiza la auditoría de seguridad en imágenes.
 */
export async function runImageSecurityAudit() {
    if (debug.DEBUG_CONFIG.global_imageSec < debug.DEBUG_LEVELS.BASIC) return;

    // Bloqueo: Si ya se está ejecutando una auditoría, ignoramos la nueva petición
    if (isAuditing) {
        debug.log('global_imageSec', debug.DEBUG_LEVELS.DEEP, 
            "⏳ Auditoría en curso... petición omitida.");

        return;
    }

    // Activamos el flag de procesamiento
    isAuditing = true;

    const startTime = performance.now();

    if (typeof window.ExifReader === 'undefined') {
        debug.log('global_imageSec', debug.DEBUG_LEVELS.DEEP, 
            "Cargando motor EXIF externo...");

        await import('https://cdn.jsdelivr.net/npm/exifreader@4.12.0/dist/exif-reader.js');
    }

    debug.logGroupCollapsed('global_imageSec', debug.DEBUG_LEVELS.BASIC, 
        "%c🛡️ EJECUTANDO AUDITORÍA DE IMÁGENES (Visual Forensics)", 
        "background: #555; color: #fff; font-size: 12px; padding: 2px 5px; border-radius: 3px;");

    // -----------------------------------------------------------------------
    // RECOLECCIÓN
    // -----------------------------------------------------------------------
    const urlsToAudit = new Set(); 

    const domImages = document.querySelectorAll('img, image, link[rel*="icon"]');
    domImages.forEach(el => {
        if (el.tagName === 'IMG' && el.src) 
            urlsToAudit.add(el.src);

        if (el.tagName === 'image' && el.getAttribute('xlink:href')) 
            urlsToAudit.add(el.getAttribute('xlink:href'));

        if (el.tagName === 'LINK' && el.href) 
            urlsToAudit.add(el.href);
    });

    const allElements = document.querySelectorAll('*');
    const extractUrl = (str) => {
        if (!str || str === 'none') return null;
        const match = str.match(/url\(['"]?(.*?)['"]?\)/);
        return match ? match[1] : null;
    };

    allElements.forEach(el => {
        if ([
            'SCRIPT', 
            'STYLE', 
            'HEAD', 
            'META', 
            'TITLE'
        ].includes(el.tagName)) return;

        const checkStyle = (styleObj) => {
            const props = [
                'backgroundImage', 
                'maskImage', 
                'webkitMaskImage', 
                'listStyleImage', 
                'borderImageSource'
            ];

            props.forEach(prop => {
                const url = extractUrl(styleObj[prop]);

                if (url) urlsToAudit.add(url);
            });
        };

        checkStyle(window.getComputedStyle(el));
        checkStyle(window.getComputedStyle(el, '::before'));
        checkStyle(window.getComputedStyle(el, '::after'));
    });

    const images = Array.from(urlsToAudit).filter(src => src && src !== 'none');

    // FILTRO DE RELEVANCIA: ¿Hay alguna URL que no esté en la caché?
    const hasNewImages = images.some(url => !scannedCache.has(url));

    if (!hasNewImages) {
        debug.log('global_imageSec', debug.DEBUG_LEVELS.DEEP, 
            "🚫 No hay nuevas imagenes que analizar.");

        debug.logGroupEnd('global_imageSec', debug.DEBUG_LEVELS.BASIC);

        isAuditing = false;

        return;
    }

    const auditResults = [];

    // -----------------------------------------------------------------------
    // PROCESAMIENTO
    // -----------------------------------------------------------------------
    for (const url of images) {
        // SI YA ESTÁ EN CACHÉ: Recuperamos el resultado previo sin hacer fetch
        if (scannedCache.has(url)) {
            auditResults.push(scannedCache.get(url));
            continue; 
        }

        // SI ES NUEVO: Analizamos
        const isDataURI = url.startsWith('data:');
        let shortName = 'Asset';
        let serverMime = '---';
        let buffer = null;

        try {
            const res = await fetch(url);
            
            if (isDataURI) {
                const mimeMatch = url.match(/^data:(.*?);/);
                serverMime = mimeMatch ? mimeMatch[1] : 'Unknown';
            } else {
                serverMime = res.headers.get('Content-Type') || 'N/A';
            }
            
            buffer = await res.arrayBuffer();

        } catch (e) {
            const errorResult = { 
                name: url.startsWith('data:') ? 'DataURI Error' : (url.split('/').pop().substring(0, 20) || 'Unknown Asset'),
                fullUrl: url, 
                serverMime: 'Blocked', 
                detectedType: 'Error', 
                status: '⚠️ CORS', 
                threats: ['Network Error (CORS)'], 
                metadata: null, 
                _blob: null, 
                _isData: false
            };
            
            auditResults.push(errorResult);

            // GUARDAMOS EL ERROR EN CACHÉ (para no re-intentar fetch fallidos)
            scannedCache.set(url, errorResult);

            continue;
        }

        const bytes = new Uint8Array(buffer);
        const content = new TextDecoder('utf-8').decode(bytes.slice(0, 30000));
        const header = bytes.slice(0, 12).reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), "").toUpperCase();

        // Naming
        if (!isDataURI) {
            shortName = url.split('/').pop().substring(0, 25);
        } else {
            const idMatch = content.match(/id=["']([^"']+)["']/);

            if (idMatch) 
                shortName = `SVG: #${idMatch[1]}`;

            else if (content.includes('<svg')) 
                shortName = `SVG Inline (${bytes.length}b)`; 

            else shortName = `Base64 Asset`;
        }

        const result = { 
            name: shortName,
            fullUrl: url,
            serverMime: serverMime,
            detectedType: 'Unknown', 
            status: '✅ Clean', 
            threats: [], 
            metadata: null,
            _blob: null, // Se rellenará al final
            _isData: isDataURI
        };

        // Identificación Magic Numbers
        if (header.startsWith("424D")) 
            result.detectedType = "image/bmp";

        else if (header.startsWith("52494646") && header.includes("57454250")) 
            result.detectedType = "image/webp";

        else if (header.startsWith("FFD8FF")) 
            result.detectedType = "image/jpeg";

        else if (header.startsWith("89504E47")) 
            result.detectedType = "image/png";

        else if (header.startsWith("49492A00") || header.startsWith("4D4D002A")) 
            result.detectedType = "image/tiff";

        else if (header.startsWith("00000100")) 
            result.detectedType = "image/x-icon";

        else if (content.includes("<svg") || content.includes("<?xml") || result.serverMime.includes('svg'))
            result.detectedType = "image/svg+xml";

        // Security Checks
        if (!isDataURI && result.serverMime && !result.serverMime.includes(result.detectedType.split('/')[1]) && result.detectedType !== 'Unknown') {
            result.threats.push("MIME Mismatch");
            result.status = "❌ VULNERABLE";
        }

        try {
            const tags = window.ExifReader.load(buffer);
            result.metadata = tags; 
            if (/<script|on\w+=/i.test(JSON.stringify(tags))) {
                result.threats.push("XSS en EXIF");
                result.status = "❌ VULNERABLE";
            }
        } catch(e) {
            if (result.detectedType === "image/svg+xml") {
                result.metadata = { 
                    type: "SVG Source", 
                    preview: content.substring(0, 300) + "..." 
                };
            }
        }

        if (/<script|<\?php|on\w+=|javascript:/i.test(content)) {
            if (result.detectedType === "image/svg+xml") {
                result.threats.push("Script en SVG (Revisar)");
                result.status = "⚠️ WARNING";
            } else {
                result.threats.push("Payload en Binario");
                result.status = "❌ VULNERABLE";
            }
        }

        // Creamos el Blob AHORA, usando el tipo detectado (ej: image/x-icon), no el del servidor.
        const safeMime = result.detectedType !== 'Unknown' ? result.detectedType : 'image/jpeg';
        result._blob = new Blob([buffer], { type: safeMime });

        auditResults.push(result);

        // GUARDAR EN CACHÉ
        scannedCache.set(url, result);
    }

    debug.logGroupEnd('global_imageSec', debug.DEBUG_LEVELS.BASIC);

    // TABLA
    const displayTable = auditResults.map(item => ({
        ID: item.name,
        Type: item.detectedType,
        MIME: item.serverMime,
        Status: item.status,
        Threats: item.threats.length > 0 ? item.threats.join(', ') : 'None'
    }));

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    
    debug.logGroupExpanded('global_imageSec', debug.DEBUG_LEVELS.BASIC, 
        `%c🛡️ REPORTE VISUAL FORENSE (${duration}s)`, 
        "background: #004400; color: #fff; font-size: 14px; padding: 5px; font-weight: bold;");

    debug.logTable('global_imageSec', debug.DEBUG_LEVELS.BASIC, displayTable);

    // -----------------------------------------------------------------------
    // GALERÍA DE EVIDENCIAS (Visual)
    // -----------------------------------------------------------------------
    if (auditResults.length > 0) {
        debug.logGroupCollapsed('global_imageSec', debug.DEBUG_LEVELS.BASIC, 
            `📸 GALERÍA DE EVIDENCIAS (${auditResults.length} Activos)`);

        auditResults.forEach(img => {
            const isVuln = img.status.includes("VULNERABLE");
            const isWarn = img.status.includes("WARNING");
            const isBlocked = img.status.includes("CORS");
            
            let icon = "✅";
            let colorStyle = "color: #29b6f6;"; 
            
            if (isVuln) { 
                icon = "❌"; 
                colorStyle = "color: red; font-weight: bold;"; 
            }
            else if (isWarn) { 
                icon = "⚠️"; 
                colorStyle = "color: orange; font-weight: bold;"; 
            }
            else if (isBlocked) { 
                icon = "🚫"; 
                colorStyle = "color: gray;"; 
            }

            debug.logGroupCollapsed('global_imageSec', debug.DEBUG_LEVELS.BASIC, 
                `%c${icon} ${img.name}`, colorStyle);

            // 📸 RENDERIZADO VISUAL
            let previewUrl = null;
            if (!isBlocked) {
                if (img._isData) {
                    previewUrl = img.fullUrl;
                } else if (img._blob) {
                    try {
                        // El blob ahora tiene MIME type correcto, el navegador lo renderizará
                        previewUrl = URL.createObjectURL(img._blob);
                    } catch(e) { }
                }
            }

            if (previewUrl) {
                const cssPreview = `
                    background-image: url('${previewUrl}');
                    background-size: contain;
                    background-repeat: no-repeat;
                    background-position: center;
                    font-size: 1px;
                    padding: 50px; 
                    line-height: 100px;
                    color: transparent;
                    border: 1px solid #444;
                    border-radius: 4px;
                    display: block;
                `;
                debug.log('global_imageSec', debug.DEBUG_LEVELS.BASIC, 
                    '%c  ', cssPreview);

            } else {
                debug.log('global_imageSec', debug.DEBUG_LEVELS.BASIC, 
                    `%c[Vista previa no disponible: ${img.status}]`, 
                    "color: #aaa; font-style: italic;");
            }

            // Datos Técnicos
            debug.log('global_imageSec', debug.DEBUG_LEVELS.DEEP, 
                "%cDatos Técnicos:", 
                "color: #aaa; border-bottom: 1px solid #444; margin-bottom: 5px;");
            
            const cleanObj = { ...img };
            delete cleanObj._blob; 
            
            debug.logDir('global_imageSec', debug.DEBUG_LEVELS.DEEP, cleanObj);

            debug.logGroupEnd('global_imageSec', debug.DEBUG_LEVELS.BASIC);
        });

        debug.logGroupEnd('global_imageSec', debug.DEBUG_LEVELS.BASIC);
    }

    const vulnerable = auditResults.filter(r => r.status.includes("VULNERABLE"));

    if (vulnerable.length > 0) {
        debug.logError('global_imageSec', 
            `⚠️ ${vulnerable.length} AMENAZAS CRÍTICAS DETECTADAS`);

    } else {
        debug.log('global_imageSec', debug.DEBUG_LEVELS.BASIC, 
            "✅ Auditoría finalizada.");
    }

    debug.logGroupEnd('global_imageSec', debug.DEBUG_LEVELS.BASIC);

    window.lastAuditReport = auditResults;

    // Liberamos el flag al terminar
    isAuditing = false;
}

/**
 * Atajo para ejecutar la auditoría desde la consola sin escribir el nombre completo.
 */
export function setupSecurityShorthands() {
    window.runSecurity = runImageSecurityAudit;

    /**
     * Limpiar cache MANUALMENTE
     */
    window.clearSecurityCache = () => {
        scannedCache.clear();
        debug.log('global_imageSec', debug.DEBUG_LEVELS.BASIC, "🧹 Caché de seguridad limpia.");
    };
}

/**
 * Setup agnóstico: detecta mutaciones del DOM y cambios de URL
 */
export function _setupAutoSecurityScan(scanFunction) {
    if (debug.DEBUG_CONFIG.global_imageSec < debug.DEBUG_LEVELS.BASIC) return;

    const triggerSmartAudit = (reason) => {
        if (auditTimer) clearTimeout(auditTimer);
        auditTimer = setTimeout(() => {
            debug.log('global_imageSec', debug.DEBUG_LEVELS.DEEP, `Estabilización detectada: ${reason}`);
            scanFunction();
        }, 2000); // 2 segundos de calma
    };

    // 1. MONITOR DE DOM (Para webs autocontenidas/Swiper)
    const domObserver = new MutationObserver((mutations) => {
        const isRelevant = mutations.some(m => 
            m.type === 'childList' || 
            (m.type === 'attributes' && ['src', 'style', 'class'].includes(m.attributeName))
        );
        if (isRelevant) triggerSmartAudit("DOM Mutation");
    });

    domObserver.observe(document.body, { 
        childList: true, subtree: true, attributes: true, 
        attributeFilter: ['src', 'style', 'class'] 
    });

    // 2. MONITOR DE NAVEGACIÓN (Para webs normales/SPAs)
    window.addEventListener('popstate', () => triggerSmartAudit("URL Change (Popstate)"));
    
    // Captura cambios manuales de History API
    const originalPush = history.pushState;
    history.pushState = function() {
        originalPush.apply(this, arguments);
        triggerSmartAudit("URL Change (PushState)");
    };

    // 3. CARGA INICIAL
    if (document.readyState === 'complete') {
        scanFunction();
    } else {
        window.addEventListener('load', () => scanFunction());
    }
}

/* --- code/debug.imageSecurity.js --- */