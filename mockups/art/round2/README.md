# Yelnats hero art, round 2: art that explains the loop

The brief: teach the loop at a glance, in order, without reading the paragraph:
**a real word → a strange backwards sound → rewound, almost a word → a misheard guess → passed on to "?"**.

## The visual language, shared by all three
- **Cream pill = real English** ("pickle jar", "tickle car?").
- **Butter sound pill = the backwards recording.** It's a bar waveform that swells up and cuts off sharply, which is how reversed speech looks. Butter matches "backwards." in the headline. There's no reversed or mirrored spelling anywhere: reversed audio isn't the word spelled backwards.
- **◀◀ rewind badge** = we flip it.
- **Sky sound pill = the rewound sound**, the exact mirror image of the butter waveform, which the friend hears as almost-English.
- Numbered tokens (from Drift Trail), press-shadowed slabs (from Letter Swap), bean people (from Whisper Line).
- Labels are single words only (say / backwards / rewind / hear / guess).

## Short screens
Each mock has two SVGs in the same flexible `.home-art` box. The box is a size container (`container-type: size`), and `@container (max-height: 200px)` swaps the full art for a compact strip with a `340×120` viewBox. That strip fills the ~327×120 box on a 375×560 phone at almost 1:1, so its text stays about 12px instead of shrinking to 6px. Both SVGs use `preserveAspectRatio="xMidYMid meet"` and are clipped to their viewBox, so nothing can reach the buttons. `-mid.png` (390×700) shows the full art near the switchover point.

## A. Comic Strip
Four numbered panels: **1 say a word** (tomato bean, "pickle jar") → **2 say it backwards** (the same bean, a butter sound bubble, "gibberish!") → **3 we rewind it** (the butter waveform flips across a mirror line and ◀◀ into a sky waveform, with a wobbly "pickle jah?") → **4 friend guesses** (a puzzled sky bean, "tickle car?", → a dashed "?" next player).
- **Why:** it reads like the instructions on a game box. The order can't be misread, and it's the only one where the "you do it with your own mouth" part is obvious.
- **Short screens:** the four panels become one row, each with a one-word title.
- **Motion:** the panels light up in turn. In 3, the bars sweep across the mirror and change colour, and the "pickle jah?" letters jitter. On the Sent screen, show panel 4 with *your* bean passing to the "?".
- **Weakness:** it's the busiest of the three, and it shows one hand-off, not a chain.

## B. Switchback Trail
Drift Trail fixed. A numbered road zig-zags down the box, and **every U-turn is a rewind (◀◀)**: the direction literally reverses. Each leg follows the same pattern: word → butter backwards sound → (U-turn) → sky rewound sound → the next player's guess. So it goes "pickle jar" → "tickle car?" → "nickel bar?" → "?". The first cycle is labelled (say, backwards, rewind, hear, guess). After that the repetition does the teaching.
- **Why:** it's the only one that shows both the mechanic and the drift down a chain of people. The U-turn = rewind metaphor is built into the layout, not added on top.
- **Short screens:** it becomes one straight lane: 1 pickle jar → backwards sound → ◀◀ → rewound sound → tickle car? → "?".
- **Motion:** a token travels the road, and each pill pops in as the token reaches it. The bars in each sound pill animate while the token passes. On the Sent screen, the road ends at your stop and a new dashed leg leads to the "?".
- **Weakness:** it relies on colour (butter vs sky) for "backwards" vs "rewound". The labels on the first cycle cover that.

## C. Round and Round
A loop track around three bean friends: **1 "pickle jar" (say)** → **butter sound (backwards)** → **◀◀ + sky sound (rewind)** → **2 "tickle car?" (guess)** → back to the top, where the guess becomes the next word.
- **Why:** it says "this keeps going" better than anything else. Friends in the middle make it feel like a party game rather than a diagram, and it's the calmest and most iconic of the three.
- **Short screens:** the circle becomes a racetrack lane, with the beans in the infield.
- **Motion:** the loop turns slowly clockwise, so each station passes the top in turn, or a glowing dot runs the track. The beans glance at whichever station is lit. On the Sent screen, the dot stops at "guess" and points to a new bean entering the circle.
- **Weakness:** the starting point is less obvious than in a strip (the "1" does the work), and there's no visible drift across several people.

## Recommendation
**Go with B, Switchback Trail.** It's the one the owner asked for (5's numbered path), now with the backwards step made unmistakable. The rewind sits on every U-turn, so the backwards → rewound → guess transformation repeats down the screen, and the drift of the chain is still visible. Its compact lane is the clearest of the three small versions: one left-to-right sentence.

**Runner-up: C, Round and Round**, if the owner wants something calmer and more like a logo, or a variant for the Sent screen. A is the most literal, and would work better as the first screen of "How to play" than as the home hero.
