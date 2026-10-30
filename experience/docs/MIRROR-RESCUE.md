# Page 06 mirror rescue — complete text before optical treatment

## Reproduced failures

The previous component had two different renderers. Desktop put a fixed 266×166 HTML plane inside an SVG `foreignObject`, transformed it with CSS `matrix3d`, sampled a full-scene luminance mask, and nested that inside two `overflow:hidden` viewports. WebKit screenshots at 1440×900 actually cut the third line's ending off. Its DOM Range reported the end inside the outer viewport (approximately x=1358 versus viewport right=1398), so a DOM rectangle alone was a false assurance. Removing just the outer overflow did not repair the whole nested SVG/HTML/3D paint path. This is an observed Linux WebKit failure; it is not a claim of a tested macOS Safari version.

For narrow aspect ratios, the component instead displayed a separate viewport-positioned caption. At 390×844 the background's 65% cover crop put the actual glass outside the screen; the fallback text was on the mountains. At 768×1024 its transformed fallback bounds reached x≈768.29 beyond a 768px stage. Its positioning did not follow the cover camera.

Original Page 06 reference/artwork pixels contain older mirror writing (including a different first sentence). The existing `page06-reference-clean.jpg` / fingerprinted `page06-clean-*.jpg` has clean glass. The runtime artwork repair already replaces the old-letter region with that clean plate. Hiding the new caption and inspecting the glass confirms there is no remaining old text. No image erasure, new background generation, opaque cover patch, resizing or asset re-encoding was needed; all source backgrounds are unchanged.

## Implementation

Application files:

- `src/pages/MirrorInscription.tsx`: replace both renderers with one editable SVG text group. Exact three lines remain exported in `mirrorLines`. No `foreignObject`, CSS 3D transform, nested clip window, reflection mask, background image sampler, line-clamp or ellipsis. Each glyph is a tspan so tests can check actual painting without changing glyph advances.
- `src/pages/mirror-inscription.css`: transparent host; no background card, blur, shadow or backdrop filter. Blend only the small glyph group, not a full-page layer. Keep the existing decode-readiness gate effective for the SVG descendants. Only Page 06 narrow/small layouts change the existing photo's cover alignment to 93% 50%; this is necessary to show the physical mirror and does not modify the photo pixels or UI layout.
- `src/pages/mirror-layout.ts`: read the actual current background image box and computed object-position; calculate source-to-stage cover scale and offsets. Use ResizeObserver, image load and font completion events, with cleanup. Resolve the current stage's direct image rather than its temporary previous-scene fallback. The fallback artwork itself reads its own fallback image. There is no frame loop.
- `src/pages/ReferenceArtwork.tsx`: Page-06-only camera alignment keeps its original-art layer aligned with the clean plate after the necessary narrow crop. Other pages retain the same renderer and pixels. Centered desktop backgrounds keep their original rendering path, avoiding unrelated raster resampling.

Measured quiet glass area in the 1672×941 source is x=1280–1530, y=180–475, inside the gold seam/right jamb and above foliage/stairs. The layout intersects that area with screen margins, measures the real SVG font/glyph geometry, fits the longest line, and keeps mobile text below the unchanged body copy and above the unchanged voice controls. The 18-source-pixel font is 14.3% smaller than the old 21px source font; image scaling follows the background camera. Text is not shrunk by CSS `scale()`.

A mild SVG baseline shear of −0.06 follows the quiet glass direction without horizontal compression or perspective distortion. Native glyph shapes remain clear. A warm stone/graphite fill varies only within glyphs; multiply blends those glyphs with the actual glass/light underneath. Normal, multiply and soft-light were screenshot-tested. Multiply preserves readable text on both the light desktop glass and the existing dimmer mobile scene. Soft-light was rejected because it loses contrast. No new reflection texture or luminance filter is introduced, and no glyph fades to zero opacity.

## Actual verification

`tests/mirror-rescue.mjs` navigates the real flow to Page 06, waits for both the target page and decoded background, and captures full pages and glass crops. It verifies exact text, all 26 character extents inside the safe glass area, all 26 actually painting via per-character screenshot differences (hide one glyph without changing its advance, compare pixels, restore), and the final commas/full stop. Checks run in Chromium and Linux Playwright WebKit.

Required viewports: 1440×900, 1280×720, 390×844. Also checked 1920×1080, 768×1024, landscape 844×390 and small phone 320×568. Full-page/landscape inspections start at the top of Page 06; normal document scrolling can naturally take content out of view. No navigation scroll behavior was changed.

`tests/mirror-optics.mjs` produces actual 2×-DPR closeups for normal/multiply/soft-light and a caption-hidden glass audit. No auxiliary safe-area outlines are included on the published page.

`tests/mirror-readiness.mjs` deliberately holds the Page 06 image request: the previous complete scenery remains, and the inscription stays hidden until the actual scene is decoded. Settled 1.5-second Performance traces at desktop/mobile report zero Paint events, zero running animations and no filter/image/foreignObject inside the inscription.

Protection checks: Pages 01–05 and 07 are pixel-identical at 1920 and 390 widths. Page 06 title/body/voice/input/skip/exit/axis text, font and stage-relative rectangles match the pre-change captures. Existing sharing consent/return/refuse/agree tests pass at 1920/1366/390/320px; Page 02 and 04 glass styles remain identical. The consent test now expects a single mirror text copy instead of the former duplicate desktop/fallback DOM text; all other fixture assertions remain intact. App/session, speech, cloud data, upload and navigation code were not changed.

Build: `npm test`, `npm run build`. Baseline and final results are under `artifacts/mirror-rescue/`; public screenshots, glyph-check results and diagnostics are under `public/review/mirror-rescue/`.

## Limits

No actual macOS Safari/device microphone was available. Chromium's external Google Fonts CSS requests are blocked by this cloud proxy's certificate trust, so Chromium screenshots use the existing fallback; font configuration was not changed and TLS was not bypassed. The requested licensed Jing Xiaopeng font file is still absent; no substitute font or unauthorized download was introduced. Real AI/backend services and microphone hardware were not retested; their code is unchanged.
