## Welcome to the Website of Nysa Finance

We optimize, deploy and curate capital-efficient, counterparty-isolated lending Markets for Tokenized Assets and Stablecoins.


## Editing and deploying

- Edit `index.html` (page + JSX) and `config.js` (all social/contact links) directly. Opening
  `index.html` from a local web server works as before: Babel compiles the JSX in the browser.
- On every push to `main`, `.github/workflows/static.yml` runs `npm run build` (`scripts/build.mjs`),
  which precompiles the JSX, removes Babel, adds a Content-Security-Policy and publishes only `_site/`.
  To check it locally: `npm ci && npm run build`, then serve `_site/`.
- Libraries (React, Three.js) and fonts are self-hosted in `assets/vendor/` and `assets/fonts/`:
  the published page loads no third-party scripts, styles or fonts. If you add a new
  `three/addons/...` import, copy that file (and the files it imports) into `assets/vendor/three/addons/`.
