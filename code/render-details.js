/* --- code/render-details.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js';

function _initDetailCarousel(appInstance, swiperId, initialSlideIndex) {
    // Seguridad: Limpieza previa si existiera
    if (appInstance.STATE.detailCarouselInstance) {
        appInstance.STATE.detailCarouselInstance.destroy(true, true);
        appInstance.STATE.detailCarouselInstance = null;
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

export function _mostrarDetalle(cursoId) {
    const appInstance = this;
    const isMobile = window.innerWidth <= data.MAX_WIDTH.MOBILE;
    const curso = appInstance._findNodoById(cursoId, appInstance.STATE.fullData.navegacion); 

    if (!curso) return;

    // 🗑️ LIMPIEZA TOTAL DE NAVEGACIÓN (AHORRO DE MEMORIA) 🗑️
    // 1. Destruir instancia Swiper del menú
    if (typeof appInstance._destroyCarousel === 'function') {
        appInstance._destroyCarousel();
    }
    
    // 2. Ocultar y limpiar DOM de navegación para evitar conflictos
    ['vista-navegacion-desktop', 'vista-navegacion-tablet', 'vista-navegacion-mobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
            el.style.display = 'none';
            // Opcional: el.innerHTML = ''; // Si quieres ser extremo con la memoria
        }
    });

    // Limpieza de vistas de detalle cruzadas (por si cambio de modo)
    const desktopView = document.getElementById('vista-detalle-desktop');
    const mobileView = document.getElementById('vista-detalle-mobile');
    
    if (desktopView) { desktopView.classList.remove('active'); desktopView.style.display = 'none'; }
    if (mobileView) { mobileView.classList.remove('active'); mobileView.style.display = 'none'; }

    // Asignación y activación de la vista correcta
    appInstance.DOM.vistaDetalle = isMobile ? mobileView : desktopView;
    appInstance.DOM.vistaDetalle.style.display = 'flex'; 
    appInstance.DOM.vistaDetalle.classList.add('active');

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
                <article class="card card-volver-vertical" role="button" tabindex="0" onclick="App._handleVolverClick()">
                    <h3>${data.LOGO.VOLVER}</h3>
                </article>
            `;
        }

        slidesHtml += `
            <div class="swiper-slide">
                <article class="card card-breadcrumb-vertical" tabindex="-1" style="margin-bottom: 10px;">
                    <h3>${parentName}</h3>
                </article>
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

    if (isMobile) {
        slidesHtml += `<div class="swiper-slide card-relleno-final" style="height: 100px !important; pointer-events: none;"></div>`;
    }

    if (appInstance.DOM.detalleTrack) {
        appInstance.DOM.detalleTrack.innerHTML = slidesHtml;
    }

    _initDetailCarousel(appInstance, swiperId, 0);

    setTimeout(() => {
        let targetElement = null;

        if (isMobile) {
            targetElement = appInstance.DOM.detalleTrack.querySelector('.card-volver-vertical');
            if (!targetElement) {
                targetElement = appInstance.DOM.detalleTrack.querySelector('.detail-text-fragment[data-index="0"]');
            }
        } else {
            targetElement = appInstance.DOM.detalleTrack.querySelector('.detail-text-fragment[data-index="0"]');
        }

        if (targetElement) {
            targetElement.focus({ preventScroll: true });
            if (nav_base_details && typeof nav_base_details._updateDetailFocusState === 'function') {
                nav_base_details._updateDetailFocusState(appInstance);
            }
        }
    }, 200);
}
/* --- code/render-details.js --- */