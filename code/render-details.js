// --- code/render-details.js ---

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base from './nav-base.js';
import * as nav_base_details from './nav-base-details.js';

// ⭐️ NUEVO: Inicialización del Swiper de Detalle
function _initCarousel_Detail(appInstance) {
    if (appInstance.STATE.detailCarouselInstance) {
        appInstance.STATE.detailCarouselInstance.destroy(true, true);
    }
    
    if (typeof Swiper === 'undefined') {
         debug.logError('render_details', "Swiper library not found.");
         return;
    }

    const swiperConfig = {
        direction: 'vertical', 
        // Usamos 'auto' y freeMode para permitir el scroll fluido de documento en móvil
        slidesPerView: 'auto', 
        freeMode: true, 
        mousewheel: { sensitivity: 1, releaseOnEdges: true }, 
        speed: 300,
        keyboard: { enabled: false }, 
    };

    appInstance.STATE.detailCarouselInstance = new Swiper('#nav-swiper-detail', swiperConfig);
    debug.log('render_details', debug.DEBUG_LEVELS.BASIC, "Detail Vertical Swiper initialized.");
}


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
    
    // ⬇️ Lógica para obtener el nombre de la CATEGORÍA PADRE (Breadcrumb) ⬇️
    const parentLevelState = appInstance.stackGetCurrent();
    let parentName = appInstance.getString('breadcrumbRoot');

    if (parentLevelState && parentLevelState.levelId) {
        const parentNodo = appInstance._findNodoById(parentLevelState.levelId, appInstance.STATE.fullData.navegacion);
        if (parentNodo) {
            parentName = parentNodo.nombre || parentNodo.titulo || appInstance.getString('breadcrumbRoot');
        }
    }
    // ⬆️ FIN Lógica Padre ⬆️

    const fragmentsAndActions = [];
    
    // 1. MOBILE ONLY: Add Breadcrumb and Volver cards as the first slides if necessary
    if (isMobile) {
        if (parentLevelState && parentLevelState.levelId) {
            // Breadcrumb slide
            fragmentsAndActions.push(`
                <div class="swiper-slide card card-breadcrumb-vertical" data-id="breadcrumb-nav" data-tipo="relleno" tabindex="-1" aria-hidden="true">
                    <h3>${parentName}</h3>
                </div>
            `);

            // Volver slide
            fragmentsAndActions.push(`
                <div class="swiper-slide card card-volver-vertical" data-id="volver-nav" data-tipo="volver-vertical" role="button" tabindex="0" onclick="App._handleVolverClick()" aria-label="${appInstance.getString('ariaBackLevel')}">
                    <h3>${data.LOGO_VOLVER} Volver</h3>
                </div>
            `);
        }
    }
    
    // 2. Title Slide (Siempre visible en Desktop/Tablet)
    const titleHtml = `<h2 style="outline:none;">${curso.titulo}</h2>`;
    fragmentsAndActions.push(`
        <div class="swiper-slide detail-title-slide" tabindex="-1"> 
            ${titleHtml}
        </div>
    `);

    // 3. Process fragments into slides
    const description = curso.descripcion || 'No hay descripción disponible.';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description.trim();
    
    Array.from(tempDiv.childNodes).forEach((node) => {
        if (node.nodeType === 1 && (node.tagName === 'P' || node.tagName === 'UL' || node.tagName === 'OL' || node.tagName === 'DIV')) {
            // Cada fragmento de texto es un slide
            fragmentsAndActions.push(`
                <div class="swiper-slide detail-fragment-slide detail-text-fragment" tabindex="0">
                    ${node.outerHTML}
                </div>
            `);
        } else if (node.nodeType === 3 && node.textContent.trim().length > 0) {
            // Texto suelto también es un slide
            fragmentsAndActions.push(`
                <div class="swiper-slide detail-fragment-slide detail-text-fragment" tabindex="0">
                    <p>${node.textContent}</p>
                </div>
            `);
        }
    });
    
    // 4. Process action items into slides
    if (curso.enlaces && curso.enlaces.length > 0) {
        // La lista completa de acciones es un único slide grande y enfocable
        fragmentsAndActions.push(`
            <div class="swiper-slide detail-fragment-slide detail-actions-list-wrapper" tabindex="-1">
                <div class="detail-actions-list">
                    ${curso.enlaces.map(enlace => {
                        const iconClass = getIconClass(enlace.type);
                        const isDisabled = !enlace.url || enlace.url === '#';
                        const contentHtml = `<i class="action-icon ${iconClass}"></i>`;
                        const disabledContentHtml = `<i class="action-icon icon-vacio"></i>`; 
                        const hrefAttr = isDisabled ? '' : `href="${enlace.url}"`;
                        const classDisabledBtn = isDisabled ? 'disabled' : '';
                        const tabIndexContainer = '0'; 
                        const targetAttr = isDisabled ? '' : 'target="_blank"';
                        const onclickAttr = isDisabled ? 'onclick="return false;"' : '';

                        // Nota: Las filas de acción son los elementos enfocables reales dentro del slide
                        return `
                          <div class="detail-action-item" onclick="App._handleActionRowClick(event)" tabindex="${tabIndexContainer}" role="listitem">
                              <span class="detail-action-text">${enlace.texto}</span>
                              <a ${hrefAttr} class="detail-action-btn ${classDisabledBtn}" ${targetAttr} aria-label="${enlace.texto} ${isDisabled ? '(No disponible)' : ''}">
                                 ${isDisabled ? disabledContentHtml : contentHtml}
                              </a>
                          </div>`;
                    }).join('')}
                </div>
            </div>
        `);
    }

    // ⭐️ New DOM Injection Structure ⭐️
    appInstance.DOM.detalleContenido.innerHTML = `
      <div class="swiper swiper-vertical-detalle" id="nav-swiper-detail">
        <div class="swiper-wrapper">
            ${fragmentsAndActions.join('')}
        </div>
      </div>
    `;


    // ⭐️ Initialization and Activation ⭐️
    if (appInstance.DOM.vistaNav) { appInstance.DOM.vistaNav.classList.remove('active'); }
    appInstance.DOM.vistaDetalle.classList.add('active');

    // ⭐️ Initialize the new Swiper ⭐️
    _initCarousel_Detail(appInstance);
    
    // ⬇️ Lógica de Foco Inicial (post-swiper) ⬇️
    // Encontrar el índice del primer slide de contenido real (saltando Breadcrumb/Volver)
    let targetSlideIndex = 0;
    if (isMobile && parentLevelState && parentLevelState.levelId) {
         // Si hay breadcrumb/volver, el contenido empieza en el slide 2
         targetSlideIndex = 2; 
    }
    
    if (appInstance.STATE.detailCarouselInstance.slides[targetSlideIndex]) {
        appInstance.STATE.detailCarouselInstance.slideTo(targetSlideIndex, 0);
    }
}

// --- code/render-details.js ---