// --- code/i18n.js ---
(function() {

    // ⭐️ 1. ALMACÉN DE STRINGS (Textos)
    // Estructurado por idioma ('es') para futura internacionalización
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

            // Columna "Acerca de" (Nuevo)
            'aboutTitle': 'Acerca de VortexSpira®',
            'aboutLinkLanding': 'Visita la Landing Page',
            'aboutLinkDiary': 'Lee el Dev Diary en GitHub',

            // Footer
            'footerCopyright': '&copy;2025 VortexSpira®',
            'footerAuthor': 'Desarrollado por Diego González Fernández'
        }
    };

    // ⭐️ 2. FUNCIÓN HELPER PARA OBTENER STRINGS
    
    // Define el idioma actual (se podría expandir para leer el navegador)
    let currentLang = 'es'; 

    /**
     * Obtiene una cadena de texto del almacén por su clave.
     * @param {string} key - La clave del string (ej: 'headerTitle').
     * @returns {string} - El texto correspondiente.
     */
    App.getString = function(key) {
        if (!App.STRINGS[currentLang] || !App.STRINGS[currentLang][key]) {
            logError('i18n', `Clave no encontrada: ${key}`);
            return `[${key}]`; // Devuelve la clave como fallback
        }
        return App.STRINGS[currentLang][key];
    };

    // ⭐️ 3. FUNCIÓN DE INYECCIÓN DE TEXTOS
    
    /**
     * Aplica todos los textos al DOM al cargar la página.
     */
    App.applyStrings = function() {
        log('i18n', DEBUG_LEVELS.BASIC, 'Aplicando textos (i18n)...');

        // Establecer idioma del documento
        document.documentElement.lang = currentLang;

        // 1. Título de la página
        document.title = App.getString('pageTitle');

        // 2. Textos que se inyectan por ID
        const elementsById = {
            'app-header h1': 'headerTitle',
            'btn-volver-navegacion': 'btnBack',
            'info-adicional-titulo': 'aboutTitle', // ID del nuevo <p>
            'info-adicional-link-landing': 'aboutLinkLanding', // ID del nuevo <a>
            'info-adicional-link-diary': 'aboutLinkDiary' // ID del nuevo <a>
        };

        for (const id in elementsById) {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = App.getString(elementsById[id]);
            }
        }

        // 3. Textos por Atributo [data-i18n-key]
        document.querySelectorAll('[data-i18n-key]').forEach(el => {
            const key = el.getAttribute('data-i18n-key');
            el.innerHTML = App.getString(key);
        });

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
