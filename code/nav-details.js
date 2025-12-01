// --- code/nav-details.js (NUEVO MÓDULO DE DETALLE) ---

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base from './nav-base.js'; // ⭐️ NECESARIO para el helper de búsqueda

/**
 * Lógica de inicialización de los handlers de foco en la vista de detalle.
 * Se llama desde nav-base.setupListeners.
 */
export function _setupDetailFocusHandler() {
    // 'this' es la instancia de App
    document.addEventListener('focusin', (e) => {
        const focusedEl = e.target;
        const isDetailView = this.DOM.vistaDetalle && this.DOM.vistaDetalle.classList.contains('active'); 

        if (isDetailView) {
            _updateDetailFocusState.call(this, focusedEl);
        }
    });
};

/**
 * ⭐️ GESTIÓN DE FOCO EN VISTA DETALLE (BLUR MASK Y FRAGMENTOS) ⭐️
 * Función que actualiza las clases CSS en función del elemento enfocado.
 */
export function _updateDetailFocusState(focusedEl) {
    const detailContainer = this.DOM.vistaDetalle; 
    
    // 1. Obtener TODOS los elementos secuenciales enfocables (Fragmento de texto O Fila de acción)
    const sequenceItems = Array.from(detailContainer.querySelectorAll('.detail-text-fragment, .detail-action-item'));

    // Encontrar el contenedor secuencial del elemento enfocado (puede ser el botón de acción o el fragmento de texto)
    const focusedContainer = focusedEl.closest('.detail-text-fragment') || focusedEl.closest('.detail-action-item');

    if (!focusedContainer) {
        // Foco fuera del contenido principal (ej. título o sidebar)
        sequenceItems.forEach(item => item.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2'));
        detailContainer.classList.remove('mode-focus-actions', 'mode-focus-text');
        return;
    }
    
    // 2. Proximidad y aplicación de clases
    const focusedIndex = sequenceItems.indexOf(focusedContainer);

    sequenceItems.forEach((item, index) => {
        const diff = Math.abs(index - focusedIndex);

        item.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2');
        
        if (diff === 0) {
            item.classList.add('focus-current');
        } else if (diff === 1) {
            item.classList.add('focus-adj-1'); 
        } else if (diff === 2) {
            item.classList.add('focus-adj-2'); 
        }
    });

    // 3. Aplicar clases binarias para el control de la MÁSCARA (ya no controlan el blur)
    const isTextFocus = focusedContainer.classList.contains('detail-text-fragment');

    if (isTextFocus) {
        detailContainer.classList.add('mode-focus-text');
        detailContainer.classList.remove('mode-focus-actions');
    } else {
        detailContainer.classList.add('mode-focus-actions');
        detailContainer.classList.remove('mode-focus-text');
    }
};

/**
 * Muestra el detalle del curso, inyectando contenido y gestionando el foco.
 */
export function _mostrarDetalle(cursoId) {
    // 'this' es la instancia de App
    debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'Mostrando detalle del curso:', cursoId);
    
    // ⭐️ CORRECCIÓN: Llamada al helper de búsqueda directamente desde nav_base ⭐️
    const curso = nav_base._findNodoById(cursoId, this.STATE.fullData.navegacion); 
    
    if (!curso) {
        debug.logWarn('nav_base', 'Curso no encontrado para ID:', cursoId);
        return;
    }

    // ⭐️ Reasignar referencias de detalle ANTES de inyectar
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    this.DOM.vistaDetalle = isMobile ? document.getElementById('vista-detalle-mobile') : document.getElementById('vista-detalle-desktop');
    this.DOM.detalleContenido = isMobile ? document.getElementById('detalle-contenido-mobile') : document.getElementById('detalle-contenido-desktop');


    const getIconHtml = (text) => {
        const lower = text.toLowerCase();
        if (lower.includes('adquirir') || lower.includes('comprar')) { return '<i class="action-icon icon-buy"></i>'; } // Icono de compra
        let iconClass = 'icon-link'; 
        if (lower.includes('instalar') || lower.includes('descargar') || lower.includes('pwa')) { iconClass = 'icon-download'; }
        // Se mantiene el icono link para los que no son de compra/descarga
        return `<i class="action-icon ${iconClass}"></i>`; 
    };

    let enlacesHtml = '';
    if (curso.enlaces && curso.enlaces.length > 0) {
        const itemsHtml = curso.enlaces.map(enlace => {
            const iconHtml = getIconHtml(enlace.texto);
            const isDisabled = !enlace.url || enlace.url === '#';
            const hrefAttr = isDisabled ? '' : `href="${enlace.url}"`;
            
            const classDisabledBtn = isDisabled ? 'disabled' : '';
            const classDisabledText = ''; 
            
            const tabIndexContainer = '-1'; 
            const tabIndexButton = isDisabled ? '-1' : '0'; // ⭐️ DESHABILITAR TABULACIÓN SI NO TIENE ACCIÓN ⭐️
            const targetAttr = isDisabled ? '' : 'target="_blank"';
            
            const onclickAttr = isDisabled ? 'onclick="return false;"' : '';

            // ⭐️ LÓGICA DE INYECCIÓN DEL TRIÁNGULO Y EL EMOJI 🚫 ⭐️
            const contentHtml = isDisabled ? 
                `${data.SVG_TRIANGLE}<span class="action-icon-emoji">🚫</span>` : 
                iconHtml;

            return `
                <div class="detail-action-item" onclick="App._handleActionRowClick(event)" style="cursor: pointer;" tabindex="${tabIndexContainer}" role="listitem">
                    <span class="detail-action-text ${classDisabledText}">${enlace.texto}</span>
                    <a ${hrefAttr} 
                        class="detail-action-btn ${classDisabledBtn}" 
                        ${targetAttr} 
                        tabindex="${tabIndexButton}" 
                        ${onclickAttr}
                        aria-label="${enlace.texto} ${isDisabled ? '(No disponible)' : ''}">
                        ${contentHtml}
                    </a>
                </div>`;
        }).join('');
        enlacesHtml = `<div class="detail-actions-list">${itemsHtml}</div>`;
    }

    let mobileBackHtml = '';
    
    if (isMobile) {
        mobileBackHtml = `
            <div class="mobile-back-header">
                <article class="card card-volver-vertical" 
                        role="button" 
                        tabindex="0" 
                        onclick="App._handleVolverClick()"
                        aria-label="Volver">
                    <h3>${data.LOGO_VOLVER} Volver</h3>
                </article>
            </div>
        `;
    }
    
    // ⭐️ 1. PROCESAMIENTO DE LA DESCRIPCIÓN EN FRAGMENTOS ⭐️
    let textFragmentsHtml = '';
    const description = curso.descripcion || 'No hay descripción disponible.';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description.trim();
    
    Array.from(tempDiv.childNodes).forEach((node, index) => {
        if (node.nodeType === 1 && (node.tagName === 'P' || node.tagName === 'UL' || node.tagName === 'OL' || node.tagName === 'DIV')) {
            textFragmentsHtml += `
                <div class="detail-text-fragment" data-index="${index}" role="document" tabindex="0">
                    ${node.outerHTML}
                </div>
            `;
        } else if (node.nodeType === 3 && node.textContent.trim().length > 0) {
            textFragmentsHtml += `
                <div class="detail-text-fragment" data-index="${index}" role="document" tabindex="0">
                    <p>${node.textContent}</p>
                </div>
            `;
        }
    });

    const titleHtml = `<h2 tabindex="0" style="outline:none;">${curso.titulo}</h2>`;

    this.DOM.detalleContenido.innerHTML = `
        ${mobileBackHtml}
        <div id="detalle-bloque-texto" tabindex="-1"> 
            ${titleHtml}
            
            <div id="detalle-contenido-fragmentado"> 
                ${textFragmentsHtml}
            </div>

        </div>
        <div id="detalle-bloque-acciones">
            ${enlacesHtml || '<p>No hay acciones disponibles para este curso.</p>'}
        </div>
    `;

    // ⭐️ Activación de la vista ⭐️
    this.DOM.vistaNav.classList.remove('active');
    this.DOM.vistaDetalle.classList.add('active');
    
    const screenWidth = window.innerWidth;
    const isTablet = screenWidth >= data.TABLET_MIN_WIDTH && window.innerWidth <= data.TABLET_MAX_WIDTH;

    let primerElementoFocuseable = null;

    // ⭐️ 2. FOCO INICIAL EN EL PRIMER FRAGMENTO DE TEXTO ⭐️
    const firstFragment = this.DOM.detalleContenido.querySelector('.detail-text-fragment');
    
    if (!isMobile) { 
        // DESKTOP/TABLET
        if (this.DOM.cardNivelActual) {
            this.DOM.cardNivelActual.innerHTML = `<h3>${curso.titulo || 'Curso'}</h3>`;
            this.DOM.cardNivelActual.classList.add('visible'); 
        }
        
        this.DOM.cardVolverFija.classList.add('visible'); 
        this.DOM.cardVolverFijaElemento.classList.add('visible');
        this.DOM.cardVolverFijaElemento.innerHTML = `<h3>${data.LOGO_VOLVER}</h3>`; 
        this.DOM.cardVolverFijaElemento.tabIndex = 0;
        
        primerElementoFocuseable = this.DOM.cardVolverFijaElemento;

        if (firstFragment) {
            firstFragment.focus();
            _updateDetailFocusState.call(this, firstFragment); 
            primerElementoFocuseable = firstFragment;
        }
        
    } else { 
        // MÓVIL
        this.DOM.infoAdicional.classList.remove('visible');
        this.DOM.cardVolverFija.classList.remove('visible');
        
        const firstInteractive = this.DOM.detalleContenido.querySelector('.card, .detail-action-btn, .detail-text-fragment');
        if (firstInteractive) {
            firstInteractive.focus();
            _updateDetailFocusState.call(this, firstInteractive); 
            primerElementoFocuseable = firstInteractive;
        }
    }

    if (primerElementoFocuseable) {
        debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'Foco en detalle:', primerElementoFocuseable.tagName, primerElementoFocuseable.id || primerElementoFocuseable.className);
    }
};

/**
 * Helper para obtener todos los elementos enfocables dentro de la vista de detalle.
 */
export function _getFocusableDetailElements() {
    // 'this' es la instancia de App
    // ⭐️ CORRECCIÓN: Obtener elementos secuenciales que son focales (Fragmento de texto O Botón) ⭐️
    const detailElements = Array.from(this.DOM.detalleContenido.querySelectorAll('.detail-text-fragment, .detail-action-btn'));
    let elements = [];
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    
    if (!isMobile && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
        elements.push(this.DOM.cardVolverFijaElemento);
    } 
    // Usamos .detail-action-btn para la navegación secuencial, ya que tiene tabindex=0.
    elements.push(...detailElements);
    return elements;
};

// ⭐️ HELPER: Clic en fila -> Solo pone foco (NO click) ⭐️
export function _handleActionRowClick(e) {
    // 'this' es la instancia de App
    debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'Clic en fila de acción (Detalle) detectado.');
    
    // Apuntamos al botón de acción, ya que ahora es el foco objetivo.
    const btn = e.currentTarget.querySelector('.detail-action-btn');
    if (btn) {
        btn.focus(); 
    }
};