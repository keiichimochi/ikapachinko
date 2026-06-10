# Ikapachinko Implementation Notes

## Current Files

- `index.html`: Main pachinko simulator. Single-file HTML/CSS/Canvas/Vanilla JS implementation.
- `ikapachinko_mod_spec_v2.md`: Future v2.0 feature plan for tentacle tulips, suction windmills, monitor slot UI, and commentary text.

## Major Implemented Changes

### Board And Pin Layout

- Enlarged the central slot display area and separated layout geometry from collision geometry.
- Added:
  - `SLOT_RECT`: visual/layout slot bounds.
  - `SLOT_HIT_RECT`: physical collision bounds for the actual black slot display.
  - `SLOT_SAFE_ZONE`: pin-free padding around `SLOT_HIT_RECT`.
- Reworked pins around the slot:
  - Top staggered splitter pins.
  - Side zig-zag lane pins.
  - Lower V/splitter pins to reduce direct drops into `START`.
  - Additional pins in the removed slot title-strip area.
- Reworked lower tulip entrance pins into wider, more natural guide patterns.
- Added `lowerTulipEntranceWidths()` for checking lower tulip clear widths.

### Slot System

- Converted slot to a 3x3 grid.
- Symbols:
  - `🦑`, `🍺`, `🦀`, `🐙`, `🐠`, `⭐️`, `🌊`
- Multipliers:
  - `🦑 x100`, `🍺 x50`, `🦀 x30`, `🐙 x20`, `🐠 x12`, `⭐️ x8`, `🌊 x5`
- Win lines cover all 8 directions:
  - 3 horizontal
  - 3 vertical
  - 2 diagonal
- Increased win chance from `1/8` to `1/4`.
- On win:
  - Counts per-symbol hits in `symbolHitCounts`.
  - Adds the best winning line multiplier to stock.
  - Displays each symbol's multiplier and hit count in the side odds panel.
  - Animates winning symbols for 3 seconds with a pulsing scale up to about 1.3x.
  - Removed the previous yellow winning cell frame/fill.

### Pockets And Tulips

- Added per-tulip catch counters:
  - Each tulip pocket tracks `catchCount`.
  - The count is rendered inside the tulip as `IN n`.
- Enlarged tulip count text for readability.
- Adjusted multiple tulip-adjacent pins by small increments to reduce clogging and improve entry flow.
- Added random tentacle tulip effects based on `simple_one_tentacle_tulip.html`:
  - Tulip catches have a random chance to spawn 1-3 tentacles.
  - Tentacles grow from the tulip, wave with layered sine motion, and fade out.
  - Tentacle tips can touch nearby live balls and rotate their velocity by 30-90 degrees.
  - `playSound("tentacle_grab")` maps to a small local synthesized sound.

### Side Rails

- Added strong inner-side reflection for the left and right decorative side rail objects.
- New structures/functions:
  - `SIDE_RAIL_BUMPERS`
  - `angleBetween()`
  - `collideSideRailBumpers()`
- Reflection is only applied from the inside of the board so the rails act like stronger inner bumpers rather than changing the outer wall.

### Physics And Stability

- Central slot collision uses `SLOT_HIT_RECT`, not the whole visual slot area.
- Rectangle collision now handles the case where a ball center enters a rectangle, pushing it out through the nearest edge.
- Added small lateral nudges on top-edge slot collisions to avoid shelf-like resting.
- Added a slow/still ball cleanup:
  - Tracks `lastX`, `lastY`, and `still`.
  - Removes balls that barely move for too long.
- Bottom drain threshold was raised slightly to reduce bottom-pocket resting.

### Debugging

- Press `D` to toggle debug geometry.
- Debug overlay shows:
  - `slotSafeZone`
  - `slotHitRect`
  - pin collision radii
  - windmill collision radii
  - live ball collision circles

### Defaults

- Default auto fire is ON.
- Default launch power is 80%.
- Auto button starts visually in ON state.

## Validation Notes

Used local Node-based checks because the in-app browser blocks automated control of the `file://` URL.

Checks run repeatedly during implementation:

- JavaScript parse check with `new Function(script)`.
- Static geometry extraction:
  - Pins in slot safe zone: expected `0`.
  - Windmills in slot safe zone: expected `0`.
  - Closest pin spacing monitored to avoid pin overlap/clogging.
- Headless approximate 1000-shot simulations:
  - Verified no slot overlap in tested configurations.
  - Verified no timeout after still-ball cleanup.

Known caveat:

- The launch path starts from the lower-left rail, so headless route buckets still skew strongly left. Visual/manual tuning may be needed if balanced left/right routing becomes a priority.

## Useful Implementation Patterns

- Keep visible UI rectangles and physical collision rectangles separate when visual ornamentation should not block balls.
- Use computed safety zones for pin placement, then guard `pin()` so accidental unsafe pins are skipped.
- Keep pin layout grouped by purpose:
  - top splitters
  - outer return pins
  - slot side lanes
  - windmill guide pins
  - lower splitters
  - tulip guards
- For pachinko feel, avoid perfect symmetry:
  - Offset matching left/right pins by a few pixels.
  - Use staggered rows rather than clean arcs.
- For animation clarity, animate symbols themselves instead of adding bright frames that obscure the slot result.

## Publishing Notes

- Target GitHub repository: `keiichimochi/ikapachinko`.
- This project is a static site and can be deployed on Vercel without a build command.
- Vercel should serve `index.html` as the root page.
