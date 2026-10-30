# Typography background continuity repair

## Diagnosis

Title DOM nodes are direct children of the scenery stage. All seven titles and the 18 actual `.voices-static-cloud button` nodes already computed to transparent backgrounds, no background image, no box-shadow and no backdrop-filter. They were not glass cards. Page 01 uses only its clean plate, without an artwork repair mask; its three viewport screenshots are byte-identical before/after this change. No artificial title override was added there.

On desktop Pages 02–07, `ReferenceArtwork.tsx` places the original, text-bearing artwork over the existing clean plate. Rectangular cutouts remove baked old text. The stage's existing full-scene shade was between the clean plate and the original artwork, so exposed repairs were graded differently. The two existing sources also have local texture/illumination differences. These compositing windows produced the apparent title boxes and the 18 apparent cloud labels. Hiding all HTML titles/cloud words in browser screenshots still showed the rectangles, confirming their scenery-layer origin.

Relevant source-image coordinates are the second repair box on each page: Page 02 `(65,130,735,175)`, 03 `(65,130,540,195)`, 04 `(60,130,650,195)`, 05 `(65,130,690,230)`, 06 `(50,130,535,255)`, 07 `(65,145,550,335)`. Page 02 also has a separate body-text repair `(65,315,580,95)`, which uses the same continuous blend. Page 07's remaining 18 repair boxes are listed in `ReferenceArtwork.tsx`. All coordinates refer to the existing 1672×941 artwork coordinate system. The background files themselves were not rewritten, recolored, cropped or regenerated.

## Changes

- Move the **existing, viewport-wide** shade above both scenery sources while keeping it below foreground text and controls. This removes the source-specific brightness grading. It does not introduce a new title gradient, a rectangle behind the heading, or an additional visual layer.
- Use a continuous 64-source-pixel alpha feather around only the title/body text repair and Page 07 cloud-word repairs. The core remains fully cut out so original baked text cannot ghost through. Four straight edge gradients and four radial corners blend existing scenery pixels at the repair boundaries. The gradients are mask opacity, not colored overlays. They do not blur text or artwork.
- Keep the existing small mask filter/cutouts for other controls and the mirror unchanged. The final typography masks require no new Gaussian blur/filter or background image request. A wider-blur trial was rejected before delivery.
- Match the previous-scene fallback's shade ordering so pending background decoding uses the same composition as the ready stage.
- Scope explicit transparency and removal of box/backdrop effects to actual cloud buttons only. Replace the old 18px/12px word glow with a restrained 1px-down/2px-blur glyph shadow. Selection color, typography hierarchy, click targets and layout remain intact.

Exact application source files modified:

1. `src/pages/ReferenceArtwork.tsx`
2. `src/pages/static-pages.css`
3. `src/pages/background-readiness.css`

No changes to App/session state, AI/mock-generation logic, speech, cloud data arrays, font loading, title/body copy, navigation, modal components/styles, mirror projection/material, source backgrounds or optimized background URLs.

## Validation

- `tests/typography-continuity.mjs`: actual seven-page flow, Chromium and Linux Playwright WebKit, at 1920×1080, 1366×768 and 390×844 (42 page/engine/viewport captures). Title/cloud elements are transparent without box-shadow/backdrop-filter. Each Page 07 run clicks and cancels a keyword. Capture both normal pages and backgrounds with only HTML titles/copy/cloud temporarily hidden for inspection. The hidden-text style is removed immediately; it is not included in the app.
- `tests/typography-preservation.mjs` asserts the expected title for each numbered page before accepting comparison results. Compare Chromium before/after: every title's text, font, font size, font weight, position, bounds, color and opacity are identical at all three widths. All 18 cloud words retain these same values and ordering. Page 01 screenshots are byte-identical. The 1920 Page 06 mirror crop `(1460,240)–(1740,430)` has 0 changed pixels; its source and mask/projection code are untouched.
- Manual screenshot inspection: all seven desktop titles, Page 07 cloud, and narrow screenshots; repaired sky/mist has no apparent straight rectangular patch boundaries. Before/after background-only crops are published so source blending can be assessed independently of typography. Natural architectural edges and varying scene brightness are retained; uniform background brightness is not a goal.
- `tests/consent-dialog.mjs`: actual Page 02 clarification, Page 04 habits dialog, and sharing consent (actually on Page 06 before the Page 07 cloud), at 1920/1366/390/320px. Existing glass panel measurements for 02/04 and other Page 06 UI remain identical. Confirm, reject, return editing, empty input, no implicit consent, keyword selection, exit/reset all pass; no write/upload request was introduced.
- `tests/typography-performance.mjs`: settled cloud, 1.5 seconds CDP Performance trace: 0 Paint events, 0 active animations, 0 Canvas, one original artwork layer, no mask blur above the previous 4px level, and no title/cloud backdrop filters.
- Existing delayed-background-layer/resize readiness check passes. Cold/warm/slow Chromium loading probe still shows 0 incomplete-visible intervals. The warm run transfers 0 image network bytes; initial Page 01 is still one 299,190-byte WebP, and only idle Page 02 preloads afterward. No Page 03–07 images are requested on entry.
- The existing 28-page static regression across 1672/1920/1366/390px also passes, including dream adjustment/regeneration, habits, static player, reflection/share, cloud selection and reset.
- `npm test` and `npm run build` pass. Source background files and hashes are unchanged.

Screenshots and raw results are in `artifacts/typography-continuity/`; published previews, requested full PNGs and cloud crop are in `public/review/typography-continuity/`.

## Limits

Linux Playwright WebKit is not real macOS Safari. Local Chromium cannot trust the cloud proxy's certificate for existing external Google Fonts CSS, so its before/after screenshots use the same existing fallback; font configuration is unchanged. No TLS bypass is used. Real microphone hardware, recognition accuracy and live AI/backend services were not revalidated; their implementation was not changed. This repair cannot make the requested licensed Jing Xiaopeng font available; the prior missing-file/licence limitation remains.
