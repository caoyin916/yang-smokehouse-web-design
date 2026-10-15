# Yang's Smokehouse website

The website for Yang's Smokehouse (杨记烤肉), 240 Legacy Dr #306, Plano, TX. It's a static site with no framework and no npm dependencies: `build.mjs` turns the data files into plain HTML pages in `dist/`, which any static host can serve.

## Pages

| URL | What it's for |
| --- | --- |
| `/` | Home: hero, signature dishes, story, reviews, H-E-B coupon, hours, party CTA |
| `/menu/` | Full menu (134 dishes) with photos, search and section chips. Tap a dish to open its detail sheet; tap **+** to add it to the order slip |
| `/our-story/` | Grandma Yang's story, timeline, and the two vows |
| `/gallery/` | Photo grid with a lightbox |
| `/visit/` | Address, hours, map, phone, and an FAQ (marked up for Google) |
| `/catering/` | Combos for groups, the Kaili sour soup fish, and a catering inquiry form (opens an email) |

### The order slip (点菜单)

Chowbus has no per-dish links, so the site can't drop a dish straight into a Chowbus cart. Instead, guests build an **order slip** as they browse. It's saved in their browser and tallied with 正 marks like the paper slips at a Guiyang skewer stall. From the slip they can:

- **Check out on Chowbus** (the store opens in a new tab, and the slip stays on screen as their list), or
- **Show the slip to their server**: a full-screen, big-type view with Chinese names, for dine-in.

## Everyday edits

All business info lives in **`src/data/site.json`**: phone, hours, address, links, the H-E-B promo, and the review quotes. Edit it and rebuild.

- **Hours:** update `hours`. The "Open now" badge, the hours tables, the footer and Google's structured data all read from it.
- **Locations:** every "Order online" button first opens a "Where would you like to order from?" box built from `locations`. To add a second store, add another entry (name, street, cityLine, Chowbus `order` link).
- **Promo bar:** set `promo.active` to `false`, or let it switch off on its own after `promo.expires`.
- **Menu wording:** dish names, portions and section order are set in `scripts/normalize_menu.py` (the `NAMES`, `DESC` and `SECTIONS` tables).

```sh
node build.mjs          # writes dist/
node scripts/check.mjs  # checks links, images, alt text, titles, structured data
python -m http.server 4173 --directory dist   # preview at http://127.0.0.1:4173
```

## Refreshing the menu from Chowbus

Do this when prices or dishes change on Chowbus.

1. Open https://pos.chowbus.com/online-ordering/store/Yang-Smokehouse/24035 in Chrome, open DevTools → Console, and run:
   `copy(self.__next_f.filter(x => x[0] === 1).map(x => x[1]).join(''))`
2. Paste the clipboard into a new file, `.work/rsc-decoded.txt`.
3. Run:
   ```sh
   python -I -X utf8 scripts/extract_chowbus.py .work/rsc-decoded.txt .work/menu-raw.json
   python -I scripts/download_photos.py .work/menu-raw.json .work/raw
   python -I -X utf8 scripts/normalize_menu.py .work/menu-raw.json src/data/menu.json .work/image-jobs.json
   bash scripts/process_images.sh      # needs ffmpeg; only converts new photos
   node build.mjs && node scripts/check.mjs
   ```
A new dish shows up with an auto-generated name. Add a line to `NAMES` in `normalize_menu.py` to give it a clean name and portion.

## Going live

The site currently runs on Wix. To switch:

`dist/` is committed, so it can be uploaded as-is. After any edit, run `node build.mjs` and commit the updated `dist/` too.

1. Deploy `dist/` to a static host such as Cloudflare Pages, Netlify or Hostinger. On Netlify and Cloudflare Pages, `_headers` (caching) and `_redirects` (old Wix URLs) take effect automatically.
2. Point `www.yangsmokeco.com` at the new host, and redirect the bare `yangsmokeco.com` to `www`.
3. In Google Search Console, submit `https://www.yangsmokeco.com/sitemap.xml`. The existing site-verification tag is kept in every page.
4. In Google Business Profile, keep the website set to `https://www.yangsmokeco.com/` and add `/menu/` as the menu link.

## Preview on GitHub Pages

`.github/workflows/pages.yml` publishes a preview to **https://caoyin916.github.io/yang-smokehouse-web-design/** on every push to `main`.

- **One-time setup:** in the GitHub repo, go to Settings → Pages → Build and deployment and set Source to **GitHub Actions**.
- The workflow builds with `BASE_PATH=/yang-smokehouse-web-design` (GitHub serves project sites under the repo name) and `PREVIEW=1`. Preview mode marks every page `noindex`, and `robots.txt` blocks crawlers, so the preview never competes in Google with www.yangsmokeco.com.
- The committed `dist/` is unaffected; it's always built for the real domain.
- To test the preview build locally (in Git Bash, set `MSYS_NO_PATHCONV=1` first):
  `BASE_PATH=/yang-smokehouse-web-design PREVIEW=1 node build.mjs`

**Using GitHub Pages for the real domain later:** in `pages.yml`, remove the three `env` values and add a `CNAME` file containing `www.yangsmokeco.com` to `src/static/`. Then set the custom domain under Settings → Pages and point DNS at GitHub (a `CNAME` record for `www` → `caoyin916.github.io`).

## SEO built in

- Every page is fully rendered HTML: all 134 dishes, prices and descriptions are readable without JavaScript.
- Schema.org JSON-LD: `Restaurant` (address, geo, hours, order and reserve actions), `Menu` with every section and item price, `FAQPage`, and `BreadcrumbList`.
- A unique title and description on every page, canonical URLs, Open Graph and Twitter cards (`og-image.jpg`), and a sitemap with image entries.
- Bilingual dish names (`lang="zh-Hans"`) so Chinese searches like 杨记烤肉 or 羊肉串 can match.
- Speed: WebP images at two sizes with `srcset`, lazy loading below the fold, the hero image preloaded, width and height on every image (no layout shift), and about 12 KB of JavaScript.

## Mobile

- A sticky bottom bar: **Order · Menu · Reserve · Directions**.
- The dish detail opens as a bottom sheet.
- The order slip docks above the bottom bar.
- Touch targets are at least 44 px, there's no sideways scrolling, and reduced-motion settings are respected.

## Folder map

```
build.mjs              page templates + generator
src/data/site.json     business info (edit me)
src/data/menu.json     generated menu (from normalize_menu.py)
src/assets/            css, js, images (WebP)
src/static/            favicon, icons, og-image (copied to the site root)
scripts/               Chowbus extraction, photo pipeline, QA check
dist/                  the built site to deploy
```
