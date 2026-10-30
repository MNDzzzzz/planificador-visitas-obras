---
name: skill-scout
description: Search existing local, marketplace, GitHub, and web skill sources before creating a new skill. Use when the user wants to create, build, fork, or find a skill for a workflow.
metadata:
  origin: ECC / affaan-m
---

# Skill Scout & Installer

Use this skill to discover, evaluate, vet, and install skills and agents from local and remote repositories (e.g. affaan-m/ECC, Smithery MCP, GitHub).

## Capacidades y Comandos
1. Búsqueda en GitHub:
   - `gh search repos "claude code skill <término>" --sort stars`
   - `gh search code "filename:SKILL.md <término>"`
2. Inspección sin clonar todo:
   - `gh api -H "Accept: application/vnd.github.raw" repos/<owner>/<repo>/contents/<path-to-skill>`
3. Instalación segura:
   - Descargar en `./skills/<nueva-skill>/SKILL.md`.
   - Validar ausencia de código malicioso o comandos destructivos.
4. Registro:
   - Notificar al Agente Director de la nueva skill disponible.
