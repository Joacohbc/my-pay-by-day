---
name: MyPayByDay
colors:
  bg: "#1B1E23"
  surface: "#2A2F38"
  surface-low: "#131619"
  primary: "#D0BCFF"
  secondary: "#CCC2DC"
  tertiary: "#EFB8C8"
  text-main: "#E6E1E5"
  text-muted: "#939094"
  success: "#BBDCC0"
  error: "#F2B8B5"
  info: "#7DD3FC"
typography:
  display:
    fontFamily: "'Work Sans', sans-serif"
  mono:
    fontFamily: "'JetBrains Mono', monospace"
rounded:
  input: 16px
  card: 28px
  pill: 9999px
breakpoints:
  xs: 23.4375rem
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.pill}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.text-main}"
    rounded: "{rounded.pill}"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
  textarea:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.input}"
  searchable-select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.card}"
---

## Brand & Style

This design system embraces a high-contrast, modern dark mode aesthetic designed for personal finance tracking. The brand personality is stealthy, professional, and highly focused, transforming financial data into an easily digestible and sleek visual experience.

The UI relies on a "deep-space" approach: the background is a very dark gray (`#1B1E23`), while interactive elements and surfaces are lifted with slightly lighter shades. The emotional response is intended to be calm, focused, and premium, utilizing distinct pastels for primary actions to draw the eye without overwhelming the user.

## Colors

The color strategy prioritizes low eye strain and high legibility. The dark canvas is complemented by soft, muted pastel accents that provide excellent contrast without being glaringly bright.

- **Primary Canvas:** A deep, almost black background (`#1B1E23`) to minimize glare.
- **Surfaces:** Floating cards and sections use lighter shades like `#2A2F38` to create structural hierarchy.
- **Accents:** The primary brand color is a soft lavender (`#D0BCFF`), which is used for key actions and active states.
- **Text:** High-contrast off-white (`#E6E1E5`) for main content, and a muted gray (`#939094`) for secondary information.

## Typography

The design system utilizes **Work Sans** as the primary display font for its clean, modern, and highly legible geometric characteristics.

- **Hierarchy:** Clear distinction between titles, subtitles, and body text using weight and color (main text vs. muted text).
- **Monospace:** **JetBrains Mono** is reserved for code, numbers, or specialized data points that require tabular alignment or a technical feel.

## Layout & Spacing

The layout follows a fluid, mobile-first model that scales gracefully. Elements are grouped into distinct cards that float within the safe areas of the viewport.

- **Rhythm:** Generous padding around inputs and buttons ensures touch targets are large and accessible.
- **Grouping:** Related financial metrics or form inputs are housed in flex or grid layouts with consistent gaps.
- **Negative Space:** Outer margins and padding are maintained to ensure the interface doesn't feel cramped, even on smaller devices.

## Elevation & Depth

Depth in this design system is achieved through subtle color shifts and borders, rather than heavy shadows.

- **The Stack:**
  - **Level 1 (Base):** Deep dark background (`bg`).
  - **Level 2 (Surface Low):** Slightly lighter shade for inputs and secondary surfaces (`surface-low`).
  - **Level 3 (Surface):** Lighter gray for floating cards and primary containers (`surface`).
- **Edge Definition:** Many surfaces and inputs feature a subtle 1px border (`border-white/5` or `border-white/10`) to provide crisp edges against the dark background.
- **Interactions:** Subtle hover states (`bg-dn-surface` or opacity changes) and an active press scale effect provide tactile feedback without relying on deep shadows.

## Shapes

The shape language is smooth and approachable, heavily utilizing rounded corners to soften the otherwise strict, data-heavy interface.

- **Cards:** Use `28px` (`radius-card`) for standard containers and modals.
- **Action Elements:** Buttons and pills use fully rounded corners `9999px` (`radius-pill`) to create a soft, tactile feel.
- **Inputs:** Form fields and textareas use `16px` (`radius-input`) to maintain a clear boundary while remaining friendly.
- **Icons:** Material Symbols Outlined are used consistently for a clean, line-based iconography that complements the typography.

## Components

### Containers & Surfaces

Standard cards and select dropdowns use the `surface` color with the `card` radius, often accompanied by a subtle white border. This creates a distinct floating layer above the base background.

### Action Elements

Buttons are fully rounded pills. Primary buttons use the lavender accent color, while secondary buttons rely on `surface-low` with a subtle border. Ghost buttons have no background but reveal a surface on hover. All interactive elements use an active press scale for physical feedback.

### Inputs & Forms

Interactive text inputs and textareas use the `surface-low` background with an `input` radius. They feature a soft border that transitions to the primary accent color upon focus, providing clear visual feedback.

### Typography Application

Page headers and titles use the main text color, while labels and secondary information fall back to the muted text color to establish a clear reading order. Error and success states are clearly communicated with designated pastel red and green tones.
