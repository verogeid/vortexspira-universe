// --- MODIFICADO: code/i18n.js ---
(function() {
    // 'App' debe estar definido por app.js antes de que esto se ejecute

    // ⭐️ 1. ALMACÉN DE STRINGS (Textos)
    App.STRINGS = {
        'es': {
            'pageTitle': 'VortexSpira®: Selector de Cursos',
            'headerTitle': 'VortexSpira®: Tu Mentor de Audio-Aprendizaje Técnico',
            'btnBack': '&larr; Volver',
            'ariaNavRegion': 'Navegación principal de cursos',
            'ariaBackLevel': 'Volver al nivel anterior',
            'ariaLicense': 'Descripción de la licencia CC BY-NC-ND 4.0',
            'ariaLinkedIn': 'Perfil de LinkedIn de Diego González Fernández',
            'helpTitle': 'Ayuda Rápida:',
            'helpRotate': '<b>Gira</b>: Arrastra, usa la rueda del ratón o las flechas del teclado.',
            'helpBack': '<b>Vuelve</b>: Pulsa [Esc] o el botón "Volver".',
            'aboutTitle': 'Acerca de VortexSpira®',
            'aboutSummary': 'Plataforma de audio-aprendizaje inmersivo diseñada para ingenieros, con foco en la accesibilidad cognitiva y cero ansiedad.',
            'aboutLinkLanding': 'Visita la Landing Page',
            'aboutLinkDiary': 'Lee el Dev Diary en GitHub',
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

    // ⭐️ 3. FUNCIÓN DE INYECCIÓN DE TEXTOS Y ENLACES
    
    App.applyStrings = function() {
        log('i18n', DEBUG_LEVELS.BASIC, 'Aplicando textos (i18n)...');

        document.documentElement.lang = currentLang;
        document.title = App.getString('pageTitle');

        // 2. Textos que se inyectan por ID (elementos simples)
        const elementsById = {
            'main-header-title': 'headerTitle',
            'btn-volver-navegacion': 'btnBack',
            'info-adicional-titulo-ayuda': 'helpTitle',
            'info-adicional-ayuda-gira': 'helpRotate',
            'info-adicional-ayuda-vuelve': 'helpBack',
            'info-adicional-titulo-acerca': 'aboutTitle',
            'info-adicional-summary': 'aboutSummary'
        };

        for (const id in elementsById) {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = App.getString(elementsById[id]);
            } else {
                logWarn('i18n', `Elemento no encontrado por ID: #${id}`);
            }
        }

        // ⭐️ AÑADIDO: 3. Enlaces (Texto Y Href) ⭐️
        // (Lee las constantes globales definidas en data.js)
        const linksById = {
            'info-adicional-link-landing': { 
                key: 'aboutLinkLanding', 
                url: typeof LANDING_PAGE_URL !== 'undefined' ? LANDING_PAGE_URL : '#' 
            },
            'info-adicional-link-diary': { 
                key: 'aboutLinkDiary', 
                url: typeof DEV_DIARY_URL !== 'undefined' ? DEV_DIARY_URL : '#' 
            }
        };

        for (const id in linksById) {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = App.getString(linksById[id].key);
                el.setAttribute('href', linksById[id].url);
            } else {
                logWarn('i18n', `Elemento de enlace no encontrado por ID: #${id}`);
            }
        }

        // 4. Atributos (ej: aria-label)
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
