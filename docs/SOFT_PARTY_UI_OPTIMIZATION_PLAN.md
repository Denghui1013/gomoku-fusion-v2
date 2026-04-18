# Soft Party UI Optimization Plan

## Purpose

This plan optimizes the current `public/settlement/soft-party/app-preview.html` direction after visual review.

The current preview is friendly, polished, and approachable, but it reads more like a soft casual party app than a board strategy game. The goal is to keep its warmth while making the product feel more like a mobile gomoku game: clearer board focus, stronger strategic atmosphere, better mobile first density, and more durable UI assets.

## Current Assessment

### What Works

- The soft blue and white visual system feels clean and friendly.
- Cards, buttons, and mode selections have a clear hierarchy.
- The style is approachable for casual players and family use.
- The preview already has a consistent direction across mode selection, game board, lobby, rank, and settlement surfaces.
- The light glass card style fits the existing product tokens better than a full dark or neon gaming style.

### Main Problems

- The board is not dominant enough on the actual game screen.
- The visual language is cute, but not strategic enough for a board game.
- Mobile first density needs improvement: the top title and style chips take too much early vertical space.
- Some structural symbols are emoji-like, which may render inconsistently across platforms.
- The settlement and reward moments are pleasant, but could feel more earned and game-specific.
- The current board surface looks warm, but the surrounding UI competes with it.

## Target Direction

Working direction: **Soft Strategy Gomoku**

The new direction should feel:

- Friendly, not childish.
- Calm, not flat.
- Tactile, not heavy 3D.
- Strategic, not arcade.
- Mobile first, not desktop preview first.
- Rewarding, but not noisy.

Keep:

- Soft blue app atmosphere.
- Cream or wood board surface.
- Rounded cards and generous spacing.
- Gold for reward and rank moments.
- Clean Chinese UI text rendered by code.

Strengthen:

- Board as the visual center.
- Turn state and threat state clarity.
- Stone placement feedback.
- Endgame celebration tied to board outcome.
- Touch target size and safe area behavior.

Reduce:

- Decorative floating accents on gameplay screens.
- Oversized page title in mobile preview.
- Emoji or platform-dependent icons.
- Excessive glass-card competition around the board.

## Design Tokens

### Keep Existing Base

```css
--party-bg: #edf4fb;
--party-primary: #0b5fa5;
--party-primary-soft: #1d8fe1;
--party-board: #f5e6c8;
--party-board-line: #8b4513;
--party-card: rgba(255, 255, 255, 0.86);
--party-border: rgba(11, 95, 165, 0.14);
--party-gold: #d8a84c;
--party-success: #22c55e;
--party-danger: #ef4444;
```

### Add Strategy Layer Tokens

```css
--strategy-felt: #167247;
--strategy-felt-deep: #0d5738;
--strategy-mint: #a8e6bf;
--strategy-ink: #123b5b;
--strategy-warning: #d97706;
--strategy-threat: #e95f46;
--strategy-board-shadow: 0 20px 42px rgba(20, 71, 45, 0.18);
--strategy-card-shadow: 0 12px 28px rgba(11, 95, 165, 0.1);
```

Use the soft party palette for menu, lobby, rank, and settlement. Use the strategy layer mainly for the active game screen.

## Page-Level Plan

## 1. Mode Selection

### Goal

Make the entry screen feel lighter and faster on mobile while preserving the soft party identity.

### Changes

- Compress the top title area on mobile.
- Keep one clear primary CTA visible earlier.
- Replace emoji-like mode icons with SVG or Lucide-style icons.
- Keep mode cards large enough for touch, but reduce excessive vertical padding.
- Move preview-only style chips out of production UI.

### Acceptance Criteria

- On 390px width, at least the first two mode cards and the settings panel title are visible without excessive scrolling.
- All mode cards have at least 44px touch target height.
- No structural emoji icons remain.
- Selected mode state is clear without relying only on color.

## 2. Game Board Screen

### Goal

Make the board the strongest visual element.

### Changes

- Increase board size by 15-25% where viewport allows.
- Reduce the weight of the control panel below the board.
- Move decorative accents away from the active board area.
- Use a calmer HUD: player chips, timer, current turn.
- Add a subtle current move ring and threat highlight.
- Keep board lines high contrast enough on mobile.

### Acceptance Criteria

- Board occupies the largest area on the screen.
- Current player, timer, and last move are identifiable within one glance.
- Touch intersections remain easy to hit.
- Game controls do not visually overpower the board.
- Reduced motion mode still communicates last move and win state.

## 3. Lobby / Multiplayer

### Goal

Keep lobby simple and reassuring.

### Changes

- Preserve the current card layout, but make room actions more distinct.
- Use a room code display pattern that is easy to copy/share.
- Add waiting state and opponent joined state styles.
- Use clear recovery actions for network errors.

### Acceptance Criteria

- Primary action is obvious: create room or join room.
- Room code is readable and copyable.
- Loading/waiting state does not look broken or empty.
- Error state includes a retry path.

## 4. Rank Screen

### Goal

Make ranking feel earned without turning the app into a noisy reward UI.

### Changes

- Keep the medal motif, but replace emoji medals with SVG or component graphics.
- Make progress to next tier clearer.
- Use gold sparingly for rank achievement, not routine UI.
- Keep stat cards compact on mobile.

### Acceptance Criteria

- Current rank and next milestone are visible without explanation.
- Gold is reserved for rank/reward states.
- Rank cards remain legible in both light and dark OS modes if supported.

## 5. Settlement Screens

### Goal

Make victory, defeat, draw, and rank-up feel connected to the board outcome.

### Changes

- Use a small board fragment or winning line motif in each settlement background.
- Keep animated celebration short and interruptible.
- Show game-specific stats: move count, time, side, win pattern, rating.
- Make "再来一局" the primary action.
- Make "返回选择" visually secondary.

### Acceptance Criteria

- Outcome is readable in under one second.
- Primary next action is obvious.
- Celebration does not hide important result text.
- No result text is baked into images.

## Component Rules

### Icons

- Use SVG or icon library components for structural icons.
- Do not use emoji for mode, rank, trophy, settings, or multiplayer icons.
- Keep icon stroke width consistent.

### Cards

- Cards may stay rounded and soft, but avoid nested cards inside nested cards.
- Gameplay screen cards should be lighter than menu cards.
- Avoid making the board look like an embedded preview.

### Buttons

- Minimum height: 44px.
- Primary action: filled blue or strategy green depending on screen.
- Destructive action: coral/red, separated from primary.
- Press feedback: scale 0.96-0.98 or opacity change.

### Motion

- Use motion for meaning only:
  - stone drop
  - last move ring
  - win line draw
  - modal enter
  - rank-up celebration
- Keep micro-interactions around 120-240ms.
- Respect `prefers-reduced-motion`.

## Implementation Phases

### Phase 1: Preview Refinement

Scope:

- Update `public/settlement/soft-party/app-preview.html`.
- Remove emoji-like icons from preview.
- Create one stronger active game screen variation.
- Tighten mobile layout density.

Deliverables:

- Updated standalone preview.
- Desktop screenshot.
- 390px mobile screenshot.

### Phase 2: Token Extraction

Scope:

- Move final visual decisions into tokens.
- Add strategy layer tokens to `src/styles/tokens.css`.
- Avoid hardcoded color drift across components.

Deliverables:

- Token update.
- Short token usage notes.

### Phase 3: Low-Risk Page Migration

Scope:

- Migrate mode selection first.
- Then lobby/multiplayer shell.
- Keep game logic unchanged.

Deliverables:

- Updated mode page.
- Updated lobby page.
- Visual QA screenshots.

### Phase 4: Gameplay Migration

Scope:

- Update board container and game HUD.
- Preserve board coordinates and game interaction logic.
- Add/adjust last move and win line feedback.

Deliverables:

- Updated game screen.
- Keyboard/touch accessibility check.
- Mobile viewport screenshots.

### Phase 5: Settlement Integration

Scope:

- Integrate victory/defeat/draw/rank-up visual system.
- Keep text rendered by React, not embedded in image assets.
- Validate all outcomes.

Deliverables:

- Updated settlement components.
- Outcome screenshots.
- Reduced-motion verification.

## QA Checklist

- 390px mobile viewport works without horizontal scroll.
- 844px mobile height can reach primary actions comfortably.
- All touch targets are at least 44px high/wide.
- Board remains the visual center on gameplay screen.
- Text contrast meets 4.5:1 for primary text.
- Icon-only controls have labels.
- Motion respects reduced-motion preference.
- No emoji used as structural icons.
- No Chinese UI text baked into images.
- Current game logic and routes remain unchanged unless explicitly scoped.

## Recommendation

Do not discard the current soft party direction. It has a strong approachable base.

Refine it by making gameplay more strategic and board-centered. Treat "soft party" as the emotional layer for menu, lobby, rank, and settlement, while the active board screen gets a stronger "soft strategy" layer with better contrast, clearer state, and less decoration.
