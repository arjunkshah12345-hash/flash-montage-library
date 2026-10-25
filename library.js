// flash-montage library gallery: filter, search, open a sheet with licence + credit, and flash the selection.
document.documentElement.classList.add("js");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);
const ALL = await fetch("data/library.json").then((r) => r.json());
requestAnimationFrame(() => document.documentElement.classList.add("ready"));

const CAT = {
  "shells-fossils": "Shells and fossils", "anatomy-skeleton": "Anatomy", "macro-eyes-skin": "Macro", botanical: "Botanical",
  creatures: "Creatures", "geology-ice": "Geology and ice", cosmos: "Cosmos", "earth-aerial": "Earth from above",
  "machines-engineering": "Machines", "drawings-archive": "Drawings", "studio-objects": "Studio objects",
  "textures-full-bleed": "Textures", procedural: "Generated specimens",
};
const GROUND = { "seamless-light": "Pale", "seamless-dark": "Black", "full-bleed": "Full-bleed" };

// default order: categories interleaved round-robin, shuffled within each (seeded), so no subject repeats in a row
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(7);
const byCat = {};
for (const r of ALL) (byCat[r.c] ||= []).push(r);
for (const k in byCat) { const a = byCat[k]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }
const MIXED = [];
const keys = Object.keys(byCat);
for (let i = 0; MIXED.length < ALL.length; i++) for (const k of keys) if (byCat[k][i]) MIXED.push(byCat[k][i]);

const state = { c: "", g: "", q: "" };
const params = new URLSearchParams(location.hash.slice(1));
state.c = params.get("c") || ""; state.g = params.get("g") || ""; state.q = params.get("q") || "";

// ---------------------------------------------------------------- filters
const counts = ALL.reduce((m, r) => ((m[r.c] = (m[r.c] || 0) + 1), m), {});
const cats = $("cats");
cats.innerHTML = [`<button type="button" data-c="" aria-pressed="true">Everything<span class="n">${ALL.length}</span></button>`]
  .concat(Object.keys(CAT).filter((c) => counts[c]).map((c) => `<button type="button" data-c="${c}" aria-pressed="false">${CAT[c]}<span class="n">${counts[c]}</span></button>`))
  .join("");
function press(group, attr, val) {
  group.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset[attr] === val)));
}
cats.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.c = b.dataset.c; apply(); });
$("grounds").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.g = b.dataset.g; apply(); });
$("q").value = state.q;
let qt;
$("q").addEventListener("input", (e) => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value.trim(); apply(); }, 120); });

// ---------------------------------------------------------------- grid (rendered in pages so 989 tiles never block)
const grid = $("grid");
let list = [], shown = 0;
const PAGE = 120;
function tile(r) {
  const fb = r.g === "full-bleed";
  return `<button class="tile${fb ? " fb" : ""}" type="button" data-i="${r.i}" style="background:${r.bg}"><img src="${r.t}" alt="${esc(r.n)}" loading="lazy" decoding="async" /><span class="cap">${esc(r.n)}</span></button>`;
}
function esc(s) { return String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])); }
function more() {
  const next = list.slice(shown, shown + PAGE);
  grid.insertAdjacentHTML("beforeend", next.map(tile).join(""));
  shown += next.length;
}
const sentinel = document.createElement("div");
grid.after(sentinel);
new IntersectionObserver((es) => { if (es[0].isIntersecting && shown < list.length) more(); }, { rootMargin: "800px" }).observe(sentinel);

function apply() {
  press(cats, "c", state.c); press($("grounds"), "g", state.g);
  const q = state.q.toLowerCase();
  list = MIXED.filter((r) => (!state.c || r.c === state.c) && (!state.g || r.g === state.g) && (!q || r.n.toLowerCase().includes(q) || r.by.toLowerCase().includes(q)));
  grid.innerHTML = ""; shown = 0; more();
  $("count").textContent = `${list.length} ${list.length === 1 ? "image" : "images"}`;
  const h = new URLSearchParams(Object.entries(state).filter(([, v]) => v)).toString();
  history.replaceState(null, "", h ? `#${h}` : location.pathname);
  resetFlash();
}

// ---------------------------------------------------------------- the sheet
const sheet = $("sheet");
grid.addEventListener("click", (e) => { const t = e.target.closest(".tile"); if (t) open(ALL[+t.dataset.i]); });
function open(r) {
  $("sheet-img").src = r.t; $("sheet-img").alt = r.n;
  const full = new Image(); full.onload = () => ($("sheet-img").src = r.f); full.src = r.f;
  $("sheet-imgwrap").style.background = r.g === "full-bleed" ? "#000" : r.bg;
  $("sheet-title").textContent = r.n;
  $("sheet-by").textContent = r.by ? `By ${r.by}` : "Creator unknown";
  $("sheet-lic").textContent = r.l;
  $("sheet-cat").textContent = CAT[r.c] || r.c;
  $("sheet-ground").textContent = GROUND[r.g] || r.g;
  $("sheet-size").textContent = r.w ? `${r.w} × ${r.h}` : "—";
  $("sheet-pal").innerHTML = (r.pal || []).map((c) => `<span style="background:${c}" title="${c}"></span>`).join("");
  $("sheet-dl").href = r.f;
  const src = $("sheet-src");
  if (r.p) { src.href = r.p; src.hidden = false; } else src.hidden = true;
  $("sheet-path").textContent = r.f;
  $("sheet-credit").onclick = (ev) => {
    const text = `“${r.n}”${r.by ? ` by ${r.by}` : ""}, ${r.l}${r.p ? `, ${r.p}` : ""}`;
    navigator.clipboard?.writeText(text).then(() => { ev.target.textContent = "Copied"; setTimeout(() => (ev.target.textContent = "Copy credit"), 1400); });
  };
  sheet.showModal();
}
sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.close(); });

// ---------------------------------------------------------------- the flash: the selection on the measured burst curve
function burstFrames(n, a, b, p) {
  const out = []; let acc = 0, prev = 0;
  for (let i = 0; i < n; i++) { acc += a + (b - a) * Math.pow(i / Math.max(1, n - 1), p); const c = Math.max(prev + 1, Math.round(acc)); out.push(c - prev); prev = c; }
  return out;
}
const fimg = $("flash-img"), fframe = $("flash"), fnow = $("flash-now"), ftoggle = $("flash-toggle");
let playing = !reduce, timer = null, fi = 0, fk = 0, frames = burstFrames(24, 1.5, 8, 2.6);
const pre = new Map();
function preload(r) { if (!pre.has(r.t)) { const im = new Image(); im.src = r.t; pre.set(r.t, im); } }
function label() { return state.c ? CAT[state.c] : state.q ? `“${state.q}”` : "the whole library"; }
function tick() {
  if (!list.length) return;
  const r = list[fi % list.length];
  fimg.src = r.t; fimg.style.objectFit = r.g === "full-bleed" ? "cover" : "contain"; fframe.style.background = r.g === "full-bleed" ? "#000" : r.bg;
  for (let k = 1; k <= 6; k++) preload(list[(fi + k) % list.length]);
  const f = fk < frames.length ? frames[fk] : 30;
  fnow.textContent = fk < frames.length ? `Flashing ${label()}: ${f} ${f === 1 ? "frame" : "frames"}` : `${r.n}`;
  fi++; fk = fk >= frames.length ? 0 : fk + 1;
  if (playing && !document.hidden) timer = setTimeout(tick, (f * 1000) / 30);
}
function resetFlash() { clearTimeout(timer); fi = 0; fk = 0; if (playing) tick(); else if (list.length) { const r = list[0]; fimg.src = r.t; fnow.textContent = r.n; } }
ftoggle.addEventListener("click", () => {
  playing = !playing; ftoggle.setAttribute("aria-pressed", String(!playing)); ftoggle.textContent = playing ? "Pause" : "Play";
  clearTimeout(timer); if (playing) tick();
});
document.addEventListener("visibilitychange", () => { clearTimeout(timer); if (playing && !document.hidden) tick(); });
new IntersectionObserver(([e]) => { clearTimeout(timer); if (e.isIntersecting && playing) tick(); }).observe(fframe);
if (reduce) { ftoggle.textContent = "Play"; ftoggle.setAttribute("aria-pressed", "true"); }

apply();
