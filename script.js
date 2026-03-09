"use strict";
/**
 * TP-Link Omada Amazon Storefront - Main TypeScript
 * Dropdown nav + button ripple + product card hover + scroll animations + FAQ toggles
 */
// ============================================================================
// IIFE — Keeps all state private
// ============================================================================
(function () {
    // ==========================================================================
    // STATE & CONFIGURATION
    // ==========================================================================
    let currentTestimonialIndex = 0;
    let testimonialInterval = null;
    const TESTIMONIAL_INTERVAL_MS = 5000;
    const SCROLL_OBSERVER_THRESHOLD = 0.15;
    const CART_ANIMATION_DURATION = 300;
    const STICKY_HEADER_HEIGHT = 84;
    const PRODUCT_STAGGER_DELAY = 100;
    const EASING_BOUNCE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    const EASING_SMOOTH = 'cubic-bezier(0.4, 0, 0.2, 1)';
    const observers = [];
    let prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
        prefersReducedMotion = e.matches;
    });
    // ==========================================================================
    // UTILITY FUNCTIONS
    // ==========================================================================
    function createThrottle() {
        let ticking = false;
        return function throttle(callback) {
            if (ticking)
                return;
            ticking = true;
            requestAnimationFrame(() => {
                callback();
                ticking = false;
            });
        };
    }
    function smoothScrollTo(element, offset = STICKY_HEADER_HEIGHT) {
        if (!element)
            return;
        const elementPosition = element.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - offset;
        window.scrollTo({
            top: offsetPosition,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
    }
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    // ==========================================================================
    // DROPDOWN NAVIGATION
    // ==========================================================================
    function initDropdownNavigation() {
        const dropdownWrappers = document.querySelectorAll('.brand-nav__tab-wrapper');
        if (!dropdownWrappers.length)
            return;
        dropdownWrappers.forEach((wrapper) => {
            const tab = wrapper.querySelector('.brand-nav__tab--has-dropdown');
            const dropdown = wrapper.querySelector('.brand-nav__dropdown');
            if (!tab || !dropdown)
                return;
            tab.setAttribute('aria-haspopup', 'true');
            tab.setAttribute('aria-expanded', 'false');
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isOpen = tab.getAttribute('aria-expanded') === 'true';
                closeAllDropdowns();
                if (!isOpen) {
                    tab.setAttribute('aria-expanded', 'true');
                    wrapper.classList.add('brand-nav__tab-wrapper--open');
                }
            });
            tab.addEventListener('keydown', (e) => {
                const keyEvent = e;
                if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                    keyEvent.preventDefault();
                    keyEvent.stopPropagation();
                    const isOpen = tab.getAttribute('aria-expanded') === 'true';
                    closeAllDropdowns();
                    if (!isOpen) {
                        tab.setAttribute('aria-expanded', 'true');
                        wrapper.classList.add('brand-nav__tab-wrapper--open');
                        const firstLink = dropdown.querySelector('.brand-nav__dropdown-link');
                        if (firstLink)
                            firstLink.focus();
                    }
                }
                if (keyEvent.key === 'ArrowDown') {
                    keyEvent.preventDefault();
                    tab.setAttribute('aria-expanded', 'true');
                    wrapper.classList.add('brand-nav__tab-wrapper--open');
                    const firstLink = dropdown.querySelector('.brand-nav__dropdown-link');
                    if (firstLink)
                        firstLink.focus();
                }
            });
            const links = dropdown.querySelectorAll('.brand-nav__dropdown-link');
            links.forEach((link, linkIndex) => {
                link.addEventListener('keydown', (e) => {
                    const keyEvent = e;
                    if (keyEvent.key === 'ArrowDown') {
                        keyEvent.preventDefault();
                        const next = links[linkIndex + 1] || links[0];
                        next.focus();
                    }
                    if (keyEvent.key === 'ArrowUp') {
                        keyEvent.preventDefault();
                        const prev = links[linkIndex - 1] || links[links.length - 1];
                        prev.focus();
                    }
                    if (keyEvent.key === 'Escape') {
                        closeAllDropdowns();
                        tab.focus();
                    }
                });
                link.addEventListener('click', (e) => {
                    const href = link.getAttribute('href');
                    if (href) {
                        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                        const [linkPage, hash] = href.split('#');
                        if (linkPage && linkPage !== currentPage) {
                            closeAllDropdowns();
                            return;
                        }
                        if (hash) {
                            e.preventDefault();
                            const section = document.getElementById(hash)
                                || document.querySelector(`section[data-section="${hash}"], [data-section="${hash}"]`);
                            if (section && section.tagName !== 'A' && section.tagName !== 'BUTTON') {
                                smoothScrollTo(section);
                            }
                        }
                    }
                    closeAllDropdowns();
                });
            });
        });
        function closeAllDropdowns() {
            dropdownWrappers.forEach((wrapper) => {
                const tab = wrapper.querySelector('.brand-nav__tab--has-dropdown');
                if (tab)
                    tab.setAttribute('aria-expanded', 'false');
                wrapper.classList.remove('brand-nav__tab-wrapper--open');
            });
        }
        document.addEventListener('click', (e) => {
            const mouseEvent = e;
            if (!mouseEvent.target?.closest('.brand-nav__tab-wrapper')) {
                closeAllDropdowns();
            }
        });
        document.addEventListener('keydown', (e) => {
            const keyEvent = e;
            if (keyEvent.key === 'Escape')
                closeAllDropdowns();
        });
    }
    // ==========================================================================
    // TAB NAVIGATION (for pages with section tabs)
    // ==========================================================================
    function initTabNavigation() {
        const tabs = document.querySelectorAll('.brand-nav__tab:not(.brand-nav__tab--has-dropdown)');
        if (!tabs.length)
            return;
        tabs.forEach((tab) => {
            tab.addEventListener('click', (_e) => {
                const href = tab.getAttribute('href');
                if (href && !href.startsWith('#')) {
                    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                    const linkPage = href.split('#')[0];
                    if (linkPage && linkPage !== currentPage) {
                        return;
                    }
                }
            });
        });
    }
    // ==========================================================================
    // "SEE MORE PRODUCTS" TOGGLE
    // ==========================================================================
    function initProductToggles() {
        const toggleButtons = document.querySelectorAll('[data-toggle-products]');
        toggleButtons.forEach((button) => {
            const containerId = button.getAttribute('data-toggle-products');
            if (!containerId)
                return;
            const container = document.getElementById(containerId);
            if (!container)
                return;
            const extraProducts = container.querySelectorAll('.product-card--extra');
            let isExpanded = false;
            let isAnimating = false;
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-controls', containerId);
            const handleToggle = () => {
                if (isAnimating)
                    return;
                isAnimating = true;
                isExpanded = !isExpanded;
                button.setAttribute('aria-expanded', isExpanded.toString());
                if (isExpanded) {
                    extraProducts.forEach((card) => {
                        card.style.display = 'block';
                    });
                    requestAnimationFrame(() => {
                        extraProducts.forEach((card, cardIndex) => {
                            const htmlCard = card;
                            setTimeout(() => {
                                if (prefersReducedMotion) {
                                    htmlCard.style.opacity = '1';
                                    htmlCard.style.transform = 'translateY(0)';
                                }
                                else {
                                    htmlCard.classList.add('fade-in-up', 'visible');
                                }
                            }, (cardIndex % 5) * PRODUCT_STAGGER_DELAY);
                        });
                    });
                    button.textContent = 'Show fewer products';
                    setTimeout(() => { isAnimating = false; }, 600);
                }
                else {
                    extraProducts.forEach((card, index) => {
                        const htmlCard = card;
                        setTimeout(() => {
                            htmlCard.classList.remove('visible');
                            if (prefersReducedMotion) {
                                htmlCard.style.opacity = '';
                                htmlCard.style.transform = '';
                                htmlCard.style.display = 'none';
                            }
                        }, index * 40);
                    });
                    button.textContent = 'See more products';
                    setTimeout(() => {
                        extraProducts.forEach((card) => {
                            const htmlCard = card;
                            htmlCard.style.display = 'none';
                            htmlCard.style.opacity = '';
                            htmlCard.style.transform = '';
                        });
                        isAnimating = false;
                    }, 500);
                }
            };
            button.addEventListener('click', handleToggle);
        });
    }
    // ==========================================================================
    // SCROLL ANIMATIONS
    // ==========================================================================
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('.story-card, .category-tile, .product-card:not(.product-card--extra), .stat-item, .testimonial, .contact-cta, .from-manufacturer__item, .cert-badge, .category-banner, .btn--modern, .btn--gradient, .feature-card, .industry-tile, .industry-detail');
        if (!animatedElements.length)
            return;
        if (prefersReducedMotion) {
            animatedElements.forEach((element) => {
                const htmlEl = element;
                htmlEl.style.opacity = '1';
                htmlEl.style.transform = 'none';
            });
            return;
        }
        animatedElements.forEach((element) => {
            element.classList.add('fade-in-up');
        });
        requestAnimationFrame(() => {
            animatedElements.forEach((element) => {
                const htmlEl = element;
                const parent = htmlEl.parentElement;
                if (parent?.classList.contains('story-cards') ||
                    parent?.classList.contains('category-grid') ||
                    parent?.classList.contains('product-grid') ||
                    parent?.classList.contains('stats-grid') ||
                    parent?.classList.contains('from-manufacturer__grid') ||
                    parent?.classList.contains('certifications-bar__badges') ||
                    parent?.classList.contains('feature-grid') ||
                    parent?.classList.contains('industry-grid')) {
                    const siblings = Array.from(parent.children).filter((child) => {
                        return window.getComputedStyle(child).display !== 'none';
                    });
                    const siblingIndex = siblings.indexOf(element);
                    const computedStyle = window.getComputedStyle(parent);
                    const colString = computedStyle.gridTemplateColumns || '';
                    const gridCols = colString ? colString.split(' ').length : 3;
                    const columnIndex = siblingIndex % gridCols;
                    htmlEl.style.transitionDelay = `${columnIndex * 0.08}s`;
                }
            });
        });
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: SCROLL_OBSERVER_THRESHOLD, rootMargin: '0px 0px -100px 0px' });
        animatedElements.forEach((element) => observer.observe(element));
        observers.push(observer);
        requestAnimationFrame(() => {
            animatedElements.forEach((element) => {
                const rect = element.getBoundingClientRect();
                const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
                if (isInViewport) {
                    element.classList.add('visible');
                }
            });
        });
    }
    // ==========================================================================
    // STICKY BRAND HEADER
    // ==========================================================================
    function initStickyHeader() {
        const brandHeaderEl = document.querySelector('.brand-header');
        const amazonHeader = document.querySelector('.amazon-header');
        if (!brandHeaderEl || !amazonHeader)
            return;
        const brandHeader = brandHeaderEl;
        let stickyThreshold = amazonHeader.offsetHeight;
        let brandHeaderHeight = brandHeader.offsetHeight;
        let isSticky = false;
        const throttle = createThrottle();
        function applySticky() {
            if (isSticky)
                return;
            isSticky = true;
            brandHeader.classList.add('brand-header--sticky');
            brandHeader.style.position = 'fixed';
            brandHeader.style.top = '0';
            brandHeader.style.left = '0';
            brandHeader.style.width = '100%';
            brandHeader.style.zIndex = '999';
            brandHeader.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            document.body.style.paddingTop = brandHeaderHeight + 'px';
        }
        function removeSticky() {
            if (!isSticky)
                return;
            isSticky = false;
            brandHeader.classList.remove('brand-header--sticky');
            brandHeader.style.position = '';
            brandHeader.style.top = '';
            brandHeader.style.left = '';
            brandHeader.style.width = '';
            brandHeader.style.zIndex = '';
            brandHeader.style.boxShadow = '';
            document.body.style.paddingTop = '0';
        }
        const handleScroll = () => {
            throttle(() => {
                if (window.scrollY > stickyThreshold) {
                    applySticky();
                }
                else {
                    removeSticky();
                }
            });
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        const handleResize = debounce(() => {
            const wasSticky = isSticky;
            if (wasSticky)
                removeSticky();
            stickyThreshold = amazonHeader.offsetHeight;
            brandHeaderHeight = brandHeader.offsetHeight;
            if (wasSticky && window.scrollY > stickyThreshold)
                applySticky();
        }, 200);
        window.addEventListener('resize', handleResize, { passive: true });
        if (window.scrollY > stickyThreshold) {
            applySticky();
        }
    }
    // ==========================================================================
    // BACK TO TOP
    // ==========================================================================
    function initBackToTop() {
        const backToTopLink = document.querySelector('.footer__back-to-top-link, .amazon-footer__back-to-top-link');
        if (!backToTopLink)
            return;
        backToTopLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    // ==========================================================================
    // CART COUNTER ANIMATION
    // ==========================================================================
    function initCartCounter() {
        const cartCount = document.querySelector('.amazon-header__cart-count');
        const optionButtons = document.querySelectorAll('.product-card .btn--amazon, .fbt-pricing > .btn--amazon');
        if (!cartCount || !optionButtons.length)
            return;
        let currentCount = parseInt(cartCount.textContent ?? '0', 10) || 0;
        cartCount.setAttribute('aria-live', 'polite');
        cartCount.setAttribute('aria-atomic', 'true');
        optionButtons.forEach((button) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                currentCount++;
                cartCount.textContent = String(currentCount);
                if (prefersReducedMotion) {
                    cartCount.style.color = '#ff9900';
                    setTimeout(() => { cartCount.style.color = ''; }, CART_ANIMATION_DURATION);
                }
                else {
                    cartCount.style.transition = `transform 0.15s ${EASING_BOUNCE}, color 0.15s ${EASING_SMOOTH}`;
                    cartCount.style.transform = 'scale(1.15)';
                    cartCount.style.color = '#ff9900';
                    setTimeout(() => {
                        cartCount.style.transform = 'scale(1)';
                        cartCount.style.color = '';
                    }, CART_ANIMATION_DURATION);
                }
            });
        });
    }
    // ==========================================================================
    // TESTIMONIAL CAROUSEL
    // ==========================================================================
    function initTestimonialCarousel() {
        const dots = document.querySelectorAll('.dot');
        const testimonialSection = document.querySelector('.testimonials-section');
        if (!dots.length)
            return;
        const dotsContainer = document.querySelector('.dots-container, .testimonial-dots');
        if (dotsContainer) {
            dotsContainer.setAttribute('role', 'tablist');
            dotsContainer.setAttribute('aria-label', 'Testimonial navigation');
        }
        dots.forEach((dot, index) => {
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-label', `Show testimonial ${index + 1}`);
            dot.setAttribute('tabindex', index === 0 ? '0' : '-1');
        });
        function updateActiveDot(index) {
            dots.forEach((dot, i) => {
                dot.classList.toggle('dot--active', i === index);
                dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
                dot.setAttribute('tabindex', i === index ? '0' : '-1');
            });
        }
        function nextTestimonial() {
            currentTestimonialIndex = (currentTestimonialIndex + 1) % dots.length;
            updateActiveDot(currentTestimonialIndex);
        }
        function resetInterval() {
            if (testimonialInterval) {
                clearInterval(testimonialInterval);
            }
            if (!prefersReducedMotion) {
                testimonialInterval = setInterval(nextTestimonial, TESTIMONIAL_INTERVAL_MS);
            }
        }
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentTestimonialIndex = index;
                updateActiveDot(index);
                resetInterval();
            });
        });
        if (testimonialSection) {
            testimonialSection.addEventListener('mouseenter', () => {
                if (testimonialInterval) {
                    clearInterval(testimonialInterval);
                }
            });
            testimonialSection.addEventListener('mouseleave', () => { resetInterval(); });
        }
        resetInterval();
    }
    // ==========================================================================
    // FAQ ACCORDION
    // ==========================================================================
    function initFaqAccordion() {
        const faqQuestions = document.querySelectorAll('.faq-question');
        if (!faqQuestions.length)
            return;
        faqQuestions.forEach((question) => {
            question.setAttribute('aria-expanded', 'false');
            const answer = question.nextElementSibling;
            if (answer && answer.classList.contains('faq-answer')) {
                answer.setAttribute('aria-hidden', 'true');
            }
            question.addEventListener('click', () => {
                const isExpanded = question.getAttribute('aria-expanded') === 'true';
                // Close all other FAQs
                faqQuestions.forEach((q) => {
                    q.setAttribute('aria-expanded', 'false');
                    const a = q.nextElementSibling;
                    if (a && a.classList.contains('faq-answer')) {
                        a.setAttribute('aria-hidden', 'true');
                    }
                });
                if (!isExpanded) {
                    question.setAttribute('aria-expanded', 'true');
                    if (answer && answer.classList.contains('faq-answer')) {
                        answer.setAttribute('aria-hidden', 'false');
                    }
                }
            });
            question.addEventListener('keydown', (e) => {
                const keyEvent = e;
                if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                    keyEvent.preventDefault();
                    question.click();
                }
            });
        });
    }
    // ==========================================================================
    // VIDEO THUMBNAILS
    // ==========================================================================
    function initVideoThumbnails() {
        const thumbnails = document.querySelectorAll('.video-thumbnail');
        const mainVideoContainer = document.querySelector('.video-section__main iframe');
        if (!thumbnails.length || !mainVideoContainer)
            return;
        thumbnails.forEach((thumbnail, index) => {
            const htmlThumbnail = thumbnail;
            htmlThumbnail.setAttribute('role', 'button');
            htmlThumbnail.setAttribute('tabindex', '0');
            htmlThumbnail.setAttribute('aria-label', `Play video ${index + 1}`);
            const clickHandler = () => {
                const videoSrc = htmlThumbnail.getAttribute('data-video-src');
                if (mainVideoContainer && videoSrc) {
                    mainVideoContainer.src = videoSrc;
                }
            };
            htmlThumbnail.addEventListener('click', clickHandler);
            htmlThumbnail.addEventListener('keydown', (e) => {
                const keyEvent = e;
                if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                    keyEvent.preventDefault();
                    clickHandler();
                }
            });
        });
    }
    // ==========================================================================
    // CATEGORY TILE NAVIGATION
    // ==========================================================================
    function initCategoryTiles() {
        const categoryTiles = document.querySelectorAll('.category-tile[data-href]');
        if (!categoryTiles.length)
            return;
        categoryTiles.forEach((tile) => {
            const htmlTile = tile;
            htmlTile.setAttribute('role', 'button');
            htmlTile.setAttribute('tabindex', '0');
            if (!prefersReducedMotion) {
                htmlTile.style.transition = `transform 0.3s ${EASING_SMOOTH}, box-shadow 0.3s ${EASING_SMOOTH}`;
            }
            const clickHandler = () => {
                const href = htmlTile.getAttribute('data-href');
                if (href) {
                    if (href.startsWith('#')) {
                        const section = document.querySelector(href);
                        if (section)
                            smoothScrollTo(section);
                    }
                    else {
                        window.location.href = href;
                    }
                }
            };
            htmlTile.addEventListener('click', clickHandler);
            htmlTile.addEventListener('keydown', (e) => {
                const keyEvent = e;
                if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                    keyEvent.preventDefault();
                    clickHandler();
                }
            });
        });
    }
    // ==========================================================================
    // MOBILE NAVIGATION SCROLL INDICATORS
    // ==========================================================================
    function initMobileNavScrollIndicators() {
        const brandNav = document.querySelector('.brand-header__nav');
        if (!brandNav)
            return;
        const navContainerMaybe = brandNav.querySelector('.brand-header__container');
        if (!navContainerMaybe)
            return;
        const navContainer = navContainerMaybe;
        const leftIndicator = document.createElement('div');
        leftIndicator.className = 'nav-scroll-indicator nav-scroll-indicator--left';
        leftIndicator.setAttribute('aria-hidden', 'true');
        leftIndicator.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:40px;background:linear-gradient(to right,rgba(255,255,255,0.95),transparent);pointer-events:none;opacity:0;transition:opacity 0.3s ease;z-index:2;`;
        const rightIndicator = document.createElement('div');
        rightIndicator.className = 'nav-scroll-indicator nav-scroll-indicator--right';
        rightIndicator.setAttribute('aria-hidden', 'true');
        rightIndicator.style.cssText = `position:absolute;right:0;top:0;bottom:0;width:40px;background:linear-gradient(to left,rgba(255,255,255,0.95),transparent);pointer-events:none;opacity:0;transition:opacity 0.3s ease;z-index:2;`;
        brandNav.style.position = 'relative';
        brandNav.appendChild(leftIndicator);
        brandNav.appendChild(rightIndicator);
        const scrollThrottle = createThrottle();
        function updateScrollIndicators() {
            const isScrollable = navContainer.scrollWidth > navContainer.clientWidth;
            const scrollLeft = navContainer.scrollLeft;
            const maxScroll = navContainer.scrollWidth - navContainer.clientWidth;
            if (isScrollable) {
                leftIndicator.style.opacity = scrollLeft > 10 ? '1' : '0';
                rightIndicator.style.opacity = scrollLeft < maxScroll - 10 ? '1' : '0';
            }
            else {
                leftIndicator.style.opacity = '0';
                rightIndicator.style.opacity = '0';
            }
        }
        navContainer.addEventListener('scroll', () => { scrollThrottle(updateScrollIndicators); }, { passive: true });
        window.addEventListener('resize', () => { scrollThrottle(updateScrollIndicators); }, { passive: true });
        requestAnimationFrame(updateScrollIndicators);
    }
    // ==========================================================================
    // IMAGE ERROR HANDLING
    // ==========================================================================
    function initImageErrorHandling() {
        const images = document.querySelectorAll('img');
        images.forEach((img) => {
            if (img.complete && img.naturalHeight !== 0)
                return;
            img.addEventListener('error', function () {
                this.classList.add('image-error');
                this.alt = this.alt || 'Image failed to load';
                this.style.backgroundColor = '#f0f0f0';
                this.style.minHeight = '200px';
            }, { once: true });
        });
    }
    // ==========================================================================
    // LAZY LOADING
    // ==========================================================================
    function initLazyLoading() {
        const images = document.querySelectorAll('img:not([loading])');
        images.forEach((img, index) => {
            if (index > 3) {
                img.setAttribute('loading', 'lazy');
            }
        });
    }
    // ==========================================================================
    // BUTTON HOVER POLISH
    // ==========================================================================
    function initButtonHoverPolish() {
        if (prefersReducedMotion)
            return;
        const buttons = document.querySelectorAll('button, .btn, .brand-nav__tab, .category-tile');
        buttons.forEach((button) => {
            const htmlButton = button;
            const currentTransition = window.getComputedStyle(htmlButton).transition;
            if (currentTransition && currentTransition !== 'none' && currentTransition !== 'all 0s ease 0s')
                return;
            htmlButton.style.transition = `opacity 0.2s ${EASING_SMOOTH}, box-shadow 0.2s ${EASING_SMOOTH}, background-color 0.2s ${EASING_SMOOTH}, color 0.2s ${EASING_SMOOTH}, border-color 0.2s ${EASING_SMOOTH}`;
        });
    }
    // ==========================================================================
    // BUTTON RIPPLE EFFECT
    // ==========================================================================
    function initButtonRippleEffect() {
        if (prefersReducedMotion)
            return;
        const buttons = document.querySelectorAll('.btn--modern, .btn--gradient, .btn--outline-dark, .btn--outline-light');
        if (!buttons.length)
            return;
        buttons.forEach((button) => {
            button.addEventListener('click', function (e) {
                const mouseEvent = e;
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = mouseEvent.clientX - rect.left - size / 2;
                const y = mouseEvent.clientY - rect.top - size / 2;
                ripple.style.cssText = `position:absolute;width:${size}px;height:${size}px;left:${x}px;top:${y}px;background:rgba(255,255,255,0.3);border-radius:50%;transform:scale(0);animation:rippleEffect 0.6s ease-out;pointer-events:none;`;
                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });
        if (!document.querySelector('#ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `@keyframes rippleEffect { to { transform: scale(4); opacity: 0; } }`;
            document.head.appendChild(style);
        }
    }
    // ==========================================================================
    // PRODUCT CARD HOVER ENHANCEMENT
    // ==========================================================================
    function initProductCardEnhancements() {
        if (prefersReducedMotion)
            return;
        const cards = document.querySelectorAll('.product-card');
        if (!cards.length)
            return;
        cards.forEach((card) => {
            const img = card.querySelector('.product-card__image img, .product-card__image');
            if (img) {
                card.addEventListener('mouseenter', () => {
                    img.style.transition = `transform 0.4s ${EASING_SMOOTH}`;
                    img.style.transform = 'scale(1.05)';
                });
                card.addEventListener('mouseleave', () => { img.style.transform = 'scale(1)'; });
            }
        });
    }
    // ==========================================================================
    // COMPARISON TABLE
    // ==========================================================================
    function initComparisonTable() {
        const table = document.querySelector('.comparison-table');
        if (!table)
            return;
        const allRows = table.querySelectorAll('tr');
        function highlightColumn(colIndex, active) {
            allRows.forEach(function (row) {
                const cell = row.children[colIndex];
                if (cell) {
                    if (active) {
                        cell.style.backgroundColor = 'rgba(0, 128, 85, 0.06)';
                    }
                    else {
                        cell.style.backgroundColor = '';
                    }
                }
            });
        }
        allRows.forEach(function (row) {
            Array.from(row.children).forEach(function (cell, colIndex) {
                if (colIndex === 0)
                    return;
                cell.addEventListener('mouseenter', function () { highlightColumn(colIndex, true); });
                cell.addEventListener('mouseleave', function () { highlightColumn(colIndex, false); });
            });
        });
        const thead = table.querySelector('thead');
        const wrapper = document.querySelector('.comparison-table-wrapper');
        if (wrapper && thead) {
            thead.style.position = 'sticky';
            thead.style.top = '0';
            thead.style.zIndex = '2';
        }
    }
    // ==========================================================================
    // HERO VIDEO BACKGROUND
    // ==========================================================================
    function initHeroVideo() {
        const videoEl = document.querySelector('.hero__bg-video');
        if (!videoEl)
            return;
        const video = videoEl;
        function loadAndPlay() {
            if (video.preload !== 'none')
                return;
            video.preload = 'auto';
            video.load();
            video.play().catch(() => { });
        }
        const timer = setTimeout(loadAndPlay, 3000);
        const interactionEvents = ['scroll', 'mousemove', 'touchstart', 'keydown'];
        function onInteraction() {
            clearTimeout(timer);
            interactionEvents.forEach((evt) => { window.removeEventListener(evt, onInteraction); });
            loadAndPlay();
        }
        interactionEvents.forEach((evt) => {
            window.addEventListener(evt, onInteraction, { once: true, passive: true });
        });
    }
    // ==========================================================================
    // CLEANUP
    // ==========================================================================
    function cleanup() {
        if (testimonialInterval) {
            clearInterval(testimonialInterval);
        }
        observers.forEach((observer) => {
            if (observer && typeof observer.disconnect === 'function') {
                observer.disconnect();
            }
        });
    }
    // ==========================================================================
    // SMOOTH SCROLL FOR HASH LINKS
    // ==========================================================================
    function initSmoothHashScroll() {
        // Handle initial hash on page load
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            setTimeout(() => {
                const target = document.getElementById(hash);
                if (target) {
                    smoothScrollTo(target);
                }
            }, 300);
        }
    }
    // ==========================================================================
    // HERO CAROUSEL (mirrors omadanetworks.com banner slider)
    // ==========================================================================
    function initHeroCarousel() {
        const carousel = document.querySelector('.hero-carousel');
        if (!carousel)
            return;
        const slides = carousel.querySelectorAll('.hero-carousel__slide');
        const dots = carousel.querySelectorAll('.hero-carousel__dot');
        const prevBtn = carousel.querySelector('.hero-carousel__prev');
        const nextBtn = carousel.querySelector('.hero-carousel__next');
        if (slides.length < 2)
            return;
        let current = 0;
        let autoplayTimer = null;
        const AUTOPLAY_MS = 5000;
        function goTo(index) {
            slides[current].classList.remove('hero-carousel__slide--active');
            dots[current]?.classList.remove('hero-carousel__dot--active');
            dots[current]?.setAttribute('aria-selected', 'false');
            current = (index + slides.length) % slides.length;
            slides[current].classList.add('hero-carousel__slide--active');
            dots[current]?.classList.add('hero-carousel__dot--active');
            dots[current]?.setAttribute('aria-selected', 'true');
        }
        function startAutoplay() {
            stopAutoplay();
            autoplayTimer = setInterval(() => goTo(current + 1), AUTOPLAY_MS);
        }
        function stopAutoplay() {
            if (autoplayTimer) {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            }
        }
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => { goTo(i); startAutoplay(); });
        });
        prevBtn?.addEventListener('click', () => { goTo(current - 1); startAutoplay(); });
        nextBtn?.addEventListener('click', () => { goTo(current + 1); startAutoplay(); });
        // Pause on hover
        carousel.addEventListener('mouseenter', stopAutoplay);
        carousel.addEventListener('mouseleave', startAutoplay);
        // Touch swipe support
        let touchStartX = 0;
        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            stopAutoplay();
        }, { passive: true });
        carousel.addEventListener('touchend', (e) => {
            const diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                goTo(diff > 0 ? current + 1 : current - 1);
            }
            startAutoplay();
        }, { passive: true });
        startAutoplay();
    }
    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================
    function init() {
        initDropdownNavigation();
        initTabNavigation();
        initProductToggles();
        initScrollAnimations();
        initStickyHeader();
        initBackToTop();
        initCartCounter();
        initTestimonialCarousel();
        initFaqAccordion();
        initVideoThumbnails();
        initCategoryTiles();
        initMobileNavScrollIndicators();
        initImageErrorHandling();
        initLazyLoading();
        initButtonHoverPolish();
        initButtonRippleEffect();
        initHeroVideo();
        initComparisonTable();
        initProductCardEnhancements();
        initSmoothHashScroll();
        initHeroCarousel();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    }
    else {
        init();
    }
    window.addEventListener('beforeunload', cleanup);
})();
