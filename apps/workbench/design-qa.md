# Emotion & decisions poster QA

Reference: user-provided 1222 × 1287 infographic. Compared at original size with a 1200 × 1294 browser screenshot of the rendered poster on 2026-09-23.

- Matched the main composition: centered headline and subtitle, two colored System cards plus key idea, two flow lanes, three lower panels, and closing banner.
- Adjusted the poster grid from 12 to 20 columns after screenshot review so the key idea panel had the intended width and the top row no longer stretched vertically.
- Replaced an unavailable network icon font with bundled Phosphor SVG icons; checked the rendered screenshot to confirm icons appear instead of icon names.
- Checked the Mindful poster at 1200 px width. Text stays inside its panels, all eight widgets render, and the footer is visible. Icons are stylistically simpler than the reference artwork, but section hierarchy, colors, spacing, and content remain close.
- Browser validation: the seven existing checks passed in the first full run; the new poster checks passed after correcting their locator and expected icon count. The final production build passed. The app retains the existing zoom, pan, theme, and shape controls.

final result: passed

# AI opportunity poster QA

Reference: user-provided 1222 × 1287 infographic. Compared with a 1200 × 1250 browser screenshot of the editable poster on 2026-09-23.

- Kept the reference's three-stage top row, middle game-making comparison, four-reason strip, and key takeaway panel as separate IR widgets.
- Generated five transparent illustrations for the characters and screens; the surrounding headings, summaries, bullets, captions, and quotes remain editable HTML. The generated artwork follows the reference's visual style but is not an exact replica.
- All six image instances loaded at their local `/assets/` paths in Chromium. The poster and regular grid both support image fields; invalid paths receive field-specific errors and missing files display a fallback.
- The full preexisting browser suite plus the new image tests passed. A phone-width Fit check confirmed no page overflow. The final production build passed.

final result: passed
