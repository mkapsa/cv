# CLAUDE.md

## Project Overview

Personal portfolio/CV website for Matyáš Kapsa, a digital marketing specialist based in Prague. Hosted on GitHub Pages at `mkapsa.cz`.

## Tech Stack

**Vanilla HTML/CSS only — no JavaScript frameworks, no build tools, no preprocessors.**

This is intentional. Keep it this way unless explicitly asked otherwise.

- HTML + CSS only (no JS files — Google Analytics is the only script)
- No package.json, no npm, no build step
- Deployed directly from `main` branch via GitHub Pages
- Custom domain configured via `CNAME` file (`mkapsa.cz`)

## File Structure

```
cv/
├── index.html          # Main CV/profile page
├── portfolio.html      # Photography portfolio gallery
├── style.css           # Main page styles
├── portfolio.css       # Portfolio grid styles
├── headshot.jpg        # Profile photo
├── CNAME               # Custom domain config
├── img/                # Portfolio images (WebP) + social logos
│   └── logos/          # x.png, ig.png, linkedin.svg
└── [favicon files]     # Various favicon formats
```

## Key Conventions

- **Images**: Portfolio images are WebP format; use WebP for any new portfolio images
- **Responsive**: Main page breakpoint at 800px (flexbox), portfolio at 600px (CSS grid)
- **Typography**: Trebuchet MS for headings, Georgia for intro text
- **Portfolio grid**: Uses `grid-auto-flow: dense` with horizontal images spanning 2 columns
- **Analytics**: Google Analytics 4 (ID: `G-3J35KTP6T4`) embedded in both HTML files

## Deployment

Push to `main` → GitHub Pages auto-deploys to `mkapsa.cz`. No CI/CD pipeline.
