---
name: emil-design-eng
description: Philosophy on UI polish, component design, animation decisions, and the invisible details that make software feel great (Linear & Apple style).
metadata:
  origin: emilkowalski/skills
---

# Emil Kowalski Design Engineering Rules

1. **No `transition: all`:** Specify exact properties (`transform`, `opacity`, `background-color`, `border-color`).
2. **Scale from 0.95, not 0:** Things enter from `scale(0.95)` with `opacity: 0`, never `scale(0)`.
3. **Asymmetric Timing:** Fast exits (150ms-180ms ease-out) vs smooth enters (200ms-240ms).
4. **Deliberate Feedback:** Buttons must have tactile active state `:active { transform: scale(0.975); }`.
5. **Obsidian & Hairlines:** Deep dark backgrounds (`#090A0C`), hair-line borders (`rgba(255, 255, 255, 0.08)`), top subtle highlight bevel (`box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08)`).
6. **Tabular Numerals:** Always `tabular-nums` for counters, time codes, and durations.
7. **Staggered Reveals:** 30-50ms delay between list cards.
