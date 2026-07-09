- Arreglar sistema de Duplicados

- Ajustar .env.example global y el especifico de cada uno

- Al ir desde el chat a un event/draft no vuelve al chat. Un sistema de from y to mas robusto

- Agregar en el Chat un transcribe enchanted que se el transcribe use le modelo fast para editar el texto actual. Y no lo tome literal.

- Validar prompts/codigo duplicado/obsoleto entre frontend/chatbot

## Deuda arquitectónica (análisis 2026-07-09)

- [ ] Error codes tipados: `BusinessException` debe transportar el `MsgKey` como código además del mensaje localizado. El mapper JAX-RS devuelve `{ code: "EVENT_NOT_FOUND", message: "..." }` para que frontend y chatbot ramifiquen por código y no por string localizado. Hoy `BusinessException` es el god node del grafo (124 aristas) sin tipo de error.

- [ ] Regenerar schema OpenAPI del chatbot: eliminar los `as any` en `chatbot/src/tools/finance.ts` (paths de drafts `/drafts/finance-events/*` y `confirm-batch` no están en `backend/schema.d.ts`). El anti-corruption layer tiene agujeros en el contrato.

- [ ] Tool manifest como fuente única: cada tool del chatbot declara sus metadatos (kind, dominios de caché que invalida, si parchea el form abierto, clave i18n) y un script genera lo que consume el frontend. Elimina la sincronización manual en 5 archivos (`toolInvalidation.ts`, `PATCH_TOOL_NAMES` en `useEntityChat.ts`, `en.ts`, `es.ts`, `toolFriendlyNames` en `ChatMessage.tsx`).

- [ ] (Solo si multi-usuario) Camino B: paquete de contrato compartido `@mypaybyday/ai-contract`, outbox pattern para eventos de dominio (reemplaza `fireAsync` volátil de `DuplicateDetectionEvent`), y cola durable de tareas de agente con claim/heartbeat/lease (reemplaza el `Map` en memoria de `executor.ts`). Hoy NO hacer — sobre-ingeniería para app personal.