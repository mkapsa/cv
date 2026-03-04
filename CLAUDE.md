# CLAUDE.md

## Project Overview

Personal portfolio/CV website for Matyáš Kapsa, a digital marketing specialist based in Prague. Hosted on GitHub Pages at `mkapsa.cz`.

## Tech Stack

- **HTML + CSS + JavaScript (ES modules)** — no frameworks, no build tools, no npm
- **Three.js** loaded via CDN import map (no local install)
- Deployed directly from `main` branch via GitHub Pages
- Custom domain configured via `CNAME` file (`mkapsa.cz`)

## File Structure

```
cv/
├── index.html          # Single-page site (hero, about, portfolio, contact)
├── style.css           # Dark theme styles with CSS custom properties
├── js/
│   ├── bg-scene.js     # Three.js background (particles + wireframe polyhedra)
│   ├── hero-scene.js   # Three.js hero section (3D bust model + fallback)
│   └── scroll-effects.js  # Intersection Observer reveals + lightbox
├── model/
│   └── bust.glb        # Low-poly 3D model (loaded by hero-scene.js)
├── portfolio.html      # Redirect to /#portfolio (preserves old URLs)
├── headshot.jpg        # Fallback image for no-WebGL
├── CNAME               # Custom domain config
├── img/                # Portfolio images (WebP)
│   └── logos/          # Social logos (legacy, now inline SVGs)
└── [favicon files]     # Various favicon formats
```

## Key Conventions

- **Images**: Portfolio images are WebP format; use WebP for any new portfolio images
- **Theme**: Dark & moody — colors defined as CSS custom properties in `:root`
- **Three.js CDN**: Version pinned in import map in index.html `<head>`
- **Responsive**: Breakpoints at 900px (tablet) and 600px (mobile)
- **Typography**: Trebuchet MS for headings, Georgia for intro text, system-ui for body
- **Portfolio grid**: CSS grid with `grid-auto-flow: dense`, horizontal images span 2 columns
- **Analytics**: Google Analytics 4 (ID: `G-3J35KTP6T4`) in index.html
- **3D model**: GLTFLoader loads `model/bust.glb`; falls back to wireframe icosahedron if missing
- **Local testing**: Must use HTTP server (`python3 -m http.server`) — import maps don't work with `file://`

## Deployment

Push to `main` → GitHub Pages auto-deploys to `mkapsa.cz`. No CI/CD pipeline.
