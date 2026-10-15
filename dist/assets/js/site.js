/* Yang's Smokehouse — small, dependency-free behavior for every page. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = (n) => "$" + Number(n).toFixed(2);
  const ICON = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  };
  const config = JSON.parse($("#site-config")?.textContent || "{}");

  /* ---------- Mobile nav ---------- */
  const toggle = $(".menu-toggle");
  const mnav = $("#mobile-nav");
  if (toggle && mnav) {
    const set = (open) => {
      if (open) mnav.style.top = Math.max(0, $(".site-header").getBoundingClientRect().bottom) + "px";
      toggle.setAttribute("aria-expanded", String(open));
      mnav.hidden = !open;
      document.body.classList.toggle("nav-open", open);
    };
    toggle.addEventListener("click", () => set(toggle.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => e.key === "Escape" && set(false));
    $$("a", mnav).forEach((a) => a.addEventListener("click", () => set(false)));
  }

  /* ---------- Order online: choose a location before Chowbus ---------- */
  const orderDlg = $("#order-locations");
  if (orderDlg) {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-order]");
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // modified clicks go straight through
      e.preventDefault();
      orderDlg.returnFocus = a;
      orderDlg.showModal();
    });
    orderDlg.addEventListener("click", (e) => {
      if (e.target === orderDlg || e.target.closest("[data-close-order]")) orderDlg.close();
      else if (e.target.closest(".order-loc")) setTimeout(() => orderDlg.close(), 0); // let the link open first
    });
    orderDlg.addEventListener("close", () => orderDlg.returnFocus?.focus?.());
  }

  /* ---------- Open / closed status (restaurant time zone) ---------- */
  const hours = config.hours || [];
  const nowParts = () => {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: config.timezone || "America/Chicago", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
    return { day: p.weekday, mins: (+p.hour % 24) * 60 + +p.minute };
  };
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fmt = (t) => {
    const [h, m] = t.split(":").map(Number);
    const hh = ((h + 11) % 12) + 1;
    return `${hh}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 ? "AM" : "PM"}`;
  };
  if (hours.length) {
    const { day, mins } = nowParts();
    const idx = hours.findIndex((h) => h.day === day);
    const today = hours[idx];
    let open = false, text = "";
    if (today && !today.closed && mins >= toMin(today.open) && mins < toMin(today.close)) {
      open = true;
      text = `<strong>Open now</strong> until ${fmt(today.close)}`;
    } else {
      // find the next opening
      for (let i = 0; i < 8; i++) {
        const d = hours[(idx + i) % 7];
        if (d.closed) continue;
        if (i === 0 && mins >= toMin(d.open)) continue;
        text = `<strong>Closed now</strong>. Opens ${i === 0 ? "today" : i === 1 ? "tomorrow" : d.day} at ${fmt(d.open)}`;
        break;
      }
    }
    $$("[data-status]").forEach((el) => { el.dataset.open = open; $(".status__text", el).innerHTML = text; });
    $$("[data-hours] tr").forEach((tr) => tr.classList.toggle("today", tr.dataset.day === day));
  }

  /* ---------- Order slip state ---------- */
  const KEY = "yang-slip-v1";
  let slip = {};
  try { slip = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { slip = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(slip)); } catch {} };
  const dishes = JSON.parse($("#dish-data")?.textContent || "{}");
  const tally = (n) => "正".repeat(Math.floor(n / 5)) + ["", "一", "丅", "下", "止"][n % 5];
  const count = () => Object.values(slip).reduce((a, l) => a + l.q, 0);
  const total = () => Object.values(slip).reduce((a, l) => a + l.q * l.price, 0);

  function setQty(slug, q, info) {
    const d = info || dishes[slug] || slip[slug];
    if (!d) return;
    if (q <= 0) delete slip[slug];
    else slip[slug] = { q: Math.min(q, 99), en: d.en, cn: d.cn, price: Number(d.price) };
    save();
    render();
  }
  const fab = $(".slip-fab");
  function render() {
    const n = count();
    $$("[data-add]").forEach((b) => {
      const q = slip[b.dataset.add]?.q || 0;
      b.dataset.count = q;
      b.setAttribute("aria-label", q ? `${b.dataset.name}: ${q} on your slip. Add one more` : `Add ${b.dataset.name} to your order slip`);
    });
    if (fab) {
      fab.hidden = n === 0;
      document.body.classList.toggle("has-slip", n > 0);
      $(".slip-fab__tally", fab).textContent = n > 9 ? n : tally(n) || "0";
      $(".slip-fab__count", fab).textContent = `${n} item${n === 1 ? "" : "s"}`;
      $(".slip-fab__total", fab).textContent = money(total());
    }
    renderSlip();
  }

  /* ---------- Slip drawer ---------- */
  const slipDlg = $("#slip");
  function renderSlip() {
    if (!slipDlg) return;
    const list = $(".slip__list", slipDlg);
    const lines = Object.entries(slip);
    $(".slip__count", slipDlg).textContent = lines.length ? `${count()} item${count() === 1 ? "" : "s"}` : "Nothing yet";
    $(".slip__total-val", slipDlg).textContent = money(total());
    $$(".needs-items", slipDlg).forEach((el) => (el.hidden = !lines.length));
    if (!lines.length) {
      list.innerHTML = `<li class="slip__empty"><strong>空</strong>Your slip is empty. Tap the + next to any dish to tally it here, just like the paper slips at a Guiyang skewer stall.</li>`;
      return;
    }
    list.innerHTML = lines.map(([slug, l]) => `
      <li class="slip__line">
        <div class="slip__name">${l.en}<span lang="zh-Hans">${l.cn || ""}</span></div>
        <div class="slip__tally" aria-hidden="true">${tally(l.q)}</div>
        <div class="slip__controls">
          <div class="stepper" role="group" aria-label="Quantity for ${l.en}">
            <button type="button" data-step="-1" data-slug="${slug}" aria-label="Remove one ${l.en}">${ICON.minus}</button>
            <output aria-live="polite">${l.q}</output>
            <button type="button" data-step="1" data-slug="${slug}" aria-label="Add one ${l.en}">${ICON.plus}</button>
          </div>
          <span class="slip__line-price">${money(l.q * l.price)}</span>
        </div>
      </li>`).join("");
  }
  if (slipDlg) {
    slipDlg.addEventListener("click", (e) => {
      const b = e.target.closest("[data-step]");
      if (b) setQty(b.dataset.slug, (slip[b.dataset.slug]?.q || 0) + Number(b.dataset.step));
      if (e.target === slipDlg) slipDlg.close();
    });
    $(".slip__clear", slipDlg)?.addEventListener("click", () => { slip = {}; save(); render(); });
    $(".slip__close", slipDlg)?.addEventListener("click", () => slipDlg.close());
    $$("[data-open-slip]").forEach((b) => b.addEventListener("click", () => slipDlg.showModal()));
  }
  const serverDlg = $("#server-view");
  if (serverDlg) {
    $$("[data-open-server]").forEach((b) => b.addEventListener("click", () => {
      $("ol", serverDlg).innerHTML = Object.values(slip).map((l) => `<li><div><span class="cn" lang="zh-Hans">${l.cn || l.en}</span><span class="en">${l.en}</span></div><span class="qty">×${l.q}</span></li>`).join("");
      serverDlg.showModal();
    }));
    $(".server-close", serverDlg)?.addEventListener("click", () => serverDlg.close());
  }

  /* ---------- Dish sheet ---------- */
  const sheet = $("#dish-sheet");
  let current = null, sheetQty = 1;
  const TAGS = { signature: ["Signature", "tag--signature"], spicy: ["Spicy", "tag--spicy"], "high-protein": ["High protein", "tag--protein"], "call-ahead": ["Call a day ahead", "tag--call-ahead"], "house-specialty": ["House specialty", "tag--house"] };
  function openDish(slug, opener) {
    const d = dishes[slug];
    if (!d || !sheet) return;
    current = slug;
    sheetQty = 1;
    const media = $(".sheet__media", sheet);
    media.querySelectorAll("img, .sheet__brush").forEach((n) => n.remove());
    if (d.img) {
      const img = new Image();
      const dir = `${config.base || ""}/assets/img/menu/${d.img}`;
      img.src = `${dir}-1200.webp`;
      img.srcset = `${dir}-640.webp 640w, ${dir}-1200.webp 1200w`;
      img.sizes = "(max-width: 640px) 100vw, 560px";
      img.alt = d.en;
      img.width = 1200; img.height = 930;
      media.prepend(img);
    } else {
      const b = document.createElement("div");
      b.className = "sheet__brush"; b.lang = "zh-Hans"; b.setAttribute("aria-hidden", "true");
      b.textContent = d.cn || d.en;
      media.prepend(b);
    }
    $(".sheet__name", sheet).textContent = d.en;
    $(".sheet__cn", sheet).textContent = d.cn || "";
    $(".sheet__price", sheet).textContent = money(d.price) + (d.options ? "+" : "");
    const desc = $(".sheet__desc", sheet);
    desc.textContent = d.desc || "";
    desc.hidden = !d.desc;
    const meta = [];
    if (d.portion) meta.push(`<span class="tag tag--house">${d.portion}</span>`);
    (d.tags || []).forEach((t) => TAGS[t] && !(t === "high-protein" && d.protein) && meta.push(`<span class="tag ${TAGS[t][1]}">${TAGS[t][0]}</span>`));
    if (d.protein) meta.push(`<span class="tag tag--protein">About ${d.protein} g protein</span>`);
    $(".sheet__meta", sheet).innerHTML = meta.join("");
    $(".sheet__fine", sheet).hidden = !d.options;
    $("output", sheet).textContent = sheetQty;
    sheet.returnFocus = opener;
    sheet.showModal();
  }
  if (sheet) {
    sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.close(); });
    sheet.addEventListener("close", () => sheet.returnFocus?.focus?.());
    $(".sheet__close", sheet).addEventListener("click", () => sheet.close());
    $$(".sheet [data-qty]", sheet).forEach((b) => b.addEventListener("click", () => {
      sheetQty = Math.max(1, Math.min(99, sheetQty + Number(b.dataset.qty)));
      $("output", sheet).textContent = sheetQty;
    }));
    $(".sheet__add", sheet).addEventListener("click", () => {
      setQty(current, (slip[current]?.q || 0) + sheetQty);
      sheet.close();
      bump();
    });
  }
  function bump() {
    if (!fab) return;
    fab.classList.remove("bump"); void fab.offsetWidth; fab.classList.add("bump");
  }
  document.addEventListener("click", (e) => {
    const open = e.target.closest("[data-dish]");
    if (open) { openDish(open.dataset.dish, open); return; }
    const add = e.target.closest("[data-add]");
    if (add) { setQty(add.dataset.add, (slip[add.dataset.add]?.q || 0) + 1); bump(); }
  });
  // Deep link: /menu/#dish-zesty-lamb-skewers opens that dish
  const m = location.hash.match(/^#dish-(.+)$/);
  if (m && dishes[m[1]]) {
    const btn = $(`[data-dish="${m[1]}"]`);
    btn?.scrollIntoView({ block: "center" });
    openDish(m[1], btn);
  }
  render();

  /* ---------- Menu: search + section chips ---------- */
  const search = $("#menu-search");
  if (search) {
    const sections = $$(".menu-section");
    const empty = $(".no-results");
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      let any = false;
      sections.forEach((sec) => {
        let secHit = false;
        $$(".dish, .fav-grid > li", sec).forEach((li) => {
          const hit = !q || li.dataset.search.includes(q);
          li.classList.toggle("is-hidden", !hit);
          secHit ||= hit;
        });
        $$(".dish-group", sec).forEach((g) => g.classList.toggle("is-hidden", !!q && !$$(".dish:not(.is-hidden)", g).length));
        sec.classList.toggle("is-hidden", !secHit);
        any ||= secHit;
      });
      empty?.classList.toggle("is-hidden", any);
    });
    $("#menu-search-form")?.addEventListener("submit", (e) => e.preventDefault());
  }
  const chips = $$(".chips a");
  if (chips.length) {
    const byId = Object.fromEntries(chips.map((c) => [c.hash.slice(1), c]));
    const secs = $$(".menu-section");
    const tools = $(".menu-tools");
    let active = chips.find((c) => c.hasAttribute("aria-current")) || null, ticking = false;
    const spy = () => {
      ticking = false;
      const line = Math.max((tools?.getBoundingClientRect().bottom || 0) + 80, innerHeight * 0.4);
      let cur = secs.find((s) => !s.classList.contains("is-hidden")) || secs[0];
      for (const s of secs) if (!s.classList.contains("is-hidden") && s.getBoundingClientRect().top <= line) cur = s;
      const c = byId[cur.id];
      if (!c || c === active) return;
      active?.removeAttribute("aria-current");
      c.setAttribute("aria-current", "true");
      active = c;
      c.parentElement.scrollTo({ left: c.offsetLeft - c.parentElement.offsetLeft - 16, behavior: "smooth" });
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    addEventListener("load", () => setTimeout(spy, 250)); // the browser's jump to #section can land after this script runs
    spy();
  }

  /* ---------- Gallery lightbox ---------- */
  const lb = $("#lightbox");
  if (lb) {
    const items = $$("[data-lightbox]");
    let i = 0;
    const show = (n) => {
      i = (n + items.length) % items.length;
      const b = items[i];
      const img = $("img", lb);
      img.src = b.dataset.lightbox;
      img.alt = $("img", b).alt;
      $("figcaption", lb).textContent = $("img", b).alt;
    };
    items.forEach((b, n) => b.addEventListener("click", () => { show(n); lb.showModal(); }));
    $(".lb-prev", lb).addEventListener("click", () => show(i - 1));
    $(".lb-next", lb).addEventListener("click", () => show(i + 1));
    $(".sheet__close", lb).addEventListener("click", () => lb.close());
    lb.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") show(i - 1); if (e.key === "ArrowRight") show(i + 1); });
    lb.addEventListener("click", (e) => { if (e.target.classList.contains("lightbox__inner")) lb.close(); });
  }

  /* ---------- Catering inquiry -> email ---------- */
  const form = $("#catering-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const body = [
        `Name: ${f.get("name")}`, `Phone: ${f.get("phone")}`, `Email: ${f.get("email")}`,
        `Event date: ${f.get("date")}`, `Guests: ${f.get("guests")}`, `Type: ${f.get("type")}`, "", f.get("details") || "",
      ].join("\n");
      location.href = `mailto:${config.email}?subject=${encodeURIComponent(`Catering inquiry: ${f.get("type")} for ${f.get("guests")} guests`)}&body=${encodeURIComponent(body)}`;
      $(".form-done", form.parentElement).hidden = false;
    });
  }
})();
