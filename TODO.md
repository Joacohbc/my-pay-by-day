- Arreglar sistema de Duplicados

- Ajustar .env.example global y el especifico de cada uno

- Al ir desde el chat a un event/draft no vuelve al chat. Un sistema de from y to mas robusto

- Agregar en el Chat un transcribe enchanted que se el transcribe use le modelo fast para editar el texto actual. Y no lo tome literal.

- Validar prompts/codigo duplicado/obsoleto entre frontend/chatbot

## Deuda arquitectónica (análisis 2026-07-09)

- [ ] Error codes tipados: `BusinessException` debe transportar el `MsgKey` como código además del mensaje localizado. El mapper JAX-RS devuelve `{ code: "EVENT_NOT_FOUND", message: "..." }` para que frontend y chatbot ramifiquen por código y no por string localizado. Hoy `BusinessException` es el god node del grafo (124 aristas) sin tipo de error.
