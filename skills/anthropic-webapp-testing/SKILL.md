---
name: anthropic-webapp-testing
description: Metodología de pruebas para aplicaciones web interactivas (reconnaissance-then-action, validación de flujos de usuario, estados de carga y errores).
license: Apache 2.0 (Anthropic)
metadata:
  origin: anthropics/skills
---

# Web Application Testing (Anthropic Patterns)

## Principios de Verificación
1. **Reconnaissance-then-action:**
   - Inspeccionar los estados del DOM renderizado antes de interactuar.
   - Verificar la presencia de controles interactivos con roles accesibles (`role="button"`, `role="dialog"`, `aria-label`).
2. **Validación de Flujos Críticos:**
   - Flujo 1: Filtrado reactivo en cliente (cambio de técnico y fecha actualiza la lista al instante).
   - Flujo 2: Programación con validación fallida (muestra el banner de alerta con la regla exacta).
   - Flujo 3: Programación exitosa (persiste en la lista, reordena cronológicamente y cierra el modal).
   - Flujo 4: Cancelación en un clic con confirmación visual (el estado pasa a 'Cancelada' en gris, y el horario queda liberado para una nueva reserva en esa franja).
