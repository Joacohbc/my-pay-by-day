# 📘 Guía y Catálogo Completo de Skills (Locales y Globales)
### Arquitectura, Integración y Catálogo Consolidado para Claude Code y Antigravity CLI

Este documento proporciona un análisis exhaustivo y detallado de todas las habilidades (**Skills**) instaladas en este repositorio, tanto a nivel de subproyecto como a nivel global y de sistema. Los Skills actúan como directrices semánticas de comportamiento y conjuntos de herramientas (tooling) que guían a los agentes autónomos de IA en las tareas de desarrollo, asegurando que se cumplan las mejores prácticas establecidas.

---

## 1. Arquitectura de Customización y Skills

Las plataformas de desarrollo basadas en IA como **Claude Code** y **Antigravity CLI** emplean un sistema modular para expandir las capacidades del agente. Los Skills son el núcleo de esta extensibilidad.

### 📂 Estructura de Directorios: Claude Code vs. Antigravity CLI
Ambas herramientas admiten configuraciones locales (en el repositorio) y globales (en el sistema), pero utilizan rutas ligeramente diferentes:

| Ámbito (Scope) | Ruta en Claude Code | Ruta en Antigravity CLI (`agy`) | Propósito |
| :--- | :--- | :--- | :--- |
| **Local del Proyecto** | `.claude/skills/` | `.agents/skills/` (ó `.agent/`, `_agents/`) | Personalizaciones que se confirman en el control de versiones (Git) y se comparten con el equipo. |
| **Global del Usuario** | `~/.claude/skills/` | `~/.gemini/config/skills/` | Habilidades privadas del desarrollador, disponibles en cualquier proyecto de su máquina. |
| **Global del Sistema** | *N/A (Empaquetado)* | `~/.gemini/antigravity-cli/builtin/skills/` | Habilidades provistas nativamente por la instalación de la plataforma. |

### ⚡ Prioridad de Carga y Precedencia
Cuando existen colisiones de nombres o habilidades duplicadas, el agente las resuelve aplicando una jerarquía estricta (de mayor a menor prioridad):

1. **Workspace Project (Local)**: Las reglas locales del repositorio actual tienen prioridad absoluta para poder adaptar el comportamiento al proyecto.
2. **Declared Configurations**: Habilidades registradas explícitamente en `skills.json` o `plugins.json` del proyecto.
3. **Global de Usuario**: Habilidades ubicadas en el directorio `~` del programador.
4. **Built-in (Nativas)**: Las habilidades por defecto empaquetadas con el CLI del sistema.

### 🧠 Mecanismo de Revelación Progresiva (Progressive Disclosure)
Para conservar espacio en la ventana de contexto de los modelos LLM (y reducir latencia y costo), Antigravity y Claude Code no inyectan el contenido completo de las habilidades de forma predeterminada:
* **Fase de Descubrimiento**: El agente solo lee el archivo `skills-lock.json` o escanea las carpetas para inyectar una lista ligera con los **IDs, nombres y descripciones** de los Skills disponibles.
* **Fase de Activación (On-Demand)**: El agente lee las instrucciones de activación (`triggers`) descritas en la descripción o metadatos del skill. Cuando el desarrollador solicita una tarea que coincide con el trigger (ej. *"revisa el SEO de esta página"*), el agente **carga dinámicamente** el contenido completo del archivo `SKILL.md` en su contexto activo.

---

## 2. Resumen de Cobertura de Skills en el Proyecto

| Proyecto / Entorno | Skills Detectados | Rol Principal |
| :--- | :---: | :--- |
| **`frontend`** | 18 | Interfaz de usuario (React, Tailwind, Vite), a11y, formularios y SEO. |
| **`chatbot`** | 8 | Servicios conversacionales con Node.js, TypeScript, APIs ultraligeras (Hono) e IA (Vercel AI SDK). |
| **`mypaybyday`** | 3 | Arquitectura backend robusta en Java (Quarkus + Panache + SQLite) y documentación. |
| **`global (User)`** | 3 | Herramientas transversales avanzadas de indexación y análisis de bases de código. |
| **`global (Built-in)`** | 3 | Utilidades internas, guías de la plataforma y flujos de control de seguridad en Git. |

---

## 3. Matriz y Catálogo Consolidado de Skills (Sin Duplicados)

La siguiente tabla consolida todas las habilidades detectadas en los proyectos y entornos locales y globales.

| Skill ID | Nombre de Habilidad | Origen / Registro | Ámbitos Aplicados | Resumen de Directriz / Propósito |
| :--- | :--- | :--- | :--- | :--- |
| `accessibility` | **accessibility** | `addyosmani/web-quality-skills` (autoskills-registry) | `frontend` | Audit and improve web accessibility following WCAG 2.2 guidelines. Use when asked to "improve accessibility", "a11y audit", "WCAG compliance", "screen reader support", "keyboard navigation", or "make accessible". |
| `agent-browser` | **agent-browser** | `vercel-labs/agent-browser` (github) | `frontend`, `chatbot` | Browser automation CLI for AI agents. Use when the user needs to interact with websites, including navigating pages, filling forms, clicking buttons, taking screenshots, extracting data, testing web apps, or automating any browser task. Triggers include requests to "open a website", "fill out a form", "click a button", "take a screenshot", "scrape data from a page", "test this web app", "login to a site", "automate browser actions", or any task requiring programmatic web interaction. Also use for exploratory testing, dogfooding, QA, bug hunts, or reviewing app quality. Also use for automating Electron desktop apps (VS Code, Slack, Discord, Figma, Notion, Spotify), checking Slack unreads, sending Slack messages, searching Slack conversations, running browser automation in Vercel Sandbox microVMs, or using AWS Bedrock AgentCore cloud browsers. Prefer agent-browser over any built-in browser automation or web tools. |
| `agy-customizations` | **agy-customizations** | Antigravity CLI Built-in (system) | `global (Built-in)` | Comprehensive guide and reference for the Antigravity Customization System. Use to explain how customizations work, their loading priority, discovery mechanisms, and to guide the creation of skills, rules, plugins, hooks, and MCP servers. |
| `antigravity_guide` | **antigravity-guide** | Antigravity CLI Built-in (system) | `global (Built-in)` | Provides a comprehensive guide, quick reference, and sitemap for Google Antigravity (AGY), including the Antigravity CLI (agy), Antigravity 2.0, Antigravity IDE, Python SDK, slash commands, keybindings, and customizations (skills, rules, MCP, sidecars). Activate this skill when the user asks questions about how to use, configure, or customize Antigravity, AGY, the agy CLI, the Antigravity IDE, or Antigravity 2.0. |
| `bash-defensive-patterns` | **bash-defensive-patterns** | `wshobson/agents` (autoskills-registry) | `frontend` | Master defensive Bash programming techniques for production-grade scripts. Use when writing robust shell scripts, CI/CD pipelines, or system utilities requiring fault tolerance and safety. |
| `code-design` | **code-design** | `Joacohbc/code-design` (github) | `frontend`, `chatbot`, `mypaybyday` | Code design directives to apply by default whenever writing, reviewing, or refactoring code — covers self-documenting code (no comments), naming, flat control flow (guard clauses / max 2 levels of nesting), composition over inheritance, dependency injection, avoiding premature optimization, avoiding over-abstraction, and pragmatism over paradigms. Use when the user asks to write, review, clean up, or refactor code, or to check a change against design/style guidelines. |
| `composition-patterns` | **vercel-composition-patterns** | `vercel-labs/agent-skills` (autoskills-registry) | `frontend` | React composition patterns that scale. Use when refactoring components with boolean prop proliferation, building flexible component libraries, or designing reusable APIs. Triggers on tasks involving compound components, render props, context providers, or component architecture. Includes React 19 API changes. |
| `docker-patterns` | **docker-patterns** | `User Global Config (~/.claude/skills)` (user) | `global (User)` | Docker and Docker Compose patterns for local development, container security, networking, volume strategies, and multi-service orchestration. |
| `frontend-design` | **frontend-design** | `anthropics/skills` (autoskills-registry) | `frontend` | Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics. |
| `graphify` | **graphify** | `User Global Config (~/.claude/skills)` (user) | `global (User)` | Use for any question about a codebase, its architecture, file relationships, or project content — especially when graphify-out/ exists, where the question should be treated as a graphify query first. Turns any input (code, docs, papers, images, videos) into a persistent knowledge graph with god nodes, community detection, and query/path/explain tools. |
| `hono` | **hono** | `yusukebe/hono-skill` (autoskills-registry) | `chatbot` | Use when building Hono web applications or when the user asks about Hono APIs, routing, middleware, JSX, validation, testing, or streaming. TRIGGER when code imports from 'hono' or 'hono/*', or user mentions Hono. Use `npx hono request` to test endpoints. |
| `java-coding-standards` | **java-coding-standards** | `affaan-m/everything-claude-code` (autoskills-registry) | `mypaybyday` | Java coding standards for Spring Boot services: naming, immutability, Optional usage, streams, exceptions, generics, and project layout. |
| `java-docs` | **java-docs** | `github/awesome-copilot` (autoskills-registry) | `mypaybyday` | Ensure that Java types are documented with Javadoc comments and follow best practices for documentation. |
| `multi-stage-dockerfile` | **multi-stage-dockerfile** | `User Global Config (~/.claude/skills)` (user) | `global (User)` | Create optimized multi-stage Dockerfiles for any language or framework |
| `nodejs-backend-patterns` | **nodejs-backend-patterns** | `wshobson/agents` (autoskills-registry) | `frontend`, `chatbot` | Build production-ready Node.js backend services with Express/Fastify, implementing middleware patterns, error handling, authentication, database integration, and API design best practices. Use when creating Node.js servers, REST APIs, GraphQL backends, or microservices architectures. |
| `nodejs-best-practices` | **nodejs-best-practices** | `sickn33/antigravity-awesome-skills` (autoskills-registry) | `frontend`, `chatbot` | Node.js development principles and decision-making. Framework selection, async patterns, security, and architecture. Teaches thinking, not copying. |
| `permissioned-github` | **permissioned-github** | Antigravity CLI Built-in (system) | `global (Built-in)` | Guidelines for interacting with GitHub and request permissions from the user when commands fail due to restrictions in the agent environment. |
| `react-best-practices` | **vercel-react-best-practices** | `vercel-labs/agent-skills` (autoskills-registry) | `frontend` | React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements. |
| `react-hook-form` | **react-hook-form** | `pproenca/dot-skills` (autoskills-registry) | `frontend` | React Hook Form performance optimization for client-side form validation using useForm, useWatch, useController, and useFieldArray. This skill should be used when building client-side controlled forms with React Hook Form library. This skill does NOT cover React 19 Server Actions, useActionState, or server-side form handling (use react-19 skill for those). |
| `seo` | **seo** | `addyosmani/web-quality-skills` (autoskills-registry) | `frontend` | Optimize for search engine visibility and ranking. Use when asked to "improve SEO", "optimize for search", "fix meta tags", "add structured data", "sitemap optimization", or "search engine optimization". |
| `tailwind-css-patterns` | **tailwind-css-patterns** | `giuseppe-trisciuoglio/developer-kit` (autoskills-registry) | `frontend` | Provides comprehensive Tailwind CSS utility-first styling patterns including responsive design, layout utilities, flexbox, grid, spacing, typography, colors, and modern CSS best practices. Use when styling React/Vue/Svelte components, building responsive layouts, implementing design systems, or optimizing CSS workflow. |
| `typescript-advanced-types` | **typescript-advanced-types** | `wshobson/agents` (autoskills-registry) | `frontend`, `chatbot` | Master TypeScript's advanced type system including generics, conditional types, mapped types, template literals, and utility types for building type-safe applications. Use when implementing complex type logic, creating reusable type utilities, or ensuring compile-time type safety in TypeScript projects. |
| `ui-ux-pro-max` | **ui-ux-pro-max** | `nextlevelbuilder/ui-ux-pro-max-skill` (github) | `frontend` | UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app. Elements: button, modal, navbar, sidebar, card, table, form, and chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient. Integrations: shadcn/ui MCP for component search and examples. |
| `use-ai-sdk` | **ai-sdk** | `vercel/ai` (autoskills-registry) | `frontend`, `chatbot` | Answer questions about the AI SDK and help build AI-powered features. Use when developers: (1) Ask about AI SDK functions like generateText, streamText, ToolLoopAgent, embed, or tools, (2) Want to build AI agents, chatbots, RAG systems, or text generation features, (3) Have questions about AI providers (OpenAI, Anthropic, Google, etc.), streaming, tool calling, structured output, or embeddings, (4) Use React hooks like useChat or useCompletion. Triggers on: "AI SDK", "Vercel AI SDK", "generateText", "streamText", "add AI to my app", "build an agent", "tool calling", "structured output", "useChat". |
| `vite` | **vite** | `antfu/skills` (autoskills-registry) | `frontend` | Vite build tool configuration, plugin API, SSR, and Vite 8 Rolldown migration. Use when working with Vite projects, vite.config.ts, Vite plugins, or building libraries/SSR apps with Vite. |
| `web-design-guidelines` | **web-design-guidelines** | `vercel-labs/agent-skills` (github) | `frontend` | Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices". |
| `zod` | **zod** | `pproenca/dot-skills` (autoskills-registry) | `frontend`, `chatbot` | Zod schema validation best practices for type safety, parsing, and error handling. This skill should be used when defining z.object schemas, using z.string validations, safeParse, or z.infer. This skill does NOT cover React Hook Form integration patterns (use react-hook-form skill) or OpenAPI client generation (use orval skill). |

---

## 4. Análisis Detallado por Categoría Funcional

### 🌍 A. Directrices de Arquitectura y Calidad de Código (Código Limpio)
Estas habilidades rigen cómo debe estructurarse y escribirse el código fuente para mantenerlo legible y mantenible en cualquier entorno.

#### 📝 `code-design`
* **Ámbito**: `frontend`, `chatbot`, `mypaybyday` (Instalado localmente en los tres proyectos)
* **Origen**: `Joacohbc/code-design` (github)
* **Directrices Fundamentales**:
  * **Cero Comentarios innecesarios**: El código debe documentarse por sí mismo mediante nombres descriptivos de variables y funciones. Si requiere explicación sobre *qué* hace, debe refactorizarse. Solo se permiten comentarios para explicar el *por qué* de decisiones complejas, optimizaciones críticas o algoritmos matemáticos no triviales.
  * **Control de Flujo Plano**: Límite estricto de **2 niveles de anidamiento máximo**. Uso sistemático de cláusulas de guarda (guard clauses) y retornos tempranos para mantener el flujo principal plano.
  * **Composición sobre Herencia**: Utilizar herencia únicamente bajo relaciones estrictas de "es-un" (Liskov Substitution Principle). Priorizar interfaces y composición de tipos.
  * **Inyección de Dependencias (DI)**: Prohibida la instanciación interna de dependencias en constructores.
  * **YAGNI & Anti-optimización prematura**: Priorizar código correcto y entendible antes de optimizar o sobre-abstraer sin múltiples casos de uso reales.

#### ☕ `java-coding-standards` & `java-docs`
* **Ámbito**: `mypaybyday` (Backend Quarkus)
* **Origen**: `affaan-m/everything-claude-code` y `github/awesome-copilot`
* **Directrices Fundamentales**:
  * Adopción de convenciones de Java modernas con enfoque en inmutabilidad.
  * Uso correcto de `Optional` para evitar retornos `null`.
  * Optimización de flujos con la API de Java Streams y manejo estructurado de excepciones.
  * Obligatoriedad de documentar interfaces y tipos públicos mediante comentarios estructurados Javadoc.

---

### 🎨 B. Ingeniería Web y UI/UX (Frontend Stack)
Guías destinadas a proporcionar una interfaz interactiva de primera calidad, asegurando una estética visual premium y rendimiento óptimo.

#### 💡 `ui-ux-pro-max` & `frontend-design`
* **Ámbito**: `frontend`
* **Origen**: `nextlevelbuilder/ui-ux-pro-max-skill` (github) y `anthropics/skills`
* **Directrices Fundamentales**:
  * **Afecta a**: Vistas, maquetas, landing pages, dashboards y componentes visuales.
  * **Alineación Visual**: Prohibido usar estilos básicos u hojas genéricas de IA. Obliga al uso de paletas de colores HSL armoniosas, gradientes suaves, micro-animaciones en interacciones (hover, focus), tipografías modernas (Inter, Outfit) y layouts modernos (Bento grids, Glassmorphism, Claymorphism).
  * **Estructura semántica**: Uso de contenedores con anchos adaptables, estados de carga elegantes y layouts responsive nativos.

#### ♿ `accessibility` & `web-design-guidelines`
* **Ámbito**: `frontend`
* **Origen**: `addyosmani/web-quality-skills` y `vercel-labs/agent-skills`
* **Directrices Fundamentales**:
  * Cumplimiento estricto del estándar internacional **WCAG 2.2**.
  * Requisitos críticos: Navegación completa por teclado (tabindex), roles ARIA específicos para lectores de pantalla, contraste adecuado de colores, etiquetas descriptivas para elementos interactivos e imágenes.

#### ⚡ `react-best-practices`, `react-hook-form`, `tailwind-css-patterns` & `vite`
* **Ámbito**: `frontend`
* **Origen**: Diversas fuentes de Vercel y la comunidad.
* **Directrices Fundamentales**:
  * **React**: Estructuración eficiente de componentes React 19, prevención de renders innecesarios, uso correcto de Hooks y modularización.
  * **Formularios**: Gestión eficiente de formularios grandes y dinámicos utilizando `React Hook Form` (useWatch, useController) para minimizar re-renderizados, en lugar de estados controlados pesados.
  * **Tailwind**: Directrices para el uso correcto de clases utilitarias de Tailwind CSS para layouts responsivos, alineación (Flex/Grid) y transiciones.
  * **Vite & SEO**: Configuraciones de empaquetado ligeras, compresión de bundles, optimización de tiempo de carga inicial y estructuración de etiquetas Meta dinámicas.

---

### 🤖 C. APIs, IA y Node.js Backend (Chatbot Stack)
Skills diseñados para el desarrollo ágil de APIs de alto rendimiento con validación tipada y la integración de modelos de lenguaje LLM.

#### 🟢 `nodejs-backend-patterns` & `nodejs-best-practices`
* **Ámbito**: `frontend`, `chatbot`
* **Origen**: `wshobson/agents` y `sickn33/antigravity-awesome-skills`
* **Directrices Fundamentales**:
  * Arquitectura limpia para aplicaciones en Node.js.
  * Manejo asíncrono robusto (Async/Await) y middleware defensivo para el tratamiento de errores y seguridad de APIs.

#### 🚀 `hono`, `zod` & `use-ai-sdk`
* **Ámbito**: `frontend`, `chatbot`
* **Origen**: Propietarios de Hono y Vercel.
* **Directrices Fundamentales**:
  * **Hono**: Construcción de enrutadores web y middleware ligeros en Hono, ideales para Cloudflare Workers o microservicios de chatbot.
  * **Zod**: Validación estricta y tipada en la frontera de las APIs. Definición de esquemas Zod (`z.object()`, `safeParse`) para sanitizar datos entrantes y derivar tipos de TypeScript en tiempo de compilación.
  * **Vercel AI SDK**: Integración de capacidades generativas utilizando funciones nativas (`generateText`, `streamText`, `useChat`). Gestión avanzada de llamadas a herramientas (tool calling) y flujos conversacionales.

---

### 🌐 D. Habilidades Globales y del Sistema (Built-ins)
Herramientas avanzadas integradas en los entornos locales del sistema operativo o en el daemon global de la consola para agilizar la interacción y el análisis de proyectos.

#### 📊 `graphify`
* **Ámbito**: `global (User)` (Instalado en `~/.claude/skills/graphify/`)
* **Propósito**: Convierte cualquier directorio con múltiples lenguajes (código, Markdown, PDF, audios) en un mapa de conocimiento visual (Knowledge Graph). Permite al agente ejecutar búsquedas complejas (queries en grafo con BFS/DFS), trazar rutas de dependencias de componentes y generar informes estructurados (GRAPH_REPORT.md).
* **Uso sugerido**: Cuando se entra a un proyecto nuevo o se quiere trazar el flujo de datos entre módulos distantes.

#### 🛠️ `antigravity-guide` & `agy-customizations`
* **Ámbito**: `global (Built-in)` (Instalados en la instalación por defecto de Antigravity)
* **Propósito**: Actúan como el "manual de usuario interactivo" y el motor de personalización del CLI. Permiten al agente entender cómo funcionan los slash commands (`/goal`, `/plan`), el SDK en Python, los hooks de Git y los servidores MCP.

#### 🛡️ `permissioned-github`
* **Ámbito**: `global (Built-in)` (Nativo del sistema)
* **Propósito**: Guía de contingencia para interactuar con repositorios remotos. Permite al agente manejar errores de permisos y solicitar de manera segura autorizaciones al usuario cuando una acción automatizada en la terminal falla debido a restricciones de sandbox.

---

## 5. Recomendaciones de Uso y triggers para el Desarrollador

Para maximizar la eficiencia y no saturar innecesariamente el contexto del agente con directrices que no corresponden a la tarea actual, se recomienda la activación de las habilidades siguiendo estas pautas:

1. **Tareas de Diseño y Estilos**: Al construir maquetas o retocar la UI, invocar o activar `ui-ux-pro-max` y `frontend-design`. El agente inmediatamente diseñará con colores HSL, tipografías personalizadas y bordes redondeados consistentes.
2. **Creación de Formularios**: Al desarrollar entradas de datos en el cliente, activar `react-hook-form` y `zod` en conjunto para generar estructuras seguras sin degradar el rendimiento del navegador.
3. **Mantenimiento y Refactorización**: Antes de realizar cualquier reestructuración masiva de lógica en JS/TS, Java o Node, activar `code-design` para asegurar que el código nuevo respete los guard clauses y no introduzca comentarios innecesarios.
4. **Análisis Arquitectónico**: Si necesitas comprender cómo interactúan las clases o archivos del repositorio, la herramienta `/graphify` del skill global `graphify` creará el mapa necesario para acelerar la comprensión del sistema.

---
*Este catálogo se actualiza automáticamente al añadir nuevos skills o modificar los archivos `skills-lock.json` correspondientes a cada subproyecto.*
