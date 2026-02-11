/* --- code/a11y.js --- */

import * as debug from './debug.js';
import { getString } from './i18n.js';

const STORAGE_KEY = 'vortex_a11y_prefs_v1';

const DEFAULTS = {
    fontType: 'sans',      
    fontSizePct: 100,      
    lineHeight: 1.5,       
    paragraphSpacing: 1.5 
};

// Mapeo para el slider de espaciado: Valor -> [AlturaLinea, Etiqueta]
const SPACING_MAP = {
    1: { val: 1.0, labelKey: 'modal.spacing.compact' },
    2: { val: 1.5, labelKey: 'modal.spacing.normal' },
    3: { val: 2.0, labelKey: 'modal.spacing.wide' }
};

let _prefs = { ...DEFAULTS };
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
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            _prefs = { ...DEFAULTS, ...JSON.parse(saved) };
        }
    } catch (e) {
        debug.logWarn('a11y', 'Error leyendo localStorage', e);
    }
}

function _savePreferences() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_prefs));

        debug.log('a11y', debug.DEBUG_LEVELS.BASIC, 'Preferencias guardadas.');
        
    } catch (e) {
        debug.logError('a11y', 'Error guardando a11y prefs', e);
    }
}

/**
 * Aplica las variables CSS al :root
 */
function _applyPreferences() {
    const root = document.documentElement;
    
    // 1. Familia
    let fontVar = 'var(--font-sans)';
    if (_prefs.fontType === 'serif') fontVar = 'var(--font-serif)';
    if (_prefs.fontType === 'dyslexic') fontVar = 'var(--font-dyslexic)';
    root.style.setProperty('--font-family-base', fontVar);

    // 2. Escala
    const scale = _prefs.fontSizePct / 100;
    root.style.setProperty('--font-scale', scale);

    // 3. Espaciado
    root.style.setProperty('--line-height-base', _prefs.lineHeight);
    root.style.setProperty('--paragraph-spacing', `${_prefs.paragraphSpacing}em`);

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

        // 🟢 Actualizar aria-pressed para feedback semántico
        btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
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
        for (const [key, data] of Object.entries(SPACING_MAP)) {
            if (data.val === _prefs.lineHeight) step = key;
        }
        _domRefs.rangeSpacing.value = step;
        
        // 🟢 Actualizar aria-valuetext para leer "Normal", "Amplio", etc.
        _domRefs.rangeSpacing.setAttribute('aria-valuenow', step);
        const labelKey = SPACING_MAP[step]?.labelKey || 'modal.spacing.normal';
        _domRefs.rangeSpacing.setAttribute('aria-valuetext', getString(labelKey));
        
        _updateSpacingLabel(step);
    }
}

function _updateSliderLabel(pct) {
    if (!_domRefs.rangeVal) return;

    const computedPx = parseFloat(getComputedStyle(document.documentElement).fontSize).toFixed(1);
    _domRefs.rangeVal.textContent = `${pct}%`; // (${computedPx}px)`;
}

function _updateSpacingLabel(step) {
    if (!_domRefs.rangeSpacingVal) return;
    const info = SPACING_MAP[step] || SPACING_MAP[2];

    _domRefs.rangeSpacingVal.textContent = getString(info.labelKey);
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
                    <h2 id="a11y-title">${getString('modal.title')}</h2>

                    <button id="a11y-close" 
                            class="a11y-close-btn" 
                            aria-label="${getString('modal.close')}">✕</button>
                </div>

                <div class="a11y-section">
                    <h3>${getString('modal.sections.font')}</h3>

                    <div class="a11y-controls-group font-group" 
                        role="group" 
                        aria-label="${getString('modal.sections.font')}">

                        <button class="a11y-option-btn font-preview-sans" 
                            data-font="sans" 
                            aria-label="${getString('modal.aria.font')} Sans">
                            ${getString('modal.options.sans')}
                        </button>

                        <button class="a11y-option-btn font-preview-serif" 
                            data-font="serif" 
                            aria-label="${getString('modal.aria.font')} Serif">
                            ${getString('modal.options.serif')}
                        </button>

                        <button class="a11y-option-btn font-preview-dyslexic" 
                            data-font="dyslexic" 
                            aria-label="${getString('modal.aria.font')} Dyslexic">
                            ${getString('modal.options.dyslexic')}
                        </button>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>${getString('modal.sections.size')}</h3>
                    <div class="a11y-range-wrapper">
                        <span style="font-size: 0.8rem" 
                            aria-hidden="true">A</span>

                        <span id="a11y-range-val" 
                            class="a11y-range-value">100%</span>

                        <span style="font-size: 1.2rem" 
                            aria-hidden="true">A</span>

                        <input type="range" 
                            id="a11y-range-size" 
                            class="a11y-range" 
                            min="90" 
                            max="200" 
                            step="5" 
                            aria-label="${getString('modal.aria.textSize')}"
                            aria-valuemin="90" 
                            aria-valuemax="200">
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>${getString('modal.sections.spacing')}</h3>
                    <div class="a11y-range-wrapper">
                        <span class="range-icon-small" 
                            style="font-size: 0.8rem" 
                            aria-hidden="true">≡</span>

                        <span id="a11y-range-spacing-val" 
                            class="a11y-range-value">${getString('modal.spacing.normal')}</span>

                        <span class="range-icon-large" 
                            style="font-size: 1.2rem" 
                            aria-hidden="true">≡</span>

                        <input type="range" 
                            id="a11y-range-spacing" 
                            class="a11y-range" 
                            min="1" 
                            max="3" 
                            step="1" 
                            aria-label="${getString('modal.aria.lineSpacing')}"
                            aria-valuemin="1" 
                            aria-valuemax="3">
                    </div>
                </div>

                <div class="a11y-footer">
                    <button id="a11y-reset" 
                        aria-label="${getString('modal.reset')}" 
                        title="${getString('modal.reset')}"></button>
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

    // Botón Reset
    if (_domRefs.resetBtn) {
        _domRefs.resetBtn.addEventListener('click', () => {
            _prefs = { ...DEFAULTS };
            _applyPreferences();
            _savePreferences();
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
            const info = SPACING_MAP[step];
            if (info) {
                _prefs.lineHeight = info.val;
                _prefs.paragraphSpacing = info.val;
                
                // 🟢 FIX: Actualizar atributos ARIA (ValueText)
                e.target.setAttribute('aria-valuenow', step);
                e.target.setAttribute('aria-valuetext', getString(info.labelKey));

                _updateSpacingLabel(step);
                
                const root = document.documentElement;
                root.style.setProperty('--line-height-base', _prefs.lineHeight);
                root.style.setProperty('--paragraph-spacing', `${_prefs.paragraphSpacing}em`);
            }
        });
        _domRefs.rangeSpacing.addEventListener('change', () => {
            _applyPreferences();
            _savePreferences();
        });
    }
}

export function openModal() {
    if (!_domRefs.overlay) return;

    // 🟢 Anunciar apertura
    if (window.App && window.App.announceA11y) {
        // Forzamos el anuncio aunque el modal se esté abriendo (ya que el bloqueo en App.js mira si está 'active')
        // Al llamarlo antes de añadir la clase 'active', pasará el filtro.
        window.App.announceA11y(getString('modal.opened') || 'Configuración de accesibilidad abierta', 'assertive');
    }

    _updateModalUI(); // Asegurar que UI está sincronizada al abrir
    _domRefs.overlay.classList.add('active');
    _domRefs.overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => _domRefs.closeBtn.focus(), 50);
    document.body.style.overflow = 'hidden'; 
}

export function closeModal() {
    if (!_domRefs.overlay) return;
    _domRefs.overlay.classList.remove('active');
    _domRefs.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (_domRefs.triggerBtn) _domRefs.triggerBtn.focus();
}

/* --- code/a11y.js --- */