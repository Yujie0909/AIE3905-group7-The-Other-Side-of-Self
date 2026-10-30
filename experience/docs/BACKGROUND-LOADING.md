# Background loading fix — 2026-10-30

## Confirmed cause

Chromium DevTools Protocol Network events, Performance traces and screencast frames reproduced a partly painted JPEG during a cold 200 KiB/s, 150 ms visit. The first image was a 492,329-byte baseline JPEG, not a PNG. It was discovered after application startup; its DOM layer was immediately visible while download/decode was still incomplete. Pages 2–7 independently displayed a clean JPEG and masked original PNG artwork. There was no all-seven download at entry and no CSS background tiling defect. On mobile, hiding the SVG with CSS still downloaded its image.

The evidence is in `public/review/background-loading/measurements.json` and `network-evidence.zip`; source probes are `tests/background-network.mjs`, `background-journey.mjs`, `background-readiness.mjs`, and `background-webkit-network.mjs`.

## Implementation

- `scripts/optimize-backgrounds.py` creates same-resolution WebP assets, preserves ICC data, and checks RGB PSNR and an explicitly reported 8×8-block luminance SSIM. PNG artwork uses near-lossless WebP with PSNR ≥49 dB and block SSIM ≥0.9975. Clean plates require ≥43 dB and ≥0.990. No resize, crop, grading, image generation or scene edits. Original references and public/scenes images remain backups.
- Clean Page 05 stays JPEG because high-quality WebP did not meet the size/quality cutoff. Page 06 clean JPEG stays byte-identical: it is also the mirror text luminance source. All large runtime artwork PNGs become WebP. Page 01 original artwork is converted for completeness but is not a runtime dependency because it contains baked-in text.
- Vite fingerprints imported assets. An early HTML preload and the initial static scene use the same hashed Page 01 resource as React. The initial scene remains hidden until `decode()` resolves, then shows without animation. Before readiness, its existing dark scene base remains.
- `backgroundLoading.ts` shares image/decode promises and retains decoded image handles. The current plate and desktop artwork must both decode before becoming visible. Until then, the last complete scenery remains behind the new page; its snapshot contains no user text. Errors keep the fallback instead of exposing partial imagery. Stale completion handlers are cancelled on navigation/resize. Mobile does not mount the hidden artwork SVG.
- Only Page 01 is fetched at entry. After Page 01 is painted and fonts settle, idle time preloads Page 02 at low priority. Save-Data/2G skip this work. Pages 03–07 load on demand. No arbitrary wait, loader animation, transition, service worker or session logic change.
- The existing mirror text, masks/projection, fonts, copy, layout, interactions and cloud data code are unchanged.

## Actual measurements

Three runs per Chromium case, isolated from conversions/other browser tests; production builds on the same local HTTP server, max-age=600. Slow network is CDP 200 KiB/s aggregate and 150 ms latency. Times are navigation-to-first-complete-visible-background medians, not public internet visitor guarantees.

| Measurement | Before | After |
|---|---:|---:|
| Page 01 file bytes | 492,329 | 299,190 (−39.2%) |
| Cold, normal network | 488.3 ms | 442.5 ms |
| Warm revisit | 615.2 ms | 422.9 ms |
| Cold, slow network | 4,472.6 ms | 3,385.4 ms |
| Slow visible while incomplete interval | 2,510.3 ms | 0 ms |
| Background URLs before Page 01 ready | 1 | 1 |
| Full seven-page desktop background bytes | 17,601,333 | 11,120,413 (−36.8%) |
| Full seven-page mobile unique background URLs | 13 | 7 |
| Warm Chromium Page 01 background network bytes | 0 | 0 |

After readiness there may be two additional Page 02 low-priority background requests; these begin after the recorded Page 01 paint mark, not in competition with its initial load. Cold Page 01 transfer including HTTP headers is 492,548→299,409 bytes. Full journey totals count unique resource bodies, not duplicate cached loader handles.

Linux Playwright WebKit was also exercised: single-run cold 787→664 ms, warm 419→721 ms, slow 4,149→3,476 ms. It no longer exposes an incomplete image. These noisier single-run results do **not** show a warm WebKit improvement. WebKit uses a separate server streaming throttle of 200 KiB/s per connection, so its slow numbers are not directly comparable with Chromium. WebKit ResourceTiming did not reliably establish cache hits here; do not interpret its reported transferSize as a verified cache result.

## Validation and visual quality

- Chromium and Playwright WebKit: all seven pages through actual input/navigation, desktop 1920×1080 and mobile 390×844, before and after. No JS errors, no horizontal overflow, no running animations. Mobile now downloads seven plate URLs instead of thirteen plate/artwork URLs.
- A deliberately delayed Page 03 artwork request verifies that both new layers stay hidden and the complete previous scene remains. Once released, both become visible together. Resizing mobile→desktop also waits for the newly required artwork.
- Before/after whole-render comparison across 28 engine/viewport/page pairs: minimum PSNR 45.136 dB and minimum block SSIM 0.993574. Static screenshot review showed no obvious compression blocks or scene/composition changes. This is a high-quality lossy conversion, not a claim of pixel identity. The original Page 06 clean source is byte-identical.
- `npm test` (3 state tests), `npm run build`, the 28-page static regression at 1672/1920/1366/390px, and actual consent-dialog agree/refuse/return/exit checks at 1920/1366/390/320px all pass.
- The gallery contains seven desktop and seven narrow screenshots for each tested engine, plus actual slow-loading filmstrip frames and delayed-layer screenshots.

## Cache and limits

GitHub Pages currently returns `Cache-Control: max-age=600`, ETag and Last-Modified. That is hosting-controlled; this change does not pretend to set one-year immutable headers. Content-hashed URLs reuse the browser cache and change on content updates. Publication preserves old `assets/` hashes so cached HTML and already-open sessions do not break after deployment. Original background backups remain available.

Real macOS Safari and Chrome's branded desktop application are not installed in this Linux environment. Tested browsers are system Chromium and Playwright WebKit, not a claim of real Safari device verification. Existing Google Fonts CSS requests fail certificate trust through the cloud proxy; before/after both used the same existing fallback. No TLS checks were bypassed, and font files/configuration were not changed. Audio microphone hardware was not retested; its code is untouched.

## Commands

```sh
npm test
npm run build
node tests/background-network.mjs # PROBE_LABEL / PROBE_URL select comparable snapshots
node tests/background-journey.mjs
node tests/background-readiness.mjs
STATIC_BASE_URL=http://localhost:5184 node tests/all-static.mjs
STATIC_BASE_URL=http://localhost:5184 node tests/consent-dialog.mjs
```

WebKit probes additionally require a working Playwright WebKit installation. The asset converter requires Python/Pillow/NumPy and cwebp (or FLOW_CWEBP); it is an offline asset tool, not an app runtime dependency.
