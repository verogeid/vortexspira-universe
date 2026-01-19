/* --- code/a11y.js --- */

import * as debug from './debug.js';

const STORAGE_KEY = 'vortex_a11y_prefs_v1';

const DEFAULTS = {
    fontType: 'sans',      
    fontSizePct: 100,      
    lineHeight: 1.5,       
    paragraphSpacing: 1.5 
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

    // Botones de Espaciado
    _domRefs.spacingBtns.forEach(btn => {
        const val = parseFloat(btn.dataset.spacing);
        btn.classList.toggle('selected', val === _prefs.lineHeight);
    });

    // Slider y Texto
    if (_domRefs.rangeSize) {
        _domRefs.rangeSize.value = _prefs.fontSizePct;
        _updateSliderLabel(_prefs.fontSizePct);
    }
}

/**
 * Actualiza solo el texto del porcentaje y los píxeles calculados
 */
function _updateSliderLabel(pct) {
    if (!_domRefs.rangeVal) return;
    
    // TRUCO: Calculamos los píxeles reales actuales.
    // getComputedStyle devuelve el tamaño final renderizado.
    // Como ya hemos aplicado la escala, este valor es el resultado final.
    const computedPx = parseFloat(getComputedStyle(document.documentElement).fontSize).toFixed(1);
    
    _domRefs.rangeVal.textContent = `${pct}% (${computedPx}px)`;
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
                    <div class="a11y-controls-group">
                        <button class="a11y-option-btn font-preview-sans" data-font="sans">Sans</button>
                        <button class="a11y-option-btn font-preview-serif" data-font="serif">Serif</button>
                        <button class="a11y-option-btn font-preview-dyslexic" data-font="dyslexic">Dislexia</button>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>Tamaño del Texto (Base Sistema)</h3>
                    <div class="a11y-range-wrapper">
                        <span style="font-size: 0.8rem" aria-hidden="true">A</span>
                        <input type="range" id="a11y-range-size" class="a11y-range" min="90" max="200" step="5" aria-label="Tamaño de texto">
                        <span style="font-size: 1.2rem" aria-hidden="true">A</span>
                        <span id="a11y-range-val" class="a11y-range-value">100%</span>
                    </div>
                </div>

                <div class="a11y-section">
                    <h3>Espaciado</h3>
                    <div class="a11y-controls-group">
                        <button class="a11y-option-btn" data-spacing="1.0">Compacto</button>
                        <button class="a11y-option-btn" data-spacing="1.5">Normal</button>
                        <button class="a11y-option-btn" data-spacing="2.0">Amplio</button>
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
        spacingBtns: document.querySelectorAll('[data-spacing]'),
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

    // SLIDER OPTIMIZADO
    if (_domRefs.rangeSize) {
        // 'input': Se dispara mientras arrastras. Actualizamos visualmente pero NO guardamos.
        _domRefs.rangeSize.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            _prefs.fontSizePct = val;
            
            // Aplicamos CSS en vivo para que el usuario vea el cambio
            document.documentElement.style.setProperty('--font-scale', val / 100);
            _updateSliderLabel(val);
        });

        // 'change': Se dispara al soltar. AQUÍ guardamos.
        _domRefs.rangeSize.addEventListener('change', () => {
            _savePreferences(); // Persistencia
        });
    }

    // Espaciado
    _domRefs.spacingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = parseFloat(btn.dataset.spacing);
            _prefs.lineHeight = val;
            _prefs.paragraphSpacing = val; 
            _applyPreferences();
            _savePreferences();
        });
    });
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