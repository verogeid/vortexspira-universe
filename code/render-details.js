/* --- code/render-details.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js';

/**
 * Inicializa el Swiper de la vista de detalle.
 */
function _initDetailCarousel(appInstance, swiperId, initialSlideIndex) {
    if (appInstance.STATE.detailCarouselInstance) {
        appInstance.STATE.detailCarouselInstance.destroy(true, true);
    }

    const swiperConfig = {
        direction: 'vertical',
        slidesPerView: 'auto',
        loop: false,
        initialSlide: initialSlideIndex,
        touchRatio: 1,
        simulateTouch: true,
        mousewheel: {
            sensitivity: 1,
            releaseOnEdges: true,
        },
        speed: 300,
        freeMode: true,
        freeModeMomentum: true,
        freeModeSticky: true,
    };

    appInstance.STATE.detailCarouselInstance = new Swiper(document.querySelector(swiperId), swiperConfig);

    if (appInstance.STATE.detailCarouselInstance) {
        appInstance.STATE.detailCarouselInstance.on('slideChangeTransitionEnd', (swiper) => {
            nav_base_details._handleSlideChangeEnd(swiper, appInstance);
        });
    }
}

/**
 * Muestra el detalle de un curso específico.
 */
export function _mostrarDetalle(cursoId) {
    const appInstance = this;
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    const curso = appInstance._findNodoById(cursoId, appInstance.STATE.fullData.navegacion); 

    if (!curso) return;

    appInstance.DOM.vistaDetalle = isMobile ? document.getElementById('vista-detalle-mobile') : document.getElementById('vista-detalle-desktop');
    appInstance.DOM.detalleTrack = isMobile ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop'); 

    const swiperId = isMobile ? '#detalle-swiper-mobile' : '#detalle-swiper-desktop';

    let slidesHtml = '';

    if (isMobile) {
        const parent = appInstance.stackGetCurrent();
        let parentName = appInstance.getString('breadcrumbRoot');
        if (parent && parent.levelId) {
            const parentNodo = appInstance._findNodoById(parent.levelId, appInstance.STATE.fullData.navegacion);
            if (parentNodo) {
                parentName = parentNodo.nombre || parentNodo.titulo || parentName;
            }
        }

        let volverHtml = '';
        if (parent && parent.levelId) {
            volverHtml = `
                <div class="card card-volver-vertical" role="button" tabindex="0" onclick="App._handleVolverClick()">
                    <h3>${data.LOGO_VOLVER} Volver</h3>
                </div>
            `;
        }

        slidesHtml += `
            <div class="swiper-slide">
                <div class="card card-breadcrumb-vertical" tabindex="-1">
                    <h3>${parentName}</h3>
                </div>
                ${volverHtml}
            </div>
        `;
    }

    const descripcion = curso.descripcion || '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = descripcion.trim();
    const fragments = Array.from(tempDiv.childNodes).filter(node => 
        (node.nodeType === 1 && ['P', 'UL', 'OL', 'DIV'].includes(node.tagName)) || 
        (node.nodeType === 3 && node.textContent.trim().length > 0)
    );

    if (fragments.length > 0) {
        let firstContent = fragments[0].nodeType === 1 ? fragments[0].outerHTML : `<p>${fragments[0].textContent}</p>`;
        // ⭐️ FIX: onclick="this.focus()" para permitir foco en móvil ⭐️
        slidesHtml += `
            <div class="swiper-slide">
                <h2 class="detail-title-slide">${curso.titulo}</h2>
                <div class="detail-text-fragment" data-index="0" role="document" tabindex="0" onclick="this.focus()">
                    <div class="content-wrapper">
                        ${firstContent}
                    </div>
                </div>
            </div>
        `;

        for (let i = 1; i < fragments.length; i++) {
            let content = fragments[i].nodeType === 1 ? fragments[i].outerHTML : `<p>${fragments[i].textContent}</p>`;
            // ⭐️ FIX: onclick="this.focus()" para permitir foco en móvil ⭐️
            slidesHtml += `
                <div class="swiper-slide">
                    <div class="detail-text-fragment" data-index="${i}" role="document" tabindex="0" onclick="this.focus()">
                        <div class="content-wrapper">
                            ${content}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    if (curso.enlaces) {
        curso.enlaces.forEach(enlace => {
            const iconClass = (enlace.type === 'c') ? 'icon-buy' : (enlace.type === 'd' ? 'icon-download' : 'icon-link');
            slidesHtml += `
                <div class="swiper-slide detail-action-slide">
                    <div class="detail-action-item" onclick="App._handleActionRowClick(event)" tabindex="0" role="listitem">
                        <span class="detail-action-text">${enlace.texto}</span>
                        <a ${!enlace.url || enlace.url === '#' ? '' : `href="${enlace.url}" target="_blank"`} 
                           class="detail-action-btn ${!enlace.url || enlace.url === '#' ? 'disabled' : ''}">
                            <i class="action-icon ${!enlace.url || enlace.url === '#' ? 'icon-vacio' : iconClass}"></i>
                        </a>
                    </div>
                </div>
            `;
        });
    }

    /* ⭐️ INSERCIÓN QUIRÚRGICA: Card de relleno solo en móvil ⭐️ */
    if (isMobile) {
        slidesHtml += `<div class="swiper-slide card-relleno-final" style="height: 100px !important; pointer-events: none;"></div>`;
    }

    if (appInstance.DOM.detalleTrack) {
        appInstance.DOM.detalleTrack.innerHTML = slidesHtml;
    }

    _initDetailCarousel(appInstance, swiperId, 0);

    if (appInstance.DOM.vistaNav) appInstance.DOM.vistaNav.classList.remove('active');
    if (appInstance.DOM.vistaDetalle) appInstance.DOM.vistaDetalle.classList.add('active');
}

/* --- code/render-details.js --- */
