// --- code/render-details.js ---

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base from './nav-base.js';
import * as nav_base_details from './nav-base-details.js';

/**
 * Muestra el detalle del curso, inyectando contenido y gestionando el foco.
 */
export function _mostrarDetalle(cursoId) {
    // 'this' es la instancia de App
    const appInstance = this;
    debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 'Mostrando detalle del curso:', cursoId);
    
    const curso = appInstance._findNodoById(cursoId, appInstance.STATE.fullData.navegacion); 
    
    if (!curso) {
        debug.logWarn('render_details', 'Curso no encontrado para ID:', cursoId);
        return;
    }

    // ⭐️ Reasignar referencias de detalle ANTES de inyectar (necesario para el resize)
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    appInstance.DOM.vistaDetalle = isMobile ? document.getElementById('vista-detalle-mobile') : document.getElementById('vista-detalle-desktop');
    appInstance.DOM.detalleContenido = isMobile ? document.getElementById('detalle-contenido-mobile') : document.getElementById('detalle-contenido-desktop');


    // USANDO NUEVA CLAVE 'type' del JSON
    const getIconClass = (type) => {
        if (type === 'c') { return 'icon-buy'; }
        if (type === 'd') { return 'icon-download'; }
        return 'icon-link';
    };

    let enlacesHtml = '';
    if (curso.enlaces && curso.enlaces.length > 0) {
        const itemsHtml = curso.enlaces.map(enlace => {
            const iconClass = getIconClass(enlace.type);
            const isDisabled = !enlace.url || enlace.url === '#';
            
            const contentHtml = `<i class="action-icon ${iconClass}"></i>`;
            const disabledContentHtml = `<i class="action-icon icon-vacio"></i>`; 

            const hrefAttr = isDisabled ? '' : `href="${enlace.url}"`;
            const classDisabledBtn = isDisabled ? 'disabled' : '';
            
            const tabIndexContainer = '0'; 
            const tabIndexButton = '-1'; 
            const targetAttr = isDisabled ? '' : 'target="_blank"';
            
            const onclickAttr = isDisabled ? 'onclick="return false;"' : '';

            return `
              <div class="detail-action-item" onclick="App._handleActionRowClick(event)" style="cursor: pointer;" tabindex="${tabIndexContainer}" role="listitem">
                  <span class="detail-action-text">${enlace.texto}</span>
                  <a ${hrefAttr} 
                     class="detail-action-btn ${classDisabledBtn}" 
                     ${targetAttr} 
                     tabIndex="${tabIndexButton}" 
                     ${onclickAttr}
                     aria-label="${enlace.texto} ${isDisabled ? '(No disponible)' : ''}">
                     ${isDisabled ? disabledContentHtml : contentHtml}
                  </a>
              </div>`;
        }).join('');
        enlacesHtml = `<div class="detail-actions-list">${itemsHtml}</div>`;
    }

    let mobileBackHtml = '';
    
    // ⬇️ Lógica para obtener el nombre de la CATEGORÍA PADRE ⬇️
    const parentLevelState = appInstance.stackGetCurrent();
    let parentName = appInstance.getString('breadcrumbRoot');

    if (parentLevelState && parentLevelState.levelId) {
        // En un curso, el nivel actual de la pila (parentLevelState) apunta a la CATEGORÍA
        const parentNodo = appInstance._findNodoById(parentLevelState.levelId, appInstance.STATE.fullData.navegacion);
        if (parentNodo) {
            parentName = parentNodo.nombre || parentNodo.titulo || appInstance.getString('breadcrumbRoot');
        }
    }
    // ⬆️ FIN Lógica Padre ⬆️

    if (isMobile) {
        
        let volverHtml = '';
        
        if (parentLevelState && parentLevelState.levelId) { // Solo si no estamos en el nivel raíz
            // Generar el botón Volver
            volverHtml = `
                <article class="card card-volver-vertical" 
                         role="button" 
                         tabindex="0" 
                         onclick="App._handleVolverClick()"
                         aria-label="${appInstance.getString('ariaBackLevel')}">
                    <h3>${data.LOGO_VOLVER} Volver</h3>
                </article>
            `;
        }

        const breadcrumbHtml = `
            <article class="card card-breadcrumb-vertical" 
                     data-id="breadcrumb-nav" 
                     data-tipo="relleno" 
                     tabindex="-1"
                     aria-hidden="true">
                <h3>${parentName}</h3>
            </article>
        `;
        
        mobileBackHtml = `
          <div class="mobile-back-header">
              ${breadcrumbHtml}
              ${volverHtml}
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

    const titleHtml = `<h2 style="outline:none;">${curso.titulo}</h2>`;

    appInstance.DOM.detalleContenido.innerHTML = `
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
    if (appInstance.DOM.vistaNav) { 
        appInstance.DOM.vistaNav.classList.remove('active'); 
    }
    appInstance.DOM.vistaDetalle.classList.add('active');
    
    // ⭐️ 3. Attaching listeners for Text Fragments and Actions ⭐️
    const fragments = appInstance.DOM.detalleContenido.querySelectorAll('.detail-text-fragment');
    fragments.forEach(fragment => {
        // Fix A: Manually handle click/focus on fragments (1st click focus)
        fragment.addEventListener('click', (e) => {
            if (document.activeElement !== fragment) {
                e.preventDefault(); 
                fragment.focus(); 
            }
        });
        
        // Fix B: Handle hover on fragments (make it sharp on mouseover)
        fragment.addEventListener('mouseover', () => {
            fragment.classList.add('focus-current-hover');
        });
        fragment.addEventListener('mouseout', () => {
            fragment.classList.remove('focus-current-hover');
        });
    });
    
    const isTablet = window.innerWidth >= data.TABLET_MIN_WIDTH && window.innerWidth <= data.TABLET_MAX_WIDTH;

    // ⭐️ 2. FOCO INICIAL EN EL PRIMER FRAGMENTO DE TEXTO (RESTAURACIÓN) ⭐️
    const allDetailElements = nav_base_details._getFocusableDetailElements(appInstance).filter(el => 
        !el.classList.contains('card-volver-vertical') && 
        el.id !== 'card-volver-fija-elemento'
    );
    
    const focusIndex = appInstance.STATE.lastDetailFocusIndex || 0;
    const elementToFocus = allDetailElements[focusIndex];

    if (!isMobile) { 
        // DESKTOP/TABLET
        if (appInstance.DOM.cardNivelActual) {
           // ⬇️ MODIFICACIÓN: Mostrar el nombre del padre (categoría) ⬇️
           appInstance.DOM.cardNivelActual.innerHTML = `<h3>${parentName}</h3>`;
           appInstance.DOM.cardNivelActual.classList.add('visible'); 
        }
        
        appInstance.DOM.cardVolverFija.classList.add('visible'); 
        appInstance.DOM.cardVolverFijaElemento.classList.add('visible');
        appInstance.DOM.cardVolverFijaElemento.innerHTML = `<h3>${data.LOGO_VOLVER}</h3>`; 
        appInstance.DOM.cardVolverFijaElemento.tabIndex = 0;
        
        if (elementToFocus && elementToFocus.classList.contains('detail-text-fragment')) {
            // Si el foco inicial es el primer fragmento, forzamos el scroll al inicio del contenedor (donde está el título)
            appInstance.DOM.detalleContenido.scrollTop = 0; 
            elementToFocus.focus();
            nav_base_details._updateDetailFocusState(elementToFocus, appInstance);
        }
        else if (elementToFocus) {
             elementToFocus.focus();
             nav_base_details._updateDetailFocusState(elementToFocus, appInstance); 
             elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
    } else { 
        // MÓVIL
        appInstance.DOM.infoAdicional.classList.remove('visible');
        appInstance.DOM.cardVolverFija.classList.remove('visible');
        
        // ⭐️ CORRECCIÓN SCROLL: Asegurar que el scroll está al inicio al abrir el detalle en móvil. ⭐️
        if (appInstance.DOM.detalleContenido) {
             appInstance.DOM.detalleContenido.scrollTop = 0;
        }

        if (elementToFocus) {
             elementToFocus.focus();
             nav_base_details._updateDetailFocusState(elementToFocus, appInstance); 
             elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
             const firstInteractive = appInstance.DOM.detalleContenido.querySelector('.card, .detail-action-item, .detail-text-fragment');
             if (firstInteractive) {
                firstInteractive.focus();
                nav_base_details._updateDetailFocusState(firstInteractive, appInstance); 
             }
        }
    }
};

// --- code/render-details.js ---