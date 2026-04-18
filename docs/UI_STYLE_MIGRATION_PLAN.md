# UI Style Migration Plan

## Goal

Migrate the game from the current clean glass-card style toward a warmer, softer "party gomoku" style without losing the existing product identity.

The target style should feel playful and polished, but not like a copied IP. The visual language should be original and should remain recognizable as Yanyan Gomoku.

## Style Direction

Working name: **Soft Party Gomoku**

Core traits:

- Light blue app background that matches the current product.
- White translucent glass cards with soft blue borders.
- Warm wood/cream board surfaces.
- Deep blue primary actions.
- Gold only for rewards, rank-up, and celebration.
- Rounded toy-like black and white gomoku mascots.
- Small party accents such as stars, confetti, bubbles, and stage glow.
- Clean Chinese text rendered by code, not baked into images.

Avoid:

- Direct Eggy Party characters, logos, UI shapes, or identifiable assets.
- Overly saturated rainbow palettes that clash with the current app.
- Large image-only UI that makes text blurry or hard to localize.
- Dark-heavy settlement screens unless used only for master/rank climax moments.

## Current Product Tokens

The current app already has a strong base:

- Background: `#EDF4FB`
- Primary: `#0B5FA5`
- Secondary: `#1D8FE1`
- CTA green: `#22C55E`
- Card: `#FFFFFF`
- Border: `rgba(11, 95, 165, 0.12)`
- Text primary: `#123B5B`
- Text secondary: `#3A5064`
- Board background: `#F5E6C8`
- Board line: `#8B4513`

These should remain the foundation of the migration.

## Proposed Extended Tokens

Use these as a migration target before editing many components:

```css
:root {
  --party-bg: #edf4fb;
  --party-sky: #d9eaf7;
  --party-primary: #0b5fa5;
  --party-primary-soft: #1d8fe1;
  --party-board: #f5e6c8;
  --party-board-line: #8b4513;
  --party-gold: #d8a84c;
  --party-gold-bright: #f59e0b;
  --party-success: #22c55e;
  --party-danger: #ef4444;
  --party-card: rgba(255, 255, 255, 0.86);
  --party-card-solid: #ffffff;
  --party-border: rgba(11, 95, 165, 0.14);
  --party-shadow: 0 18px 42px rgba(11, 95, 165, 0.14);
  --party-pop-shadow: 0 18px 36px rgba(11, 95, 165, 0.18);
  --party-radius-card: 28px;
  --party-radius-panel: 22px;
  --party-radius-button: 16px;
}
```

## Existing Experimental Assets

Independent preview assets are stored here:

```text
public/settlement/soft-party/
```

Current files:

- `party-victory-bg.svg`
- `party-defeat-bg.svg`
- `party-draw-bg.svg`
- `party-rank-up-bg.svg`
- `party-reward-card.svg`
- `party-master-bg.svg`
- `preview.html`

These assets are **not connected to the app** yet. They are safe to iterate on before deciding whether to integrate them.

## Migration Principles

1. Keep the app usable after every step.
2. Migrate one surface at a time.
3. Preserve current game logic and routing.
4. Do not bake Chinese labels into images.
5. Prefer CSS/SVG/component graphics for UI-critical elements.
6. Use raster or decorative SVG backgrounds only as mood layers.
7. Test every migrated page in APK WebView, not only desktop browser.

## Page Migration Order

### 1. Mode Selection Page

Why first:

- It defines the user's first impression.
- It has low game-logic risk.
- It already uses cards and bottom action buttons.

Tasks:

- Apply party glass cards.
- Add subtle mascot or board accent.
- Keep current mode cards readable.
- Keep bottom CTA clear above the safe area.

Acceptance:

- All modes visible on mobile.
- Player-side choices scroll correctly.
- Start button never overlaps the home indicator.
- UI still feels related to current app.

### 2. Local Game Page

Why second:

- It is the most frequently seen page.
- It contains the board layout and top safe-area issues.

Tasks:

- Update top mode chip.
- Refine board container.
- Keep board size stable.
- Add only subtle party accents around controls.

Acceptance:

- Board is not hidden by status bar.
- Bottom buttons are fully visible.
- Board remains playable at small screen widths.
- No layout shift while timer changes.

### 3. Multiplayer Lobby

Why third:

- It uses forms and server errors.
- It benefits from friendly visual language.

Tasks:

- Restyle lobby card.
- Improve create/join room panels.
- Keep error state clear and not overly playful.
- Keep server URL behavior unchanged.

Acceptance:

- Create room works.
- Join room works.
- Error messages remain readable.
- Top buttons are not blocked by status bar.

### 4. Multiplayer Game Page

Why fourth:

- Highest layout risk.
- Needs safe area, board size, chat, and room status to work together.

Tasks:

- Unify header, board, player badges, control panel.
- Keep mobile board compact enough for bottom UI.
- Style chat drawer with same party-glass language.

Acceptance:

- First move appears for both sides.
- Board is not covered.
- Player badges fit.
- Chat opens and closes safely.
- Room code footer remains visible or scrollable.

### 5. Rank Page

Why fifth:

- It is visually close to settlement/reward work.
- It can introduce rank reward styling.

Tasks:

- Restyle rank header.
- Restyle stats cards.
- Restyle tier grid.
- Add subtle gold treatment to unlocked/current ranks.

Acceptance:

- Rank data updates after matches.
- Tier grid scrolls correctly.
- Top header does not overlap status bar.
- Text remains readable.

### 6. Settlement Overlay

Why sixth:

- It should inherit the new visual language after the core pages are aligned.

Tasks:

- Decide whether to use `soft-party` SVG backgrounds.
- Keep title, stats, buttons rendered in React.
- Support victory, defeat, draw, timeout.
- Keep auto-close countdown reliable.

Acceptance:

- Victory/defeat/draw are visually distinct.
- Text is sharp.
- Buttons are easy to tap.
- Modal fits small screens.

### 7. Rank Promotion Modal

Why seventh:

- It can use the reward and rank-up assets once rank page is aligned.

Tasks:

- Integrate rank-up mood background if approved.
- Keep tier icons dynamic.
- Keep countdown state working.
- Show rewards clearly.

Acceptance:

- Countdown moves every second.
- Rewards are readable.
- Promotion event clears correctly.
- No content clipped on mobile.

### 8. Master Easter Egg

Why last:

- It is special and can be more dramatic.
- It should not define the baseline style for the entire app.

Tasks:

- Use a richer dark-blue/gold treatment.
- Keep close button easy to tap.
- Ensure effects do not harm mobile performance.

Acceptance:

- Close action always works.
- No performance stutter on APK.
- Visual feels premium but still consistent.

## Component Strategy

Create reusable classes/components only after one or two pages prove the direction.

Potential shared pieces:

- `PartyPanel`
- `PartyButton`
- `PartyBadge`
- `PartyMascotStone`
- `PartyRewardCard`
- `PartySettlementFrame`

Do not over-abstract too early. First migrate real pages, then extract repeated patterns.

## Asset Strategy

Recommended:

- Background SVGs for mood.
- Code-rendered text.
- SVG or React icons for medals and stones.
- CSS gradients for cards/buttons.
- Small decorative SVG accents.

Avoid:

- PNG backgrounds with baked UI text.
- Full-screen image UI with fixed text positions.
- Large assets that increase APK size without meaningful benefit.

## APK Mobile Constraints

Must verify on phone after each major page migration:

- Android status bar safe area.
- Navigation/home indicator safe area.
- WebView viewport height.
- Small-screen scroll behavior.
- Board hit targets.
- Button tap reliability.
- Input focus and keyboard behavior.
- PM2/VPS multiplayer API is unaffected.

## Testing Checklist

Before committing each migration step:

```powershell
npm run build
```

When APK-relevant UI changes are made:

```powershell
.\build-apk-versioned.bat
```

Manual checks:

- Open `/mode`.
- Start PVC as black.
- Start PVC as white.
- Finish a match and inspect settlement.
- Open `/rank`.
- Create multiplayer room.
- Join multiplayer room from second device/browser.
- Make the first black move and confirm both sides see it.
- Open chat.
- Resign or finish multiplayer match.

## Rollout Plan

Use small commits:

1. Add migration docs and preview assets.
2. Add design tokens/classes only.
3. Migrate mode page.
4. Migrate local game page.
5. Migrate multiplayer lobby.
6. Migrate multiplayer game.
7. Migrate rank page.
8. Migrate settlement overlays.
9. Final polish and APK pass.

## Current Decision Point

Before touching production UI, choose one of these:

- **Option A:** Continue iterating the independent preview assets until approved.
- **Option B:** Build a standalone route or static preview page that mocks all future screens.
- **Option C:** Start migrating `/mode` first using the new style.

Recommended next step: **Option B**. A full screen mock preview will make it easier to judge consistency before changing the live app.
