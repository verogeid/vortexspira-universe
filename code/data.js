/* --- code/data.js --- */

export const PRELOAD_TIME = 2000;

export const A11Y = {
    STORAGE_KEY: 'vortex_a11y_prefs_v1',
    DEFAULTS: {
        fontType: 'atkinson', 

        fontSizePct: 100,  

        lineHeight: 1.5,       
        paragraphSpacing: 1.5,

        letterSpacing: '0em',
        wordSpacing: '0em',

        theme: 'default',

        reduceMotion: false,

        noBlockOpacity: false, 
        noMaskOpacity: false,
        noZoneOpacity: false
    },
    SPACING_MAP: { // Mapeo para el slider de espaciado: Valor -> [AlturaLinea, Etiqueta]
        1: { val: 1.0, labelKey: 'modal.spacing.compact' },
        2: { val: 1.5, labelKey: 'modal.spacing.normal' },
        3: { val: 2, labelKey: 'modal.spacing.wide' },
        4: { val: 2.5, labelKey: 'modal.spacing.extraWide' }
    },
    LETTER_SPACING_MAP: {
        1: { letter: '0em', word: '0em', labelKey: 'modal.spacing.normal' },
        2: { letter: '0.12em', word: '0.16em', labelKey: 'modal.spacing.wide' },
        3: { letter: '0.20em', word: '0.25em', labelKey: 'modal.spacing.extraWide' }
    }
};

export const MEDIA = {
    URL: {
        LINKEDIN: "https://www.linkedin.com/company/vortexspira",
        LICENSE: "http://creativecommons.org/licenses/by-nc-nd/4.0/",
        LICENSE_IMG_SRC: "https://licensebuttons.net/l/by-nc-nd/4.0/88x31.png",
        LANDING_PAGE: "https://subscribepage.io/vortexspira",
        DEV_DIARY: "https://github.com/verogeid/vortexspira-devdiary",
        WEBPAGE: "https://www.vortexspira.com"
    }
};

export const VIEWPORT = {
    // MÍNIMO VITAL: ¿Necesario para ver algo útil?
    MIN_CONTENT_HEIGHT: {
        MOBILE: 230,
        TABLET: 450, // Equivale a 28.125em
        DESKTOP: 600 // Equivale a 37.5em
    },
    MAX_WIDTH: {
        MOBILE: 600,
        TABLET_PORTRAIT: 800,
        TABLET_LANDSCAPE: 1023.99
    },
    DETAILS: {
        minLinesHeight: 1
    }
}

export const SWIPER = {
    prefersReducedMotion: function() {
        // 🟢 Comprueba si está marcado en el modal (data-attribute) O en el sistema operativo
        const manualOverride = document.body.getAttribute('data-reduced-motion') === 'true';

        const osPreference = window.matchMedia && window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;
        
        return manualOverride || osPreference;
    },
    get SLIDE_SPEED() { 
        return this.prefersReducedMotion() ? 0 : 400; 
    },
    get SLIDES_PER_VIEW() {
        return 3;
    },
    get NEEDED_SLIDES_TO_LOOP() {
        return this.SLIDES_PER_VIEW * 3 + 2; 
    },
    get scrollBehavior () {
        return this.prefersReducedMotion() ? 'auto' : 'smooth';
    },
    CARD_GAP_PX: 15,
    ELEMENTS_PER_COLUMN_TABLET: 2,
    ELEMENTS_PER_COLUMN_DESKTOP: 3,
};



/* --- code/data.js --- */