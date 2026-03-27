/* --- code/main-menu.js --- */

import * as data from './data.js';

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
        btnMainMenu.setAttribute('aria-label', appInstance.getString('header.aria.menuBtn') || 
            'Abrir menú principal');
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
            ? appInstance.getString('header.aria.langBtn') || 
                "Idioma: Español. Cambiar a Inglés." 
            : appInstance.getString('header.aria.langBtn') || 
                "Language: English. Switch to Spanish.";

        // 🟢 INYECTAMOS LA CUADRÍCULA DE ICONOS (44x44)
        navDropdown.innerHTML = `
            <div class="menu-grid" role="menu">
                <div class="menu-grid-row" role="presentation">
                    <button role="menuitem" 
                        id="menu-btn-a11y" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('header.aria.a11yBtn') 
                            || 'Accesibilidad'}">
                        <span class="menu-icon icon-a11y"></span> 
                    </button>
                    ${enableI18n ? `
                    <button role="menuitem" 
                        id="menu-btn-lang" 
                        class="menu-link" 
                        aria-label="${langLabel}">
                        <span class="menu-icon icon-lang"></span> 
                    </button>` : ''}
                    <button role="menuitem" 
                        id="menu-btn-about" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('footer.aria.about')}">
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
                        aria-label="${appInstance.getString('footer.aria.linkedin')}">
                        <span class="menu-icon link-linkedin"></span> 
                    </a>
                    <a role="menuitem" 
                        href="${data.MEDIA.URL.DEV_DIARY}" 
                        target="_blank" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('footer.aria.github')}">
                        <span class="menu-icon link-github"></span> 
                    </a>
                    <a role="menuitem" 
                        href="${data.MEDIA.URL.LANDING_PAGE}" 
                        target="_blank" 
                        class="menu-link" 
                        aria-label="${appInstance.getString('footer.aria.landing')}">
                        <span class="menu-icon link-fire"></span> 
                    </a>
                </div>

                <div class="menu-separator" 
                    role="presentation">
                    <hr aria-hidden="true">
                </div>

                <div class="menu-grid-row" 
                    role="presentation">
                    <a role="menuitem" 
                        href="${data.MEDIA.URL.LICENSE}" 
                        target="_top" 
                        class="menu-link cc-license-btn" 
                        aria-label="${appInstance.getString('footer.aria.license')}">
                        <span class="cc-icon-layers" aria-hidden="true">
                            <span class="cc-layer-bg"></span>
                            <span class="cc-layer-paper"></span>
                            <span class="cc-layer-ink"></span>
                        </span>
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
    // 1. Clics de apertura y cierre
    btnMainMenu.onclick = (e) => {
        e.stopPropagation();
        toggleMenu();
    };

    document.addEventListener('click', (e) => {
        if (btnMainMenu.getAttribute('aria-expanded') === 'true' && !navDropdown.contains(e.target) && !btnMainMenu.contains(e.target)) {
            toggleMenu(true);
        }
    });

    // 3. MOTOR WAI-ARIA DE TECLADO (Aislado para el menú)
    // 3. MOTOR WAI-ARIA DE TECLADO (Aislado para el menú)
    navDropdown.addEventListener('keydown', (e) => {
        const items = Array.from(navDropdown.querySelectorAll('.menu-link'));
        const index = items.indexOf(document.activeElement);

        // 🟢 FIX: Al ser una cuadrícula, permitimos fluir con Arriba/Abajo/Izquierda/Derecha
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault(); e.stopPropagation();
            const nextIndex = (index + 1) % items.length;
            items[nextIndex].focus();
        } 
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault(); e.stopPropagation();
            const prevIndex = (index - 1 + items.length) % items.length;
            items[prevIndex].focus();
        } 
        else if (e.key === 'Tab') {
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
        navDropdown.querySelector('#menu-btn-lang').onclick = (e) => {
            e.preventDefault();
            toggleMenu(true);
            appInstance.toggleLanguage();
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