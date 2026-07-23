document.addEventListener('DOMContentLoaded', () => {
    
    // =================================================================
    // 1. MOBILE MENU INTERACTIVITY (HAMBURGER DRAWER)
    // =================================================================
    const menuToggle = document.getElementById('menuToggleBtn') || document.querySelector('.mobile-menu-toggle');
    const navMenu = document.getElementById('mobileNavMenu') || document.querySelector('.nav-menu');

    if (menuToggle && navMenu) {
        const toggleIcon = menuToggle.querySelector('i');

        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            navMenu.classList.toggle('active');
            if (toggleIcon) {
                if (navMenu.classList.contains('active')) {
                    toggleIcon.className = 'fas fa-times';
                } else {
                    toggleIcon.className = 'fas fa-bars';
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                if (toggleIcon) toggleIcon.className = 'fas fa-bars';
            }
        });
    }

    // =================================================================
    // 2. FULLY FUNCTIONAL HERO IMAGE SLIDER
    // =================================================================
    const heroBgImages = [
        'images/hero-section.png', 
        'images/almirah.png', 
        'images/dinningtable.png'
    ];
    let currentHeroIndex = 0;
    const heroSection = document.querySelector('.hero-section');
    const heroDots = document.querySelectorAll('.hero-section .dot');
    const prevArrow = document.querySelector('.prev-arrow');
    const nextArrow = document.querySelector('.next-arrow');

    function updateHeroSlide(index) {
        if (heroSection) {
            heroSection.style.transition = "background-image 0.8s ease-in-out";
            heroSection.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${heroBgImages[index]}')`;
        }
        
        heroDots.forEach(dot => dot.classList.remove('active'));
        if (heroDots[index]) {
            heroDots[index].classList.add('active');
        }
    }

    if (nextArrow && prevArrow) {
        nextArrow.addEventListener('click', () => {
            currentHeroIndex = (currentHeroIndex + 1) % heroBgImages.length;
            updateHeroSlide(currentHeroIndex);
            resetSliderTimer();
        });

        prevArrow.addEventListener('click', () => {
            currentHeroIndex = (currentHeroIndex - 1 + heroBgImages.length) % heroBgImages.length;
            updateHeroSlide(currentHeroIndex);
            resetSliderTimer();
        });
    }

    heroDots.forEach((dot, dotIndex) => {
        dot.addEventListener('click', () => {
            currentHeroIndex = dotIndex;
            updateHeroSlide(currentHeroIndex);
            resetSliderTimer();
        });
    });

    let autoSliderTimer = setInterval(() => {
        currentHeroIndex = (currentHeroIndex + 1) % heroBgImages.length;
        updateHeroSlide(currentHeroIndex);
    }, 5000);

    function resetSliderTimer() {
        clearInterval(autoSliderTimer);
        autoSliderTimer = setInterval(() => {
            currentHeroIndex = (currentHeroIndex + 1) % heroBgImages.length;
            updateHeroSlide(currentHeroIndex);
        }, 5000);
    }

    if (heroSection) {
        updateHeroSlide(0);
    }

    // =================================================================
    // 3. SMOOTH SCROLL TO TOP BUTTON
    // =================================================================
    const scrollTopBtn = document.querySelector('.scroll-to-top');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // =================================================================
    // 4. DYNAMIC TESTIMONIAL SLIDER INTERACTION
    // =================================================================
    const testimonialBlock = document.querySelector('.testimonial-column');
    
    if (testimonialBlock) {
        const tCards = testimonialBlock.querySelectorAll('.testimonial-card');
        const tDots = testimonialBlock.querySelectorAll('.slider-dots .dot');
        const prevTestArrow = testimonialBlock.querySelector('.left-test');
        const nextTestArrow = testimonialBlock.querySelector('.right-test');
        let currentReviewIndex = 0;

        function changeReview(index) {
            tCards.forEach(card => card.style.display = 'none');
            tDots.forEach(dot => dot.classList.remove('active'));

            if (tCards[index]) tCards[index].style.display = 'block';
            if (tDots[index]) tDots[index].classList.add('active');
        }

        if (nextTestArrow && prevTestArrow) {
            nextTestArrow.addEventListener('click', () => {
                currentReviewIndex = (currentReviewIndex + 1) % tCards.length;
                changeReview(currentReviewIndex);
            });

            prevTestArrow.addEventListener('click', () => {
                currentReviewIndex = (currentReviewIndex - 1 + tCards.length) % tCards.length;
                changeReview(currentReviewIndex);
            });
        }

        tDots.forEach((dot, dotIndex) => {
            dot.addEventListener('click', () => {
                currentReviewIndex = dotIndex;
                changeReview(currentReviewIndex);
            });
        });
    }

    // =================================================================
    // 5. CONTACT FORM TO WHATSAPP DIRECT CONNECT ENGINE
    // =================================================================
    const inquiryForm = document.getElementById('contactForm');
    
    if (inquiryForm) {
        inquiryForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const nameInput = this.querySelector('input[placeholder*="Ramesh"]').value.trim();
            const phoneInput = this.querySelector('input[type="tel"]').value.trim();
            const emailInput = this.querySelector('input[type="email"]').value.trim() || 'Not Provided';
            const categorySelect = this.querySelector('select').value;
            const requirementsText = this.querySelector('textarea').value.trim();
            
            const formattedMessage = 
                `*NEW INQUIRY - HANUMAN ARTS*\n` +
                `----------------------------------------\n\n` +
                `👤 *Customer Name:* ${nameInput}\n` +
                `📞 *Contact Number:* ${phoneInput}\n` +
                `✉️ *Email Address:* ${emailInput}\n` +
                `🛋️ *Product Category:* ${categorySelect}\n\n` +
                `📝 *Detailed Requirements & Dimensions:*\n` +
                `"${requirementsText}"\n\n` +
                `----------------------------------------\n` +
                `_Sent natively via Hanuman Arts Portal_`;
            
            const encodedText = encodeURIComponent(formattedMessage);
            const businessNumber = "918946871958"; // Updated WhatsApp number
            
            window.open(`https://wa.me/${businessNumber}?text=${encodedText}`, '_blank');
        });
    }

    // =================================================================
    // 6. GLOBAL MOBILE DROPDOWN ACCORDION TOGGLE (UNIFIED CLASS FIX)
    // =================================================================
    const allDropdowns = document.querySelectorAll('.nav-menu ul li.dropdown');
    
    allDropdowns.forEach(dropdownLi => {
        const arrowTrigger = dropdownLi.querySelector('.mobile-arrow-trigger');
        const mainTextLink = dropdownLi.querySelector('a');

        if (arrowTrigger) {
            const handleMobileAccordion = function(e) {
                if (window.innerWidth <= 768) {
                    e.preventDefault();    
                    e.stopPropagation();    
                    
                    // TOGGLES UNIFIED HELPER CLASS MATCHING YOUR MAIN STYLES
                    dropdownLi.classList.toggle('open-active');
                    
                    const arrowIcon = arrowTrigger.querySelector('i');
                    if (arrowIcon) {
                        if (dropdownLi.classList.contains('open-active')) {
                            arrowIcon.style.transform = 'rotate(180deg)';
                        } else {
                            arrowIcon.style.transform = 'rotate(0deg)';
                        }
                    }
                }
            };

            arrowTrigger.addEventListener('click', handleMobileAccordion);
            arrowTrigger.addEventListener('touchstart', handleMobileAccordion, { passive: false });
        }

        if (mainTextLink) {
            mainTextLink.addEventListener('click', function(e) {
                if (window.innerWidth <= 768 && e.target !== arrowTrigger && !arrowTrigger.contains(e.target)) {
                    dropdownLi.classList.remove('open-active');
                }
            });
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            allDropdowns.forEach(dropdown => {
                dropdown.classList.remove('open-active');
                const arrowIcon = dropdown.querySelector('.mobile-arrow-trigger i');
                if (arrowIcon) arrowIcon.style.transform = 'rotate(0deg)';
            });
        }
    });

    // =================================================================
    // 7. ⚡ DYNAMIC PORTFOLIO LIGHTBOX ENGINE (ULTRA-LARGE CLAMP FIX)
    // =================================================================
    const lightbox = document.getElementById('portfolioLightbox');
    const lightboxImg = document.getElementById('lightboxTargetImg');
    const lightboxCaption = document.getElementById('lightboxTargetCaption');
    const closeBtn = document.getElementById('closeLightboxBtn');
    const gridCards = document.querySelectorAll('.gallery-card');
    
    function openLargeLightbox(imageSrc, captionText) {
        if (lightbox && lightboxImg && lightboxCaption) {
            lightboxImg.src = imageSrc;
            lightboxCaption.textContent = captionText;
            
            lightboxImg.style.maxWidth = "95vw";
            lightboxImg.style.maxHeight = "85vh";
            lightboxImg.style.width = "auto";
            lightboxImg.style.height = "auto";
            lightboxImg.style.objectFit = "contain";
            
            lightbox.style.display = 'flex';
            setTimeout(() => {
                lightbox.style.opacity = '1';
            }, 10);
        }
    }

    gridCards.forEach(card => {
        card.addEventListener('click', () => {
            const imgElement = card.querySelector('img');
            const h3Element = card.querySelector('.gallery-details-area h3');
            const pElement = card.querySelector('.gallery-details-area p');
            
            if (imgElement) {
                const src = imgElement.src;
                const title = h3Element ? h3Element.textContent : "Factory Showcase";
                const desc = pElement ? pElement.textContent : "";
                openLargeLightbox(src, `${title} - ${desc}`);
            }
        });
    });

    const carouselSlides = document.querySelectorAll('.slide-img-track');
    carouselSlides.forEach(slide => {
        slide.style.cursor = "pointer";
        slide.addEventListener('click', (e) => {
            e.stopPropagation();
            const imgElement = slide.querySelector('img');
            if (imgElement) {
                openLargeLightbox(
                    imgElement.src, 
                    "Commercial Bulk Order Dispatch: 300 Hand-Carved Premium Doors to Hyderabad"
                );
            }
        });
    });

    if (closeBtn && lightbox) {
        const closeLightbox = () => {
            lightbox.style.opacity = '0';
            setTimeout(() => {
                lightbox.style.display = 'none';
            }, 300);
        };

        closeBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }
});