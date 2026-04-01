/* --- code/main-menu.js --- */

import * as data from './data.js';
import * as debug from './debug/debug.js';

let navDropdown = null;
let btnMainMenu = null;

export function initMainMenu(appInstance, wrapper, enableI18n) {
    // 1. INYECTAR BOTÓN HAMBURGUESA
    let controls = wrapper.querySelector('.header-controls');
    if (!controls) {
        controls = document.createElement('div');
        controls.className = 'header-controls';
        wrapper.appendChild(controls);
    }

    if (!document.getElementById('btn-main-menu')) {
        btnMainMenu = document.createElement('button');
        btnMainMenu.id = 'btn-main-menu';
        btnMainMenu.setAttribute('aria-expanded', 'false');
        btnMainMenu.setAttribute('aria-controls', 'main-menu-dropdown');
        btnMainMenu.setAttribute('aria-label', appInstance.getString('header.aria.menuBtn'));
        btnMainMenu.setAttribute('title', appInstance.getString('header.aria.menuBtn'));
        btnMainMenu.tabIndex = 0;
        
        const iconHamburger = document.createElement('span');
        iconHamburger.className = 'icon-hamburger';
        iconHamburger.setAttribute('aria-hidden', 'true');
        btnMainMenu.appendChild(iconHamburger);
        controls.appendChild(btnMainMenu);
    }

    if (!document.getElementById('main-menu-dropdown')) {
        // 2. INYECTAR MENÚ DESPLEGABLE EN EL BODY
        navDropdown = document.createElement('nav');
        navDropdown.id = 'main-menu-dropdown';
        navDropdown.className = 'menu-dropdown';
        
        const currentLang = localStorage.getItem('vortex_lang') || 'es';
        const langLabel = currentLang === 'es' 
            ? appInstance.getString('header.aria.langBtn')
            : appInstance.getString('header.aria.langBtn');

        // 🟢 INYECTAMOS LA CUADRÍCULA DE ICONOS (44x44)
        navDropdown.innerHTML = `
            <div class="menu-grid" role="menu">
                <div class="menu-grid-row" role="presentation">
                    <button role="menuitem" 
                        id="menu-btn-a11y" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('header.aria.a11yBtn')}"
                        title="${appInstance.getString('header.aria.a11yBtn')}">
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
                        aria-label="${appInstance.getString('footer.aria.about')}"
                        title="${appInstance.getString('footer.aria.about')}">
                        <span class="menu-icon icon-info"></span> 
                    </button>
                </div>

                <div class="menu-separator" role="presentation">
                    <hr aria-hidden="true">
                </div>

                <div class="menu-grid-row" role="presentation">
                    <a role="menuitem" 
                        href="${data.MEDIA.URL.LINKEDIN}" 
                        target="_blank" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('footer.aria.linkedin')}"
                        title="${appInstance.getString('footer.aria.linkedin')}">
                        <span class="menu-icon icon-linkedin"></span> 
                    </a>
                    <a role="menuitem" 
                        href="${data.MEDIA.URL.DEV_DIARY}" 
                        target="_blank" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('footer.aria.github')}"
                        title="${appInstance.getString('footer.aria.github')}">
                        <span class="menu-icon icon-github"></span> 
                    </a>
                    <a role="menuitem" 
                        href="${data.MEDIA.URL.LANDING_PAGE}" 
                        target="_blank" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('footer.aria.landing')}"
                        title="${appInstance.getString('footer.aria.landing')}">
                        <span class="menu-icon icon-landing"></span> 
                    </a>
                </div>

                <div class="menu-separator" 
                    role="presentation">
                    <hr aria-hidden="true">
                </div>

                <div class="menu-grid-row" role="presentation">
                    <a role="menuitem" 
                        href="${data.MEDIA.URL.LICENSE}" 
                        target="_top" 
                        class="menu-link cc-license-btn" 
                        aria-label="${appInstance.getString('footer.aria.license')}"
                        title="${appInstance.getString('footer.aria.license')}">
                        
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
}

function toggleMenu(forceClose = false) {
    const isExpanded = btnMainMenu.getAttribute('aria-expanded') === 'true';
    const newState = forceClose ? false : !isExpanded;

    debug.log('main_menu', debug.DEBUG_LEVELS.BASIC, 
        `Toggling menu. Current state: ${isExpanded}, New state: ${newState}, Force close: ${forceClose}`);

    if (isExpanded === newState) return;
    
    btnMainMenu.setAttribute('aria-expanded', String(newState));
    
    if (newState) {
        // 🟢 LAZY LOAD: Inyectar CSS y ESPERAR a que termine antes de mostrar
        if (window.App && typeof window.App._injectCSS === 'function') {
            window.App._injectCSS('styles/style-menu.css', 'vortex-css-menu').then(() => {
                navDropdown.classList.add('active');
                setTimeout(() => {
                    const firstItem = navDropdown.querySelector('.menu-link');
                    if (firstItem) firstItem.focus();
                }, 50);
            });
        } else {
            navDropdown.classList.add('active');
        }
    } else {
        navDropdown.classList.remove('active');
    }
}

function _setupListeners(appInstance, enableI18n) {
    // 1. Clics de apertura y cierre
    btnMainMenu.onclick = (e) => {
        e.stopPropagation();
        toggleMenu();
    };

    document.addEventListener('click', (e) => {
        if (btnMainMenu.getAttribute('aria-expanded') === 'true' && 
            !navDropdown.contains(e.target) && 
            !btnMainMenu.contains(e.target)) {

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

            // 1. Identificamos todas las filas y en cuál estamos
            const rows = Array.from(navDropdown.querySelectorAll('.menu-grid-row'));
            const currentRow = currentItem.closest('.menu-grid-row');
            const rowIndex = rows.indexOf(currentRow);
            
            if (rowIndex === -1) return;

            // 2. ¿En qué posición (columna) estamos dentro de nuestra fila actual?
            const itemsInCurrentRow = Array.from(currentRow.querySelectorAll('.menu-link'));
            const colIndex = itemsInCurrentRow.indexOf(currentItem);

            // 3. Calculamos la fila destino (con bucle arriba/abajo)
            let targetRowIndex;
            if (e.key === 'ArrowDown') {
                targetRowIndex = (rowIndex + 1) % rows.length;
            } else { // ArrowUp
                targetRowIndex = (rowIndex - 1 + rows.length) % rows.length;
            }
            
            const targetRow = rows[targetRowIndex];
            const itemsInTargetRow = Array.from(targetRow.querySelectorAll('.menu-link'));

            // 4. Saltamos a la misma columna, o al último elemento si la fila destino es más corta
            const targetColIndex = Math.min(colIndex, itemsInTargetRow.length - 1);
            if (itemsInTargetRow[targetColIndex]) {
                itemsInTargetRow[targetColIndex].focus();
            }
        } 
        else if (e.key === 'Tab') {
            // Trampa de foco suave: Cerramos y el navegador sigue su camino
            toggleMenu(true);    
        }
    });

    // 🟢 CERRAR AL PERDER EL FOCO (Focus Out)
    // navDropdown es una variable persistente en el scope del módulo.
    navDropdown.addEventListener('focusout', (e) => {
        // 🛡️ EXCEPCIÓN CRÍTICA: Si el foco va al botón de menú, NO cerramos aquí.
        // Dejamos que el evento 'onclick' del propio botón gestione el cierre.
        if (e.relatedTarget && 
            e.relatedTarget !== btnMainMenu && 
            !navDropdown.contains(e.relatedTarget)) {
            toggleMenu(true); 
        }
    });

    // 4. Conectar acciones
    navDropdown.querySelector('#menu-btn-a11y').onclick = (e) => {
        e.preventDefault();
        toggleMenu(true);
        import('./a11y.js').then(module => module.openModal());
    };

    if (enableI18n) {
        const btnLang = navDropdown.querySelector('#menu-btn-lang');
        btnLang.onclick = (e) => {
            e.preventDefault();
            toggleMenu(true);
            appInstance.toggleLanguage(); // Tu función principal
            
            // 🟢 FIX: Actualizamos el texto y el ARIA en caliente sin recargar el menú
            setTimeout(() => {
                const currentLang = localStorage.getItem('vortex_lang') || 'es';
                
                // Actualizar Texto visual
                const textSpan = btnLang.querySelector('.lang-text');
                if (textSpan) textSpan.textContent = currentLang.toUpperCase();
                
                // Actualizar Etiqueta ARIA
                const langLabel = currentLang === 'es' 
                    ? appInstance.getString('header.aria.langBtn') 
                    : appInstance.getString('header.aria.langBtn');
                
                btnLang.setAttribute('aria-label', langLabel);
                btnLang.setAttribute('title', langLabel);
            }, 50); // Pequeño retraso de seguridad por si toggleLanguage tarda unos ms en setear el localStorage
        };
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