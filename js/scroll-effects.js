import { setScrollY } from './bg-scene.js';

// Section reveal on scroll
const sections = document.querySelectorAll('section:not(#hero)');

const revealObserver = new IntersectionObserver(
    (entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        }
    },
    { threshold: 0.1 }
);

for (const section of sections) {
    revealObserver.observe(section);
}

// Scroll position for background parallax
window.addEventListener('scroll', () => {
    setScrollY(window.scrollY);
}, { passive: true });

// Portfolio accordion
document.querySelectorAll('.category-tile').forEach((tile) => {
    tile.addEventListener('click', () => {
        const category = tile.closest('.portfolio-category');
        const isOpen = category.classList.contains('open');
        category.classList.toggle('open');
        tile.setAttribute('aria-expanded', !isOpen);
    });
});

// Portfolio lightbox with arrow navigation
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox?.querySelector('img');
let currentImages = [];
let currentIndex = 0;

function openLightbox(img) {
    if (!lightbox || !lightboxImg) return;
    const grid = img.closest('.category-grid');
    currentImages = Array.from(grid.querySelectorAll('img'));
    currentIndex = currentImages.indexOf(img);
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.hidden = false;
    lightbox.offsetHeight;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showImage(index) {
    if (!currentImages.length) return;
    currentIndex = (index + currentImages.length) % currentImages.length;
    lightboxImg.src = currentImages[currentIndex].src;
    lightboxImg.alt = currentImages[currentIndex].alt;
}

document.querySelectorAll('.category-grid img').forEach((img) => {
    img.addEventListener('click', () => openLightbox(img));
});

if (lightbox) {
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    prevBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        showImage(currentIndex - 1);
    });

    nextBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        showImage(currentIndex + 1);
    });

    // Click backdrop or image = close
    lightbox.addEventListener('click', (e) => {
        if (e.target === prevBtn || e.target === nextBtn) return;
        closeLightbox();
    });
}

document.addEventListener('keydown', (e) => {
    if (!lightbox?.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
    if (e.key === 'ArrowRight') showImage(currentIndex + 1);
});

function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    currentImages = [];
    setTimeout(() => {
        lightbox.hidden = true;
        if (lightboxImg) lightboxImg.src = '';
    }, 300);
}
