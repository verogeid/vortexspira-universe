/* --- code/render-details.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js';

function _initDetailCarousel(appInstance, swiperId, initialSlideIndex) {
    if (appInstance.STATE.detailCarouselInstance) appInstance.STATE.detailCarouselInstance.destroy(true, true);
    const swiperConfig = {
        direction: 'vertical', slidesPerView: 'auto', loop: false, 
        initialSlide: initialSlideIndex, touchRatio: 1, simulateTouch: true, 
        mousewheel: { sensitivity: 1, releaseOnEdges: true }, 
        speed: 300, freeMode: true, freeModeMomentum: true, freeModeSticky: true, 
    };
    appInstance.STATE.detailCarouselInstance = new Swiper(document.querySelector(swiperId), swiperConfig);
    if (appInstance.STATE.detailCarouselInstance) {
         appInstance.STATE.detailCarouselInstance.on('slideChangeTransitionEnd', (s) => nav_base_details._handleSlideChangeEnd(s, appInstance));
    }
}

export function _mostrarDetalle(cursoId) {
    const appInstance = this;
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    const curso = appInstance._findNodoById(cursoId, appInstance.STATE.fullData.navegacion); 
    if (!curso) return;

    appInstance.DOM.vistaDetalle = isMobile ? document.getElementById('vista-detalle-mobile') : document.getElementById('vista-detalle-desktop');
    appInstance.DOM.detalleTrack = isMobile ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop'); 
    const swiperId = isMobile ? '#detalle-swiper-mobile' : '#detalle-swiper-desktop';

    let slidesHtml = '';
    
    // Header Breadcrumb (Mobile)
    if (isMobile) {
        const parent = appInstance.stackGetCurrent();
        let parentName = appInstance.getString('breadcrumbRoot');
        if (parent?.levelId) {
            const pNodo = appInstance._findNodoById(parent.levelId, appInstance.STATE.fullData.navegacion);
            if (pNodo) parentName = pNodo.nombre || pNodo.titulo || parentName;
        }
        let vHtml = parent?.levelId ? `<div class="card card-volver-vertical" role="button" tabindex="0" onclick="App._handleVolverClick()"><h3>${data.LOGO_VOLVER} Volver</h3></div>` : '';
        slidesHtml += `<div class="swiper-slide"><div class="card card-breadcrumb-vertical" tabindex="-1"><h3>${parentName}</h3></div>${vHtml}</div>`;
    }
    
    // Contenido del curso
    const desc = curso.descripcion || '';
    const temp = document.createElement('div'); temp.innerHTML = desc.trim();
    const frags = Array.from(temp.childNodes).filter(n => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim().length > 0));

    frags.forEach((frag, i) => {
        let content = frag.nodeType === 1 ? frag.outerHTML : `<p>${frag.textContent}</p>`;
        // ⭐️ FIX: Foco manual al clicar párrafo y título ⭐️
        if (i === 0) {
            slidesHtml += `<div class="swiper-slide"><h2 class="detail-title-slide">${curso.titulo}</h2><div class="detail-text-fragment" data-index="0" role="document" tabindex="0" onclick="this.focus()"><div class="content-wrapper">${content}</div></div></div>`;
        } else {
            slidesHtml += `<div class="swiper-slide"><div class="detail-text-fragment" data-index="${i}" role="document" tabindex="0" onclick="this.focus()"><div class="content-wrapper">${content}</div></div></div>`;
        }
    });

    // Enlaces
    if (curso.enlaces) {
        curso.enlaces.forEach(e => {
            const icon = (e.type === 'c') ? 'icon-buy' : (e.type === 'd' ? 'icon-download' : 'icon-link');
            slidesHtml += `<div class="swiper-slide detail-action-slide"><div class="detail-action-item" onclick="App._handleActionRowClick(event)" tabindex="0" role="listitem"><span class="detail-action-text">${e.texto}</span><a ${!e.url || e.url === '#' ? '' : `href="${e.url}" target="_blank"`} class="detail-action-btn ${!e.url || e.url === '#' ? 'disabled' : ''}"><i class="action-icon ${!e.url || e.url === '#' ? 'icon-vacio' : icon}"></i></a></div></div>`;
        });
    }

    // ⭐️ INYECCIÓN QUIRÚRGICA: Relleno final en Detalles ⭐️
    slidesHtml += `<div class="swiper-slide" style="height: 150px !important; background: transparent !important; border: none !important; box-shadow: none !important; pointer-events: none;"></div>`;

    if (appInstance.DOM.detalleTrack) appInstance.DOM.detalleTrack.innerHTML = slidesHtml;
    _initDetailCarousel(appInstance, swiperId, 0);

    if (appInstance.DOM.vistaNav) appInstance.DOM.vistaNav.classList.remove('active'); 
    if (appInstance.DOM.vistaDetalle) appInstance.DOM.vistaDetalle.classList.add('active');
}

/* --- code/render-details.js --- */
