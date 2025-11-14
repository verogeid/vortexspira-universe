// --- code/i18n.js ---
(function() {

    // ⭐️ 1. ALMACÉN DE STRINGS (Textos)
    App.STRINGS = {
        'es': {
            // Meta y Títulos
            'pageTitle': 'VortexSpira®: Selector de Cursos',
            'headerTitle': 'VortexSpira®: Tu Mentor de Audio-Aprendizaje Técnico',

            // Botones y Controles
            'btnBack': '&larr; Volver',

            // Labels de Accesibilidad (ARIA)
            'ariaNavRegion': 'Navegación principal de cursos',
            'ariaBackLevel': 'Volver al nivel anterior',
            'ariaLicense': 'Descripción de la licencia CC BY-NC-ND 4.0',
            'ariaLinkedIn': 'Perfil de LinkedIn de Diego González Fernández',

            // Ayuda Rápida
            'helpTitle': 'Ayuda Rápida:',
            'helpRotate': '<b>Gira</b>: Arrastra, usa la rueda del ratón o las flechas del teclado.',
            'helpBack': '<b>Vuelve</b>: Pulsa [Esc] o el botón "Volver".',
            
            // Columna "Acerca de"
            'aboutTitle': 'Acerca de VortexSpira®',
            'aboutSummary': 'Plataforma de audio-aprendizaje inmersivo diseñada para ingenieros, con foco en la accesibilidad cognitiva y cero ansiedad.',
            'aboutLinkLanding': 'Visita la Landing Page',
            'aboutLinkDiary': 'Lee el Dev Diary en GitHub',

            // Footer
            'footerCopyright': '&copy;2025 VortexSpira®',
            'footerAuthor': 'Desarrollado por Diego González Fernández'
        }
    };

    // ⭐️ 2. FUNCIÓN HELPER PARA OBTENER STRINGS
    
    let currentLang = 'es'; 

    App.getString = function(key) {
        if (!App.STRINGS[currentLang] || !App.STRINGS[currentLang][key]) {
            logError('i18n', `Clave no encontrada: ${key}`);
            return `[${key}]`;
        }
        return App.STRINGS[currentLang][key];
    };

    // ⭐️ 3. FUNCIÓN DE INYECCIÓN DE TEXTOS
    
    App.applyStrings = function() {
        log('i18n', DEBUG_LEVELS.BASIC, 'Aplicando textos (i18n)...');

        document.documentElement.lang = currentLang;
        document.title = App.getString('pageTitle');

        // 2. Textos que se inyectan por ID
        // ⭐️ CORREGIDO: Apunta al ID del H1, no a un selector CSS
        const elementsById = {
            'main-header-title': 'headerTitle', // <-- Corregido
            'btn-volver-navegacion': 'btnBack',
            
            'info-adicional-titulo-ayuda': 'helpTitle',
            'info-adicional-ayuda-gira': 'helpRotate',
            'info-adicional-ayuda-vuelve': 'helpBack',
            
            'info-adicional-titulo-acerca': 'aboutTitle',
            'info-adicional-summary': 'aboutSummary',
            'info-adicional-link-landing': 'aboutLinkLanding',
            'info-adicional-link-diary': 'aboutLinkDiary'
        };

        for (const id in elementsById) {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = App.getString(elementsById[id]);
            } else {
                // Añadimos un log de advertencia por si un ID está mal escrito
                logWarn('i18n', `Elemento no encontrado por ID: #${id}`);
            }
        }

        // 3. Textos por Atributo [data-i18n-key] (Sin cambios)
        document.querySelectorAll('[data-i18n-key]').forEach(el => {
            const key = el.getAttribute('data-i18n-key');
            el.innerHTML = App.getString(key);
        });

        // 4. Atributos (ej: aria-label) (Sin cambios)
        const attributes = {
            'vista-central': { 'aria-label': 'ariaNavRegion' },
            'card-volver-fija-elemento': { 'aria-label': 'ariaBackLevel' }
        };

        for (const id in attributes) {
            const el = document.getElementById(id);
            if (el) {
                for (const attr in attributes[id]) {
                    const key = attributes[id][attr];
                    el.setAttribute(attr, App.getString(key));
                }
            }
        }
    };

})();
