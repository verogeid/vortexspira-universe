/* --- code/components/main-menu.js --- */

import * as debug from '../debug/debug.js'
import * as data from '../services/data.js';
import * as a11y from '../features/a11y/a11y.js';
import * as app_utils from '../services/app-utils.js'

let navDropdown = null;
let btnMainMenu = null;
let _isInitialized = false;

export function initMainMenu(appInstance, wrapper, enableI18n) {
    if (_isInitialized) return; // Evita inyectar el DOM dos veces si se pulsa rápido
    
    // Enganchamos el botón que app-utils.js ya creó en el DOM
    btnMainMenu = document.getElementById('btn-main-menu');

    if (!document.getElementById('main-menu-dropdown')) {
        // 2. INYECTAR MENÚ DESPLEGABLE EN EL BODY
        navDropdown = document.createElement('nav');
        navDropdown.id = 'main-menu-dropdown';
        navDropdown.className = 'menu-dropdown';
        
        const currentLang = localStorage.getItem('vortex_lang') || 'es';
        const langLabel = appInstance.getString('menu.aria.langBtn');

        // 🟢 INYECTAMOS LA CUADRÍCULA (Iconos en Móvil, Lista Detallada en Desktop)
        navDropdown.innerHTML = `
            <div class="menu-grid" role="menu">
                <div class="menu-grid-row" role="presentation">
                    <button role="menuitem" 
                        id="menu-btn-a11y" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('menu.aria.a11yBtn')}"
                        title="${appInstance.getString('menu.aria.a11yBtn')}">

                        <span class="menu-icon icon-a11y" aria-hidden="true"></span> 

                        <span class="menu-text" aria-hidden="true">
                            ${appInstance.getString('menu.aria.a11yBtn')}
                        </span>
                    </button>

                    ${enableI18n ? `
                    <button role="menuitem" 
                        id="menu-btn-lang" 
                        class="menu-link lang-btn-container" 
                        aria-label="${langLabel}"
                        title="${langLabel}">

                        <div class="icon-wrapper" aria-hidden="true">
                            <span class="lang-icon-bg"></span>
                            <span class="lang-text">
                                ${currentLang.toUpperCase()}
                            </span>
                        </div>

                        <span class="menu-text" aria-hidden="true">
                            ${langLabel}
                        </span>
                    </button>` : ''}

                    <button role="menuitem" 
                        id="menu-btn-about" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('menu.aria.about')}"
                        title="${appInstance.getString('menu.aria.about')}">

                        <span class="menu-icon icon-info" aria-hidden="true"></span>

                        <span class="menu-text" aria-hidden="true">
                            ${appInstance.getString('menu.aria.about')}
                        </span>
                    </button>

                </div>

                <div class="menu-separator" role="presentation">
                    <hr aria-hidden="true">
                </div>

                <div class="menu-grid-row" role="presentation">
                    <button role="menuitem" 
                        id="menu-btn-linkedin"
                        class="menu-link" 
                        aria-label="${appInstance.getString('menu.aria.linkedin')}"
                        title="${appInstance.getString('menu.aria.linkedin')}">

                        <span class="menu-icon icon-linkedin" aria-hidden="true"></span> 

                        <span class="menu-text" aria-hidden="true">
                            ${appInstance.getString('menu.aria.linkedin')}
                        </span>
                    </button>

                    <button role="menuitem" 
                        id="menu-btn-github"
                        class="menu-link" 
                        aria-label="${appInstance.getString('menu.aria.github')}"
                        title="${appInstance.getString('menu.aria.github')}">

                        <span class="menu-icon icon-github" aria-hidden="true"></span> 

                        <span class="menu-text" aria-hidden="true">
                            ${appInstance.getString('menu.aria.github')}
                        </span>
                    </button>

                    <button role="menuitem" 
                        id="menu-btn-landing"
                        class="menu-link" 
                        aria-label="${appInstance.getString('menu.aria.landing')}"
                        title="${appInstance.getString('menu.aria.landing')}">

                        <span class="menu-icon icon-landing" aria-hidden="true"></span> 

                        <span class="menu-text" aria-hidden="true">
                            ${appInstance.getString('menu.aria.landing')}
                        </span>
                    </button>
                </div>

                <div class="menu-separator" role="presentation">
                    <hr aria-hidden="true">
                </div>

                <div class="menu-grid-row" role="presentation">
                    <button role="menuitem" 
                        id="menu-btn-feedback"
                        class="menu-link" 
                        aria-label="${appInstance.getString('menu.aria.feedback')} ${appInstance.getString('menu.aria.feedbackTarget')}"
                        title="${appInstance.getString('menu.aria.feedback')}">

                        <span class="menu-icon icon-bug" aria-hidden="true"></span> 

                        <span class="menu-text" aria-hidden="true">
                            ${appInstance.getString('menu.aria.feedback')}
                        </span>
                    </button>
                </div>

                <div class="menu-separator" role="presentation">
                    <hr aria-hidden="true" style="opacity: 0;">
                </div>

                <div class="menu-grid-row" role="presentation">
                    <a role="menuitem" 
                        id="menu-link-license"
                        href="${data.MEDIA.URL.LICENSE}" 
                        target="_top" 
                        class="menu-link cc-license-btn" 
                        aria-label="${appInstance.getString('menu.aria.license')}"
                        title="${appInstance.getString('menu.aria.license')}">

                        <div class="cc-license-stack" aria-hidden="true">
                            <span class="cc-layer-plate"></span>
                            <span class="cc-layer-bg-circles"></span>
                            <span class="cc-layer-bg-letters"></span>
                            <span class="cc-layer-details"></span>
                        </div>
                    </a>
                </div>
            </div>
        `;

        const existingMenu = document.getElementById('main-menu-dropdown');
        if (existingMenu) existingMenu.remove();

        const appContainer = document.getElementById('app-container');
        if (appContainer) 
            appContainer.insertBefore(navDropdown, document.getElementById('vista-volver'));
        else
            document.body.appendChild(navDropdown);

        // 🟢 NUEVO: Lógica de enrutamiento para los nuevos botones
        const setupExternalButton = (id, urlOrFunction) => {
            const btn = navDropdown.querySelector(id);
            if (btn) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    toggleMenu(true); // Cierra el menú al hacer clic
                    
                    // Comprobamos si le pasamos un string (URL) o una función generadora (Feedback)
                    const targetUrl = typeof urlOrFunction === 'function' ? urlOrFunction() : urlOrFunction;
                    window.open(targetUrl, '_blank', 'noopener,noreferrer');
                };
            }
        };

        setupExternalButton('#menu-btn-linkedin', data.MEDIA.URL.LINKEDIN);
        setupExternalButton('#menu-btn-github', data.MEDIA.URL.DEV_DIARY);
        setupExternalButton('#menu-btn-landing', data.MEDIA.URL.LANDING_PAGE);
        
        // Al Feedback le pasamos una función para que calcule el string codificado en el momento del clic
        setupExternalButton('#menu-btn-feedback', () => {
            return `https://github.com/verogeid/vortexspira-devdiary/issues/new?labels=feedback&title=[Feedback]&body=${encodeURIComponent(appInstance.getString('menu.feedbackBody'))}`;
        });
    }

    _setupListeners(appInstance, enableI18n);
    _isInitialized = true;
}

// 🟢 Expuesta para que app-utils pueda forzar la apertura
export function toggleMenu(forceClose = false) {
    if (!btnMainMenu || !navDropdown) return;
    
    const isExpanded = btnMainMenu.getAttribute('aria-expanded') === 'true';
    const newState = forceClose ? false : !isExpanded;
    if (isExpanded === newState) return;
    
    btnMainMenu.setAttribute('aria-expanded', String(newState));
    
    if (newState) {
        navDropdown.classList.add('active');

        debug.log('main_menu', debug.DEBUG_LEVELS.DEEP, 
            "🎯 Iniciando precarga de detalles...");

        // 🟢 PRECARGA EN SEGUNDO PLANO (Lazy Load Details)
        if (window.requestIdleCallback) {
            requestIdleCallback(() => {
                app_utils.preloadDetailsModules(this, 'css');
            });
        } else {
            setTimeout(() => {
                app_utils.preloadDetailsModules(this, 'css');
            }, data.PRELOAD_TIME);
        }

        setTimeout(() => {
            const firstItem = navDropdown.querySelector('.menu-link');
            if (firstItem) firstItem.focus();
        }, 50);
    } else {
        navDropdown.classList.remove('active');
    }
}

function _setupListeners(appInstance, enableI18n) {
    document.addEventListener('click', (e) => {
        if (btnMainMenu && 
            btnMainMenu.getAttribute('aria-expanded') === 'true' && 
                !navDropdown.contains(e.target) && 
                !btnMainMenu.contains(e.target)
        ) {
            toggleMenu(true);
        }
    });

    // 3. MOTOR WAI-ARIA DE TECLADO (Navegación 2D para Cuadrícula)
    navDropdown.addEventListener('keydown', (e) => {
        const allItems = Array.from(navDropdown.querySelectorAll('.menu-link'));
        const currentItem = document.activeElement;
        const currentIndex = allItems.indexOf(currentItem);

        if (currentIndex === -1) return;

        const isMobile = document.body.getAttribute('data-layout') === 'mobile';

        // 🟢 NAVEGACIÓN HORIZONTAL (Secuencial clásica)
        if ((e.key === 'ArrowRight') || (!isMobile && e.key === 'ArrowDown')) {
            e.preventDefault(); e.stopPropagation();
            const nextIndex = (currentIndex + 1) % allItems.length;
            allItems[nextIndex].focus();
        } 
        else if ((e.key === 'ArrowLeft') || (!isMobile && e.key === 'ArrowUp')) {
            e.preventDefault(); e.stopPropagation();
            const prevIndex = (currentIndex - 1 + allItems.length) % allItems.length;
            allItems[prevIndex].focus();
        } 
        // 🟢 NAVEGACIÓN VERTICAL (Espacial entre filas)
        else if (isMobile && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault(); e.stopPropagation();

            const rows = Array.from(navDropdown.querySelectorAll('.menu-grid-row'));
            const currentRow = currentItem.closest('.menu-grid-row');
            const rowIndex = rows.indexOf(currentRow);
            
            if (rowIndex === -1) return;

            const itemsInCurrentRow = Array.from(currentRow.querySelectorAll('.menu-link'));
            const colIndex = itemsInCurrentRow.indexOf(currentItem);

            let targetRowIndex;
            if (e.key === 'ArrowDown') {
                targetRowIndex = (rowIndex + 1) % rows.length;
            } else { // ArrowUp
                targetRowIndex = (rowIndex - 1 + rows.length) % rows.length;
            }
            
            const targetRow = rows[targetRowIndex];
            const itemsInTargetRow = Array.from(targetRow.querySelectorAll('.menu-link'));

            const targetColIndex = Math.min(colIndex, itemsInTargetRow.length - 1);
            if (itemsInTargetRow[targetColIndex]) {
                itemsInTargetRow[targetColIndex].focus();
            }
        } 
        else if (e.key === 'Tab') {
            toggleMenu(true);    
        }
    });

    // 4. Conectar acciones
    const btnA11y = navDropdown.querySelector('#menu-btn-a11y');
    if (btnA11y) {
        btnA11y.onclick = (e) => {
            e.preventDefault();
            toggleMenu(true);
            
            // 🟢 Directo: Usamos la referencia 'a11y' que ya importamos arriba
            // y llamamos a openModal (que es el nombre real en tu a11y.js)
            a11y.openModal(appInstance);
        };
    }

    if (enableI18n) {
        const btnLang = navDropdown.querySelector('#menu-btn-lang');
        if (btnLang) {
            btnLang.onclick = (e) => {
                e.preventDefault();
                toggleMenu(true);
                appInstance.toggleLanguage(); 
            };
        }
    }

    navDropdown.querySelector('#menu-btn-about').onclick = (e) => {
        e.preventDefault();
        toggleMenu(true);
        if (window.App && typeof window.App._mostrarAbout === 'function') {
            window.App._mostrarAbout();
        }
    };
}

/* --- code/components/main-menu.js --- */