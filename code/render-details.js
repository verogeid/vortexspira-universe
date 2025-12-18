// --- code/render-details.js ---

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base from './nav-base.js';
import * as nav_base_details from './nav-base-details.js';

/**
 * Inicializa la instancia de Swiper para la vista de detalle.
 */
function _initDetailCarousel(appInstance, swiperId, initialSlideIndex) {
    if (appInstance.STATE.detailCarouselInstance) appInstance.STATE.detailCarouselInstance.destroy(true, true);
    
    const swiperConfig = {
        direction: 'vertical', 
        slidesPerView: 'auto', 
        group: 1, 
        loop: false, 
        initialSlide: initialSlideIndex, 
        touchRatio: 1, 
        simulateTouch: true, 
        mousewheel: { sensitivity: 1, releaseOnEdges: true }, 
        speed: 300, 
        freeMode: true, 
        freeModeMomentum: true, 
        freeModeSticky: true, 
    };

    appInstance.STATE.detailCarouselInstance = new Swiper(document.querySelector(swiperId), swiperConfig);
    
    if (appInstance.STATE.detailCarouselInstance) {
         debug.log('render_details', debug.DEBUG_LEVELS.BASIC, `Swiper inicializado en ${swiperId}.`);
         appInstance.STATE.detailCarouselInstance.on('slideChangeTransitionEnd', (s) => nav_base_details._handleSlideChangeEnd(s, appInstance));
    }
}

/**
 * Renderiza y muestra la vista de detalle de un curso.
 */
export function _mostrarDetalle(cursoId) {
    const appInstance = this;
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;

    // Reseteo preventivo del flag de bloqueo (Telemetría vía debug._watchFlag)
    if (isMobile) {
        debug.log('render_details', debug.DEBUG_LEVELS.DEEP, "DEPURACIÓN MOBILE: Limpiando flag al entrar.");
        appInstance.STATE.keyboardNavInProgress = false;
    }

    debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 'Iniciando _mostrarDetalle para:', cursoId);
    
    const curso = appInstance._findNodoById(cursoId, appInstance.STATE.fullData.navegacion); 
    if (!curso) {
        debug.logError('render_details', "No se pudo encontrar el curso con ID:", cursoId);
        return;
    }

    appInstance.DOM.vistaDetalle = isMobile ? document.getElementById('vista-detalle-mobile') : document.getElementById('vista-detalle-desktop');
    appInstance.DOM.detalleTrack = isMobile ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop'); 
    const swiperId = isMobile ? '#detalle-swiper-mobile' : '#detalle-swiper-desktop';

    const parentLevelState = appInstance.stackGetCurrent();
    let parentName = appInstance.getString('breadcrumbRoot');
    if (parentLevelState?.levelId) {
        const pNodo = appInstance._findNodoById(parentLevelState.levelId, appInstance.STATE.fullData.navegacion);
        if (pNodo) parentName = pNodo.nombre || pNodo.titulo || parentName;
    }

    let slidesHtml = '';
    
    // --- SECCIÓN BREADCRUMB Y VOLVER (MÓVIL) ---
    if (isMobile) {
        let volverHtml = (parentLevelState?.levelId) ? 
            `<div class="card card-volver-vertical" role="button" tabindex="0" onclick="App._handleVolverClick()"><h3>${data.LOGO_VOLVER} Volver</h3></div>` : '';
        
        // ⭐️ REVERTIDO: Restaurada la clase 'card card-breadcrumb-vertical' ⭐️
        slidesHtml += `
            <div class="swiper-slide detail-mobile-fixed-slide">
                <div class="card card-breadcrumb-vertical" tabindex="-1"><h3>${parentName}</h3></div>
                ${volverHtml}
            </div>`;
    }
    
    // --- SECCIÓN CONTENIDO (FRAGMENTOS DE TEXTO) ---
    const desc = curso.descripcion || '';
    const temp = document.createElement('div'); 
    temp.innerHTML = desc.trim();
    
    const frags = Array.from(temp.childNodes).filter(n => 
        (n.nodeType === 1 && ['P', 'UL', 'OL', 'DIV'].includes(n.tagName)) || 
        (n.nodeType === 3 && n.textContent.trim().length > 0)
    );

    if (frags.length > 0) {
        let firstContent = frags[0].nodeType === 1 ? frags[0].outerHTML : `<p>${frags[0].textContent}</p>`;
        slidesHtml += `
            <div class="swiper-slide">
                <h2 class="detail-title-slide">${curso.titulo}</h2>
                <div class="detail-text-fragment" data-index="0" role="document" tabindex="0">
                    <div class="content-wrapper">${firstContent}</div>
                </div>
            </div>`;

        for (let i = 1; i < frags.length; i++) {
            let content = frags[i].nodeType === 1 ? frags[i].outerHTML : `<p>${frags[i].textContent}</p>`;
            slidesHtml += `
                <div class="swiper-slide">
                    <div class="detail-text-fragment" data-index="${i}" role="document" tabindex="0">
                        <div class="content-wrapper">${content}</div>
                    </div>
                </div>`;
        }
    }

    // --- SECCIÓN ACCIONES (ENLACES) ---
    if (curso.enlaces) {
        curso.enlaces.forEach(e => {
            const icon = (e.type === 'c') ? 'icon-buy' : (e.type === 'd' ? 'icon-download' : 'icon-link');
            slidesHtml += `
                <div class="swiper-slide detail-action-slide">
                    <div class="detail-action-item" onclick="App._handleActionRowClick(event)" tabindex="0" role="listitem">
                        <span class="detail-action-text">${e.texto}</span>
                        <a ${!e.url || e.url === '#' ? '' : `href="${e.url}" target="_blank"`} 
                           class="detail-action-btn ${!e.url || e.url === '#' ? 'disabled' : ''}">
                            <i class="action-icon ${!e.url || e.url === '#' ? 'icon-vacio' : icon}"></i>
                        </a>
                    </div>
                </div>`;
        });
    }

    // Inyección en el DOM
    if (appInstance.DOM.detalleTrack) {
        appInstance.DOM.detalleTrack.innerHTML = slidesHtml;
    }

    _initDetailCarousel(appInstance, swiperId, 0);

    // Activación de vistas
    if (appInstance.DOM.vistaNav) appInstance.DOM.vistaNav.classList.remove('active'); 
    if (appInstance.DOM.vistaDetalle) appInstance.DOM.vistaDetalle.classList.add('active');
    
    // Configuración del Volver fijo en Desktop
    if (!isMobile && appInstance.DOM.cardVolverFijaElemento) {
        appInstance.DOM.cardVolverFijaElemento.classList.add('visible');
        appInstance.DOM.cardVolverFijaElemento.tabIndex = 0;
        appInstance.DOM.cardVolverFijaElemento.innerHTML = `<h3>${data.LOGO_VOLVER}</h3>`;
    }

    // --- GESTIÓN DE FOCO INICIAL ---
    const focusElements = nav_base_details._getFocusableDetailElements(appInstance);
    const target = focusElements.find(el => el.id === 'card-volver-fija-elemento' || el.classList.contains('card-volver-vertical')) || focusElements[0];

    if (target) {
        const tryFocus = (el, att) => {
            if (att <= 0) {
                debug.logWarn('render_details', "No se pudo consolidar el foco inicial tras varios intentos.");
                return;
            }
            
            // Foco (Telemetría profunda vía debug._setupFocusMethodInterceptor)
            el.focus();

            if (document.activeElement === el) {
                debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 'Foco inicial consolidado en el detalle.');
                appInstance.STATE.lastDetailFocusIndex = focusElements.indexOf(el);
                setTimeout(() => nav_base_details._updateDetailFocusState(appInstance), 50); 
            } else {
                setTimeout(() => tryFocus(el, att - 1), 50);
            }
        };
        setTimeout(() => tryFocus(target, 10), 150);
    }
};

// --- code/render-details.js ---