/* --- code/debug/debug.ldJsonSim.js --- */

import * as debug from './debug.js';

export const ldJsonSim = {
    _debounceTimer: null,
    _lastReportJson: '', // Para evitar duplicados exactos

    init() {
        debug.log('seo_sim', debug.DEBUG_LEVELS.BASIC, '🔍 SIMULADOR DE RASTREO IA: Esperando estabilidad...');
        
        const observer = new MutationObserver(() => {
            this.scheduleReport();
        });

        // Observamos cambios en el HEAD
        observer.observe(document.head, { 
            childList: true, 
            subtree: true, 
            attributes: true, 
            attributeFilter: ['content'] 
        });

        // Reporte inicial tras el arranque
        this.scheduleReport(1000); 
    },

    scheduleReport(delay = 400) {
        // Limpiamos el temporizador anterior para agrupar todas las ráfagas de cambios
        clearTimeout(this._debounceTimer);
        
        this._debounceTimer = setTimeout(() => {
            this.report();
        }, delay);
    },

    report() {
        const title = document.title;
        const lang = document.documentElement.lang;
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || 'NO DEFINIDA';
        const ldJsonElement = document.getElementById('vortex-json-ld');
        
        const currentContent = ldJsonElement ? ldJsonElement.textContent : '';
        
        // 🟢 GUARDIA DE VERDAD: Si el contenido SEO no ha cambiado realmente, no ensuciamos la consola
        const currentFullState = `${lang}|${title}|${description}|${currentContent}`;
        if (this._lastReportJson === currentFullState) return;
        this._lastReportJson = currentFullState;

        let schemaData = "SIN DATOS ESTRUCTURADOS";
        if (ldJsonElement) {
            try {
                schemaData = JSON.parse(currentContent);
            } catch (e) { 
                schemaData = "ERROR AL PARSEAR JSON-LD"; 
            }
        }

        // 🟢 LIMPIEZA DE CONSOLA: Usamos el wrapper de debug para evitar anidamientos extraños
        debug.logGroupCollapsed('seo_sim', debug.DEBUG_LEVELS.BASIC,
            `%c🤖 IA Crawler Report | ${lang.toUpperCase()} | ${title.substring(0, 40)}...`, 
            "color: #00ff00; font-weight: bold; background: #111; padding: 3px 8px; border-radius: 4px;"
        );
        
        debug.log('seo_sim', debug.DEBUG_LEVELS.BASIC, "%cMeta Título:      ", "font-weight: bold; color: #aaa", title);
        debug.log('seo_sim', debug.DEBUG_LEVELS.BASIC, "%cMeta Descripción: ", "font-weight: bold; color: #aaa", description);
        debug.log('seo_sim', debug.DEBUG_LEVELS.BASIC, "%cIdioma (lang):    ", "font-weight: bold; color: #aaa", lang);
        
        debug.log('seo_sim', debug.DEBUG_LEVELS.BASIC, 
            "%cEsquema JSON-LD:", "font-weight: bold; color: #00acee");
        
        if (typeof schemaData === 'object') {
            debug.logTable('seo_sim', debug.DEBUG_LEVELS.BASIC, schemaData);
        } else {
            debug.log('seo_sim', debug.DEBUG_LEVELS.BASIC, schemaData);
        }
        
        debug.logGroupEnd('seo_sim', debug.DEBUG_LEVELS.BASIC);
    }
};

/* --- code/debug/debug.ldJsonSim.js --- */