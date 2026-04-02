/* --- code/main-menu.js --- */

import * as data from './data.js';
import * as a11y from './a11y.js';

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

        // 🟢 INYECTAMOS LA CUADRÍCULA DE ICONOS (44x44)
        navDropdown.innerHTML = `
            <div class="menu-grid" role="menu">
                <div class="menu-grid-row" role="presentation">
                    <button role="menuitem" 
                        id="menu-btn-a11y" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('menu.aria.a11yBtn')}"
                        title="${appInstance.getString('menu.aria.a11yBtn')}">
                        <span class="menu-icon icon-a11y"></span> 
                    </button>
                    ${enableI18n ? `
                    <button role="menuitem" 
                        id="menu-btn-lang" 
                        class="menu-link lang-btn-container" 
                        aria-label="${langLabel}"
                        title="${langLabel}">
                        <span class="lang-icon-bg" aria-hidden="true"></span>
                        <span class="lang-text" aria-hidden="true">
                            ${currentLang.toUpperCase()}
                        </span>
                    </button>` : ''}
                    <button role="menuitem" 
                        id="menu-btn-about" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('menu.aria.about')}"
                        title="${appInstance.getString('menu.aria.about')}">
                        <span class="menu-icon icon-info"></span> 
                    </button>
                </div>

                <div class="menu-separator" role="presentation">
                    <hr aria-hidden="true">
                </div>

                <div class="menu-grid-row" role="presentation">
                    <a role="menuitem" 
                        id="menu-link-linkedin"
                        href="${data.MEDIA.URL.LINKEDIN}" 
                        target="_blank" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('menu.aria.linkedin')}"
                        title="${appInstance.getString('menu.aria.linkedin')}">
                        <span class="menu-icon icon-linkedin"></span> 
                    </a>
                    <a role="menuitem" 
                        id="menu-link-github"
                        href="${data.MEDIA.URL.DEV_DIARY}" 
                        target="_blank" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('menu.aria.github')}"
                        title="${appInstance.getString('menu.aria.github')}">
                        <span class="menu-icon icon-github"></span> 
                    </a>
                    <a role="menuitem" 
                        id="menu-link-landing"
                        href="${data.MEDIA.URL.LANDING_PAGE}" 
                        target="_blank" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('menu.aria.landing')}"
                        title="${appInstance.getString('menu.aria.landing')}">
                        <span class="menu-icon icon-landing"></span> 
                    </a>
                </div>

                <div class="menu-separator" 
                    role="presentation">
                    <hr aria-hidden="true">
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

        // 🟢 FIX: Inyectarlo en el body, fuera del header
        const existingMenu = document.getElementById('main-menu-dropdown');
        if (existingMenu) existingMenu.remove();

        const appContainer = document.getElementById('app-container');
        if (appContainer) 
            appContainer.insertBefore(navDropdown, document.getElementById('vista-volver'));
        else
            document.body.appendChild(navDropdown);
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

        // 🟢 NAVEGACIÓN HORIZONTAL (Secuencial clásica)
        if (e.key === 'ArrowRight') {
            e.preventDefault(); e.stopPropagation();
            const nextIndex = (currentIndex + 1) % allItems.length;
            allItems[nextIndex].focus();
        } 
        else if (e.key === 'ArrowLeft') {
            e.preventDefault(); e.stopPropagation();
            const prevIndex = (currentIndex - 1 + allItems.length) % allItems.length;
            allItems[prevIndex].focus();
        } 
        // 🟢 NAVEGACIÓN VERTICAL (Espacial entre filas)
        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
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

/* --- code/main-menu.js --- */