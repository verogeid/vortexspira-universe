/* --- code/a11y.js --- */

import * as debug from './debug.js';

const STORAGE_KEY = 'vortex_a11y_prefs_v1';

const DEFAULTS = {
    fontType: 'sans',      
    fontSizePct: 100,      
    lineHeight: 1.5,       
    paragraphSpacing: 1.5 
};

// Mapeo para el slider de espaciado: Valor -> [AlturaLinea, Etiqueta]
const SPACING_MAP = {
    1: { val: 1.0, label: 'Compacto' },
    2: { val: 1.5, label: 'Normal' },
    3: { val: 2.0, label: 'Amplio' }
};

let _prefs = { ...DEFAULTS };
let _domRefs = {};

export function initA11y() {
    debug.log('a11y', debug.DEBUG_LEVELS.BASIC, 'Inicializando módulo de accesibilidad...');
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
        console.error('Error guardando a11y prefs', e);
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
        btn.classList.toggle('selected', btn.dataset.font === _prefs.fontType);
    });

    // Slider Texto
    if (_domRefs.rangeSize) {
        _domRefs.rangeSize.value = _prefs.fontSizePct;
        _updateSliderLabel(_prefs.fontSizePct);
    }

    // Slider Espaciado (Nuevo)
    if (_domRefs.rangeSpacing) {
        // Buscar qué paso del slider (1, 2, 3) corresponde al valor actual
        let step = 2; // Default Normal
        for (const [key, data] of Object.entries(SPACING_MAP)) {
            if (data.val === _prefs.lineHeight) step = key;
        }
        _domRefs.rangeSpacing.value = step;
        _updateSpacingLabel(step);
    }
}

function _updateSliderLabel(pct) {
    if (!_domRefs.rangeVal) return;
    const computedPx = parseFloat(getComputedStyle(document.documentElement).fontSize).toFixed(1);
    _domRefs.rangeVal.textContent = `${pct}% (${computedPx}px)`;
}

function _updateSpacingLabel(step) {
    if (!_domRefs.rangeSpacingVal) return;
    const info = SPACING_MAP[step] || SPACING_MAP[2];
    _domRefs.rangeSpacingVal.textContent = info.label;
}

function _injectModalHTML() {
    if (document.getElementById('a11y-modal-overlay')) return;

    const html = `
        <div id="a11y-modal-overlay" class="a11y-modal-overlay" aria-hidden="true">
            <div id="a11y-modal" class="a11y-modal" role="dialog" aria-modal="true" aria-labelledby="a11y-title">
                <div class="a11y-header">
                    <h2 id="a11y-title">Accesibilidad</h2>
                    <button id="a11y-close" class="a11y-close-btn" aria-label="Cerrar">✕</button>
                </div>

                <div class="a11y-section">
                    <h3>Tipografía</h3>
                    <div class="a11y-controls-group font-group">
                        <button class="a11y-option-btn font-preview-sans" data-font="sans">Sans</button>
                        <button class="a11y-option-btn font-preview-serif" data-font="serif">Serif</button>
                        <button class="a11y-option-btn font-preview-dyslexic" data-font="dyslexic">Dislexia</button>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>Tamaño Texto</h3>
                    <div class="a11y-range-wrapper">
                        <span style="font-size: 0.8rem" aria-hidden="true">A</span>
                        <input type="range" id="a11y-range-size" class="a11y-range" min="90" max="200" step="5" aria-label="Tamaño de texto">
                        <span style="font-size: 1.2rem" aria-hidden="true">A</span>
                        <span id="a11y-range-val" class="a11y-range-value">100%</span>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>Espaciado</h3>
                    <div class="a11y-range-wrapper">
                        <span class="range-icon-small" aria-hidden="true">≡</span>
                        <input type="range" id="a11y-range-spacing" class="a11y-range" min="1" max="3" step="1" aria-label="Espaciado de línea">
                        <span class="range-icon-large" aria-hidden="true">≡</span>
                        <span id="a11y-range-spacing-val" class="a11y-range-value">Normal</span>
                    </div>
                </div>

                <div class="a11y-footer">
                    <button id="a11y-reset" aria-label="Restaurar configuración por defecto" title="Restaurar valores por defecto"></button>
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
                _updateSpacingLabel(step);
                
                // Aplicar CSS visualmente sin recargar todo
                const root = document.documentElement;
                root.style.setProperty('--line-height-base', _prefs.lineHeight);
                root.style.setProperty('--paragraph-spacing', `${_prefs.paragraphSpacing}em`);
            }
        });
        _domRefs.rangeSpacing.addEventListener('change', () => {
            _applyPreferences(); // Asegurar consistencia
            _savePreferences();
        });
    }
}

export function openModal() {
    if (!_domRefs.overlay) return;
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