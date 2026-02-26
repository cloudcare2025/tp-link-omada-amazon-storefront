/**
 * TP-Link Omada Amazon Storefront - Main TypeScript
 * Dropdown nav + button ripple + product card hover + scroll animations + FAQ toggles
 */

// Interfaces & Types
// ============================================================================

interface ToggleConfig {
  readonly buttonId: string;
  readonly containerId: string;
}

interface CategoryMapping {
  readonly index: number;
  readonly section: string;
  readonly name: string;
}

type ScrollTargetResolver = () => HTMLElement | null;

type DebouncedFunction<T extends (...args: never[]) => void> = (...args: Parameters<T>) => void;

// ============================================================================
// IIFE — Keeps all state private
// ============================================================================

(function (): void {

  // ==========================================================================
  // STATE & CONFIGURATION
  // ==========================================================================

  let currentTestimonialIndex: number = 0;
  let testimonialInterval: ReturnType<typeof setInterval> | null = null;
  const TESTIMONIAL_INTERVAL_MS = 5000 as const;
  const SCROLL_OBSERVER_THRESHOLD = 0.15 as const;
  const CART_ANIMATION_DURATION = 300 as const;
  const STICKY_HEADER_HEIGHT = 84 as const;
  const PRODUCT_STAGGER_DELAY = 100 as const;
  const EASING_BOUNCE: string = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  const EASING_SMOOTH: string = 'cubic-bezier(0.4, 0, 0.2, 1)';

  const observers: IntersectionObserver[] = [];

  let prefersReducedMotion: boolean = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionQuery: MediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener('change', (e: MediaQueryListEvent): void => {
    prefersReducedMotion = e.matches;
  });

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  function createThrottle(): (callback: () => void) => void {
    let ticking: boolean = false;
    return function throttle(callback: () => void): void {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame((): void => {
        callback();
        ticking = false;
      });
    };
  }

  function smoothScrollTo(element: Element, offset: number = STICKY_HEADER_HEIGHT): void {
    if (!element) return;
    const elementPosition: number = element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition: number = elementPosition - offset;
    window.scrollTo({
      top: offsetPosition,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  }

  function debounce<T extends (...args: never[]) => void>(func: T, wait: number): DebouncedFunction<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function executedFunction(this: unknown, ...args: Parameters<T>): void {
      const later = (): void => {
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

  function initDropdownNavigation(): void {
    const dropdownWrappers: NodeListOf<Element> = document.querySelectorAll('.brand-nav__tab-wrapper');

    if (!dropdownWrappers.length) return;

    dropdownWrappers.forEach((wrapper: Element): void => {
      const tab: Element | null = wrapper.querySelector('.brand-nav__tab--has-dropdown');
      const dropdown: Element | null = wrapper.querySelector('.brand-nav__dropdown');

      if (!tab || !dropdown) return;

      tab.setAttribute('aria-haspopup', 'true');
      tab.setAttribute('aria-expanded', 'false');

      tab.addEventListener('click', (e: Event): void => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen: boolean = tab.getAttribute('aria-expanded') === 'true';
        closeAllDropdowns();
        if (!isOpen) {
          tab.setAttribute('aria-expanded', 'true');
          wrapper.classList.add('brand-nav__tab-wrapper--open');
        }
      });

      tab.addEventListener('keydown', (e: Event): void => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          const isOpen: boolean = tab.getAttribute('aria-expanded') === 'true';
          closeAllDropdowns();
          if (!isOpen) {
            tab.setAttribute('aria-expanded', 'true');
            wrapper.classList.add('brand-nav__tab-wrapper--open');
            const firstLink: HTMLElement | null = dropdown.querySelector('.brand-nav__dropdown-link');
            if (firstLink) firstLink.focus();
          }
        }
        if (keyEvent.key === 'ArrowDown') {
          keyEvent.preventDefault();
          tab.setAttribute('aria-expanded', 'true');
          wrapper.classList.add('brand-nav__tab-wrapper--open');
          const firstLink: HTMLElement | null = dropdown.querySelector('.brand-nav__dropdown-link');
          if (firstLink) firstLink.focus();
        }
      });

      const links: NodeListOf<HTMLElement> = dropdown.querySelectorAll('.brand-nav__dropdown-link');
      links.forEach((link: HTMLElement, linkIndex: number): void => {
        link.addEventListener('keydown', (e: Event): void => {
          const keyEvent = e as KeyboardEvent;
          if (keyEvent.key === 'ArrowDown') {
            keyEvent.preventDefault();
            const next: HTMLElement = links[linkIndex + 1] || links[0];
            next.focus();
          }
          if (keyEvent.key === 'ArrowUp') {
            keyEvent.preventDefault();
            const prev: HTMLElement = links[linkIndex - 1] || links[links.length - 1];
            prev.focus();
          }
          if (keyEvent.key === 'Escape') {
            closeAllDropdowns();
            (tab as HTMLElement).focus();
          }
        });

        link.addEventListener('click', (e: Event): void => {
          const href: string | null = link.getAttribute('href');
          if (href) {
            const currentPage: string = window.location.pathname.split('/').pop() || 'index.html';
            const [linkPage, hash] = href.split('#');
            if (linkPage && linkPage !== currentPage) {
              closeAllDropdowns();
              return;
            }
            if (hash) {
              e.preventDefault();
              const section: Element | null = document.getElementById(hash)
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

    function closeAllDropdowns(): void {
      dropdownWrappers.forEach((wrapper: Element): void => {
        const tab: Element | null = wrapper.querySelector('.brand-nav__tab--has-dropdown');
        if (tab) tab.setAttribute('aria-expanded', 'false');
        wrapper.classList.remove('brand-nav__tab-wrapper--open');
      });
    }

    document.addEventListener('click', (e: Event): void => {
      const mouseEvent = e as MouseEvent;
      if (!(mouseEvent.target as Element)?.closest('.brand-nav__tab-wrapper')) {
        closeAllDropdowns();
      }
    });

    document.addEventListener('keydown', (e: Event): void => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Escape') closeAllDropdowns();
    });
  }

  // ==========================================================================
  // TAB NAVIGATION (for pages with section tabs)
  // ==========================================================================

  function initTabNavigation(): void {
    const tabs: NodeListOf<Element> = document.querySelectorAll('.brand-nav__tab:not(.brand-nav__tab--has-dropdown)');
    if (!tabs.length) return;

    tabs.forEach((tab: Element): void => {
      tab.addEventListener('click', (_e: Event): void => {
        const href: string | null = (tab as HTMLAnchorElement).getAttribute('href');
        if (href && !href.startsWith('#')) {
          const currentPage: string = window.location.pathname.split('/').pop() || 'index.html';
          const linkPage: string = href.split('#')[0];
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

  function initProductToggles(): void {
    const toggleButtons: NodeListOf<Element> = document.querySelectorAll('[data-toggle-products]');

    toggleButtons.forEach((button: Element): void => {
      const containerId: string | null = (button as HTMLElement).getAttribute('data-toggle-products');
      if (!containerId) return;

      const container: HTMLElement | null = document.getElementById(containerId);
      if (!container) return;

      const extraProducts: NodeListOf<Element> = container.querySelectorAll('.product-card--extra');
      let isExpanded: boolean = false;
      let isAnimating: boolean = false;

      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', containerId);

      const handleToggle = (): void => {
        if (isAnimating) return;
        isAnimating = true;

        isExpanded = !isExpanded;
        button.setAttribute('aria-expanded', isExpanded.toString());

        if (isExpanded) {
          extraProducts.forEach((card: Element): void => {
            (card as HTMLElement).style.display = 'block';
          });

          requestAnimationFrame((): void => {
            extraProducts.forEach((card: Element, cardIndex: number): void => {
              const htmlCard = card as HTMLElement;
              setTimeout((): void => {
                if (prefersReducedMotion) {
                  htmlCard.style.opacity = '1';
                  htmlCard.style.transform = 'translateY(0)';
                } else {
                  htmlCard.classList.add('fade-in-up', 'visible');
                }
              }, (cardIndex % 5) * PRODUCT_STAGGER_DELAY);
            });
          });

          (button as HTMLElement).textContent = 'Show fewer products';
          setTimeout((): void => { isAnimating = false; }, 600);

        } else {
          extraProducts.forEach((card: Element, index: number): void => {
            const htmlCard = card as HTMLElement;
            setTimeout((): void => {
              htmlCard.classList.remove('visible');
              if (prefersReducedMotion) {
                htmlCard.style.opacity = '';
                htmlCard.style.transform = '';
                htmlCard.style.display = 'none';
              }
            }, index * 40);
          });

          (button as HTMLElement).textContent = 'See more products';
          setTimeout((): void => {
            extraProducts.forEach((card: Element): void => {
              const htmlCard = card as HTMLElement;
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

  function initScrollAnimations(): void {
    const animatedElements: NodeListOf<Element> = document.querySelectorAll(
      '.story-card, .category-tile, .product-card:not(.product-card--extra), .stat-item, .testimonial, .contact-cta, .from-manufacturer__item, .cert-badge, .category-banner, .btn--modern, .btn--gradient, .feature-card, .industry-tile, .industry-detail'
    );

    if (!animatedElements.length) return;

    if (prefersReducedMotion) {
      animatedElements.forEach((element: Element): void => {
        const htmlEl = element as HTMLElement;
        htmlEl.style.opacity = '1';
        htmlEl.style.transform = 'none';
      });
      return;
    }

    animatedElements.forEach((element: Element): void => {
      (element as HTMLElement).classList.add('fade-in-up');
    });

    requestAnimationFrame((): void => {
      animatedElements.forEach((element: Element): void => {
        const htmlEl = element as HTMLElement;
        const parent: HTMLElement | null = htmlEl.parentElement;

        if (parent?.classList.contains('story-cards') ||
            parent?.classList.contains('category-grid') ||
            parent?.classList.contains('product-grid') ||
            parent?.classList.contains('stats-grid') ||
            parent?.classList.contains('from-manufacturer__grid') ||
            parent?.classList.contains('certifications-bar__badges') ||
            parent?.classList.contains('feature-grid') ||
            parent?.classList.contains('industry-grid')) {

          const siblings: Element[] = Array.from(parent.children).filter((child: Element): boolean => {
            return window.getComputedStyle(child).display !== 'none';
          });

          const siblingIndex: number = siblings.indexOf(element);
          const computedStyle: CSSStyleDeclaration = window.getComputedStyle(parent);
          const colString: string = computedStyle.gridTemplateColumns || '';
          const gridCols: number = colString ? colString.split(' ').length : 3;
          const columnIndex: number = siblingIndex % gridCols;

          htmlEl.style.transitionDelay = `${columnIndex * 0.08}s`;
        }
      });
    });

    const observer: IntersectionObserver = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]): void => {
        entries.forEach((entry: IntersectionObserverEntry): void => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: SCROLL_OBSERVER_THRESHOLD, rootMargin: '0px 0px -100px 0px' }
    );

    animatedElements.forEach((element: Element): void => observer.observe(element));
    observers.push(observer);

    requestAnimationFrame((): void => {
      animatedElements.forEach((element: Element): void => {
        const rect: DOMRect = element.getBoundingClientRect();
        const isInViewport: boolean = rect.top < window.innerHeight && rect.bottom > 0;
        if (isInViewport) { element.classList.add('visible'); }
      });
    });
  }

  // ==========================================================================
  // STICKY BRAND HEADER
  // ==========================================================================

  function initStickyHeader(): void {
    const brandHeaderEl: HTMLElement | null = document.querySelector('.brand-header');
    const amazonHeader: HTMLElement | null = document.querySelector('.amazon-header');

    if (!brandHeaderEl || !amazonHeader) return;
    const brandHeader: HTMLElement = brandHeaderEl;

    let stickyThreshold: number = amazonHeader.offsetHeight;
    let brandHeaderHeight: number = brandHeader.offsetHeight;
    let isSticky: boolean = false;

    const throttle = createThrottle();

    function applySticky(): void {
      if (isSticky) return;
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

    function removeSticky(): void {
      if (!isSticky) return;
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

    const handleScroll = (): void => {
      throttle((): void => {
        if (window.scrollY > stickyThreshold) {
          applySticky();
        } else {
          removeSticky();
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleResize = debounce((): void => {
      const wasSticky: boolean = isSticky;
      if (wasSticky) removeSticky();
      stickyThreshold = amazonHeader.offsetHeight;
      brandHeaderHeight = brandHeader.offsetHeight;
      if (wasSticky && window.scrollY > stickyThreshold) applySticky();
    }, 200);
    window.addEventListener('resize', handleResize as EventListener, { passive: true });

    if (window.scrollY > stickyThreshold) {
      applySticky();
    }
  }

  // ==========================================================================
  // BACK TO TOP
  // ==========================================================================

  function initBackToTop(): void {
    const backToTopLink: Element | null = document.querySelector('.footer__back-to-top-link, .amazon-footer__back-to-top-link');
    if (!backToTopLink) return;
    backToTopLink.addEventListener('click', (e: Event): void => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ==========================================================================
  // CART COUNTER ANIMATION
  // ==========================================================================

  function initCartCounter(): void {
    const cartCount: HTMLElement | null = document.querySelector('.amazon-header__cart-count');
    const optionButtons: NodeListOf<Element> = document.querySelectorAll(
      '.product-card .btn--amazon, .fbt-pricing > .btn--amazon'
    );

    if (!cartCount || !optionButtons.length) return;

    let currentCount: number = parseInt(cartCount.textContent ?? '0', 10) || 0;
    cartCount.setAttribute('aria-live', 'polite');
    cartCount.setAttribute('aria-atomic', 'true');

    optionButtons.forEach((button: Element): void => {
      button.addEventListener('click', (e: Event): void => {
        e.preventDefault();
        currentCount++;
        cartCount.textContent = String(currentCount);

        if (prefersReducedMotion) {
          cartCount.style.color = '#ff9900';
          setTimeout((): void => { cartCount.style.color = ''; }, CART_ANIMATION_DURATION);
        } else {
          cartCount.style.transition = `transform 0.15s ${EASING_BOUNCE}, color 0.15s ${EASING_SMOOTH}`;
          cartCount.style.transform = 'scale(1.15)';
          cartCount.style.color = '#ff9900';
          setTimeout((): void => {
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

  function initTestimonialCarousel(): void {
    const dots: NodeListOf<Element> = document.querySelectorAll('.dot');
    const testimonialSection: Element | null = document.querySelector('.testimonials-section');

    if (!dots.length) return;

    const dotsContainer: HTMLElement | null = document.querySelector('.dots-container, .testimonial-dots');
    if (dotsContainer) {
      dotsContainer.setAttribute('role', 'tablist');
      dotsContainer.setAttribute('aria-label', 'Testimonial navigation');
    }

    dots.forEach((dot: Element, index: number): void => {
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Show testimonial ${index + 1}`);
      dot.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    function updateActiveDot(index: number): void {
      dots.forEach((dot: Element, i: number): void => {
        dot.classList.toggle('dot--active', i === index);
        dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
        dot.setAttribute('tabindex', i === index ? '0' : '-1');
      });
    }

    function nextTestimonial(): void {
      currentTestimonialIndex = (currentTestimonialIndex + 1) % dots.length;
      updateActiveDot(currentTestimonialIndex);
    }

    function resetInterval(): void {
      if (testimonialInterval) { clearInterval(testimonialInterval); }
      if (!prefersReducedMotion) {
        testimonialInterval = setInterval(nextTestimonial, TESTIMONIAL_INTERVAL_MS);
      }
    }

    dots.forEach((dot: Element, index: number): void => {
      dot.addEventListener('click', (): void => {
        currentTestimonialIndex = index;
        updateActiveDot(index);
        resetInterval();
      });
    });

    if (testimonialSection) {
      testimonialSection.addEventListener('mouseenter', (): void => {
        if (testimonialInterval) { clearInterval(testimonialInterval); }
      });
      testimonialSection.addEventListener('mouseleave', (): void => { resetInterval(); });
    }

    resetInterval();
  }

  // ==========================================================================
  // FAQ ACCORDION
  // ==========================================================================

  function initFaqAccordion(): void {
    const faqQuestions: NodeListOf<Element> = document.querySelectorAll('.faq-question');

    if (!faqQuestions.length) return;

    faqQuestions.forEach((question: Element): void => {
      question.setAttribute('aria-expanded', 'false');

      const answer: Element | null = question.nextElementSibling;
      if (answer && answer.classList.contains('faq-answer')) {
        answer.setAttribute('aria-hidden', 'true');
      }

      question.addEventListener('click', (): void => {
        const isExpanded: boolean = question.getAttribute('aria-expanded') === 'true';

        // Close all other FAQs
        faqQuestions.forEach((q: Element): void => {
          q.setAttribute('aria-expanded', 'false');
          const a: Element | null = q.nextElementSibling;
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

      question.addEventListener('keydown', (e: Event): void => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault();
          (question as HTMLElement).click();
        }
      });
    });
  }

  // ==========================================================================
  // VIDEO THUMBNAILS
  // ==========================================================================

  function initVideoThumbnails(): void {
    const thumbnails: NodeListOf<Element> = document.querySelectorAll('.video-thumbnail');
    const mainVideoContainer: HTMLIFrameElement | null = document.querySelector('.video-section__main iframe');

    if (!thumbnails.length || !mainVideoContainer) return;

    thumbnails.forEach((thumbnail: Element, index: number): void => {
      const htmlThumbnail = thumbnail as HTMLElement;
      htmlThumbnail.setAttribute('role', 'button');
      htmlThumbnail.setAttribute('tabindex', '0');
      htmlThumbnail.setAttribute('aria-label', `Play video ${index + 1}`);

      const clickHandler = (): void => {
        const videoSrc: string | null = htmlThumbnail.getAttribute('data-video-src');
        if (mainVideoContainer && videoSrc) {
          mainVideoContainer.src = videoSrc;
        }
      };

      htmlThumbnail.addEventListener('click', clickHandler);
      htmlThumbnail.addEventListener('keydown', (e: Event): void => {
        const keyEvent = e as KeyboardEvent;
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

  function initCategoryTiles(): void {
    const categoryTiles: NodeListOf<Element> = document.querySelectorAll('.category-tile[data-href]');

    if (!categoryTiles.length) return;

    categoryTiles.forEach((tile: Element): void => {
      const htmlTile = tile as HTMLElement;
      htmlTile.setAttribute('role', 'button');
      htmlTile.setAttribute('tabindex', '0');

      if (!prefersReducedMotion) {
        htmlTile.style.transition = `transform 0.3s ${EASING_SMOOTH}, box-shadow 0.3s ${EASING_SMOOTH}`;
      }

      const clickHandler = (): void => {
        const href: string | null = htmlTile.getAttribute('data-href');
        if (href) {
          if (href.startsWith('#')) {
            const section: Element | null = document.querySelector(href);
            if (section) smoothScrollTo(section);
          } else {
            window.location.href = href;
          }
        }
      };

      htmlTile.addEventListener('click', clickHandler);
      htmlTile.addEventListener('keydown', (e: Event): void => {
        const keyEvent = e as KeyboardEvent;
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

  function initMobileNavScrollIndicators(): void {
    const brandNav: HTMLElement | null = document.querySelector('.brand-header__nav');
    if (!brandNav) return;

    const navContainerMaybe: HTMLElement | null = brandNav.querySelector('.brand-header__container');
    if (!navContainerMaybe) return;
    const navContainer: HTMLElement = navContainerMaybe;

    const leftIndicator: HTMLDivElement = document.createElement('div');
    leftIndicator.className = 'nav-scroll-indicator nav-scroll-indicator--left';
    leftIndicator.setAttribute('aria-hidden', 'true');
    leftIndicator.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:40px;background:linear-gradient(to right,rgba(255,255,255,0.95),transparent);pointer-events:none;opacity:0;transition:opacity 0.3s ease;z-index:2;`;

    const rightIndicator: HTMLDivElement = document.createElement('div');
    rightIndicator.className = 'nav-scroll-indicator nav-scroll-indicator--right';
    rightIndicator.setAttribute('aria-hidden', 'true');
    rightIndicator.style.cssText = `position:absolute;right:0;top:0;bottom:0;width:40px;background:linear-gradient(to left,rgba(255,255,255,0.95),transparent);pointer-events:none;opacity:0;transition:opacity 0.3s ease;z-index:2;`;

    brandNav.style.position = 'relative';
    brandNav.appendChild(leftIndicator);
    brandNav.appendChild(rightIndicator);

    const scrollThrottle = createThrottle();

    function updateScrollIndicators(): void {
      const isScrollable: boolean = navContainer.scrollWidth > navContainer.clientWidth;
      const scrollLeft: number = navContainer.scrollLeft;
      const maxScroll: number = navContainer.scrollWidth - navContainer.clientWidth;

      if (isScrollable) {
        leftIndicator.style.opacity = scrollLeft > 10 ? '1' : '0';
        rightIndicator.style.opacity = scrollLeft < maxScroll - 10 ? '1' : '0';
      } else {
        leftIndicator.style.opacity = '0';
        rightIndicator.style.opacity = '0';
      }
    }

    navContainer.addEventListener('scroll', (): void => { scrollThrottle(updateScrollIndicators); }, { passive: true });
    window.addEventListener('resize', (): void => { scrollThrottle(updateScrollIndicators); }, { passive: true });
    requestAnimationFrame(updateScrollIndicators);
  }

  // ==========================================================================
  // IMAGE ERROR HANDLING
  // ==========================================================================

  function initImageErrorHandling(): void {
    const images: NodeListOf<HTMLImageElement> = document.querySelectorAll('img');
    images.forEach((img: HTMLImageElement): void => {
      if (img.complete && img.naturalHeight !== 0) return;
      img.addEventListener('error', function (this: HTMLImageElement): void {
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

  function initLazyLoading(): void {
    const images: NodeListOf<HTMLImageElement> = document.querySelectorAll('img:not([loading])');
    images.forEach((img: HTMLImageElement, index: number): void => {
      if (index > 3) { img.setAttribute('loading', 'lazy'); }
    });
  }

  // ==========================================================================
  // BUTTON HOVER POLISH
  // ==========================================================================

  function initButtonHoverPolish(): void {
    if (prefersReducedMotion) return;
    const buttons: NodeListOf<Element> = document.querySelectorAll('button, .btn, .brand-nav__tab, .category-tile');
    buttons.forEach((button: Element): void => {
      const htmlButton = button as HTMLElement;
      const currentTransition: string = window.getComputedStyle(htmlButton).transition;
      if (currentTransition && currentTransition !== 'none' && currentTransition !== 'all 0s ease 0s') return;
      htmlButton.style.transition = `opacity 0.2s ${EASING_SMOOTH}, box-shadow 0.2s ${EASING_SMOOTH}, background-color 0.2s ${EASING_SMOOTH}, color 0.2s ${EASING_SMOOTH}, border-color 0.2s ${EASING_SMOOTH}`;
    });
  }

  // ==========================================================================
  // BUTTON RIPPLE EFFECT
  // ==========================================================================

  function initButtonRippleEffect(): void {
    if (prefersReducedMotion) return;
    const buttons: NodeListOf<Element> = document.querySelectorAll('.btn--modern, .btn--gradient, .btn--outline-dark, .btn--outline-light');
    if (!buttons.length) return;

    buttons.forEach((button: Element): void => {
      button.addEventListener('click', function (this: HTMLElement, e: Event): void {
        const mouseEvent = e as MouseEvent;
        const ripple: HTMLSpanElement = document.createElement('span');
        const rect: DOMRect = this.getBoundingClientRect();
        const size: number = Math.max(rect.width, rect.height);
        const x: number = mouseEvent.clientX - rect.left - size / 2;
        const y: number = mouseEvent.clientY - rect.top - size / 2;

        ripple.style.cssText = `position:absolute;width:${size}px;height:${size}px;left:${x}px;top:${y}px;background:rgba(255,255,255,0.3);border-radius:50%;transform:scale(0);animation:rippleEffect 0.6s ease-out;pointer-events:none;`;

        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        setTimeout((): void => ripple.remove(), 600);
      });
    });

    if (!document.querySelector('#ripple-styles')) {
      const style: HTMLStyleElement = document.createElement('style');
      style.id = 'ripple-styles';
      style.textContent = `@keyframes rippleEffect { to { transform: scale(4); opacity: 0; } }`;
      document.head.appendChild(style);
    }
  }

  // ==========================================================================
  // PRODUCT CARD HOVER ENHANCEMENT
  // ==========================================================================

  function initProductCardEnhancements(): void {
    if (prefersReducedMotion) return;
    const cards: NodeListOf<Element> = document.querySelectorAll('.product-card');
    if (!cards.length) return;

    cards.forEach((card: Element): void => {
      const img: HTMLElement | null = card.querySelector('.product-card__image img, .product-card__image');
      if (img) {
        card.addEventListener('mouseenter', (): void => {
          img.style.transition = `transform 0.4s ${EASING_SMOOTH}`;
          img.style.transform = 'scale(1.05)';
        });
        card.addEventListener('mouseleave', (): void => { img.style.transform = 'scale(1)'; });
      }
    });
  }

  // ==========================================================================
  // COMPARISON TABLE
  // ==========================================================================

  function initComparisonTable(): void {
    const table: HTMLTableElement | null = document.querySelector('.comparison-table');
    if (!table) return;

    const allRows: NodeListOf<HTMLTableRowElement> = table.querySelectorAll('tr');

    function highlightColumn(colIndex: number, active: boolean): void {
      allRows.forEach(function (row: HTMLTableRowElement): void {
        const cell: Element | undefined = row.children[colIndex];
        if (cell) {
          if (active) {
            (cell as HTMLElement).style.backgroundColor = 'rgba(0, 128, 85, 0.06)';
          } else {
            (cell as HTMLElement).style.backgroundColor = '';
          }
        }
      });
    }

    allRows.forEach(function (row: HTMLTableRowElement): void {
      Array.from(row.children).forEach(function (cell: Element, colIndex: number): void {
        if (colIndex === 0) return;
        cell.addEventListener('mouseenter', function (): void { highlightColumn(colIndex, true); });
        cell.addEventListener('mouseleave', function (): void { highlightColumn(colIndex, false); });
      });
    });

    const thead: HTMLTableSectionElement | null = table.querySelector('thead');
    const wrapper: HTMLElement | null = document.querySelector('.comparison-table-wrapper');
    if (wrapper && thead) {
      thead.style.position = 'sticky';
      thead.style.top = '0';
      thead.style.zIndex = '2';
    }
  }

  // ==========================================================================
  // HERO VIDEO BACKGROUND
  // ==========================================================================

  function initHeroVideo(): void {
    const videoEl: HTMLVideoElement | null = document.querySelector('.hero__bg-video');
    if (!videoEl) return;
    const video: HTMLVideoElement = videoEl;

    function loadAndPlay(): void {
      if (video.preload !== 'none') return;
      video.preload = 'auto';
      video.load();
      video.play().catch((): void => { /* Autoplay blocked — poster shown */ });
    }

    const timer: ReturnType<typeof setTimeout> = setTimeout(loadAndPlay, 3000);

    const interactionEvents: readonly string[] = ['scroll', 'mousemove', 'touchstart', 'keydown'];
    function onInteraction(): void {
      clearTimeout(timer);
      interactionEvents.forEach((evt: string): void => { window.removeEventListener(evt, onInteraction); });
      loadAndPlay();
    }

    interactionEvents.forEach((evt: string): void => {
      window.addEventListener(evt, onInteraction, { once: true, passive: true });
    });
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  function cleanup(): void {
    if (testimonialInterval) { clearInterval(testimonialInterval); }
    observers.forEach((observer: IntersectionObserver): void => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });
  }

  // ==========================================================================
  // SMOOTH SCROLL FOR HASH LINKS
  // ==========================================================================

  function initSmoothHashScroll(): void {
    // Handle initial hash on page load
    if (window.location.hash) {
      const hash: string = window.location.hash.substring(1);
      setTimeout((): void => {
        const target: Element | null = document.getElementById(hash);
        if (target) { smoothScrollTo(target); }
      }, 300);
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  function init(): void {
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('beforeunload', cleanup);

})();
