/* --- code/a11y.js --- */

import * as debug from './debug.js';
import * as i18n from './i18n.js';
import * as data from './data.js';

let _prefs = { ...data.A11Y.DEFAULTS };
let _domRefs = {};

export function initA11y() {
    debug.log('a11y', debug.DEBUG_LEVELS.BASIC, 
        'Inicializando módulo de accesibilidad...');

    _loadPreferences();
    _injectModalHTML();

    _cacheDOM();

    _applyPreferences(); // Aplica lo guardado al arrancar
    _setupListeners();
}

function _loadPreferences() {
    try {
        const saved = localStorage.getItem(data.A11Y.STORAGE_KEY);
        if (saved) {
            _prefs = { ...data.A11Y.DEFAULTS, ...JSON.parse(saved) };
        }
    } catch (e) {
        debug.logWarn('a11y', 
            'Error leyendo localStorage', e);
    }
}

function _savePreferences() {
    try {
        localStorage.setItem(data.A11Y.STORAGE_KEY, JSON.stringify(_prefs));

        debug.log('a11y', debug.DEBUG_LEVELS.BASIC, 
            'Preferencias guardadas.');
        
    } catch (e) {
        debug.logError('a11y', 
            'Error guardando a11y prefs', e);
    }
}

/**
 * Aplica las variables CSS al :root
 */
function _applyPreferences() {
    const root = document.documentElement;
    
    // 1. Familia
    // 🟢 1. Familia: Usar data-attribute para que style-fonts.css haga el trabajo
    document.body.setAttribute('data-font', _prefs.fontType || 'atkinson');

    // 2. Escala
    const scale = _prefs.fontSizePct / 100;
    root.style.setProperty('--font-scale', scale);

    // 3. Espaciado
    root.style.setProperty('--line-height-base', _prefs.lineHeight);
    root.style.setProperty('--paragraph-spacing', `${_prefs.paragraphSpacing}em`);

    root.style.setProperty('--letter-spacing-base', _prefs.letterSpacing);
    root.style.setProperty('--word-spacing-base', _prefs.wordSpacing);

    // 🟢 Aplicar Tema al body (El CSS se encargará del resto)
    document.body.setAttribute('data-theme', _prefs.theme || 'default');

    // 🟢 LAZY LOAD: Inyección de Temas Manuales
    // Si elige algo distinto a "Sistema", inyectamos el CSS sin media queries para forzarlo
    const themeCSSMap = {
        'light': 'styles/style-theme-scheme-light.css',
        'dark': 'styles/style-theme-scheme-dark.css',
        'contrast': 'styles/style-theme-contrast.css',
        'forced': 'styles/style-theme-forced-colors.css',
        'yellow': 'styles/style-theme-yellow.css'
    };

    if (_prefs.theme !== 'default' && themeCSSMap[_prefs.theme]) {
        if (window.App) window.App._injectCSS(themeCSSMap[_prefs.theme], 'vortex-css-manual-theme');
    } else {
        // Si vuelve a "Sistema", borramos la inyección manual para que actúen las media queries del index.html
        const manualThemeLink = document.getElementById('vortex-css-manual-theme');
        if (manualThemeLink) manualThemeLink.remove();
    }

    // 🟢 Aplicar Reducción de movimiento
    document.body.setAttribute('data-reduced-motion', _prefs.reduceMotion ? 'true' : 'false');
    
    // LAZY LOAD: Forzar reducción de movimiento aunque el OS no lo pida
    if (_prefs.reduceMotion) {
        if (window.App) window.App._injectCSS('styles/style-reduce-motion.css', 'vortex-css-reduce-motion');
    } else {
        const rmLink = document.getElementById('vortex-css-reduce-motion');
        if (rmLink) rmLink.remove();
    }

    // 🟢 Atributos para la atenuación
    document.body.setAttribute('data-no-block-opacity', _prefs.noBlockOpacity ? 'true' : 'false');
    document.body.setAttribute('data-no-mask-opacity', _prefs.noMaskOpacity ? 'true' : 'false');
    document.body.setAttribute('data-no-zone-opacity', _prefs.noZoneOpacity ? 'true' : 'false');

    // LAZY LOAD: Desactivar opacidades (Solo se baja el archivo si marca algún check)
    if (_prefs.noBlockOpacity || _prefs.noMaskOpacity || _prefs.noZoneOpacity) {
        if (window.App) window.App._injectCSS('styles/style-no-opacity.css', 'vortex-css-opacity');
    } else {
        const opacityLink = document.getElementById('vortex-css-opacity');
        if (opacityLink) opacityLink.remove();
    }

    _updateModalUI();

    // ⭐️ Disparar evento de resize para que app.js recalcule el layout inmediatamente
    window.dispatchEvent(new Event('resize'));
}

/**
 * Actualiza los controles del modal para que coincidan con la realidad
 */
function _updateModalUI() {
    if (!_domRefs.modal) return;

    // Botones de Fuente
    _domRefs.fontBtns.forEach(btn => {
        const isSelected = btn.dataset.font === _prefs.fontType;
        btn.classList.toggle('selected', isSelected);

        // 🟢 Actualizar aria-checked para el comportamiento de radio button
        btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });

    // Slider Texto
    if (_domRefs.rangeSize) {
        _domRefs.rangeSize.value = _prefs.fontSizePct;

        // 🟢 Actualizar aria-valuenow para que el lector lea el valor
        _domRefs.rangeSize.setAttribute('aria-valuenow', _prefs.fontSizePct);

        _updateSliderLabel(_prefs.fontSizePct);
    }

    // Slider Espaciado
    if (_domRefs.rangeSpacing) {
        let step = 2; 

        for (const [key, info] of Object.entries(data.A11Y.SPACING_MAP)) {
            if (info.val === _prefs.lineHeight) step = key;
        }
        _domRefs.rangeSpacing.value = step;
        
        // 🟢 Actualizar aria-valuetext para leer "Normal", "Amplio", etc.
        _domRefs.rangeSpacing.setAttribute('aria-valuenow', step);
        const labelKey = data.A11Y.SPACING_MAP[step]?.labelKey || 'modal.spacing.normal';
        _domRefs.rangeSpacing.setAttribute('aria-valuetext', i18n.getString(labelKey));
        
        _updateSpacingLabel(step);
    }

    // Slider Caracteres
    if (_domRefs.rangeLetterSpacing) {
        let step = 1; 
        for (const [key, info] of Object.entries(data.A11Y.LETTER_SPACING_MAP)) {
            if (info.letter === _prefs.letterSpacing) step = key;
        }
        _domRefs.rangeLetterSpacing.value = step;
        _domRefs.rangeLetterSpacing.setAttribute('aria-valuenow', step);
        const labelKey = data.A11Y.LETTER_SPACING_MAP[step]?.labelKey || 'modal.spacing.normal';
        _domRefs.rangeLetterSpacing.setAttribute('aria-valuetext', i18n.getString(labelKey));
        
        _updateLetterSpacingLabel(step);
    }

    // Radio Buttons de Tema
    if (_domRefs.themeBtns) {
        _domRefs.themeBtns.forEach(btn => {
            const isSelected = btn.dataset.theme === _prefs.theme;
            btn.classList.toggle('selected', isSelected);
            btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        });
    }

    // Checkbox Reducir Animaciones
    if (_domRefs.reduceMotionCb)
        _domRefs.reduceMotionCb.checked = _prefs.reduceMotion;
    

    if (_domRefs.noBlockOpacityCb) 
        _domRefs.noBlockOpacityCb.checked = _prefs.noBlockOpacity;

    if (_domRefs.noMaskOpacityCb) 
        _domRefs.noMaskOpacityCb.checked = _prefs.noMaskOpacity;
}

function _updateSliderLabel(pct) {
    if (!_domRefs.rangeVal) return;

    const computedPx = parseFloat(getComputedStyle(document.documentElement).fontSize).toFixed(1);

    _domRefs.rangeVal.textContent = `${pct}%`;
}

function _updateSpacingLabel(step) {
    if (!_domRefs.rangeSpacingVal) return;
    
    const info = data.A11Y.SPACING_MAP[step] || data.A11Y.SPACING_MAP[2];

    _domRefs.rangeSpacingVal.textContent = i18n.getString(info.labelKey);
}

function _updateLetterSpacingLabel(step) {
    if (!_domRefs.rangeLetterSpacingVal) return;

    const info = data.A11Y.LETTER_SPACING_MAP[step] || data.A11Y.LETTER_SPACING_MAP[1];

    _domRefs.rangeLetterSpacingVal.textContent = i18n.getString(info.labelKey);
}

function _injectModalHTML() {
    if (document.getElementById('a11y-modal-overlay')) 
        return;

    // 🟢 FIX: Botones de fuente con aria-label descriptivo ("Tipografía: Sans")
    const html = `
        <div id="a11y-modal-overlay" 
            class="a11y-modal-overlay" 
            aria-hidden="true">

            <div id="a11y-modal" 
                class="a11y-modal" 
                role="dialog" 
                aria-modal="true" 
                aria-labelledby="a11y-title">

                <div class="a11y-header">
                    <h2 id="a11y-title">
                        ${i18n.getString('modal.title')}
                    </h2>

                    <button id="a11y-close" 
                            class="a11y-close-btn" 
                            aria-label="${i18n.getString('modal.close')}"
                            title="${i18n.getString('modal.close')}">
                        ✕
                    </button>
                </div>

                <div class="a11y-section">
                    <h3>
                        ${i18n.getString('modal.sections.motion') || 
                        'Protección vestibular y fatiga cognitiva'}
                    </h3>
                    <div class="a11y-controls-group">
                        
                        <label class="a11y-checkbox-label">
                            <input type="checkbox" 
                                id="a11y-reduce-motion" 
                                class="a11y-checkbox">
                            <span>
                                ${i18n.getString('modal.options.reduceMotion') || 
                                'Reducir animaciones'}
                            </span>
                        </label>

                        <label class="a11y-checkbox-label">
                            <input type="checkbox" 
                                id="a11y-no-block-opacity" 
                                class="a11y-checkbox">
                            <span>
                                ${i18n.getString('modal.options.noBlockOpacity') || 
                                'Desactivar atenuación en descripción de cursos'}
                            </span>
                        </label>

                        <label class="a11y-checkbox-label">
                            <input type="checkbox" 
                                id="a11y-no-mask-opacity" 
                                class="a11y-checkbox">
                            <span>
                                ${i18n.getString('modal.options.noMaskOpacity') || 
                                'Desactivar atenuación en menúes'}
                            </span>
                        </label>

                        <label class="a11y-checkbox-label">
                            <input type="checkbox" 
                                id="a11y-no-zone-opacity" 
                                class="a11y-checkbox">
                            <span>
                                ${i18n.getString('modal.options.noZoneOpacity') || 
                                'Desactivar atenuación por zona'}
                            </span>
                        </label>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>${i18n.getString('modal.sections.font')}</h3>

                    <div class="a11y-controls-group font-group" 
                        role="radiogroup" 
                        aria-label="${i18n.getString('modal.sections.font')}"
                        title="${i18n.getString('modal.sections.font')}">

                        <button class="a11y-option-btn font-preview-atkinson" 
                            role="radio"
                            aria-checked="false"
                            data-font="atkinson" 
                            aria-label="${i18n.getString('modal.aria.font')} Atkinson"
                            title="${i18n.getString('modal.aria.font')} Atkinson">

                            ${i18n.getString('modal.options.atkinson')}
                        </button>

                        <button class="a11y-option-btn font-preview-serif" 
                            role="radio"
                            aria-checked="false"
                            data-font="serif" 
                            aria-label="${i18n.getString('modal.aria.font')} Serif"
                            title="${i18n.getString('modal.aria.font')} Serif">

                            ${i18n.getString('modal.options.serif')}
                        </button>

                        <button class="a11y-option-btn font-preview-dyslexic" 
                            role="radio"
                            aria-checked="false"
                            data-font="dyslexic" 
                            aria-label="${i18n.getString('modal.aria.font')} Dyslexic"
                            title="${i18n.getString('modal.aria.font')} Dyslexic">

                            ${i18n.getString('modal.options.dyslexic')}
                        </button>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>${i18n.getString('modal.sections.size')}</h3>
                    <div class="a11y-range-wrapper">
                        <span class="range-icon-small" aria-hidden="true">A</span>

                        <input type="range" 
                            id="a11y-range-size" 
                            class="a11y-range" 
                            min="90" 
                            max="200" 
                            step="5" 
                            aria-label="${i18n.getString('modal.aria.textSize')}"
                            title="${i18n.getString('modal.aria.textSize')}"
                            aria-valuemin="90" 
                            aria-valuemax="200">

                        <span class="range-icon-large" aria-hidden="true">A</span>

                        <span id="a11y-range-val" class="a11y-range-value">100%</span>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>${i18n.getString('modal.sections.spacing')}</h3>
                    <div class="a11y-range-wrapper">
                        <span class="range-icon-small" aria-hidden="true">≡</span>

                        <input type="range" 
                            id="a11y-range-spacing" 
                            class="a11y-range" 
                            min="1" 
                            max="3" 
                            step="1" 
                            aria-label="${i18n.getString('modal.aria.lineSpacing')}"
                            title="${i18n.getString('modal.aria.lineSpacing')}"
                            aria-valuemin="1" 
                            aria-valuemax="3">

                        <span class="range-icon-large" aria-hidden="true">≡</span>

                        <span id="a11y-range-spacing-val" 
                            class="a11y-range-value">
                            ${i18n.getString('modal.spacing.normal')}
                        </span>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>${i18n.getString('modal.sections.letterSpacing') || 'Espaciado de caracteres'}</h3>
                    <div class="a11y-range-wrapper">
                        <span class="range-icon-small" 
                            aria-hidden="true">
                            T
                        </span>

                        <input type="range" 
                            id="a11y-range-letter-spacing" 
                            class="a11y-range" 
                            min="1" 
                            max="3" 
                            step="1" 
                            aria-label="${i18n.getString('modal.aria.letterSpacing')}"
                            title="${i18n.getString('modal.aria.letterSpacing')}"
                            aria-valuemin="1" 
                            aria-valuemax="3">

                        <span class="range-icon-large" 
                            aria-hidden="true" 
                            style="letter-spacing: 0.2em;">
                            T T
                        </span>

                        <span id="a11y-range-letter-spacing-val" 
                            class="a11y-range-value">
                            ${i18n.getString('modal.spacing.normal')}
                        </span>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>${i18n.getString('modal.sections.theme') || 
                        'Tema de Color'}</h3>
                    <div class="a11y-controls-group theme-group" 
                        role="radiogroup" 
                        aria-label="${i18n.getString('modal.sections.theme')}"
                        title="${i18n.getString('modal.sections.theme')}">
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="default">
                            ${i18n.getString('modal.options.themeDefault') || 'Sistema'}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="light">
                            ${i18n.getString('modal.options.themeLight') || 'Claro'}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="dark">
                            ${i18n.getString('modal.options.themeDark') || 'Oscuro'}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="contrast">
                            ${i18n.getString('modal.options.themeContrast') || 'Alto Contraste'}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="forced">
                            ${i18n.getString('modal.options.themeForced') || 'Forzados'}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="yellow">
                            ${i18n.getString('modal.options.themeYellow') || 'Amarillo/Negro'}
                        </button>
                    </div>
                </div>

                <div class="a11y-footer">
                    <button id="a11y-reset" 
                            aria-label="${i18n.getString('modal.reset')}" 
                            title="${i18n.getString('modal.reset')}"></button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function _cacheDOM() {
    _domRefs = {
        overlay: document.getElementById('a11y-modal-overlay'),
        modal: document.getElementById('a11y-modal'),
        closeBtn: document.getElementById('a11y-close'),
        resetBtn: document.getElementById('a11y-reset'),
        fontBtns: document.querySelectorAll('[data-font]'),

        rangeSize: document.getElementById('a11y-range-size'),
        rangeVal: document.getElementById('a11y-range-val'),

        rangeSpacing: document.getElementById('a11y-range-spacing'),
        rangeSpacingVal: document.getElementById('a11y-range-spacing-val'),

        rangeLetterSpacing: document.getElementById('a11y-range-letter-spacing'),
        rangeLetterSpacingVal: document.getElementById('a11y-range-letter-spacing-val'),

        themeBtns: document.querySelectorAll('.theme-group .a11y-option-btn'),

        reduceMotionCb: document.getElementById('a11y-reduce-motion'),

        noBlockOpacityCb: document.getElementById('a11y-no-block-opacity'),
        noMaskOpacityCb: document.getElementById('a11y-no-mask-opacity'),

        noZoneOpacityCb: document.getElementById('a11y-no-zone-opacity'),
        
    };
}

function _setupListeners() {
    // Abrir/Cerrar
    if (_domRefs.triggerBtn) _domRefs.triggerBtn.addEventListener('click', openModal);
    if (_domRefs.closeBtn) _domRefs.closeBtn.addEventListener('click', closeModal);

    if (_domRefs.overlay) {
        _domRefs.overlay.addEventListener('click', (e) => {
            if (e.target === _domRefs.overlay) closeModal();
        });
    }

    // Cambiar Fuente
    _domRefs.fontBtns.forEach(btn => {
        btn.addEventListener('click', () => {

            _prefs.fontType = btn.dataset.font;

            _applyPreferences();
            _savePreferences();
        });
    });

    // Slider Tamaño (Live Preview)
    if (_domRefs.rangeSize) {
        _domRefs.rangeSize.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            _prefs.fontSizePct = val;
            
            // 🟢 FIX: Actualizar aria-valuenow en tiempo real
            e.target.setAttribute('aria-valuenow', val);
            
            document.documentElement.style.setProperty('--font-scale', val / 100);

            _updateSliderLabel(val);

            window.dispatchEvent(new CustomEvent('vortex-layout-refresh'));
        });

        _domRefs.rangeSize.addEventListener('change', () => _savePreferences());
    }

    // Slider Espaciado
    if (_domRefs.rangeSpacing) {
        _domRefs.rangeSpacing.addEventListener('input', (e) => {
            const step = parseInt(e.target.value);
            const info = data.A11Y.SPACING_MAP[step];
            if (info) {
                _prefs.lineHeight = info.val;
                _prefs.paragraphSpacing = info.val;
                
                // 🟢 FIX: Actualizar atributos ARIA (ValueText)
                e.target.setAttribute('aria-valuenow', step);
                e.target.setAttribute('aria-valuetext', i18n.getString(info.labelKey));

                _updateSpacingLabel(step);
                
                const root = document.documentElement;
                root.style.setProperty('--line-height-base', _prefs.lineHeight);
                root.style.setProperty('--paragraph-spacing', `${_prefs.paragraphSpacing}em`);

                // 🟢 Nuevo: Lanzar evento de repintado en tiempo real (igual que tamaño)
                window.dispatchEvent(new CustomEvent('vortex-layout-refresh'));
            }
        });
        _domRefs.rangeSpacing.addEventListener('change', () => {
            // 🟢 FIX: Eliminamos _applyPreferences() para evitar el rebote del ARIA
            _savePreferences();
        });
    }

    // Slider Espaciado de Caracteres
    if (_domRefs.rangeLetterSpacing) {
        _domRefs.rangeLetterSpacing.addEventListener('input', (e) => {
            const step = parseInt(e.target.value);
            const info = data.A11Y.LETTER_SPACING_MAP[step];
            
            if (info) {
                _prefs.letterSpacing = info.letter;
                _prefs.wordSpacing = info.word;
                
                e.target.setAttribute('aria-valuenow', step);
                e.target.setAttribute('aria-valuetext', i18n.getString(info.labelKey));

                _updateLetterSpacingLabel(step);
                
                const root = document.documentElement;
                root.style.setProperty('--letter-spacing-base', _prefs.letterSpacing);
                root.style.setProperty('--word-spacing-base', _prefs.wordSpacing);

                window.dispatchEvent(new CustomEvent('vortex-layout-refresh'));
            }
        });
        _domRefs.rangeLetterSpacing.addEventListener('change', () => _savePreferences());
    }

    // Botones de Tema
    if (_domRefs.themeBtns) {
        _domRefs.themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                _prefs.theme = btn.dataset.theme;
                _applyPreferences();
                _savePreferences();
                
                // Anuncio al lector de pantalla
                if (window.App && window.App.announceA11y) {
                    window.App.announceA11y(`Tema cambiado a: ${btn.innerText}`, 'polite');
                }
            });
        });
    }

    // Checkbox Reducir Animaciones
    if (_domRefs.reduceMotionCb) {
        // 🟢 Evitar el salto de foco al hacer clic con el ratón (Bypass Focus Trap)
        const label = _domRefs.reduceMotionCb.closest('label');
        if (label) {
            label.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Evitamos que el foco caiga al 'body' temporalmente
                _domRefs.reduceMotionCb.focus(); // Forzamos el foco directo al checkbox
            });
        }

        _domRefs.reduceMotionCb.addEventListener('change', (e) => {
            _prefs.reduceMotion = e.target.checked;
            _applyPreferences();
            _savePreferences();
        });
    }

    if (_domRefs.noBlockOpacityCb) {
        _domRefs.noBlockOpacityCb.addEventListener('change', (e) => {
            _prefs.noBlockOpacity = e.target.checked;
            _applyPreferences();
            _savePreferences();
        });
    }
    if (_domRefs.noMaskOpacityCb) {
        _domRefs.noMaskOpacityCb.addEventListener('change', (e) => {
            _prefs.noMaskOpacity = e.target.checked;
            _applyPreferences();
            _savePreferences();
        });
    }

    if (_domRefs.noZoneOpacityCb) {
        _domRefs.noZoneOpacityCb.addEventListener('change', (e) => {
            _prefs.noZoneOpacity = e.target.checked;
            _applyPreferences();
            _savePreferences();
        });
    }

    // Botón Reset
    if (_domRefs.resetBtn) {
        _domRefs.resetBtn.addEventListener('click', () => {
            _prefs = { ...data.A11Y.DEFAULTS };
            _applyPreferences();
            _savePreferences();
            
            // 🟢 FIX: Notificar al usuario sobre el éxito de la acción
            if (window.App && window.App.announceA11y) {
                // Intenta obtener la traducción, o usa un texto por defecto
                const msg = i18n.getString('modal.resetSuccess') || 'Valores por defecto restaurados';
                
                // 1. Quitamos la clase temporalmente para saltar el bloqueo
                _domRefs.overlay.classList.remove('active');
                
                // 2. Lanzamos el anuncio
                window.App.announceA11y(msg, 'assertive');
                
                // 3. Devolvemos la clase inmediatamente (visualmente no parpadea nada)
                _domRefs.overlay.classList.add('active');
            }
        });
    }
}

export function openModal() {
    if (!_domRefs.overlay) return;

    // Metemos la lógica de apertura visual en una sub-función
    const showModal = () => {
        _updateModalUI();
        _domRefs.overlay.classList.add('active');
        _domRefs.overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        if (window.App && typeof window.App.applySmartFocus === 'function') {
            window.App.STATE.pendingA11yContext = i18n.getString('modal.opened') || 'Configuración de accesibilidad abierta';
            window.App.applySmartFocus(_domRefs.closeBtn);
        } else {
            _domRefs.closeBtn.focus();
        }
    };

    // 🟢 LAZY LOAD: Esperamos la promesa antes de lanzar showModal()
    if (window.App && typeof window.App._injectCSS === 'function') {
        window.App._injectCSS('styles/style-a11y.css', 'vortex-css-a11y').then(showModal);
    } else {
        showModal();
    }
}

export function closeModal() {
    if (!_domRefs.overlay) return;

    _domRefs.overlay.classList.remove('active');
    _domRefs.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // 🟢 FIX: El menú desplegable está cerrado, así que devolvemos el foco 
    // al botón hamburguesa principal de la cabecera.
    const btnMainMenu = document.getElementById('btn-main-menu');

    if (btnMainMenu) {
        if (window.App && typeof window.App.applySmartFocus === 'function') {
            window.App.STATE.pendingA11yContext = i18n.getString('modal.closed') || 
                'Configuración de accesibilidad cerrada';
            window.App.applySmartFocus(btnMainMenu);
        } else {
            btnMainMenu.focus();
        }
    }
}

/* --- code/a11y.js --- */