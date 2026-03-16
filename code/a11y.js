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

    // 🟢 Aplicar Tema al body (El CSS se encargará del resto)
    document.body.setAttribute('data-theme', _prefs.theme || 'default');

    // 🟢 Aplicar Reducción de movimiento al body
    document.body.setAttribute('data-reduced-motion', _prefs.reduceMotion ? 'true' : 'false');

    // 🟢 Atributos para la atenuación de textos y zonas
    document.body.setAttribute('data-no-block-opacity', _prefs.noBlockOpacity ? 'true' : 'false');
    document.body.setAttribute('data-no-mask-opacity', _prefs.noMaskOpacity ? 'true' : 'false');

    document.body.setAttribute('data-no-zone-opacity', _prefs.noZoneOpacity ? 'true' : 'false');

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
                    <h2 id="a11y-title">${i18n.getString('modal.title')}</h2>

                    <button id="a11y-close" 
                            class="a11y-close-btn" 
                            aria-label="${i18n.getString('modal.close')}">✕</button>
                </div>

                <div class="a11y-section">
                    <h3>${i18n.getString('modal.sections.font')}</h3>

                    <div class="a11y-controls-group font-group" 
                        role="radiogroup" 
                        aria-label="${i18n.getString('modal.sections.font')}">

                        <button class="a11y-option-btn font-preview-atkinson" 
                            role="radio"
                            aria-checked="false"
                            data-font="atkinson" 
                            aria-label="${i18n.getString('modal.aria.font')} Atkinson">

                            ${i18n.getString('modal.options.atkinson')}
                        </button>

                        <button class="a11y-option-btn font-preview-serif" 
                            role="radio"
                            aria-checked="false"
                            data-font="serif" 
                            aria-label="${i18n.getString('modal.aria.font')} Serif">

                            ${i18n.getString('modal.options.serif')}
                        </button>

                        <button class="a11y-option-btn font-preview-dyslexic" 
                            role="radio"
                            aria-checked="false"
                            data-font="dyslexic" 
                            aria-label="${i18n.getString('modal.aria.font')} Dyslexic">

                            ${i18n.getString('modal.options.dyslexic')}
                        </button>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>${i18n.getString('modal.sections.size')}</h3>
                    <div class="a11y-range-wrapper">
                        <span class="range-icon-small" style="font-size: 0.8rem" 
                            aria-hidden="true">A</span>

                        <input type="range" 
                            id="a11y-range-size" 
                            class="a11y-range" 
                            min="90" 
                            max="200" 
                            step="5" 
                            aria-label="${i18n.getString('modal.aria.textSize')}"
                            aria-valuemin="90" 
                            aria-valuemax="200">

                        <span class="range-icon-large" style="font-size: 1.2rem" 
                            aria-hidden="true">A</span>

                        <span id="a11y-range-val" 
                            class="a11y-range-value">100%</span>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>${i18n.getString('modal.sections.spacing')}</h3>
                    <div class="a11y-range-wrapper">
                        <span class="range-icon-small" 
                            style="font-size: 0.8rem" 
                            aria-hidden="true">≡</span>

                        <input type="range" 
                            id="a11y-range-spacing" 
                            class="a11y-range" 
                            min="1" 
                            max="3" 
                            step="1" 
                            aria-label="${i18n.getString('modal.aria.lineSpacing')}"
                            aria-valuemin="1" 
                            aria-valuemax="3">

                        <span class="range-icon-large" 
                            style="font-size: 1.2rem" 
                            aria-hidden="true">≡</span>

                        <span id="a11y-range-spacing-val" 
                            class="a11y-range-value">${i18n.getString('modal.spacing.normal')}</span>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>${i18n.getString('modal.sections.theme') || 'Tema de Color'}</h3>
                    <div class="a11y-controls-group theme-group" role="radiogroup" aria-label="${i18n.getString('modal.sections.theme') || 'Tema de Color'}">
                        <button class="a11y-option-btn" role="radio" aria-checked="false" data-theme="default">
                            ${i18n.getString('modal.options.themeDefault') || 'Sistema'}
                        </button>
                        <button class="a11y-option-btn" role="radio" aria-checked="false" data-theme="light">
                            ${i18n.getString('modal.options.themeLight') || 'Claro'}
                        </button>
                        <button class="a11y-option-btn" role="radio" aria-checked="false" data-theme="dark">
                            ${i18n.getString('modal.options.themeDark') || 'Oscuro'}
                        </button>
                        <button class="a11y-option-btn" role="radio" aria-checked="false" data-theme="contrast">
                            ${i18n.getString('modal.options.themeContrast') || 'Alto Contraste'}
                        </button>
                        <button class="a11y-option-btn" role="radio" aria-checked="false" data-theme="forced">
                            ${i18n.getString('modal.options.themeForced') || 'Forzados'}
                        </button>
                        <button class="a11y-option-btn" role="radio" aria-checked="false" data-theme="yellow">
                            ${i18n.getString('modal.options.themeYellow') || 'Amarillo/Negro'}
                        </button>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>${i18n.getString('modal.sections.motion') || 'Protección vestibular y fatiga cognitiva'}</h3>
                    <div class="a11y-controls-group">
                        
                        <label class="a11y-checkbox-label" style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                            <input type="checkbox" id="a11y-reduce-motion" class="a11y-checkbox" style="width:20px; height:20px;">
                            <span style="font-size: var(--a11y-option-btn-font-size);">${i18n.getString('modal.options.reduceMotion') || 'Reducir animaciones'}</span>
                        </label>

                        <label class="a11y-checkbox-label" style="display:flex; align-items:center; gap:10px; cursor:pointer; margin-top: 10px;">
                            <input type="checkbox" id="a11y-no-block-opacity" class="a11y-checkbox" style="width:20px; height:20px;">
                            <span style="font-size: var(--a11y-option-btn-font-size);">${i18n.getString('modal.options.noBlockOpacity') || 'Desactivar atenuación en descripción de cursos'}</span>
                        </label>

                        <label class="a11y-checkbox-label" style="display:flex; align-items:center; gap:10px; cursor:pointer; margin-top: 10px;">
                            <input type="checkbox" id="a11y-no-mask-opacity" class="a11y-checkbox" style="width:20px; height:20px;">
                            <span style="font-size: var(--a11y-option-btn-font-size);">${i18n.getString('modal.options.noMaskOpacity') || 'Desactivar atenuación en menúes'}</span>
                        </label>

                        <label class="a11y-checkbox-label" style="display:flex; align-items:center; gap:10px; cursor:pointer; margin-top: 10px;">
                            <input type="checkbox" id="a11y-no-zone-opacity" class="a11y-checkbox" style="width:20px; height:20px;">
                            <span style="font-size: var(--a11y-option-btn-font-size);">${i18n.getString('modal.options.noZoneOpacity') || 'Desactivar atenuación por zona'}</span>
                        </label>

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

        themeBtns: document.querySelectorAll('.theme-group .a11y-option-btn'),

        reduceMotionCb: document.getElementById('a11y-reduce-motion'),

        noBlockOpacityCb: document.getElementById('a11y-no-block-opacity'),
        noMaskOpacityCb: document.getElementById('a11y-no-mask-opacity'),

        noZoneOpacityCb: document.getElementById('a11y-no-zone-opacity'),
        
        triggerBtn: document.getElementById('btn-config-accesibilidad')
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

    _updateModalUI(); // Asegurar que UI está sincronizada al abrir

    _domRefs.overlay.classList.add('active');
    _domRefs.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // 🟢 FIX: Retrasar el anuncio para que el lector no lo interrumpa al leer el nuevo foco
    setTimeout(() => {
        _domRefs.closeBtn.focus();
        
        if (window.App && window.App.announceA11y) {
            // Quitamos la clase temporalmente para saltar el bloqueo de silencio
            _domRefs.overlay.classList.remove('active');
            
            window.App.announceA11y(
                i18n.getString('modal.opened') || 'Configuración de accesibilidad abierta', 
                'assertive'
            );
            
            // La devolvemos instantáneamente (sin parpadeo visual)
            _domRefs.overlay.classList.add('active');
        }
    }, 100); // 100ms da el tiempo exacto para que el lector procese el foco primero
}

export function closeModal() {
    if (!_domRefs.overlay) return;

    _domRefs.overlay.classList.remove('active');
    _domRefs.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // 🟢 FIX: Notificar al usuario que el modal se ha cerrado
    if (window.App && window.App.announceA11y) {
        window.App.announceA11y(
            i18n.getString('modal.closed') || 'Configuración de accesibilidad cerrada', 
            'assertive'
        );
    }

    // Devolver el foco al botón que abrió el modal
    if (_domRefs.triggerBtn) {
        _domRefs.triggerBtn.focus();
    }
}

/* --- code/a11y.js --- */