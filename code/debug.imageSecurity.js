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

/**
 * Función principal que realiza la auditoría de seguridad en imágenes.
 */
export async function runImageSecurityAudit() {
    if (debug.DEBUG_CONFIG.global_imageSec < debug.DEBUG_LEVELS.BASIC) return;

    const startTime = performance.now();

    // 1. Carga de dependencias
    if (typeof window.ExifReader === 'undefined') {
        debug.log('global_imageSec', debug.DEBUG_LEVELS.BASIC, 
            "Cargando motor EXIF externo...");

        await import('https://cdn.jsdelivr.net/npm/exifreader@4.12.0/dist/exif-reader.js');
    }

    debug.logGroupCollapsed('global_imageSec', debug.DEBUG_LEVELS.BASIC, 
        "%c🛡️ EJECUTANDO AUDITORÍA DE IMÁGENES (Visual Forensics)", 
        "background: #555; color: #fff; font-size: 12px; padding: 2px 5px; border-radius: 3px;");

    // -----------------------------------------------------------------------
    // 🔍 RECOLECCIÓN PROFUNDA
    // -----------------------------------------------------------------------
    const urlsToAudit = new Set(); 

    // A. Imágenes explícitas en HTML
    const domImages = document.querySelectorAll('img, image, link[rel*="icon"]');
    domImages.forEach(el => {
        if (el.tagName === 'IMG' && el.src) 
            urlsToAudit.add(el.src);

        if (el.tagName === 'image' && el.getAttribute('xlink:href')) 
            urlsToAudit.add(el.getAttribute('xlink:href'));

        if (el.tagName === 'LINK' && el.href) 
            urlsToAudit.add(el.href);
    });

    // B. Imágenes en CSS
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

    const auditResults = [];

    for (const url of images) {
        const isDataURI = url.startsWith('data:');
        let shortName = 'Asset';

        // Lógica de Fetch
        let resBlob = null;
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

            // 🔴 Inyectar el MIME type al Blob para que la consola sepa renderizarlo
            resBlob = new Blob([buffer], { type: serverMime });

        } catch (e) {
            auditResults.push({ 
                name: url.startsWith('data:') ? 'DataURI Error' : (url.split('/').pop().substring(0, 20) || 'Unknown Asset'),
                fullUrl: url, 
                serverMime: 'Blocked', 
                detectedType: 'Error', 
                status: '⚠️ CORS', 
                threats: ['Network Error (CORS)'], 
                metadata: null,
                _blob: null, // Importante: null explícito
                _isData: false
            });
            continue;
        }

        const bytes = new Uint8Array(buffer);
        // Usamos TextDecoder seguro
        const content = new TextDecoder('utf-8').decode(bytes.slice(0, 30000));
        const header = bytes.slice(0, 12).reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), "").toUpperCase();

        // Naming Inteligente
        if (!isDataURI) {
            shortName = url.split('/').pop().substring(0, 25);
        } else {
            const idMatch = content.match(/id=["']([^"']+)["']/);
            if (idMatch) {
                shortName = `SVG: #${idMatch[1]}`;
            } else if (content.includes('<svg')) {
                // Limpiamos nombre para que no quede "svgxmlns..."
                shortName = `SVG Inline (${bytes.length}b)`; 
            } else {
                shortName = `Base64 Asset`;
            }
        }

        const result = { 
            name: shortName,
            fullUrl: url,
            serverMime: serverMime,
            detectedType: 'Unknown', 
            status: '✅ Clean', 
            threats: [], 
            metadata: null,
            _blob: resBlob,
            _isData: isDataURI
        };

        // Identificación
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

        else if (content.includes("<svg") || content.includes("<?xml") || result.serverMime.includes('svg')) {
            result.detectedType = "svg+xml";
        }

        // Checks
        if (!isDataURI && result.serverMime && !result.serverMime.includes(result.detectedType.split('/')[1]) && result.detectedType !== 'Unknown') {
            result.threats.push("MIME Mismatch");
            result.status = "❌ VULNERABLE";
        }

        // EXIF & Metadata
        try {
            const tags = window.ExifReader.load(buffer);
            result.metadata = tags; 
            if (/<script|on\w+=/i.test(JSON.stringify(tags))) {
                result.threats.push("XSS en EXIF");
                result.status = "❌ VULNERABLE";
            }
        } catch(e) {
            if (result.detectedType === "image/svg+xml") {
                // Guardamos snippet del SVG para inspección
                result.metadata = { 
                    type: "SVG Source", 
                    preview: content.substring(0, 300) + "..." 
                };
            }
        }

        // Payload Checks
        if (/<script|<\?php|on\w+=|javascript:/i.test(content)) {
            if (result.detectedType === "image/svg+xml") {
                result.threats.push("Script en SVG (Revisar)");
                result.status = "⚠️ WARNING";
            } else {
                result.threats.push("Payload en Binario");
                result.status = "❌ VULNERABLE";
            }
        }

        auditResults.push(result);
    }

    debug.logGroupEnd('global_imageSec', debug.DEBUG_LEVELS.BASIC);

    // TABLA RESUMEN
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
                    `%c  `, cssPreview);
            } else {
                debug.log('global_imageSec', debug.DEBUG_LEVELS.BASIC, 
                    `%c[Vista previa no disponible: ${img.status}]`, 
                    "color: #aaa; font-style: italic;");
            }

            // Datos Técnicos
            debug.log('global_imageSec', debug.DEBUG_LEVELS.BASIC, "%cDatos Técnicos:", "color: #aaa; border-bottom: 1px solid #444; margin-bottom: 5px;");
            
            const cleanObj = { ...img };
            delete cleanObj._blob; 
            
            debug.logDir('global_imageSec', debug.DEBUG_LEVELS.BASIC, cleanObj);

            debug.logGroupEnd('global_imageSec', debug.DEBUG_LEVELS.BASIC);
        });

        debug.logGroupEnd('global_imageSec', debug.DEBUG_LEVELS.BASIC);
    }

    const vulnerable = auditResults.filter(r => r.status.includes("VULNERABLE"));
    if (vulnerable.length > 0) {
        debug.logError('global_imageSec', `⚠️ ${vulnerable.length} AMENAZAS CRÍTICAS DETECTADAS`);
    } else {
        debug.log('global_imageSec', debug.DEBUG_LEVELS.BASIC, "✅ Auditoría finalizada.");
    }

    debug.logGroupEnd('global_imageSec', debug.DEBUG_LEVELS.BASIC);
    window.lastAuditReport = auditResults;
}

/**
 * Atajo para ejecutar la auditoría desde la consola sin escribir el nombre completo.
 */
export function setupSecurityShorthands() {
    window.runSecurity = runImageSecurityAudit;
}

/**
 * Observa cambios en el DOM o en la URL para re-ejecutar 
 * la auditoría de seguridad de imágenes automáticamente.
 */
export function _setupAutoSecurityScan(scanFunction) {
    if (debug.DEBUG_CONFIG.global_imageSec < debug.DEBUG_LEVELS.BASIC) return;

    // 1. Monitorear cambios de URL (para SPAs)
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;

            debug.log('global_imageSec', debug.DEBUG_LEVELS.BASIC, 
                "🔄 Cambio de ruta detectado. Reiniciando auditoría...");

            scanFunction();
        }
    });

    urlObserver.observe(document, { 
        subtree: true, 
        childList: true 
    });

    // 2. Ejecución inicial tras carga
    window.addEventListener('load', () => {
        debug.log('global_imageSec', debug.DEBUG_LEVELS.BASIC, 
            "🚀 Ejecutando auditoría de seguridad inicial...");

        scanFunction();
    });
}

/* --- code/debug.imageSecurity.js --- */