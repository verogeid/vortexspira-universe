// --- code/render-details.js ---

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base from './nav-base.js';
import * as nav_base_details from './nav-base-details.js';

/**
 * Inicializa la instancia de Swiper vertical para la vista de detalle.
 */
function _initDetailCarousel(appInstance, swiperId, initialSlideIndex) {
    if (appInstance.STATE.detailCarouselInstance) {
        appInstance.STATE.detailCarouselInstance.destroy(true, true);
    }
    
    const swiperConfig = {
        direction: 'vertical', 
        slidesPerView: 'auto', // ⭐️ CLAVE: Muestra todos los slides que caben (panorámica) ⭐️
        slidesPerGroup: 1, 
        loop: false, 
        
        initialSlide: initialSlideIndex, 

        touchRatio: 1, 
        simulateTouch: true, 
        centeredSlides: false, // ⭐️ CLAVE: Deshabilita el centrado total para la vista secuencial ⭐️
        mousewheel: { sensitivity: 1, releaseOnEdges: true }, 
        keyboard: { enabled: false }, // Lo manejamos en nav-keyboard-details
        speed: 300, // Velocidad de snap
        
        freeMode: false, 
        freeModeMomentum: false,
    };

    appInstance.STATE.detailCarouselInstance = new Swiper(document.querySelector(swiperId), swiperConfig);
    
    if (appInstance.STATE.detailCarouselInstance) {
         debug.log('render_details', debug.DEBUG_LEVELS.BASIC, `Swiper de Detalle inicializado en ${swiperId}. Slide inicial: ${initialSlideIndex}`);
         
         // ⭐️ Enganchar listener para sincronizar el foco/blur ⭐️
         appInstance.STATE.detailCarouselInstance.on('slideChangeTransitionEnd', function(swiper) {
             nav_base_details._handleSlideChangeEnd(swiper, appInstance);
         });
    }
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

    // ⭐️ 1. REASIGNACIÓN DE REFERENCIAS DOM ⭐️
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    appInstance.DOM.vistaDetalle = isMobile ? document.getElementById('vista-detalle-mobile') : document.getElementById('vista-detalle-desktop');
    appInstance.DOM.detalleTrack = isMobile ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop'); 
    
    const swiperId = isMobile ? '#detalle-swiper-mobile' : '#detalle-swiper-desktop';

    // USANDO NUEVA CLAVE 'type' del JSON
    const getIconClass = (type) => {
        if (type === 'c') { return 'icon-buy'; }
        if (type === 'd') { return 'icon-download'; }
        return 'icon-link';
    };

    // ⬇️ Lógica para obtener el nombre de la CATEGORÍA PADRE ⬇️
    const parentLevelState = appInstance.stackGetCurrent();
    let parentName = appInstance.getString('breadcrumbRoot');

    if (parentLevelState && parentLevelState.levelId) {
        const parentNodo = appInstance._findNodoById(parentLevelState.levelId, appInstance.STATE.fullData.navegacion);
        if (parentNodo) {
            parentName = parentNodo.nombre || parentNodo.titulo || appInstance.getString('breadcrumbRoot');
        }
    }
    // ⬆️ FIN Lógica Padre ⬆️

    // ⭐️ 2. CONSTRUCCIÓN DE SLIDES ⭐️
    let slidesHtml = '';
    
    // --- A. Slides Específicos de MÓVIL (Breadcrumb y Volver) ---
    if (isMobile) {
        const breadcrumbHtml = `
            <div class="card card-breadcrumb-vertical" 
                     data-id="breadcrumb-nav" 
                     data-tipo="relleno" 
                     tabindex="-1"
                     aria-hidden="true">
                <h3>${parentName}</h3>
            </div>
        `;
        slidesHtml += `<div class="swiper-slide detail-mobile-fixed-slide">${breadcrumbHtml}</div>`;
        
        if (parentLevelState && parentLevelState.levelId) { 
            const volverHtml = `
                <div class="card card-volver-vertical" 
                         role="button" 
                         tabindex="0" 
                         onclick="App._handleVolverClick()"
                         aria-label="${appInstance.getString('ariaBackLevel')}">
                    <h3>${data.LOGO_VOLVER} Volver</h3>
                </div>
            `;
            slidesHtml += `<div class="swiper-slide detail-mobile-fixed-slide">${volverHtml}</div>`;
        }
    }
    
    // --- B. Slide del Título ---
    slidesHtml += `
        <div class="swiper-slide">
            <h2 class="detail-title-slide" tabindex="0">${curso.titulo}</h2>
        </div>
    `;


    // --- C. Slides de Fragmentos de Descripción ---
    const description = curso.descripcion || 'No hay descripción disponible.';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description.trim();
    
    Array.from(tempDiv.childNodes).forEach((node, index) => {
        if (node.nodeType === 1 && (node.tagName === 'P' || node.tagName === 'UL' || node.tagName === 'OL' || node.tagName === 'DIV')) {
            const fragmentContent = `<div class="content-wrapper">${node.outerHTML}</div>`;
            slidesHtml += `
                <div class="swiper-slide">
                    <div class="detail-text-fragment" data-index="${index}" role="document" tabindex="0">
                        ${fragmentContent}
                    </div>
                </div>
            `;
        } else if (node.nodeType === 3 && node.textContent.trim().length > 0) {
             const fragmentContent = `<div class="content-wrapper"><p>${node.textContent}</p></div>`;
            slidesHtml += `
                <div class="swiper-slide">
                    <div class="detail-text-fragment" data-index="${index}" role="document" tabindex="0">
                        ${fragmentContent}
                    </div>
                </div>
            `;
        }
    });

    // --- D. Slides de Acciones ---
    if (curso.enlaces && curso.enlaces.length > 0) {
        // Envolvemos cada acción en su propio slide para el focus/blur
        curso.enlaces.forEach((enlace) => {
            const iconClass = getIconClass(enlace.type);
            const isDisabled = !enlace.url || enlace.url === '#';
            
            const contentHtml = `<i class="action-icon ${iconClass}"></i>`;
            const disabledContentHtml = `<i class="action-icon icon-vacio"></i>`; 

            const hrefAttr = isDisabled ? '' : `href="${enlace.url}"`;
            const classDisabledBtn = isDisabled ? 'disabled' : '';
            
            const tabIndexContainer = '0'; 
            const targetAttr = isDisabled ? '' : 'target="_blank"';
            
            const onclickAttr = isDisabled ? 'onclick="return false;"' : '';
            
            const actionItemHtml = `
              <div class="detail-action-item" 
                   onclick="App._handleActionRowClick(event)" 
                   tabindex="${tabIndexContainer}" 
                   role="listitem">
                  <span class="detail-action-text">${enlace.texto}</span>
                  <a ${hrefAttr} 
                     class="detail-action-btn ${classDisabledBtn}" 
                     ${targetAttr} 
                     ${onclickAttr}
                     aria-label="${enlace.texto} ${isDisabled ? '(No disponible)' : ''}">
                     ${isDisabled ? disabledContentHtml : contentHtml}
                  </a>
              </div>`;
              
            slidesHtml += `
                <div class="swiper-slide detail-action-slide">
                    ${actionItemHtml}
                </div>
            `;
        });
    } else {
        slidesHtml += `
            <div class="swiper-slide">
                <div class="detail-text-fragment" tabindex="0">
                    <p>No hay acciones disponibles para este curso.</p>
                </div>
            </div>
        `;
    }
    
    // ⭐️ 3. INYECCIÓN E INICIALIZACIÓN ⭐️
    if (appInstance.DOM.detalleTrack) {
        appInstance.DOM.detalleTrack.innerHTML = slidesHtml;
    }

    // Inicializar Swiper
    const initialSlideIndex = appInstance.STATE.lastDetailFocusIndex;
    _initDetailCarousel(appInstance, swiperId, initialSlideIndex);

    // ⭐️ 5. Attaching listeners for Text Fragments ⭐️
    const fragments = appInstance.DOM.detalleTrack.querySelectorAll('.detail-text-fragment');
    fragments.forEach(fragment => {
        // Fix A: Manually handle click/focus on fragments (1st click focus)
        fragment.addEventListener('click', (e) => {
            const swiper = appInstance.STATE.detailCarouselInstance;
            const slide = e.currentTarget.closest('.swiper-slide');
            const targetIndex = swiper ? swiper.slides.indexOf(slide) : -1;
            
            if (swiper && targetIndex > -1 && targetIndex !== swiper.activeIndex) {
                e.preventDefault(); 
                swiper.slideTo(targetIndex, 300); 
            } else {
                 // ⭐️ FIX CLAVE: Si ya es el slide activo, forzamos el foco nativo (sin scroll) y el refresh del blur/foco. ⭐️
                 e.currentTarget.focus({ preventScroll: true });
                 nav_base_details._updateDetailFocusState(appInstance);
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


    // ⭐️ 4. ACTIVACIÓN Y UI (Desktop/Tablet) ⭐️
    if (appInstance.DOM.vistaNav) { 
        appInstance.DOM.vistaNav.classList.remove('active'); 
    }
    if (appInstance.DOM.vistaDetalle) {
        appInstance.DOM.vistaDetalle.classList.add('active');
    }
    
    if (!isMobile) { 
        // DESKTOP/TABLET Sidebar UI
        // La lógica de verificación del DOM se ha fortalecido aquí.
        if (appInstance.DOM.cardNivelActual) {
           appInstance.DOM.cardNivelActual.innerHTML = `<h3>${parentName}</h3>`;
           appInstance.DOM.cardNivelActual.classList.add('visible'); 
        }
        
        if (appInstance.DOM.cardVolverFija) {
             appInstance.DOM.cardVolverFija.classList.add('visible'); 
        }
        
        if (appInstance.DOM.cardVolverFijaElemento) {
            appInstance.DOM.cardVolverFijaElemento.classList.add('visible');
            appInstance.DOM.cardVolverFijaElemento.innerHTML = `<h3>${data.LOGO_VOLVER}</h3>`; 
            appInstance.DOM.cardVolverFijaElemento.tabIndex = 0;
        }
        
        // Ejecutar el enfoque/blur después de la inicialización de Swiper
        nav_base_details._updateDetailFocusState(appInstance);
        
    } else { 
        // MÓVIL
        if (appInstance.DOM.infoAdicional) {
            appInstance.DOM.infoAdicional.classList.remove('visible');
        }
        if (appInstance.DOM.cardVolverFija) {
            appInstance.DOM.cardVolverFija.classList.remove('visible');
        }
        
        // Ejecutar el enfoque/blur después de la inicialización de Swiper
        nav_base_details._updateDetailFocusState(appInstance);
    }
};

// --- code/render-details.js ---