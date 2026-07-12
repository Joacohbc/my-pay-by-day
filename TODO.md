- Arreglar sistema de Duplicados

- Ajustar .env.example global y el especifico de cada uno

- Validar prompts/codigo duplicado/obsoleto entre frontend/chatbot

## Deuda arquitectónica

- [ ] Error codes tipados: `BusinessException` debe transportar el `MsgKey` como código además del mensaje localizado. El mapper JAX-RS devuelve `{ code: "EVENT_NOT_FOUND", message: "..." }` para que frontend y chatbot ramifiquen por código y no por string localizado. Hoy `BusinessException` es el god node del grafo (124 aristas) sin tipo de error.
