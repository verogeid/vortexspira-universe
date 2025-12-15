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
        
        // ⭐️ CORRECCIÓN: Habilitar arrastre libre (freeMode) para permitir ver todos los elementos ⭐️
        freeMode: true, 
        freeModeMomentum: true,
        freeModeSticky: true, // ⭐️ FIX CLAVE: Añadir snap al modo free (Harmoniza con menú) ⭐️
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
    
    // --- A. Slide Fijo de MÓVIL (Breadcrumb y Volver) ---
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
        
        // Solo añadir el botón Volver si NO estamos en el nivel raíz
        let volverHtml = '';
        if (parentLevelState && parentLevelState.levelId) { 
            volverHtml = `
                <div class="card card-volver-vertical" 
                         role="button" 
                         tabindex="0" 
                         onclick="App._handleVolverClick()"
                         aria-label="${appInstance.getString('ariaBackLevel')}">
                    <h3>${data.LOGO_VOLVER} Volver</h3>
                </div>
            `;
        }
        
        // ⭐️ FIX CLAVE: Agrupar Breadcrumb y Volver en un solo slide para móvil ⭐️
        slidesHtml += `
            <div class="swiper-slide detail-mobile-fixed-slide">
                ${breadcrumbHtml}
                ${volverHtml}
            </div>
        `;
    }
    
    // --- B. Slide del Título y el Primer Fragmento ---
    const description = curso.descripcion || 'No hay descripción disponible.';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description.trim();
    
    // Filtramos nodos de texto significativos y elementos HTML
    const fragments = Array.from(tempDiv.childNodes).filter(node => 
        (node.nodeType === 1 && (node.tagName === 'P' || node.tagName === 'UL' || node.tagName === 'OL' || node.tagName === 'DIV')) || 
        (node.nodeType === 3 && node.textContent.trim().length > 0)
    );
    
    let firstFragmentContent = '';
    let descriptionNodesStart = 0;
    
    // Procesar el primer fragmento (si existe)
    if (fragments.length > 0) {
        const firstNode = fragments[0];
        if (firstNode.nodeType === 1) {
            firstFragmentContent = firstNode.outerHTML;
        } else if (firstNode.nodeType === 3) {
            firstFragmentContent = `<p>${firstNode.textContent}</p>`;
        }
        descriptionNodesStart = 1; // La descripción comienza desde el segundo fragmento
    }

    // ⭐️ FIX 2.1: Quitar tabindex="0" del título ⭐️
    slidesHtml += `
        <div class="swiper-slide">
            <h2 class="detail-title-slide">${curso.titulo}</h2>
            <div class="detail-text-fragment" data-index="0" role="document" tabindex="0">
                <div class="content-wrapper">${firstFragmentContent}</div>
            </div>
        </div>
    `;


    // --- C. Slides de Fragmentos de Descripción Restantes ---
    
    // Iterar sobre los fragmentos restantes
    for (let i = descriptionNodesStart; i < fragments.length; i++) {
        const node = fragments[i];
        let fragmentContent = '';
        
        if (node.nodeType === 1) {
            fragmentContent = node.outerHTML;
        } else if (node.nodeType === 3) {
            fragmentContent = `<p>${node.textContent}</p>`;
        }
        
        slidesHtml += `
            <div class="swiper-slide">
                <div class="detail-text-fragment" data-index="${i}" role="document" tabindex="0">
                    <div class="content-wrapper">${fragmentContent}</div>
                </div>
            </div>
        `;
    }

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
    // Usamos el índice de slide del foco lógico guardado
    const focusableElements = nav_base_details._getFocusableDetailElements(appInstance);
    const initialFocusIndex = appInstance.STATE.lastDetailFocusIndex || 0;
    
    let initialSlideIndex = 0;
    if (focusableElements.length > 0) {
        const elementToFocus = focusableElements[initialFocusIndex];
        const slide = elementToFocus ? elementToFocus.closest('.swiper-slide') : null;
        const swiperSlides = Array.from(appInstance.DOM.detalleTrack.querySelectorAll('.swiper-slide'));
        initialSlideIndex = slide ? swiperSlides.indexOf(slide) : 0;
        if(initialSlideIndex === -1) initialSlideIndex = 0;
    }
    
    _initDetailCarousel(appInstance, swiperId, initialSlideIndex);


    // ⭐️ 5. Attaching listeners for Text Fragments ⭐️
    const fragmentsEl = appInstance.DOM.detalleTrack.querySelectorAll('.detail-text-fragment');
    fragmentsEl.forEach(fragment => {
        // Fix A: Manually handle click/focus on fragments (1st click focus)
        fragment.addEventListener('click', (e) => {
            const swiper = appInstance.STATE.detailCarouselInstance;
            const clickedElement = e.currentTarget;
            const slide = clickedElement.closest('.swiper-slide');
            const targetSlideIndex = swiper ? swiper.slides.indexOf(slide) : -1;
            
            e.preventDefault(); 

            // Find index within the master focusable list
            const focusableElements = nav_base_details._getFocusableDetailElements(appInstance);
            const targetElementIndex = focusableElements.indexOf(clickedElement);

            if (targetElementIndex === -1) {
                debug.logWarn('render_details', 'Clicked fragment not found in focusable list, ignoring click action.');
                return;
            }

            if (swiper && targetSlideIndex > -1 && targetSlideIndex !== swiper.activeIndex) {
                // 1. Element is in a different slide. Move to slide.
                // Actualizamos el estado antes del slide para que el evento slideChangeTransitionEnd sepa dónde poner el foco.
                appInstance.STATE.lastDetailFocusIndex = targetElementIndex;
                swiper.slideTo(targetSlideIndex, 300); 
                
            } else {
                // 2. Element is in the active slide or fixed sidebar. Focus directly.
                
                appInstance.STATE.lastDetailFocusIndex = targetElementIndex;
                
                // ⭐️ FIX CLAVE: Aplicar foco nativo (PERMITIENDO SCROLL COMPLETO) ⭐️
                clickedElement.focus(); 
                
                // Forzar actualización visual del blur
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


    // 4. ACTIVACIÓN Y UI (Desktop/Tablet) ⭐️
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
        
    } else { 
        // MÓVIL
        if (appInstance.DOM.infoAdicional) {
            appInstance.DOM.infoAdicional.classList.remove('visible');
        }
        if (appInstance.DOM.cardVolverFija) {
            appInstance.DOM.cardVolverFija.classList.remove('visible');
        }
    }
    
    // ⭐️ LÓGICA DE FOCO INICIAL ⭐️
    // 1. Obtener el elemento que debe tener el foco
    const elementToFocus = focusableElements[initialFocusIndex];
    
    if (elementToFocus) {
        // 2. Aplicar el foco nativo (sin preventScroll)
        elementToFocus.focus();
        
        // 3. Forzar el estado visual inicial (blur/sharpness)
        nav_base_details._updateDetailFocusState(appInstance);
    }
};
// --- code/render-details.js ---