/* --- code/features/a11y/a11y-modal.js --- */

import * as debug from '../../debug/debug.js';
import * as i18n from '../../services/i18n.js';
import * as data from '../../services/data.js';
import * as a11yCore from './a11y.js'; // Importamos el core para aplicar y guardar

let _domRefs = {};
let _isHtmlInjected = false;

export function showA11yModal(appInstance) {
    if (!_isHtmlInjected) {
        _injectModalHTML();
        _cacheDOM();
        _setupListeners(appInstance);
        _isHtmlInjected = true;
    } else {
        // 🟢 FIX: Si el DOM ya estaba construido, forzamos un refresco 
        // de los textos por si el usuario ha cambiado el idioma.
        _refreshLanguage();
    }

    _updateModalUI();
    
    // 🟢 Damos 1 milisegundo al motor CSS para reconocer el nuevo HTML 
    // antes de activarlo, garantizando que la transición fluida funcione.
    requestAnimationFrame(() => {
        if (!_domRefs.overlay) return;
        
        _domRefs.overlay.classList.add('active');
        _domRefs.overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        if (window.App && typeof window.App.applySmartFocus === 'function') {
            window.App.STATE.pendingA11yContext = i18n.getString('modal.opened');
            window.App.applySmartFocus(_domRefs.closeBtn);

        } else {
            _domRefs.closeBtn.focus();
        }
    });
}

export function closeModal() {
    if (!_domRefs.overlay) return;

    // 1. Guardar referencia del botón destino antes de destruir el entorno
    const btnMainMenu = document.getElementById('btn-main-menu');

    // 2. 💥 DESTRUCCIÓN TOTAL (Nuke it from orbit)
    // El navegador elimina el nodo, sus dimensiones y su historial de scroll.
    _domRefs.overlay.remove();

    // 3. Limpiar estado y memoria
    document.body.style.overflow = '';
    _isHtmlInjected = false; 
    _domRefs = {}; // Garbage Collection: liberamos las referencias

    // 4. Asentar el foco de vuelta en la aplicación principal
    if (btnMainMenu) {
        if (window.App && typeof window.App.applySmartFocus === 'function') {
            window.App.STATE.pendingA11yContext = i18n.getString('modal.closed');
            window.App.applySmartFocus(btnMainMenu);
        } else {
            btnMainMenu.focus();
        }
    }
}

function _updateModalUI() {
    if (!_domRefs.modal) return;

    debug.log('a11y_modal', debug.DEBUG_LEVELS.EXTREME, 
        '🎨 Ejecutando _updateModalUI. Sincronizando DOM con _prefs del Core.');

    // Botones de Fuente
    _domRefs.fontBtns.forEach(btn => {
        const isSelected = btn.dataset.font === a11yCore._prefs.fontType;
        btn.classList.toggle('selected', isSelected);
        btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');

        const prefix = isSelected ? i18n.getString('modal.aria.fontCurrent') : i18n.getString('modal.aria.fontChange');
        const accessibleText = `${prefix}${btn.innerText.trim()}`;
        btn.setAttribute('aria-label', accessibleText);
        btn.setAttribute('title', accessibleText);
    });

    // Radio Buttons de Tema
    if (_domRefs.themeBtns) {
        _domRefs.themeBtns.forEach(btn => {
            const isSelected = btn.dataset.theme === a11yCore._prefs.theme;
            btn.classList.toggle('selected', isSelected);
            btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');

            const prefix = isSelected ? i18n.getString('modal.aria.themeCurrent') : i18n.getString('modal.aria.themeChange');
            const accessibleText = `${prefix}${btn.innerText.trim()}`;
            btn.setAttribute('aria-label', accessibleText);
            btn.setAttribute('title', accessibleText);
        });
    }

    // Slider Texto
    if (_domRefs.rangeSize) {
        _domRefs.rangeSize.value = a11yCore._prefs.fontSizePct;
        _domRefs.rangeSize.setAttribute('aria-valuenow', a11yCore._prefs.fontSizePct);
        _updateSliderLabel(a11yCore._prefs.fontSizePct);
    }

    // Slider Espaciado
    if (_domRefs.rangeSpacing) {
        let step = 2; 
        for (const [key, info] of Object.entries(data.A11Y.SPACING_MAP)) {
            if (info.val === a11yCore._prefs.lineHeight) step = key;
        }
        _domRefs.rangeSpacing.value = step;
        _domRefs.rangeSpacing.setAttribute('aria-valuenow', step);
        const labelKey = data.A11Y.SPACING_MAP[step]?.labelKey;
        _domRefs.rangeSpacing.setAttribute('aria-valuetext', i18n.getString(labelKey));
        
        _updateSpacingLabel(step);
    }

    // Slider Caracteres
    if (_domRefs.rangeLetterSpacing) {
        let step = 1; 
        for (const [key, info] of Object.entries(data.A11Y.LETTER_SPACING_MAP)) {
            if (info.letter === a11yCore._prefs.letterSpacing) step = key;
        }
        _domRefs.rangeLetterSpacing.value = step;
        _domRefs.rangeLetterSpacing.setAttribute('aria-valuenow', step);
        const labelKey = data.A11Y.LETTER_SPACING_MAP[step]?.labelKey;
        _domRefs.rangeLetterSpacing.setAttribute('aria-valuetext', i18n.getString(labelKey));
        
        _updateLetterSpacingLabel(step);
    }

    // ==========================================
    // 🟢 SINCRONIZAR ESTADO DE LOS CHECKBOXES
    // ==========================================
    if (_domRefs.reduceMotionCb) {
        _domRefs.reduceMotionCb.checked = a11yCore._prefs.reduceMotion === true;
    }

    if (_domRefs.noBlockOpacityCb) {
        _domRefs.noBlockOpacityCb.checked = a11yCore._prefs.noBlockOpacity === true;
    }

    if (_domRefs.noMaskOpacityCb) {
        _domRefs.noMaskOpacityCb.checked = a11yCore._prefs.noMaskOpacity === true;
    }

    if (_domRefs.noZoneOpacityCb) {
        _domRefs.noZoneOpacityCb.checked = a11yCore._prefs.noZoneOpacity === true;
    }
}

function _updateSliderLabel(pct) {
    if (!_domRefs.rangeVal) return;
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

function _refreshLanguage() {
    if (!_domRefs.overlay) return;

    // 1. Traducir textos estáticos puros (títulos, spans, botones)
    _domRefs.overlay.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = i18n.getString(el.getAttribute('data-i18n'));
    });

    // 2. Traducir atributos ARIA y Title estáticos (cerrar, rangos, checkboxes)
    _domRefs.overlay.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const text = i18n.getString(el.getAttribute('data-i18n-aria'));
        if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', text);
        if (el.hasAttribute('title')) el.setAttribute('title', text);
    });

    // NOTA: Los labels dinámicos (100%, Normal, etc) y los estados ARIA de 
    // las fuentes se traducirán solos porque _updateModalUI() se ejecuta después.
}

function _injectModalHTML() {
    if (document.getElementById('a11y-modal-overlay')) return;

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
                    <h2 id="a11y-title" 
                        data-i18n="modal.title">
                        ${i18n.getString('modal.title')}
                    </h2>
                    <button id="a11y-close" 
                            class="a11y-close-btn" 
                            data-i18n-aria="modal.close" 
                            aria-label="${i18n.getString('modal.close')}" 
                            title="${i18n.getString('modal.close')}">
                        ✕
                    </button>
                </div>

                <div class="a11y-section">
                    <h3 data-i18n="modal.sections.motion">
                        ${i18n.getString('modal.sections.motion')}
                    </h3>
                    <div class="a11y-controls-group">
                        <label class="a11y-checkbox-label">
                            <input type="checkbox" 
                                   id="a11y-reduce-motion" 
                                   class="a11y-checkbox" 
                                   data-i18n-aria="modal.options.reduceMotion" 
                                   title="${i18n.getString('modal.options.reduceMotion')}">
                            <span data-i18n="modal.options.reduceMotion">
                                ${i18n.getString('modal.options.reduceMotion')}
                            </span>
                        </label>

                        <label class="a11y-checkbox-label">
                            <input type="checkbox" 
                                   id="a11y-no-zone-opacity" 
                                   class="a11y-checkbox" 
                                   data-i18n-aria="modal.options.noZoneOpacity" 
                                   title="${i18n.getString('modal.options.noZoneOpacity')}">
                            <span data-i18n="modal.options.noZoneOpacity">
                                ${i18n.getString('modal.options.noZoneOpacity')}
                            </span>
                        </label>

                        <label class="a11y-checkbox-label">
                            <input type="checkbox" 
                                   id="a11y-no-mask-opacity" 
                                   class="a11y-checkbox" 
                                   data-i18n-aria="modal.options.noMaskOpacity" 
                                   title="${i18n.getString('modal.options.noMaskOpacity')}">
                            <span data-i18n="modal.options.noMaskOpacity">
                                ${i18n.getString('modal.options.noMaskOpacity')}
                            </span>
                        </label>

                        <label class="a11y-checkbox-label">
                            <input type="checkbox" 
                                   id="a11y-no-block-opacity" 
                                   class="a11y-checkbox" 
                                   data-i18n-aria="modal.options.noBlockOpacity" 
                                   title="${i18n.getString('modal.options.noBlockOpacity')}">
                            <span data-i18n="modal.options.noBlockOpacity">
                                ${i18n.getString('modal.options.noBlockOpacity')}
                            </span>
                        </label>

                    </div>
                </div>

                <div class="a11y-section">
                    <h3 data-i18n="modal.sections.font">
                        ${i18n.getString('modal.sections.font')}
                    </h3>
                    <div class="a11y-controls-group font-group" 
                         role="radiogroup" 
                         data-i18n-aria="modal.sections.font" 
                         aria-label="${i18n.getString('modal.sections.font')}" 
                         title="${i18n.getString('modal.sections.font')}">

                        <button class="a11y-option-btn font-preview-atkinson" 
                                role="radio" 
                                aria-checked="false" 
                                data-font="atkinson" 
                                data-i18n="modal.options.atkinson" 
                                aria-label="${i18n.getString('modal.aria.font')} Atkinson" 
                                title="${i18n.getString('modal.aria.font')} Atkinson">
                            ${i18n.getString('modal.options.atkinson')}
                        </button>

                        <button class="a11y-option-btn font-preview-serif" 
                                role="radio" 
                                aria-checked="false" 
                                data-font="serif" 
                                data-i18n="modal.options.serif" 
                                aria-label="${i18n.getString('modal.aria.font')} Serif" 
                                title="${i18n.getString('modal.aria.font')} Serif">
                            ${i18n.getString('modal.options.serif')}
                        </button>

                        <button class="a11y-option-btn font-preview-dyslexic" 
                                role="radio" 
                                aria-checked="false" 
                                data-font="dyslexic" 
                                data-i18n="modal.options.dyslexic" 
                                aria-label="${i18n.getString('modal.aria.font')} Dyslexic" 
                                title="${i18n.getString('modal.aria.font')} Dyslexic">
                            ${i18n.getString('modal.options.dyslexic')}
                        </button>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3 data-i18n="modal.sections.size">
                        ${i18n.getString('modal.sections.size')}
                    </h3>
                    <div class="a11y-range-wrapper">
                        <span class="range-icon-small" 
                              aria-hidden="true">
                            A
                        </span>
                        <input type="range" 
                               id="a11y-range-size" 
                               class="a11y-range" 
                               min="90" 
                               max="200" 
                               step="5" 
                               data-i18n-aria="modal.aria.textSize" 
                               aria-label="${i18n.getString('modal.aria.textSize')}" 
                               title="${i18n.getString('modal.aria.textSize')}" 
                               aria-valuemin="90" 
                               aria-valuemax="200">
                        <span class="range-icon-large" 
                              aria-hidden="true">
                            A
                        </span>
                        <span id="a11y-range-val" 
                              class="a11y-range-value">
                            100%
                        </span>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3 data-i18n="modal.sections.spacing">
                        ${i18n.getString('modal.sections.spacing')}
                    </h3>
                    <div class="a11y-range-wrapper">
                        <span class="range-icon-small" 
                              aria-hidden="true">
                            ≡
                        </span>
                        <input type="range" 
                               id="a11y-range-spacing" 
                               class="a11y-range" 
                               min="1" 
                               max="3" 
                               step="1" 
                               data-i18n-aria="modal.aria.lineSpacing" 
                               aria-label="${i18n.getString('modal.aria.lineSpacing')}" 
                               title="${i18n.getString('modal.aria.lineSpacing')}" 
                               aria-valuemin="1" 
                               aria-valuemax="3">
                        <span class="range-icon-large" 
                              aria-hidden="true">
                            ≡
                        </span>
                        <span id="a11y-range-spacing-val" 
                              class="a11y-range-value">
                            ${i18n.getString('modal.spacing.normal')}
                        </span>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3 data-i18n="modal.sections.letterSpacing">
                        ${i18n.getString('modal.sections.letterSpacing')}
                    </h3>
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
                               data-i18n-aria="modal.aria.letterSpacing" 
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
                    <h3 data-i18n="modal.sections.theme">
                        ${i18n.getString('modal.sections.theme')}
                    </h3>
                    <div class="a11y-controls-group theme-group" 
                         role="radiogroup" 
                        data-i18n-aria="modal.sections.theme" 
                        aria-label="${i18n.getString('modal.sections.theme')}" 
                        title="${i18n.getString('modal.sections.theme')}">

                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="default" 
                                data-i18n="modal.options.themeDefault">
                            ${i18n.getString('modal.options.themeDefault')}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="light" 
                                data-i18n="modal.options.themeLight">
                            ${i18n.getString('modal.options.themeLight')}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="dark" 
                                data-i18n="modal.options.themeDark">
                            ${i18n.getString('modal.options.themeDark')}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="contrast" 
                                data-i18n="modal.options.themeContrast">
                            ${i18n.getString('modal.options.themeContrast')}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="forced" 
                                data-i18n="modal.options.themeForced">
                            ${i18n.getString('modal.options.themeForced')}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="yellow" 
                                data-i18n="modal.options.themeYellow">
                            ${i18n.getString('modal.options.themeYellow')}
                        </button>
                    </div>
                </div>
                <div class="a11y-footer">
                    <button id="a11y-reset" 
                            data-i18n-aria="modal.reset" 
                            aria-label="${i18n.getString('modal.reset')}" 
                            title="${i18n.getString('modal.reset')}">
                    </button>
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
        fontBtns: document.querySelectorAll('.font-group [data-font]'),
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
        noZoneOpacityCb: document.getElementById('a11y-no-zone-opacity')
    };
}

function _setupListeners(appInstance) {
    if (_domRefs.closeBtn) _domRefs.closeBtn.addEventListener('click', closeModal);

    if (_domRefs.overlay) {
        _domRefs.overlay.addEventListener('click', (e) => {
            if (e.target === _domRefs.overlay) closeModal();
        });
    }

    // Cambiar Fuente
    _domRefs.fontBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            a11yCore._prefs.fontType = btn.dataset.font;
            
            a11yCore._savePreferences(null, true);
            _updateModalUI();
        });
    });

    // Slider Tamaño
    if (_domRefs.rangeSize) {
        _domRefs.rangeSize.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            a11yCore._prefs.fontSizePct = val;
            
            e.target.setAttribute('aria-valuenow', val);
            document.documentElement.style.setProperty('--font-scale', val / 100);
            _updateSliderLabel(val);

            window.dispatchEvent(new CustomEvent('vortex-layout-refresh'));

            if (document.activeElement === e.target) {
                requestAnimationFrame(() => {
                    e.target.scrollIntoView({ 
                        behavior: 'auto', 
                        block: 'nearest', 
                        inline: 'nearest' 
                    });
                });
            }
        });
        _domRefs.rangeSize.addEventListener('change', () => a11yCore._savePreferences(null, true));
    }

    // Slider Espaciado
    if (_domRefs.rangeSpacing) {
        _domRefs.rangeSpacing.addEventListener('input', (e) => {
            const step = parseInt(e.target.value);
            const info = data.A11Y.SPACING_MAP[step];
            if (info) {
                a11yCore._prefs.lineHeight = info.val;
                a11yCore._prefs.paragraphSpacing = info.val;
                
                e.target.setAttribute('aria-valuenow', step);
                e.target.setAttribute('aria-valuetext', i18n.getString(info.labelKey));
                _updateSpacingLabel(step);
                
                const root = document.documentElement;
                root.style.setProperty(
                    '--line-height-base', a11yCore._prefs.lineHeight
                );
                root.style.setProperty(
                    '--paragraph-spacing', `${a11yCore._prefs.paragraphSpacing}em`
                );

                window.dispatchEvent(new CustomEvent('vortex-layout-refresh'));

                if (document.activeElement === e.target) {
                    requestAnimationFrame(() => {
                        e.target.scrollIntoView({ 
                            behavior: 'auto', 
                            block: 'nearest', 
                            inline: 'nearest' 
                        });
                    });
                }
            }
        });
        _domRefs.rangeSpacing.addEventListener('change', () => {
            a11yCore._savePreferences(null, true)
        });
    }

    // Slider Espaciado de Caracteres
    if (_domRefs.rangeLetterSpacing) {
        _domRefs.rangeLetterSpacing.addEventListener('input', (e) => {
            const step = parseInt(e.target.value);
            const info = data.A11Y.LETTER_SPACING_MAP[step];
            
            if (info) {
                a11yCore._prefs.letterSpacing = info.letter;
                a11yCore._prefs.wordSpacing = info.word;
                
                e.target.setAttribute('aria-valuenow', step);
                e.target.setAttribute('aria-valuetext', i18n.getString(info.labelKey));
                _updateLetterSpacingLabel(step);
                
                const root = document.documentElement;
                root.style.setProperty('--letter-spacing-base', a11yCore._prefs.letterSpacing);
                root.style.setProperty('--word-spacing-base', a11yCore._prefs.wordSpacing);

                window.dispatchEvent(new CustomEvent('vortex-layout-refresh'));

                if (document.activeElement === e.target) {
                    requestAnimationFrame(() => {
                        e.target.scrollIntoView({ 
                            behavior: 'auto', 
                            block: 'nearest', 
                            inline: 'nearest' 
                        });
                    });
                }
            }
        });
        _domRefs.rangeLetterSpacing.addEventListener('change', () => {
            a11yCore._savePreferences(null, true)});
    }

    // Botones de Tema
    if (_domRefs.themeBtns) {
        _domRefs.themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                a11yCore._prefs.theme = btn.dataset.theme;
                
                a11yCore._savePreferences();
                _updateModalUI();
                
                if (window.App && window.App.announceA11y) {
                    const prefix = i18n.getString('modal.aria.themeChanged');
                    window.App.announceA11y(`${prefix}${btn.innerText}`, 'polite');
                }
            });
        });
    }

    // Checkboxes
    if (_domRefs.reduceMotionCb) {
        const label = _domRefs.reduceMotionCb.closest('label');
        if (label) {
            label.addEventListener('mousedown', (e) => {
                e.preventDefault(); 
                _domRefs.reduceMotionCb.focus(); 
            });
        }
        _domRefs.reduceMotionCb.addEventListener('change', (e) => {
            a11yCore._prefs.reduceMotion = e.target.checked;
            
            a11yCore._savePreferences();
        });
    }

    if (_domRefs.noBlockOpacityCb) {
        _domRefs.noBlockOpacityCb.addEventListener('change', (e) => {
            a11yCore._prefs.noBlockOpacity = e.target.checked;
            
            a11yCore._savePreferences();
        });
    }

    if (_domRefs.noMaskOpacityCb) {
        _domRefs.noMaskOpacityCb.addEventListener('change', (e) => {
            a11yCore._prefs.noMaskOpacity = e.target.checked;
            
            a11yCore._savePreferences();
        });
    }

    if (_domRefs.noZoneOpacityCb) {
        _domRefs.noZoneOpacityCb.addEventListener('change', (e) => {
            a11yCore._prefs.noZoneOpacity = e.target.checked;
            
            a11yCore._savePreferences();
        });
    }

    // Botón Reset
    if (_domRefs.resetBtn) {
        _domRefs.resetBtn.addEventListener('click', () => {
            // Reasignamos el objeto sin romper la referencia exportada
            Object.assign(a11yCore._prefs, data.A11Y.DEFAULTS);
            
            a11yCore._savePreferences(null, true);
            _updateModalUI();
            
            if (window.App && window.App.announceA11y) {
                const msg = i18n.getString('modal.resetSuccess');
                _domRefs.overlay.classList.remove('active');
                window.App.announceA11y(msg, 'assertive');
                _domRefs.overlay.classList.add('active');
            }
        });
    }

    // 🟢 FIX: Forzar foco lógico y visual en los sliders al tocarlos/hacer clic
    const ranges = [
        _domRefs.rangeSize, 
        _domRefs.rangeSpacing, 
        _domRefs.rangeLetterSpacing
    ];
    ranges.forEach(range => {
        if (range) {
            // Ratón
            range.addEventListener('mousedown', () => {
                requestAnimationFrame(() => range.focus());
            });
            // Táctil
            range.addEventListener('touchstart', () => {
                requestAnimationFrame(() => range.focus());
            }, { passive: true });
        }
    });
}

/* --- code/features/a11y/a11y-modal.js --- */