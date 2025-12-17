// --- code/render-details.js ---

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base from './nav-base.js';
import * as nav_base_details from './nav-base-details.js';

function _initDetailCarousel(appInstance, swiperId, initialSlideIndex) {
    if (appInstance.STATE.detailCarouselInstance) appInstance.STATE.detailCarouselInstance.destroy(true, true);
    const swiperConfig = {
        direction: 'vertical', slidesPerView: 'auto', group: 1, loop: false, 
        initialSlide: initialSlideIndex, touchRatio: 1, simulateTouch: true, 
        mousewheel: { sensitivity: 1, releaseOnEdges: true }, 
        speed: 300, freeMode: true, freeModeMomentum: true, freeModeSticky: true, 
    };
    appInstance.STATE.detailCarouselInstance = new Swiper(document.querySelector(swiperId), swiperConfig);
    if (appInstance.STATE.detailCarouselInstance) {
         debug.log('render_details', debug.DEBUG_LEVELS.BASIC, `Swiper inicializado en ${swiperId}.`);
         appInstance.STATE.detailCarouselInstance.on('slideChangeTransitionEnd', (s) => nav_base_details._handleSlideChangeEnd(s, appInstance));
    }
}

export function _mostrarDetalle(cursoId) {
    const appInstance = this;
    debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 'Iniciando _mostrarDetalle para:', cursoId);

    const curso = appInstance._findNodoById(cursoId, appInstance.STATE.fullData.navegacion); 
    if (!curso) return;

    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
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
    if (isMobile) {
        let vHtml = (parentLevelState?.levelId) ? `<div class="card card-volver-vertical" role="button" tabindex="0" onclick="App._handleVolverClick()"><h3>${data.LOGO_VOLVER} Volver</h3></div>` : '';
        slidesHtml += `<div class="swiper-slide detail-mobile-fixed-slide"><div class="card card-breadcrumb-vertical" tabindex="-1"><h3>${parentName}</h3></div>${vHtml}</div>`;
    }
    
    // Contenido
    const desc = curso.descripcion || '';
    const temp = document.createElement('div'); temp.innerHTML = desc.trim();
    const frags = Array.from(temp.childNodes).filter(n => (n.nodeType === 1 && ['P', 'UL', 'OL', 'DIV'].includes(n.tagName)) || (n.nodeType === 3 && n.textContent.trim().length > 0));
    if (frags.length > 0) {
        let first = frags[0].nodeType === 1 ? frags[0].outerHTML : `<p>${frags[0].textContent}</p>`;
        slidesHtml += `<div class="swiper-slide"><h2 class="detail-title-slide">${curso.titulo}</h2><div class="detail-text-fragment" data-index="0" role="document" tabindex="0"><div class="content-wrapper">${first}</div></div></div>`;
        for (let i = 1; i < frags.length; i++) {
            let c = frags[i].nodeType === 1 ? frags[i].outerHTML : `<p>${frags[i].textContent}</p>`;
            slidesHtml += `<div class="swiper-slide"><div class="detail-text-fragment" data-index="${i}" role="document" tabindex="0"><div class="content-wrapper">${c}</div></div></div>`;
        }
    }
    if (curso.enlaces) {
        curso.enlaces.forEach(e => {
            const icon = (e.type === 'c') ? 'icon-buy' : (e.type === 'd' ? 'icon-download' : 'icon-link');
            slidesHtml += `<div class="swiper-slide detail-action-slide"><div class="detail-action-item" onclick="App._handleActionRowClick(event)" tabindex="0" role="listitem"><span class="detail-action-text">${e.texto}</span><a ${!e.url || e.url === '#' ? '' : `href="${e.url}" target="_blank"`} class="detail-action-btn ${!e.url || e.url === '#' ? 'disabled' : ''}"><i class="action-icon ${!e.url || e.url === '#' ? 'icon-vacio' : icon}"></i></a></div></div>`;
        });
    }

    if (appInstance.DOM.detalleTrack) appInstance.DOM.detalleTrack.innerHTML = slidesHtml;

    _initDetailCarousel(appInstance, swiperId, 0);

    if (appInstance.DOM.vistaNav) appInstance.DOM.vistaNav.classList.remove('active'); 
    if (appInstance.DOM.vistaDetalle) appInstance.DOM.vistaDetalle.classList.add('active');
    
    if (!isMobile && appInstance.DOM.cardVolverFijaElemento) {
        appInstance.DOM.cardVolverFijaElemento.classList.add('visible');
        appInstance.DOM.cardVolverFijaElemento.tabIndex = 0;
        appInstance.DOM.cardVolverFijaElemento.innerHTML = `<h3>${data.LOGO_VOLVER}</h3>`;
    }

    const focusElements = nav_base_details._getFocusableDetailElements(appInstance);
    const target = focusElements.find(el => el.id === 'card-volver-fija-elemento' || el.classList.contains('card-volver-vertical')) || focusElements[0];

    if (target) {
        debug.log('render_details', debug.DEBUG_LEVELS.DEEP, 'DEPURACIÓN: Iniciando secuencia de foco en Card Volver.');
        const tryFocus = (el, att) => {
            if (att <= 0) {
                debug.logWarn('render_details', "DEPURACIÓN: Foco inicial agotado sin éxito.");
                return;
            }
            debug.log('render_details', debug.DEBUG_LEVELS.DEEP, `DEPURACIÓN: Intento #${11-att} sobre ${el.className || el.id}`);
            el.focus();
            if (document.activeElement === el) {
                debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 'DEPURACIÓN: Foco consolidado correctamente.');
                appInstance.STATE.lastDetailFocusIndex = focusElements.indexOf(el);
                setTimeout(() => nav_base_details._updateDetailFocusState(appInstance), 50); 
            } else {
                debug.log('render_details', debug.DEBUG_LEVELS.DEEP, `DEPURACIÓN: Fallo. Active actual: ${document.activeElement.tagName}`);
                setTimeout(() => tryFocus(el, att - 1), 50);
            }
        };
        setTimeout(() => tryFocus(target, 10), 150);
    }
};

// --- code/render-details.js ---