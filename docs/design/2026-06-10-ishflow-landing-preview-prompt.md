# ishflow Landing V2 — Adapted Design Prompt

> Working name: **Landing V2** (user-assigned, 2026-06-11).

> Adapted 2026-06-10 from the VALMAX photography landing prompt (qclay.design).
> Original: dark cinematic photography portfolio. Adaptation: same design language,
> SaaS product story. Live implementation: `app/[locale]/design-preview/`.

---

Build a single-page landing inside the existing Next.js 16 App Router app (React 19,
Tailwind v4, framer-motion, lucide-react) that recreates the VALMAX dark cinematic
landing design language for **ishflow** — a metadata-driven business management
platform for Russian-speaking small businesses. Mount it at `/design-preview`
(route group outside `(marketing)` so no nav/footer wraps it). Do not touch global
theme tokens — the page is permanently dark and self-scoped.

## Global setup

- Fonts (next/font, latin + cyrillic subsets): display = **Unbounded** 400/500/700/900
  (`--ishf-display`), body = **Golos Text** 400/500/600 (`--ishf-body`).
- Page base background `oklch(0.06 0.005 260)` (near-black, blue-tinted), text white.
- `MATTE = bg-[oklch(0.15_0.008_250)]` — all sections above MarvelsSection.
- Accent (replaces VALMAX lime): `--ishf-acc: oklch(0.8 0.13 245)` (luminous blue).
  Brand solid: `#0F5EEF`. `::selection` = accent bg + near-black text (scoped `.ishf`).
- `EASE = [0.22, 1, 0.36, 1]`, `INTRO_DELAY = 2.9s`, intro total 3.6s.
- Noise: inline SVG feTurbulence data-URI, opacity 0.12, mix-blend overlay
  (replaces noise.png — zero asset dependency).
- Logo: existing `/logo-dark.svg` (709×172, white wordmark + #0F5EEF accents).
  Fallback if it fails to load: plain text "ishflow" in display font.

## Content mapping (VALMAX → ishflow)

| VALMAX                          | ishflow                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| RALPH EDWARDS hero              | «ВЕСЬ БИЗНЕС / В ПОТОКЕ»                                   |
| 7 floating photo cards          | 7 floating product-UI cards (pure CSS/SVG, no images)      |
| Our photographer (beige card)   | «ПЛАТФОРМА» — beige paper card holding a posted СФ document |
| All types of projects           | «ВСЕ КОНТУРЫ УЧЁТА» — Продажи / Закупки / Склад / Деньги   |
| Mechanical Marvels headline     | «УЧЁТ ▦ БЕЗ РУТИНЫ: ПРОВОДКИ, ОСТАТКИ И ОТЧЁТЫ — САМИ»     |
| Get in touch / lime accent      | «НАЧНИТЕ ВЕСТИ / СОВРЕМЕННЫЙ УЧЁТ.» / blue accent          |
| ig/pin badges                   | module icon chips (lucide: TrendingUp, FileText, Package…) |
| Marker labels (pseudo data)     | pseudo register entries: «001207 сф-проводка (2482к.00)»   |

## Layout (top → bottom)

IntroSequence (fixed z-100) → TopBar (fixed) → Hero (matte) → EngineSection (matte)
→ ModulesSection (matte, star ring) → MarvelsSection (two stacked blocks, parallax)
→ Footer.

### Background layer bindings

| Section             | StarField                                              | LineField variant |
| ------------------- | ------------------------------------------------------ | ----------------- |
| Hero                | count=700                                              | hero              |
| EngineSection       | count=500                                              | engine            |
| ModulesSection      | count=550, ring, ringCount=260, factor=0.37, band=50   | modules           |
| MarvelsSection top  | count=450                                              | marvels           |
| MarvelsSection bot  | —                                                      | marvelsBottom     |

### 1. IntroSequence (3.6s, skipped under prefers-reduced-motion)

Same choreography as VALMAX: matte backdrop fading [1,1,0] @ [0,.82,1]; three
concentric 260n px circles (opacity [0,.55,0], scale [.15,1,1.4], 2.4s, delays
1.22/1.34/1.46); nine SVG rays at 0/30/60/120/150/210/240/300/330°, pathLength
[0,1,1], 2s, delay 1.2+i·0.05. Logo: 64px tall `/logo-dark.svg` (264px wide),
width-clip reveal [24→264px] @ [0,.3,.42,.78,1]; white pulse dot positioned over
the blue «.» period of the wordmark (x≈106, y≈56), growing 8→10→64 then fading.
Flight to TopBar slot done with pure transforms (x/y/scale keyframes computed from
viewport at mount, origin top-left), landing at 24px/24px scale 0.375 @ t=[.82→1].

### 2. TopBar (fixed, pt-6 px-6 md:px-10, z-50)

Logo h-6 (fade in 0.4s @ 3.3s). Right: links «Возможности» «Тарифы» (hidden < md),
ghost «Войти» → /sign-in, white pill «Начать» → /sign-up, Menu button → dropdown
panel (w-64, rounded-2xl, bg oklch(0.12 0.006 250), ring-white/10): rows
Возможности / Тарифы / Блог / Войти, each with ArrowUpRight that lifts on hover;
footer row «Мы на связи» → Telegram.

### 3. Hero (matte, min-h-110vh, pt-32 pb-24)

StarField 700 + LineField hero + noise + central glow (800px, white/4%, blur-3xl).
Pointer parallax via CSS vars --mx/--my (window mousemove, disabled when reduced
motion). h1 «ВЕСЬ БИЗНЕС / В ПОТОКЕ» display-black text-5xl md:text-[96px],
blurIn (INTRO_DELAY-keyed). Subline: «Продажи, закупки, склад и деньги — в одной
системе. ishflow наводит порядок в учёте малого бизнеса: документы проводятся
сами, отчёты сходятся до копейки.»

Seven floating UI cards (sharp corners, ring-white/10, deep shadow, depth-keyed
parallax translate3d, photoIn entrances, inner hover scale-105 @1200ms):

1. KPI «Выручка · июнь / 2 482 000 ₽ / +18%» + sparkline — top-[2%] left-[34%], w-150, 4/3, depth 18, badge TrendingUp.
2. Bar chart «Продажи · 6 мес» — top-[2%] right-[2%], w-260, 16/9, depth 22.
3. Mobile mini-app — top-[7%] left-[4%], w-110, 3/4, depth 28, badge Smartphone.
4. Document «Счёт № СФ-001207 / ПРОВЕДЁН» — top-[10%] right-[12%], w-200, 3/4, depth 26, badge FileText + glowing-dot «Открыть демо» pill overlay.
5. Stock table «Остатки · Склад МСК» — top-[18%] left-[3%], w-220, 3/4, depth 20, badge Package.
6. Cash «Касса · 412 380 ₽» — bottom-[calc(6%-10px)] left-[calc(34%-90px)], w-160, 4/5, depth 24, badge Wallet.
7. AR/AP «Взаиморасчёты» — bottom-[6%] right-[22%], w-230, 16/10, depth 22.

### 4. EngineSection (matte, py-32)

StarField 500 + LineField engine + noise + side glow + faint mono metadata snippet
(defineDocument(…) code block, opacity ~0.07, decorative). Big overlapping heading
«ПЛАТФОРМА». Left: beige `#efeae0` polaroid card (p-4 pb-20, max-w-440) holding a
paper «СЧЁТ-ФАКТУРА № СФ-001207» document mock (lines, totals, rotated blue
«ПРОВЕДЕНО» stamp), caption «ISHFLOW / ENGINE» black display-black. Right: h2
«СОБЕРЁТ УЧЁТ, ДОКУМЕНТЫ И ОТЧЁТЫ ЗА ВАС» + two paragraphs (metadata-driven story:
describe catalogs/documents/registers → platform generates DB, forms, postings,
reports; shared registers → balances reconcile to the kopeck; roles, audit, 5 UI
languages built in).

### 5. ModulesSection (matte, py-32, star ring)

h2 «ВСЕ КОНТУРЫ / УЧЁТА» + intro paragraph + CTA «Смотреть возможности» →
/features. Four staggered cards (md:mt-20/25/10/4, widths 216/220/230/200):
ПРОДАЖИ (doc list mini), ЗАКУПКИ (supplier docs mini, tall 3/4), СКЛАД (stock bars
mini), ДЕНЬГИ (cashflow mini). Caption + pill «открыть модуль» with ArrowUpRight
circle.

### 6. MarvelsSection

Top: StarField 450 + LineField marvels + noise. h2 display-medium md:text-[80px]:
«УЧЁТ [inline blue chip with white sparkline, h-10 md:h-20] БЕЗ РУТИНЫ: ПРОВОДКИ,
ОСТАТКИ И ОТЧЁТЫ — САМИ». Below: «Смотреть тарифы» (arrow ↗) / «Листайте дальше»
(arrow ↓).

Bottom (h-80vh): parallax aurora background (radial blue gradients on
oklch(0.1 0.02 258), useScroll y → -15%) — replaces the photo bg, fallback-safe
by design. LineField marvelsBottom. h3 «НАЧНИТЕ ВЕСТИ / СОВРЕМЕННЫЙ УЧЁТ.»
(second line in accent). White pill «НАЧАТЬ БЕСПЛАТНО» → /sign-up + 18.86px
decorative circle with tiny ArrowUpRight.

### 7. Footer

border-t white/10, text-xs white/40: «© 2026 ishflow — все права защищены» /
«Политика конфиденциальности» → /privacy.

### 8–9. StarField / LineField

Identical algorithms to VALMAX spec (canvas stars with twinkle + Gaussian ring via
Box-Muller + halo; SVG line fields with pathLength draw-in + monospace data
markers), with variants renamed photographer→engine, projects→modules and marker
labels swapped to pseudo register entries (Cyrillic).

### 10. Motion variants

blurIn / photoIn exactly as VALMAX (INTRO_DELAY-keyed for hero; whileInView once,
margin -100px below the fold).

### 11. Accessibility & misc

Decorative elements aria-hidden; prefers-reduced-motion shortens intro to 0.1s and
disables parallax; metadata title «ishflow — весь бизнес в потоке», robots noindex
(preview); strings hardcoded RU for the preview — production rollout must move
them through next-intl (8 locales) per project policy.
