/* --- code/render-details.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js';

export function _mostrarDetalle(cursoId) {
    const appInstance = this;
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    const curso = appInstance._findNodoById(cursoId, appInstance.STATE.fullData.navegacion); 
    if (!curso) return;

    appInstance.DOM.vistaDetalle = isMobile ? document.getElementById('vista-detalle-mobile') : document.getElementById('vista-detalle-desktop');
    appInstance.DOM.detalleTrack = isMobile ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop'); 
    const swiperId = isMobile ? '#detalle-swiper-mobile' : '#detalle-swiper-desktop';

    let slidesHtml = '';
    
    // Breadcrumb y Volver (Mobile)
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
    
    // Fragmentos de texto
    const desc = curso.descripcion || '';
    const temp = document.createElement('div'); temp.innerHTML = desc.trim();
    const frags = Array.from(temp.childNodes).filter(n => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim().length > 0));

    frags.forEach((frag, i) => {
        let content = frag.nodeType === 1 ? frag.outerHTML : `<p>${frag.textContent}</p>`;
        slidesHtml += `<div class="swiper-slide">
            ${i === 0 ? `<h2 class="detail-title-slide">${curso.titulo}</h2>` : ''}
            <div class="detail-text-fragment" tabindex="0" onclick="this.focus()"><div class="content-wrapper">${content}</div></div>
        </div>`;
    });

    // Enlaces
    if (curso.enlaces) {
        curso.enlaces.forEach(e => {
            const icon = (e.type === 'c') ? 'icon-buy' : (e.type === 'd' ? 'icon-download' : 'icon-link');
            slidesHtml += `<div class="swiper-slide detail-action-slide"><div class="detail-action-item" onclick="App._handleActionRowClick(event)" tabindex="0"><span class="detail-action-text">${e.texto}</span><a ${!e.url || e.url === '#' ? '' : `href="${e.url}" target="_blank"`} class="detail-action-btn"><i class="action-icon ${icon}"></i></a></div></div>`;
        });
    }

    // ÚNICA INSERCIÓN: Tarjeta de relleno transparente
    slidesHtml += `<div class="swiper-slide card-relleno-final" style="height: 80px !important;"></div>`;

    if (appInstance.DOM.detalleTrack) appInstance.DOM.detalleTrack.innerHTML = slidesHtml;
    
    // Inicialización del carrusel (usando tu config original)
    if (appInstance.STATE.detailCarouselInstance) appInstance.STATE.detailCarouselInstance.destroy(true, true);
    appInstance.STATE.detailCarouselInstance = new Swiper(document.querySelector(swiperId), {
        direction: 'vertical', slidesPerView: 'auto', loop: false, 
        initialSlide: 0, touchRatio: 1, simulateTouch: true, 
        mousewheel: { sensitivity: 1, releaseOnEdges: true }, 
        speed: 300, freeMode: true, freeModeMomentum: true, freeModeSticky: true, 
    });
}

/* --- code/render-details.js --- */