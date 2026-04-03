/* --- code/a11y-modal.js --- */

import * as debug from './debug/debug.js';
import * as i18n from './i18n.js';
import * as data from './data.js';
import * as a11yCore from './a11y.js'; // Importamos el core para aplicar y guardar

let _domRefs = {};
let _isHtmlInjected = false;

export function showA11yModal(appInstance) {
    if (!_isHtmlInjected) {
        _injectModalHTML();
        _cacheDOM();
        _setupListeners(appInstance);
        _isHtmlInjected = true;
    }

    _updateModalUI();
    
    _domRefs.overlay.classList.add('active');
    _domRefs.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (window.App && typeof window.App.applySmartFocus === 'function') {
        window.App.STATE.pendingA11yContext = i18n.getString('modal.opened');
        window.App.applySmartFocus(_domRefs.closeBtn);
    } else {
        _domRefs.closeBtn.focus();
    }
}

export function closeModal() {
    if (!_domRefs.overlay) return;

    _domRefs.overlay.classList.remove('active');
    _domRefs.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Devolvemos el foco al botón hamburguesa principal de la cabecera
    const btnMainMenu = document.getElementById('btn-main-menu');

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
    // 🟢 TELEMETRÍA EN CHECKBOXES
    // ==========================================
    if (_domRefs.reduceMotionCb) {
        const label = _domRefs.reduceMotionCb.closest('label');
        if (label) {
            label.addEventListener('mousedown', (e) => {
                debug.log('a11y_modal', debug.DEBUG_LEVELS.EXTREME, 
                    '👇 Mousedown en Label (ReduceMotion). Bloqueando nativo y forzando foco.');

                e.preventDefault(); 
                _domRefs.reduceMotionCb.focus(); 
            });
        }
        _domRefs.reduceMotionCb.addEventListener('change', (e) => {
            debug.log('a11y_modal', debug.DEBUG_LEVELS.BASIC, 
                `🔄 Evento 'change' capturado (ReduceMotion). Nuevo valor: ${e.target.checked}`);

            a11yCore._prefs.reduceMotion = e.target.checked;
            a11yCore._savePreferences();
        });
    }

    if (_domRefs.noBlockOpacityCb) {
        const label = _domRefs.noBlockOpacityCb.closest('label');
        if (label) {
            label.addEventListener('mousedown', (e) => {
                debug.log('a11y_modal', debug.DEBUG_LEVELS.EXTREME, 
                    '👇 Mousedown en Label (NoBlockOpacity). Bloqueando nativo y forzando foco.');

                e.preventDefault(); 
                _domRefs.noBlockOpacityCb.focus(); 
            });
        }
        _domRefs.noBlockOpacityCb.addEventListener('change', (e) => {
            debug.log('a11y_modal', debug.DEBUG_LEVELS.BASIC, 
                `🔄 Evento 'change' capturado (NoBlockOpacity). Nuevo valor: ${e.target.checked}`);

            a11yCore._prefs.noBlockOpacity = e.target.checked;
            a11yCore._savePreferences();
        });
    }

    if (_domRefs.noMaskOpacityCb) {
        const label = _domRefs.noMaskOpacityCb.closest('label');
        if (label) {
            label.addEventListener('mousedown', (e) => {
                debug.log('a11y_modal', debug.DEBUG_LEVELS.EXTREME, 
                    '👇 Mousedown en Label (NoMaskOpacity). Bloqueando nativo y forzando foco.');

                e.preventDefault(); 
                _domRefs.noMaskOpacityCb.focus(); 
            });
        }
        _domRefs.noMaskOpacityCb.addEventListener('change', (e) => {
            debug.log('a11y_modal', debug.DEBUG_LEVELS.BASIC, 
                `🔄 Evento 'change' capturado (NoMaskOpacity). Nuevo valor: ${e.target.checked}`);

            a11yCore._prefs.noMaskOpacity = e.target.checked;
            a11yCore._savePreferences();
        });
    }

    if (_domRefs.noZoneOpacityCb) {
        const label = _domRefs.noZoneOpacityCb.closest('label');
        if (label) {
            label.addEventListener('mousedown', (e) => {
                debug.log('a11y_modal', debug.DEBUG_LEVELS.EXTREME, 
                    '👇 Mousedown en Label (NoZoneOpacity). Bloqueando nativo y forzando foco.');

                e.preventDefault(); 
                _domRefs.noZoneOpacityCb.focus(); 
            });
        }
        _domRefs.noZoneOpacityCb.addEventListener('change', (e) => {
            debug.log('a11y_modal', debug.DEBUG_LEVELS.BASIC, 
                `🔄 Evento 'change' capturado (NoZoneOpacity). Nuevo valor: ${e.target.checked}`);

            a11yCore._prefs.noZoneOpacity = e.target.checked;
            a11yCore._savePreferences();
        });
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
                    <h2 id="a11y-title">${i18n.getString('modal.title')}</h2>
                    <button id="a11y-close" 
                            class="a11y-close-btn" 
                            aria-label="${i18n.getString('modal.close')}" 
                            title="${i18n.getString('modal.close')}">✕</button>
                </div>
                <div class="a11y-section">
                    <h3>${i18n.getString('modal.sections.motion')}</h3>
                    <div class="a11y-controls-group">
                        <label class="a11y-checkbox-label">
                            <input type="checkbox" 
                                   id="a11y-reduce-motion" 
                                   class="a11y-checkbox"
                                   title="${i18n.getString('modal.options.reduceMotion')}">
                            <span>${i18n.getString('modal.options.reduceMotion')}</span>
                        </label>
                        <label class="a11y-checkbox-label">
                            <input type="checkbox" 
                                   id="a11y-no-block-opacity" 
                                   class="a11y-checkbox"
                                   title="${i18n.getString('modal.options.noBlockOpacity')}">
                            <span>${i18n.getString('modal.options.noBlockOpacity')}</span>
                        </label>
                        <label class="a11y-checkbox-label">
                            <input type="checkbox" 
                                   id="a11y-no-mask-opacity" 
                                   class="a11y-checkbox"
                                   title="${i18n.getString('modal.options.noMaskOpacity')}">
                            <span>${i18n.getString('modal.options.noMaskOpacity')}</span>
                        </label>
                        <label class="a11y-checkbox-label">
                            <input type="checkbox" 
                                   id="a11y-no-zone-opacity" 
                                   class="a11y-checkbox"
                                   title="${i18n.getString('modal.options.noZoneOpacity')}">
                            <span>${i18n.getString('modal.options.noZoneOpacity')}</span>
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
                    <h3>${i18n.getString('modal.sections.letterSpacing')}</h3>
                    <div class="a11y-range-wrapper">
                        <span class="range-icon-small" aria-hidden="true">T</span>
                        <input type="range" 
                               id="a11y-range-letter-spacing" 
                               class="a11y-range" 
                               min="1" 
                               max="3" 
                               step="1" 
                               aria-label="${i18n.getString('modal.aria.letterSpacing')}" 
                               title="${i18n.getString('modal.aria.letterSpacing')}" aria-valuemin="1" 
                               aria-valuemax="3">
                        <span class="range-icon-large" 
                              aria-hidden="true" 
                              style="letter-spacing: 0.2em;">T T</span>
                        <span id="a11y-range-letter-spacing-val" class="a11y-range-value">
                            ${i18n.getString('modal.spacing.normal')}
                        </span>
                    </div>
                </div>
                <div class="a11y-section">
                    <h3>${i18n.getString('modal.sections.theme')}</h3>
                    <div class="a11y-controls-group theme-group" 
                         role="radiogroup" 
                         aria-label="${i18n.getString('modal.sections.theme')}" 
                         title="${i18n.getString('modal.sections.theme')}">
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="default">
                            ${i18n.getString('modal.options.themeDefault')}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="light">
                            ${i18n.getString('modal.options.themeLight')}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="dark">
                            ${i18n.getString('modal.options.themeDark')}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="contrast">
                            ${i18n.getString('modal.options.themeContrast')}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="forced">
                            ${i18n.getString('modal.options.themeForced')}
                        </button>
                        <button class="a11y-option-btn" 
                                role="radio" 
                                aria-checked="false" 
                                data-theme="yellow">
                            ${i18n.getString('modal.options.themeYellow')}
                        </button>
                    </div>
                </div>
                <div class="a11y-footer">
                    <button id="a11y-reset" 
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

/* --- code/a11y-modal.js --- */