// Static site generator for yangsmokeco.com. No dependencies: `node build.mjs` writes ./dist
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "dist");
const site = JSON.parse(fs.readFileSync(path.join(SRC, "data/site.json"), "utf8"));
const menu = JSON.parse(fs.readFileSync(path.join(SRC, "data/menu.json"), "utf8"));
const BUILD_DATE = new Date().toISOString().slice(0, 10);
// Optional env for hosting under a sub-path, e.g. a GitHub Pages project site:
//   SITE_URL=https://user.github.io/repo BASE_PATH=/repo PREVIEW=1 node build.mjs
// PREVIEW=1 marks every page noindex so a preview never competes with the real domain.
const BASE = (process.env.BASE_PATH || "").replace(/\/+$/, "");
const PREVIEW = !!process.env.PREVIEW;
const U = (process.env.SITE_URL || site.url).replace(/\/+$/, "");
/** Prefix root-relative URLs in generated HTML with BASE. */
const rebase = (html) => !BASE ? html : html
  .replace(/(\s(?:href|src|data-lightbox|action)=")\/(?!\/)/g, `$1${BASE}/`)
  .replace(/(\s(?:srcset|imagesrcset)=")([^"]*)"/g, (_, a, v) => a + v.split(",").map((x) => x.trim().replace(/^\/(?!\/)/, `${BASE}/`)).join(", ") + '"');

/* ---------------- helpers ---------------- */
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (p) => `$${Number(p).toFixed(2)}`;
const hash = (file) => crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex").slice(0, 8);
const cssV = hash(path.join(SRC, "assets/css/site.css"));
const jsV = hash(path.join(SRC, "assets/js/site.js"));

function webpSize(file) {
  const b = fs.readFileSync(file);
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (kind === "VP8L") {
    const [b0, b1, b2, b3] = [b[21], b[22], b[23], b[24]];
    return [1 + (((b1 & 0x3f) << 8) | b0), 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))];
  }
  if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  return [1200, 900];
}
const size = (rel) => webpSize(path.join(SRC, "assets/img", rel));

/** Responsive <img> for a brand photo with -SMALL and -LARGE variants. */
function brandImg(base, small, large, alt, { sizes = "100vw", cls = "", eager = false } = {}) {
  const [w, h] = size(`brand/${base}-${large}.webp`);
  return `<img src="/assets/img/brand/${base}-${large}.webp" srcset="/assets/img/brand/${base}-${small}.webp ${small}w, /assets/img/brand/${base}-${large}.webp ${large}w" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ""} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
function dishImg(d, sizes, eager = false) {
  const [w, h] = size(`menu/${d.img}-640.webp`);
  return `<img src="/assets/img/menu/${d.img}-640.webp" srcset="/assets/img/menu/${d.img}-640.webp 640w, /assets/img/menu/${d.img}-1200.webp 1200w" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(d.en)}" ${eager ? "" : 'loading="lazy"'} decoding="async">`;
}

const I = {
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 21V3c-2 0-3.5 2-3.5 6s1.5 5 3.5 5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
  Instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor"/></svg>',
  Facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.1H7.7v3h2.6V21h3.2Z"/></svg>',
  Xiaohongshu: '<svg viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="17" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" font-family="sans-serif">书</text></svg>',
};

const addr = site.address;
const addrLine = `${addr.street}, ${addr.city}, ${addr.region} ${addr.zip}`;
const fmtTime = (t) => { const [h, m] = t.split(":").map(Number); const hh = ((h + 11) % 12) + 1; return `${hh}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 ? "AM" : "PM"}`; };
const hoursRows = () => site.hours.map((d) => `<tr data-day="${d.day}"><th scope="row">${d.day}</th><td>${d.closed ? "Closed" : `${fmtTime(d.open)} – ${fmtTime(d.close)}`}</td></tr>`).join("");
const hoursTable = (caption = "Opening hours") => `<table class="hours" data-hours><caption class="sr-only">${caption}</caption><tbody>${hoursRows()}</tbody></table>`;
const status = () => `<p class="status" data-status data-open="false"><span class="status__dot" aria-hidden="true"></span><span class="status__text">Open Tuesday to Sunday</span></p>`;
const promoActive = site.promo.active && BUILD_DATE <= site.promo.expires;

/* ---------------- structured data ---------------- */
const DAYS = { Monday: "Monday", Tuesday: "Tuesday", Wednesday: "Wednesday", Thursday: "Thursday", Friday: "Friday", Saturday: "Saturday", Sunday: "Sunday" };
const restaurantLD = {
  "@type": "Restaurant",
  "@id": `${U}/#restaurant`,
  name: site.name,
  alternateName: [site.nameCn, "Yangs Smokehouse", "Yang Smokehouse"],
  description: "Family-run Guizhou-style Chinese BBQ in Plano, Texas. Skewers grilled over live charcoal with Grandma Yang's hand-crushed spice blend, a family recipe since 1980.",
  url: `${U}/`,
  logo: `${U}/assets/img/brand/yangs-smokehouse-logo.png`,
  image: [`${U}/og-image.jpg`, `${U}/assets/img/brand/storefront-1400.webp`, `${U}/assets/img/brand/dining-room-1400.webp`],
  telephone: site.phoneE164,
  email: site.email,
  priceRange: site.priceRange,
  servesCuisine: ["Chinese", "Guizhou", "Chinese BBQ", "Barbecue", "Skewers"],
  address: { "@type": "PostalAddress", streetAddress: addr.street, addressLocality: addr.city, addressRegion: addr.region, postalCode: addr.zip, addressCountry: addr.country },
  geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng },
  hasMap: site.links.maps,
  openingHoursSpecification: site.hours.filter((d) => !d.closed).map((d) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAYS[d.day], opens: d.open, closes: d.close })),
  hasMenu: `${U}/menu/`,
  acceptsReservations: site.links.reserve,
  potentialAction: [
    { "@type": "OrderAction", target: { "@type": "EntryPoint", urlTemplate: site.links.order, actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"] }, deliveryMethod: ["http://purl.org/goodrelations/v1#DeliveryModePickUp", "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet"] },
    { "@type": "ReserveAction", target: { "@type": "EntryPoint", urlTemplate: site.links.reserve, actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"] }, result: { "@type": "FoodEstablishmentReservation", name: "Table reservation" } },
  ],
  sameAs: [...site.social.map((s) => s.url), site.links.maps],
};
const websiteLD = { "@type": "WebSite", "@id": `${U}/#website`, url: `${U}/`, name: site.name, inLanguage: "en-US", publisher: { "@id": `${U}/#restaurant` } };
const crumbsLD = (trail) => ({ "@type": "BreadcrumbList", itemListElement: trail.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${U}${p}` })) });

/* ---------------- shared chrome ---------------- */
const NAV = [["Home", "/", "首页"], ["Menu", "/menu/", "菜单"], ["Our story", "/our-story/", "故事"], ["Gallery", "/gallery/", "相册"], ["Visit", "/visit/", "地址"], ["Catering", "/catering/", "宴请"]];

function layout({ path: p, title, description, body, ld = [], dishData = null, preload = "", ogImage = "/og-image.jpg" }) {
  const canonical = `${U}${p}`;
  const graph = { "@context": "https://schema.org", "@graph": [restaurantLD, websiteLD, ...ld] };
  const config = { hours: site.hours, timezone: site.timezone, email: site.email, base: BASE };
  const nav = NAV.map(([n, href]) => `<a href="${href}"${p === href ? ' aria-current="page"' : ""}>${n}</a>`).join("");
  return `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="google-site-verification" content="b8a7yAiqgZIgh0ZPrn3JKn9218KnLBqS0ah10BuVn00">
<meta name="theme-color" content="#1e1512">
<meta name="geo.region" content="US-TX"><meta name="geo.placename" content="Plano"><meta name="geo.position" content="${site.geo.lat};${site.geo.lng}"><meta name="ICBM" content="${site.geo.lat}, ${site.geo.lng}">
<meta property="og:type" content="restaurant">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${U}${ogImage}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="en_US">
<meta property="restaurant:contact_info:street_address" content="${esc(addr.street)}"><meta property="restaurant:contact_info:locality" content="${addr.city}"><meta property="restaurant:contact_info:region" content="${addr.region}"><meta property="restaurant:contact_info:postal_code" content="${addr.zip}"><meta property="restaurant:contact_info:phone_number" content="${site.phoneE164}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${U}${ogImage}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${preload}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&amp;family=Hanken+Grotesk:wght@400;500;600;700&amp;family=Ma+Shan+Zheng&amp;family=Noto+Serif+SC:wght@500;700&amp;display=swap">
<link rel="stylesheet" href="/assets/css/site.css?v=${cssV}">
<script type="application/ld+json">${JSON.stringify(graph)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${promoActive ? `<div class="promo-bar"><a href="/#heb">${esc(site.promo.short)}</a></div>` : ""}
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="${esc(site.name)} home"><img src="/assets/img/brand/yangs-smokehouse-logo-520.webp" srcset="/assets/img/brand/yangs-smokehouse-logo-520.webp 1x, /assets/img/brand/yangs-smokehouse-logo-1040.webp 2x" width="520" height="115" alt="${esc(site.name)}, ${site.nameCn}, since 1980"></a>
    <nav class="nav" aria-label="Main">${nav}</nav>
    <div class="header-cta">
      <a class="btn btn--ghost btn--sm" href="${site.links.reserve}" target="_blank" rel="noopener">Book a table</a>
      <a class="btn btn--sm" href="${site.links.order}" target="_blank" rel="noopener" data-order>Order online</a>
    </div>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open navigation"><span></span><span></span><span></span></button>
  </div>
</header>
<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile" hidden>
  ${NAV.map(([n, href, cn]) => `<a class="big" href="${href}"${p === href ? ' aria-current="page"' : ""}>${n} <span lang="zh-Hans">${cn}</span></a>`).join("")}
  <div class="meta"><p>${esc(addrLine)}<br><a href="tel:${site.phoneE164}">${site.phone}</a></p><a class="btn btn--ghost" href="${site.links.reserve}" target="_blank" rel="noopener">${I.cal} Book a table</a></div>
</nav>
<main id="main">
${body}
</main>
${footer()}
<nav class="action-bar" aria-label="Quick actions">
  <a class="primary" href="${site.links.order}" target="_blank" rel="noopener" data-order>${I.bag}Order</a>
  <a href="/menu/">${I.menu}Menu</a>
  <a href="${site.links.reserve}" target="_blank" rel="noopener">${I.cal}Reserve</a>
  <a href="${site.links.directions}" target="_blank" rel="noopener">${I.pin}Directions</a>
</nav>
${slipChrome()}
${orderChrome()}
${dishData ? sheetChrome() : ""}
<script type="application/json" id="site-config">${JSON.stringify(config)}</script>
${dishData ? `<script type="application/json" id="dish-data">${JSON.stringify(dishData).replace(/</g, "\\u003c")}</script>` : ""}
<script src="/assets/js/site.js?v=${jsV}" defer></script>
</body>
</html>
`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="/assets/img/brand/yangs-smokehouse-logo-520.webp" width="520" height="115" alt="${esc(site.name)}" loading="lazy">
        <p>Guizhou-style skewers grilled over live charcoal, from Grandma Yang's family recipes since 1980.</p>
        <div class="socials">${site.social.map((s) => `<a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.name}">${I[s.name] || ""}</a>`).join("")}</div>
      </div>
      <div>
        <h2>Visit</h2>
        <address style="font-style:normal">
          <p><a href="${site.links.directions}" target="_blank" rel="noopener">${esc(addr.street)}<br>${addr.city}, ${addr.region} ${addr.zip}</a></p>
          <p><a href="tel:${site.phoneE164}">${site.phone}</a><br><a href="mailto:${site.email}">${site.email}</a></p>
        </address>
      </div>
      <div>
        <h2>Hours</h2>
        <ul>${site.hours.map((d) => `<li>${d.day.slice(0, 3)}: ${d.closed ? "Closed" : `${fmtTime(d.open)} – ${fmtTime(d.close)}`}</li>`).join("")}</ul>
      </div>
      <div>
        <h2>Explore</h2>
        <ul>
          ${NAV.map(([n, href]) => `<li><a href="${href}">${n}</a></li>`).join("")}
          <li><a href="${site.links.order}" target="_blank" rel="noopener" data-order>Order online</a></li>
          <li><a href="${site.links.reserve}" target="_blank" rel="noopener">Book a table</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-legal"><span>© ${BUILD_DATE.slice(0, 4)} ${esc(site.name)} · ${site.nameCn}</span><span>Online ordering and reservations by Chowbus</span></div>
  </div>
</footer>`;
}

function slipChrome() {
  return `<button class="slip-fab" type="button" data-open-slip hidden aria-haspopup="dialog">
  <span class="slip-fab__tally" aria-hidden="true" lang="zh-Hans"></span>
  <span>Order slip<small><span class="slip-fab__count"></span>, <span class="slip-fab__total"></span></small></span>
</button>
<dialog class="slip-dialog" id="slip" aria-labelledby="slip-title">
  <div class="slip">
    <div class="slip__head">
      <h2 class="slip__title" id="slip-title"><span lang="zh-Hans">点菜单</span><small>Order slip: <span class="slip__count"></span></small></h2>
      <button class="slip__close" type="button" aria-label="Close order slip">${I.close}</button>
    </div>
    <ul class="slip__list"></ul>
    <div class="slip__foot">
      <div class="slip__total needs-items"><span>Estimated subtotal</span><span class="slip__total-val"></span></div>
      <p class="slip__fine needs-items">Before tax and tip. Options like extra skewers are priced at checkout.</p>
      <a class="btn needs-items" href="${site.links.order}" target="_blank" rel="noopener" data-order>${I.bag} Check out on Chowbus</a>
      <button class="btn btn--ghost needs-items" type="button" data-open-server>Show this slip to your server</button>
      <button class="slip__clear needs-items" type="button">Clear the slip</button>
    </div>
  </div>
</dialog>
<dialog class="server-dialog" id="server-view" aria-label="Order slip for your server">
  <div class="server">
    <h2><span lang="zh-Hans">点菜单</span><button class="btn btn--sm server-close" type="button">Done</button></h2>
    <ol></ol>
  </div>
</dialog>`;
}

/** Location chooser shown before any jump to Chowbus (every [data-order] link). */
function orderChrome() {
  return `<dialog class="order-dialog" id="order-locations" aria-labelledby="order-title">
  <div class="order-box">
    <button class="sheet__close" type="button" aria-label="Close" data-close-order>${I.close}</button>
    <h2 class="order-box__title" id="order-title">Where would you like to order from?</h2>
    <p class="order-box__sub">Pick your location to start a pickup or delivery order.</p>
    <ul class="order-list" role="list">
      ${site.locations.map((l) => `<li><a class="order-loc" href="${l.order}" target="_blank" rel="noopener">
        <span class="order-loc__pin" aria-hidden="true">${I.pin}</span>
        <span class="order-loc__text">
          <span class="order-loc__name">${esc(l.name)}</span>
          <span class="order-loc__addr">${esc(l.street)}, ${esc(l.cityLine)}</span>
          <span class="status" data-status data-open="false"><span class="status__dot" aria-hidden="true"></span><span class="status__text"></span></span>
        </span>
        <span class="order-loc__go" aria-hidden="true">${I.right}</span>
      </a></li>`).join("")}
    </ul>
    <p class="order-box__fine">You'll finish your order on Chowbus in a new tab.</p>
  </div>
</dialog>`;
}

function sheetChrome() {
  return `<dialog class="sheet-dialog" id="dish-sheet" aria-labelledby="sheet-name">
  <div class="sheet">
    <div class="sheet__media"><button class="sheet__close" type="button" aria-label="Close dish details">${I.close}</button></div>
    <div class="sheet__body">
      <div class="sheet__top"><h2 class="sheet__name" id="sheet-name"></h2><span class="sheet__price"></span></div>
      <p class="sheet__cn" lang="zh-Hans"></p>
      <p class="sheet__desc"></p>
      <div class="sheet__meta"></div>
      <div class="sheet__actions">
        <div class="stepper" role="group" aria-label="Quantity"><button type="button" data-qty="-1" aria-label="One fewer">${I.minus}</button><output aria-live="polite">1</output><button type="button" data-qty="1" aria-label="One more">${I.plus}</button></div>
        <button class="btn sheet__add" type="button">${I.plus} Add to order slip</button>
      </div>
      <p class="sheet__fine">Has options, such as extra skewers. Pick them at checkout.</p>
      <p class="sheet__fine" style="display:block"><a class="link" href="${site.links.order}" target="_blank" rel="noopener" data-order>Order this on Chowbus</a></p>
    </div>
  </div>
</dialog>`;
}

/* ---------------- dish fragments ---------------- */
const items = menu.items;
const TAGTXT = { signature: ["Signature", "signature"], spicy: ["Spicy", "spicy"], "high-protein": ["High protein", "protein"], "call-ahead": ["Call a day ahead", "call-ahead"], "house-specialty": ["House specialty", "house"] };
const tagHtml = (d) => d.tags.filter((t) => TAGTXT[t]).map((t) => `<span class="tag tag--${TAGTXT[t][1]}">${TAGTXT[t][0]}</span>`).join("");
const searchKey = (d) => esc(`${d.en} ${d.cn} ${d.desc} ${d.tags.join(" ")}`.toLowerCase());
const priceTxt = (d) => money(d.price) + (d.options ? "+" : "");

function dishCard(d, sizes = "(max-width: 760px) 50vw, 300px", eager = false) {
  return `<button class="card" type="button" data-dish="${d.slug}" aria-haspopup="dialog">
    <span class="card__img">${dishImg(d, sizes, eager)}</span>
    <span class="card__body"><span class="card__name">${esc(d.en)}</span><span class="card__price">${priceTxt(d)}</span><span class="card__cn" lang="zh-Hans">${esc(d.cn)}</span></span>
  </button>`;
}
function dishRow(d, compact = false) {
  return `<li class="dish${compact ? " dish--compact" : ""}" data-search="${searchKey(d)}">
    <button class="dish__open" type="button" data-dish="${d.slug}" aria-haspopup="dialog">
      ${d.img && !compact ? `<span class="dish__thumb">${dishImg(d, "104px")}</span>` : ""}
      <span class="dish__text">
        <span class="dish__name">${esc(d.en)}</span>
        ${d.cn ? `<span class="dish__cn" lang="zh-Hans">${esc(d.cn)}</span>` : ""}
        ${d.desc && !compact ? `<span class="dish__desc">${esc(d.desc)}</span>` : ""}
        <span class="dish__meta"><span class="dish__price">${priceTxt(d)}</span>${d.portion ? `<span>${esc(d.portion)}</span>` : ""}${tagHtml(d)}</span>
      </span>
    </button>
    <button class="add" type="button" data-add="${d.slug}" data-name="${esc(d.en)}" aria-label="Add ${esc(d.en)} to your order slip">${I.plus}</button>
  </li>`;
}
const dishData = (slugs) => Object.fromEntries(slugs.map((s) => { const d = items[s]; return [s, { en: d.en, cn: d.cn, price: d.price, desc: d.desc, img: d.img, tags: d.tags, portion: d.portion, options: d.options, protein: d.protein }]; }));

/* ================= PAGES ================= */
const pages = [];

/* ---------- Home ---------- */
{
  const picks = ["zesty-lamb-skewers", "angus-sliced-beef-skewers", "juicy-pork-skewers", "crispy-pork-crunch-rice-bowl", "the-king-roasted-eggplant", "crispy-tofu-balls", "wagyu-beef-skewers", "red-chili-pork-belly"].filter((s) => items[s]?.img);
  const igPicks = ["grilled-oysters", "boiled-crawfish-combo", "grilled-shrimp", "dubai-chocolate-cake", "pork-belly-tacos", "grilled-corn-on-the-cob"].filter((s) => items[s]?.img);
  const r = site.reviews;
  const body = `
<section class="hero" aria-labelledby="hero-title">
  <div class="hero__img">${brandImg("skewers-on-the-grill", 900, 1500, "Pork skewers dusted with chili, sesame and scallion, fresh off the charcoal grill", { eager: true, sizes: "100vw" })}</div>
  <div class="flag" aria-hidden="true"><span class="flag__cn" lang="zh-Hans">杨记烤肉</span><span class="flag__since">1980</span></div>
  <div class="wrap">
    <div class="hero__copy">
      <h1 class="display h1" id="hero-title"><span class="line">Guizhou street</span><span class="line">skewers over</span><span class="line">live charcoal</span></h1>
      <p class="lede">Grandma Yang opened her charcoal stall in Guiyang in 1980. Three generations later, her hand-crushed spice blend seasons every skewer we grill on Legacy Drive in Plano.</p>
      <div class="btn-row">
        <a class="btn" href="${site.links.order}" target="_blank" rel="noopener" data-order>${I.bag} Order for pickup or delivery</a>
        <a class="btn btn--ghost" href="/menu/">See the menu</a>
      </div>
      ${status()}
    </div>
  </div>
</section>

<section class="proof" aria-label="Highlights">
  <div class="wrap">
    <ul>
      <li><span class="big">${site.rating.value}</span><a href="${site.links.reviews}" target="_blank" rel="noopener"><span class="stars" aria-hidden="true">★★★★★</span><strong>${site.rating.count} Google reviews</strong></a></li>
      <li><a href="${site.links.press}" target="_blank" rel="noopener"><strong>“Sensational skewers”</strong>CultureMap Dallas, July 2026</a></li>
      <li><div><strong>Three generations</strong>One family recipe since 1980</div></li>
    </ul>
  </div>
</section>

<section class="section" aria-labelledby="picks-title">
  <div class="wrap">
    <div class="section-head">
      <div>
        <h2 class="display h2" id="picks-title">Start with these<span class="cn-tag" lang="zh-Hans">招牌</span></h2>
        <p>Most tables order a few plates of skewers each, then share a rice bowl and something from the vegetable grill. Tap a dish to see it up close.</p>
      </div>
      <a class="link" href="/menu/">See the full menu</a>
    </div>
    <div class="rail">${picks.map((s) => dishCard(items[s], "(max-width: 860px) 74vw, 300px")).join("")}</div>
  </div>
</section>

<section class="section section--ox" aria-labelledby="story-title">
  <div class="wrap story">
    <figure class="story__img" style="margin:0">
      ${brandImg("grandma-yang-and-family", 900, 1800, "Grandma Yang, seated at center, with her family at their skewer stall in Guizhou", { sizes: "(max-width: 860px) 100vw, 600px" })}
      <figcaption>Grandma Yang, center, with family at the stall in Guizhou.</figcaption>
    </figure>
    <div>
      <h2 class="display h2" id="story-title">Grandma Yang's fire</h2>
      <p class="quote">No shortcuts.<br>No compromises.</p>
      <div class="prose">
        <p>Widowed at thirty with five children to raise, Grandma Yang set up a single charcoal stall in Guiyang. Her skewers drew such a following that the family grew it to six locations, each grilling about 10,000 skewers a day.</p>
        <p>She kept two vows for forty years: honest, quality meat, and a spice blend crushed by hand and never written down. Her granddaughter Candice now runs our Plano kitchen with the same rules.</p>
      </div>
      <a class="link" href="/our-story/">Read our story</a>
    </div>
  </div>
</section>

<section class="section section--tight" aria-labelledby="reviews-title">
  <div class="wrap">
    <div class="section-head">
      <h2 class="display h2" id="reviews-title">Heard at the table</h2>
      <a class="link" href="${site.links.reviews}" target="_blank" rel="noopener">Read all ${site.rating.count} reviews on Google</a>
    </div>
    <div class="reviews">
      ${r.map((x) => `<figure class="review"><span class="stars" aria-label="5 out of 5 stars">★★★★★</span><blockquote><p>${esc(x.text)}</p></blockquote><figcaption><strong>${esc(x.author)}</strong>, Google review</figcaption></figure>`).join("")}
    </div>
  </div>
</section>

<section class="section section--tight" aria-labelledby="ig-title">
  <div class="wrap">
    <div class="section-head">
      <div>
        <h2 class="display h2" id="ig-title">Follow the grill</h2>
        <p>New skewers, specials and what's on the charcoal tonight. Follow us on Instagram.</p>
      </div>
      <a class="btn btn--ghost" href="${site.social[0].url}" target="_blank" rel="noopener">${I.Instagram} @yangsmokehouse</a>
    </div>
    <ul class="ig-grid" role="list">
      ${igPicks.map((s) => `<li><a href="${site.social[0].url}" target="_blank" rel="noopener" aria-label="${esc(items[s].en)} on Instagram">${dishImg(items[s], "(max-width: 760px) 33vw, 200px")}<span class="ig-grid__icon" aria-hidden="true">${I.Instagram}</span></a></li>`).join("")}
    </ul>
  </div>
</section>

${promoActive ? `<section class="section section--raised" id="heb" aria-labelledby="heb-title">
  <div class="wrap promo">
    <div>
      <h2 class="display h2" id="heb-title">${esc(site.promo.title)}</h2>
      <p class="lede" style="margin-top:20px">${esc(site.promo.body)}</p>
      <a class="btn" href="${site.links.order}" target="_blank" rel="noopener" data-order>${I.bag} Order online</a>
    </div>
    <img src="/assets/img/brand/heb-coupon-1000.webp" width="${size("brand/heb-coupon-1000.webp")[0]}" height="${size("brand/heb-coupon-1000.webp")[1]}" alt="Yang's Smokehouse coupon: $5 off a $35 purchase, free delivery on orders of $38 or more, expires January 31, 2027" loading="lazy" decoding="async">
  </div>
</section>` : ""}

<section class="section" aria-labelledby="visit-title">
  <div class="wrap visit">
    <div class="visit__img">${brandImg("dining-room", 800, 1400, "Our dining room under the red-lit Grandma Yang sign", { sizes: "(max-width: 860px) 100vw, 600px" })}</div>
    <div>
      <h2 class="display h2" id="visit-title">Pull up a stool</h2>
      <div class="facts">
        <div><h3>Address</h3><p><a href="${site.links.directions}" target="_blank" rel="noopener">${esc(addrLine)}</a></p></div>
        <div><h3>Hours</h3>${hoursTable()}</div>
        <div><h3>Phone</h3><p><a href="tel:${site.phoneE164}">${site.phone}</a></p></div>
      </div>
      <div class="btn-row">
        <a class="btn" href="${site.links.reserve}" target="_blank" rel="noopener">${I.cal} Book a table</a>
        <a class="btn btn--ghost" href="${site.links.directions}" target="_blank" rel="noopener">${I.pin} Get directions</a>
      </div>
    </div>
  </div>
</section>

<section class="band" aria-labelledby="band-title">
  <div class="wrap">
    <div>
      <h2 class="display h2" id="band-title">Feeding a crowd?</h2>
      <p>Skewer platters for the table, group reservations, and catering for birthdays and office lunches.</p>
    </div>
    <div class="btn-row"><a class="btn" href="/catering/">Plan a party</a><a class="btn btn--ghost" href="tel:${site.phoneE164}">${I.phone} Call us</a></div>
  </div>
</section>`;
  pages.push({
    path: "/",
    title: "Yang's Smokehouse | Guizhou Chinese BBQ Skewers in Plano, TX",
    description: "Charcoal-grilled Guizhou skewers, rice bowls and Chinese BBQ in Plano, TX, from Grandma Yang's recipes since 1980. Order online or book a table on Legacy Dr.",
    body, dishData: dishData(picks),
    preload: `<link rel="preload" as="image" href="/assets/img/brand/skewers-on-the-grill-1500.webp" imagesrcset="/assets/img/brand/skewers-on-the-grill-900.webp 900w, /assets/img/brand/skewers-on-the-grill-1500.webp 1500w" imagesizes="100vw" fetchpriority="high">`,
  });
}

/* ---------- Menu ---------- */
{
  const secs = menu.sections.filter((s) => s.groups.some((g) => g.items.length));
  const all = Object.keys(items);
  const sectionHtml = secs.map((s) => {
    const head = `<header><h2>${esc(s.en)}</h2><span class="cn" lang="zh-Hans">${s.cn}</span>${s.blurb ? `<p>${esc(s.blurb)}</p>` : ""}</header>`;
    if (s.id === "favorites") {
      return `<section class="menu-section" id="${s.id}" aria-label="${esc(s.en)}">${head}<ul class="fav-grid" role="list" style="list-style:none;margin:18px 0 0;padding:0">${s.groups[0].items.map((slug) => `<li data-search="${searchKey(items[slug])}">${dishCard(items[slug])}</li>`).join("")}</ul></section>`;
    }
    const compact = s.id === "drinks";
    const groups = s.groups.map((g) => `<div class="dish-group">${g.en ? `<h3 class="group-title">${esc(g.en)}</h3>` : ""}<ul class="dishes${compact ? " dishes--compact" : ""}" role="list">${g.items.map((slug) => dishRow(items[slug], compact)).join("")}</ul></div>`).join("");
    return `<section class="menu-section" id="${s.id}" aria-label="${esc(s.en)}">${head}${groups}</section>`;
  }).join("");

  const menuLD = {
    "@type": "Menu", "@id": `${U}/menu/#menu`, name: "Yang's Smokehouse menu", url: `${U}/menu/`, inLanguage: "en-US",
    hasMenuSection: secs.filter((s) => s.id !== "favorites").map((s) => ({
      "@type": "MenuSection", name: s.en, alternateName: s.cn, ...(s.blurb ? { description: s.blurb } : {}),
      hasMenuItem: s.groups.flatMap((g) => g.items).map((slug) => {
        const d = items[slug];
        return { "@type": "MenuItem", name: d.en, alternateName: d.cn || undefined, description: d.desc || undefined, ...(d.img ? { image: `${U}/assets/img/menu/${d.img}-1200.webp` } : {}), offers: { "@type": "Offer", price: d.price, priceCurrency: "USD" } };
      }),
    })),
  };
  const body = `
<section class="page-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / Menu</nav>
    <h1 class="display h1">Menu</h1>
    <p class="lede">Tap a dish for photos and details. Tap + to tally it on your order slip, then check out on Chowbus for pickup or delivery, or show the slip to your server.</p>
  </div>
  <span class="cn-bg" aria-hidden="true" lang="zh-Hans">菜单</span>
</section>
<div class="menu-tools">
  <div class="wrap">
    <nav class="chips" aria-label="Menu sections">${secs.map((s, i) => `<a class="chip" href="#${s.id}"${i === 0 ? ' aria-current="true"' : ""}>${esc(s.en)}</a>`).join("")}</nav>
    <form class="search" id="menu-search-form" role="search"><label class="sr-only" for="menu-search">Search the menu</label>${I.search}<input id="menu-search" type="search" placeholder="Search lamb, 牛肉, spicy…" autocomplete="off"></form>
  </div>
</div>
<div class="wrap">
  ${sectionHtml}
  <p class="no-results is-hidden" role="status">No dishes match that search. Try a different word, or <a class="link" href="tel:${site.phoneE164}">call us</a> and we'll help.</p>
  <p class="menu-note" style="padding:48px 0 24px">Prices match our online menu as of October 2026 and may change. A + after a price means the dish has add-on options at checkout. Please tell us about allergies before you order.</p>
</div>`;
  pages.push({
    path: "/menu/",
    title: "Menu | Yang's Smokehouse Chinese BBQ Skewers in Plano, TX",
    description: "Full menu with photos and prices: lamb, Angus and wagyu skewers, grilled vegetables, Guizhou rice bowls, seafood, tacos and Yomie's yogurt drinks.",
    body, dishData: dishData(all), ld: [menuLD, crumbsLD([["Home", "/"], ["Menu", "/menu/"]])],
  });
}

/* ---------- Our story ---------- */
{
  const body = `
<section class="page-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / Our story</nav>
    <h1 class="display h1">Three generations,<br>one charcoal grill</h1>
    <p class="lede">Yang's Smokehouse is a family business that started with one widow, one charcoal stall and a spice blend she never wrote down.</p>
  </div>
  <span class="cn-bg" aria-hidden="true" lang="zh-Hans">传承</span>
</section>
<section class="section">
  <div class="wrap">
    <figure class="full-img" style="margin:0 0 clamp(48px,7vw,96px)">
      ${brandImg("grandma-yang-and-family", 900, 1800, "Grandma Yang in a wheelchair at center, surrounded by her children and grandchildren in aprons at their stall", { sizes: "(max-width: 1240px) 100vw, 1160px" })}
      <figcaption class="muted" style="margin-top:10px;font-size:14px">Grandma Yang, center, with three generations of the family at the stall.</figcaption>
    </figure>
    <div class="split">
      <div>
        <h2 class="display h2">How it started</h2>
        <p class="lede" style="margin-top:20px">At thirty, facing the sudden loss of her husband, Grandma Yang didn't just survive. She commanded the embers.</p>
      </div>
      <ol class="timeline">
        <li><span class="when">1980</span><h3>A charcoal stall in Guiyang</h3><p>With five children to raise, she opened a single skewer stall in the capital of Guizhou province, seasoning everything with spices she crushed by hand.</p></li>
        <li><h3>Six stalls, ten thousand skewers a day</h3><p>Word spread. The family grew the business to six locations, each grilling around 10,000 skewers a day.</p></li>
        <li><h3>Forty years at the fire</h3><p>Grandma Yang ran her grills for four decades, then handed the recipes to her youngest daughter.</p></li>
        <li><h3>A third generation in Texas</h3><p>Her granddaughter Candice Cao came to Dallas more than a decade ago to study at Dallas Baptist University. Together with her mother, she brought the family recipes to Plano.</p></li>
        <li><h3>Grandma flies in</h3><p>Grandma Yang traveled to Texas to help open Yang's Smokehouse and coach the kitchen team herself.</p></li>
        <li><span class="when">2026</span><h3>“Sensational skewers”</h3><p>CultureMap Dallas featured the restaurant, singling out the lamb, beef tongue and crispy tofu balls. <a class="link" href="${site.links.press}" target="_blank" rel="noopener">Read the article</a></p></li>
      </ol>
    </div>
  </div>
</section>
<section class="section section--ox">
  <div class="wrap">
    <div class="section-head"><div><h2 class="display h2">Two vows</h2><p style="color:#e9d6cf">The rules Grandma Yang set at the first stall still run our kitchen.</p></div></div>
    <div class="vows">
      <div class="vow"><span class="num" lang="zh-Hans" aria-hidden="true">一</span><h3 class="h3">Honest meat</h3><p>Quality cuts, marinated properly and grilled to order. If it isn't good enough for the family table, it doesn't go on a skewer.</p></div>
      <div class="vow"><span class="num" lang="zh-Hans" aria-hidden="true">二</span><h3 class="h3">The blend stays secret</h3><p>Grandma Yang's chili and spice mix is still crushed by hand from a recipe that has never been written down. You can take a jar home as Soul Chili Powder.</p></div>
    </div>
  </div>
</section>
<section class="section">
  <div class="wrap story">
    <div class="story__img">${brandImg("dining-room", 800, 1400, "Red-lit dining room with Grandma Yang's portrait on the wall", { sizes: "(max-width: 860px) 100vw, 600px" })}</div>
    <div>
      <h2 class="display h2">BBQ, reimagined in Plano</h2>
      <div class="prose" style="margin-top:20px">
        <p>Every skewer is marinated in our 40-year signature spice tradition before it meets live fire. Grab a seat where you can watch the grill: the smoke is half the experience.</p>
        <p>We pair the classics with dishes from home, like crispy tofu balls, Kaili sour soup fish and the crispy pork crunch rice bowl, and with a few Texas touches, like skewer-meat tacos.</p>
      </div>
      <div class="btn-row" style="margin-top:28px"><a class="btn" href="/menu/">See the menu</a><a class="btn btn--ghost" href="${site.links.reserve}" target="_blank" rel="noopener">${I.cal} Book a table</a></div>
    </div>
  </div>
</section>`;
  pages.push({
    path: "/our-story/",
    title: "Our Story | Grandma Yang's Skewers Since 1980 | Yang's Smokehouse",
    description: "How a widow's charcoal skewer stall in Guiyang, Guizhou grew into six locations and, three generations later, Yang's Smokehouse in Plano, Texas.",
    body, ld: [crumbsLD([["Home", "/"], ["Our story", "/our-story/"]]), { "@type": "AboutPage", "@id": `${U}/our-story/#page`, url: `${U}/our-story/`, name: "Our story", about: { "@id": `${U}/#restaurant` } }],
  });
}

/* ---------- Gallery ---------- */
{
  const dishPhotos = ["zesty-lamb-skewers", "red-chili-pork-belly", "the-king-roasted-eggplant", "grilled-oysters", "crispy-pork-crunch-rice-bowl", "angus-sliced-beef-skewers", "spicy-stir-fried-clams", "grilled-corn-on-the-cob", "dubai-chocolate-cake", "juicy-pork-skewers", "boiled-crawfish-combo", "southern-cold-noodles", "grilled-shrimp", "chicken-potstickers", "wagyu-beef-skewers", "smashed-cucumber-salad", "pork-belly-tacos", "green-bean-skewers", "guizhou-spicy-chicken", "crispy-potato-pancakes", "grilled-sausage", "chefs-special-whole-squid", "mini-pork-ribs", "spicy-roasted-pig-brain"].filter((s) => items[s]?.img);
  const tiles = [
    ...[["storefront", 800, 1400, "Yang's Smokehouse storefront, suite 306 on Legacy Drive in Plano"], ["skewers-on-the-grill", 900, 1500, "Chili-dusted pork skewers piled high"], ["dining-room", 800, 1400, "The dining room under the red-lit Grandma Yang sign"]].map(([b, s, l, alt]) => ({ html: brandImg(b, s, l, alt, { sizes: "(max-width: 700px) 100vw, 400px" }), big: `/assets/img/brand/${b}-${l}.webp` })),
    ...dishPhotos.map((s) => ({ html: dishImg(items[s], "(max-width: 700px) 100vw, 400px"), big: `/assets/img/menu/${items[s].img}-1200.webp` })),
    { html: brandImg("grandma-yang-and-family", 900, 1800, "Grandma Yang with her family at the stall in Guizhou", { sizes: "(max-width: 700px) 100vw, 400px" }), big: "/assets/img/brand/grandma-yang-and-family-1800.webp" },
  ];
  const body = `
<section class="page-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / Gallery</nav>
    <h1 class="display h1">Gallery</h1>
    <p class="lede">Smoke, skewers and the room. Follow along on <a class="link" href="${site.social[0].url}" target="_blank" rel="noopener">Instagram @yangsmokehouse</a> for what's coming off the grill today.</p>
  </div>
  <span class="cn-bg" aria-hidden="true" lang="zh-Hans">相册</span>
</section>
<section class="section section--tight">
  <div class="wrap masonry">
    ${tiles.map((t) => `<button type="button" data-lightbox="${t.big}" aria-label="Enlarge photo">${t.html}</button>`).join("")}
  </div>
</section>
<dialog class="lightbox" id="lightbox" aria-label="Photo viewer">
  <div class="lightbox__inner">
    <figure style="margin:0"><img src="" alt=""><figcaption></figcaption></figure>
    <button class="sheet__close" type="button" aria-label="Close photo">${I.close}</button>
    <button class="lb-nav lb-prev" type="button" aria-label="Previous photo">${I.left}</button>
    <button class="lb-nav lb-next" type="button" aria-label="Next photo">${I.right}</button>
  </div>
</dialog>`;
  pages.push({
    path: "/gallery/",
    title: "Photo Gallery | Yang's Smokehouse Chinese BBQ in Plano, TX",
    description: "Photos of Yang's Smokehouse in Plano: charcoal-grilled lamb and pork belly skewers, grilled oysters, rice bowls, our dining room and the family behind the grill.",
    body, ld: [crumbsLD([["Home", "/"], ["Gallery", "/gallery/"]])],
  });
}

/* ---------- Visit ---------- */
{
  const faqs = [
    ["Do you take reservations?", `Yes. <a href="${site.links.reserve}" target="_blank" rel="noopener">Book a table online</a> any time. For large groups, call us at <a href="tel:${site.phoneE164}">${site.phone}</a> so we can set up the right table.`],
    ["Can I order takeout or delivery?", `Yes. <a href="${site.links.order}" target="_blank" rel="noopener" data-order>Order online through Chowbus</a> for pickup or delivery, or call us to order by phone.`],
    ["What should I order on my first visit?", `Start with a few plates of skewers, like the <a href="/menu/#dish-zesty-lamb-skewers">Zesty Lamb</a>, <a href="/menu/#dish-angus-sliced-beef-skewers">Angus Sliced Beef</a> and <a href="/menu/#dish-juicy-pork-skewers">Juicy Pork</a>. Then share a <a href="/menu/#dish-crispy-pork-crunch-rice-bowl">Crispy Pork Crunch Rice Bowl</a> and the <a href="/menu/#dish-crispy-tofu-balls">Crispy Tofu Balls</a>.`],
    ["How spicy is the food?", "Our skewers are seasoned with Grandma Yang's chili and spice blend. Dishes marked Spicy on the menu bring more heat. Ask your server about heat levels when you order."],
    ["Do you have vegetarian options?", "Yes: the grilled vegetable skewers (chives, corn, zucchini, potato, cauliflower, green beans, mushrooms and cabbage), crispy tofu balls, smashed cucumber salad, potato pancakes and sweet potato fries. The King Roasted Eggplant is topped with minced pork. Please tell us about any dietary needs when you order."],
    ["Is there parking?", "Yes, there is free parking in the shopping center lot right outside our door."],
    ["Do you cater or host parties?", `Yes. We put together skewer platters for groups and cater birthdays, office lunches and family gatherings. <a href="/catering/">See catering and parties</a>.`],
    ["Can I buy your chili powder?", `Yes. Our <a href="/menu/#dish-soul-chili-powder">Soul Chili Powder</a>, the same blend we use on every skewer, comes in a take-home jar.`],
  ];
  const strip = (h) => h.replace(/<[^>]+>/g, "");
  const body = `
<section class="page-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / Visit</nav>
    <h1 class="display h1">Visit us on<br>Legacy Drive</h1>
    <p class="lede">${esc(addr.landmark)}, in Plano.</p>
    ${status()}
  </div>
  <span class="cn-bg" aria-hidden="true" lang="zh-Hans">欢迎</span>
</section>
<section class="section">
  <div class="wrap visit">
    <div>
      <div class="facts" style="margin-top:0">
        <div><h3>Address</h3><p><a href="${site.links.directions}" target="_blank" rel="noopener">${esc(addr.street)}<br>${addr.city}, ${addr.region} ${addr.zip}</a></p></div>
        <div><h3>Hours</h3>${hoursTable()}</div>
        <div><h3>Phone</h3><p><a href="tel:${site.phoneE164}">${site.phone}</a></p></div>
        <div><h3>Email</h3><p><a href="mailto:${site.email}">${site.email}</a></p></div>
      </div>
      <div class="btn-row">
        <a class="btn" href="${site.links.directions}" target="_blank" rel="noopener">${I.pin} Get directions</a>
        <a class="btn btn--ghost" href="${site.links.reserve}" target="_blank" rel="noopener">${I.cal} Book a table</a>
        <a class="btn btn--ghost" href="tel:${site.phoneE164}">${I.phone} Call</a>
      </div>
    </div>
    <div style="display:grid;gap:18px">
      <iframe class="map" width="600" height="375" src="${site.links.mapEmbed}" title="Map showing Yang's Smokehouse at ${esc(addrLine)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      ${brandImg("storefront", 800, 1400, "Yang's Smokehouse storefront with red script sign, suite 306", { sizes: "(max-width: 860px) 100vw, 600px", cls: "" }).replace("<img", '<img style="border-radius:6px;aspect-ratio:16/10;object-fit:cover;width:100%"')}
    </div>
  </div>
</section>
<section class="section section--raised" aria-labelledby="faq-title">
  <div class="wrap split">
    <div><h2 class="display h2" id="faq-title">Good to know</h2><p class="muted" style="margin-top:16px;max-width:24em">Questions we hear most. Anything else, call <a href="tel:${site.phoneE164}">${site.phone}</a>.</p></div>
    <div class="faq">${faqs.map(([q, a]) => `<details><summary>${q}</summary><div class="answer"><p>${a}</p></div></details>`).join("")}</div>
  </div>
</section>`;
  pages.push({
    path: "/visit/",
    title: "Location & Hours | Yang's Smokehouse, 240 Legacy Dr #306, Plano, TX",
    description: `Yang's Smokehouse is at ${addrLine}. Open Tuesday to Sunday, closed Mondays. Call ${site.phone}, book a table or get directions.`,
    body, ld: [crumbsLD([["Home", "/"], ["Visit", "/visit/"]]), { "@type": "FAQPage", "@id": `${U}/visit/#faq`, mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) }],
  });
}

/* ---------- Catering ---------- */
{
  const combos = ["pitmaster-plate", "backyard-combo", "yangs-bbq-feast"].map((s) => items[s]).filter(Boolean);
  const fish = items["kaili-sour-soup-fish"];
  const body = `
<section class="page-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / Catering</nav>
    <h1 class="display h1">Parties &amp;<br>catering</h1>
    <p class="lede">Birthday tables, office lunches, family get-togethers. We'll keep the skewers coming.</p>
  </div>
  <span class="cn-bg" aria-hidden="true" lang="zh-Hans">宴请</span>
</section>
<section class="section">
  <div class="wrap">
    <div class="section-head"><div><h2 class="display h2">Platters for the table</h2><p>Our combos put a spread of signature skewers and sides in the middle of the table. Order them for dine-in, pickup or delivery.</p></div><a class="link" href="/menu/#combos">See all combos</a></div>
    <div class="combos">
      ${combos.map((d) => `<div class="combo"><span class="serves">${esc(d.portion)}</span><h3 class="h3">${esc(d.en)}</h3><p>${esc(d.desc)}</p><span class="price">${money(d.price)}</span></div>`).join("")}
    </div>
    ${fish ? `<div class="panel" style="margin-top:18px;display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center">
      ${fish.img ? `<div style="width:140px;border-radius:10px;overflow:hidden">${dishImg(fish, "140px")}</div>` : ""}
      <div><h3 class="h3">${esc(fish.en)} <span class="muted" lang="zh-Hans" style="font-size:.7em">${esc(fish.cn)}</span></h3><p style="margin:8px 0 0;color:#d8cabd">A whole fish in tangy Kaili red sour soup, the centerpiece of a Guizhou feast (${money(fish.price)}). We prepare it to order, so please call a day ahead.</p></div>
    </div>` : ""}
  </div>
</section>
<section class="section section--raised" aria-labelledby="inquiry-title">
  <div class="wrap split">
    <div>
      <h2 class="display h2" id="inquiry-title">Plan your event</h2>
      <div class="prose" style="margin-top:20px">
        <p>Tell us the date, headcount and what you have in mind, and we'll put together a menu and quote. The form opens an email to us with your details filled in.</p>
        <p>Rather talk it through? Call <a href="tel:${site.phoneE164}">${site.phone}</a>. For a large table at the restaurant, <a href="${site.links.reserve}" target="_blank" rel="noopener">book online</a> or give us a call.</p>
      </div>
    </div>
    <div class="panel">
      <form class="form" id="catering-form">
        <label>Your name<input name="name" autocomplete="name" required></label>
        <label>Phone<input name="phone" type="tel" autocomplete="tel" required></label>
        <label class="full">Email<input name="email" type="email" autocomplete="email" required></label>
        <label>Event date<input name="date" type="date" required></label>
        <label>Guests<input name="guests" type="number" min="2" inputmode="numeric" required></label>
        <label class="full">Type of event
          <select name="type"><option>Party at the restaurant</option><option>Catering pickup</option><option>Catering delivery</option><option>Office lunch</option><option>Something else</option></select>
        </label>
        <label class="full">Details <span class="hint">Budget, favorite dishes, dietary needs, timing</span><textarea name="details"></textarea></label>
        <div class="full"><button class="btn" type="submit">Email my inquiry</button></div>
      </form>
      <p class="form-done muted" role="status" hidden style="margin:16px 0 0">Your email app should open with the inquiry ready to send. If it didn't, email <a href="mailto:${site.email}">${site.email}</a> or call ${site.phone}.</p>
    </div>
  </div>
</section>`;
  pages.push({
    path: "/catering/",
    title: "Catering & Party Platters | Yang's Smokehouse Chinese BBQ, Plano TX",
    description: "Chinese BBQ catering in Plano: skewer combos for 1 to 4, whole Kaili sour soup fish and group reservations. Request a quote from Yang's Smokehouse.",
    body, ld: [crumbsLD([["Home", "/"], ["Catering", "/catering/"]])],
  });
}

/* ---------- 404 ---------- */
pages.push({
  path: "/404.html", noindex: true,
  title: "Page not found | Yang's Smokehouse",
  description: "This page doesn't exist. Head to the menu or call us.",
  body: `<section class="wrap notfound"><div><div class="cn" lang="zh-Hans" aria-hidden="true">空</div><h1 class="display h2">This skewer's gone</h1><p class="lede" style="margin:16px auto 28px">The page you were looking for isn't here. It may have moved when we rebuilt the site.</p><div class="btn-row" style="justify-content:center"><a class="btn" href="/menu/">See the menu</a><a class="btn btn--ghost" href="/">Go home</a></div></div></section>`,
});

/* ================= WRITE ================= */
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true }); // keep dist/ itself (a dev server may hold it open)
fs.cpSync(path.join(SRC, "assets"), path.join(OUT, "assets"), { recursive: true });
fs.cpSync(path.join(SRC, "static"), OUT, { recursive: true });

for (const pg of pages) {
  let html = rebase(layout(pg));
  if (pg.noindex || PREVIEW) html = html.replace('content="index, follow, max-image-preview:large"', 'content="noindex"');
  const file = pg.path.endsWith(".html") ? path.join(OUT, pg.path) : path.join(OUT, pg.path, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
const indexable = pages.filter((p) => !p.noindex);
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${indexable.map((p) => `  <url><loc>${U}${p.path}</loc><lastmod>${BUILD_DATE}</lastmod><priority>${p.path === "/" ? "1.0" : p.path === "/menu/" ? "0.9" : "0.7"}</priority>${p.path === "/menu/" ? Object.values(items).filter((d) => d.img).map((d) => `<image:image><image:loc>${U}/assets/img/menu/${d.img}-1200.webp</image:loc></image:image>`).join("") : ""}</url>`).join("\n")}
</urlset>
`);
fs.writeFileSync(path.join(OUT, "robots.txt"), PREVIEW ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\n\nSitemap: ${U}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, ".nojekyll"), ""); // GitHub Pages: serve files as-is
fs.writeFileSync(path.join(OUT, "site.webmanifest"), JSON.stringify({ name: site.name, short_name: "Yang's", start_url: `${BASE}/`, display: "standalone", background_color: "#1e1512", theme_color: "#1e1512", icons: [{ src: `${BASE}/icon-192.png`, sizes: "192x192", type: "image/png" }, { src: `${BASE}/icon-512.png`, sizes: "512x512", type: "image/png" }] }, null, 2));
// Netlify / Cloudflare Pages: long cache for images, revalidate HTML; old Wix URLs redirect home.
fs.writeFileSync(path.join(OUT, "_headers"), `/assets/img/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/css/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/js/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
fs.writeFileSync(path.join(OUT, "_redirects"), `/book-online  ${site.links.reserve}  302\n/members  /  301\n/my-subscriptions  /  301\n/about  /our-story/  301\n/menu.html  /menu/  301\n`);
console.log(`Built ${pages.length} pages, ${Object.keys(items).length} dishes -> dist/${BASE ? ` (base path ${BASE})` : ""}${PREVIEW ? " [preview: noindex]" : ""}`);
