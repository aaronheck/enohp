# Yelnats hero art, round 4: Comic Strip (A4)

The files are `concept-A4.html` and three renders: `concept-A4.png` (390×844), `concept-A4-mid.png` (390×700) and `concept-A4-small.png` (375×560), all @2x. `sheet.png` shows all three side by side.

## The four panels
Each panel holds one idea, with the labels in the owner's wording:

1. **pick a word**: a tomato bean with a cream bubble saying "pickle jar".
2. **say it backwards**: the same bean with a butter bubble holding only a bar waveform: garbled sound, no text.
3. **we rewind** *(so it sounds forwards!)*: butter gibberish, then a big cream ◀◀ button, then a sky pill with a wobbly "pickle jah?".
4. **friends guess** *and the chain continues*: a puzzled bean says "tickle car?", a laughing bean says "nick's cage!", then a dashed "?" bean.

The full version is a 2×2 grid, read in Z order. Butter connector badges go 1 › 2, then ↙ through the centre to 3, then 3 › 4. The compact strip, used when the art box is under 200px tall, is a single left-to-right row: pick / say it backwards / we rewind / friends guess.

## Changes beyond the art
- **Paragraph:** cut to "Telephone, but backwards." as requested.
- **Art box height:** the mock lifts `.home-art`'s `max-height: 340px` cap (`max-height: none`). With the shorter paragraph, the 340px cap left a large empty band above the buttons on tall phones. The box now fills the free space and the square art (viewBox 340×340) sits centred in it. This is a one-line CSS change in production.
- **Compact strip:** the shorter paragraph gives it about 142px instead of 120, so its text is now 10.5–11px.

## Compromises
- **Panel 3's subtitle and panel 4's "and the chain continues"** are set on a second, smaller line under the main label. They don't fit on one line at half width.
- **The compact strip uses the short labels.** Panel 4 there squeezes two beans plus the "?" bean into an 82px-wide panel. It's readable, but tight.
- **The 2 → 3 step is a Z jump**, which the owner allowed. The diagonal ↙ badge in the centre of the grid makes it explicit. The compact strip has no jump.
