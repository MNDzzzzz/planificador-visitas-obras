---
name: make-interfaces-feel-better
description: Concrete design-engineering details that compound into polished interfaces — concentric radius, optical alignment, layered shadows, tabular numbers, hit areas.
metadata:
  origin: ECC / linus707
---

# Make Interfaces Feel Better

Integración con Apple Design:
- **Radio Concéntrico:** `outer radius = inner radius + padding`.
- **Números Tabulares:** `tabular-nums` en relojes, horas y márgenes de minutos.
- **Microinteracciones Táctiles:** Botones con `:active { transform: scale(0.98); }`.
- **Hit Areas:** Controles interactivos con tamaño mínimo de 44x44px.
- **Alcance de Transiciones:** Transiciones con propiedades explícitas (`transform`, `opacity`, `background-color`), nunca `transition: all`.
