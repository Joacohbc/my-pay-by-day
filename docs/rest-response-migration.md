# Plan: migrar los resources a retornos tipados / `RestResponse<T>`

Estado: **propuesto, no ejecutado**. Se ejecuta después de la feature de payment plans.

## Problema

Los resources retornan `jakarta.ws.rs.core.Response`, que borra el tipo. SmallRye OpenAPI no puede
inferir el schema de la respuesta, así que hay que declararlo a mano:

```java
@APIResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = PaymentPlanDto.class)))
public Response listAll() {
    List<PaymentPlanDto> plans = paymentPlanService.listAll();   // ← List, la anotación dice objeto
    return Response.ok(plans).build();
}
```

Nada valida que la anotación coincida con el `return`. El compilador no lo ve, los tests no lo ven,
y el error sale recién en `chatbot/src/backend/schema.d.ts`, generado por `openapi-typescript` desde
el spec — donde el tipo queda mal y rompe el consumidor.

**No es hipotético. Dos casos encontrados en el repo:**

| Endpoint | Declaraba | Devuelve | Estado |
|---|---|---|---|
| `GET /payment-plans` | `PaymentPlanDto` | `List<PaymentPlanDto>` | corregido en la rama `feat/payment-plans` |
| `GET /payment-plans/{id}/items` | `PaymentPlanItemDto` | `List<PaymentPlanItemDto>` | corregido en la rama `feat/payment-plans` |
| `GET /transactions` | `FinanceTransactionDto` | `List<FinanceTransactionDto>` | **abierto** |

Los dos primeros rompieron el `pnpm typecheck` del chatbot (`plans.map is not a function` a nivel de
tipos). Se arreglaron con `type = SchemaType.ARRAY`, que es tapar el síntoma: la próxima anotación
mal escrita vuelve a pasar sin que nadie se entere.

Con retorno tipado el schema sale de la firma del método y la clase de bug desaparece por
construcción.

## Objetivo

Que ningún resource declare `schema = @Schema(implementation = ...)` para un caso de éxito **200 o
204**. El tipo de retorno del método es la única fuente del schema. Los `201` son la excepción y
requieren declarar el tipo — ver "Límite del 201".

`@APIResponse` se queda — sigue aportando `responseCode` y `description`, y los códigos de error
(400/404) que no se infieren de nada.

## Límite del 201: SmallRye solo infiere en el 200

Medido empíricamente en este repo (SmallRye vía Quarkus 3.32, `resteasy-reactive-common` 3.32.1):

| Intento en un `POST` con éxito 201 | Resultado en el spec |
|---|---|
| `RestResponse<PaymentPlanDto>` + `@APIResponse(responseCode="201")` | **201 sin body** |
| `@ResponseStatus(201)` + retorno `PaymentPlanDto` | **201 sin body** |
| Quitar el `@APIResponse` del 201 por completo | **el 201 desaparece del spec** |
| `@APIResponseSchema(value = X.class, responseCode = "201")` | 201 → `X` ✓ |

La inferencia no depende de `RestResponse` — un `RestResponse<PaymentPlanDto>` con éxito **200** sí
infiere correctamente. Depende del **código**: SmallRye rellena el schema inferido únicamente en la
respuesta cuyo código coincide con su "éxito por defecto", que es 200. No consulta `@ResponseStatus`.

Por eso los 12 endpoints de creación siguen nombrando su tipo, con `@APIResponseSchema` —
una sola anotación en vez del `@Content` + `@Schema` anidado, y al lado de un retorno tipado que un
lector ve de una:

```java
@APIResponseSchema(value = PaymentPlanDto.class, responseCode = "201", responseDescription = "Created")
@APIResponse(responseCode = "400", description = "Invalid payment plan data")
@ResponseStatus(201)
public PaymentPlanDto create(CreatePaymentPlanDto dto) throws BusinessException {
    return paymentPlanService.create(dto);
}
```

Es más débil que la inferencia, pero el riesgo de deriva es mucho menor que el de los arrays: acá el
tipo aparece dos veces en tres líneas contiguas. El bug que motiva este plan era una `List` declarada
como objeto a 6 líneas de distancia.

## Reglas de conversión

| Situación | Retorno | Anotación de éxito |
|---|---|---|
| Status fijo 200 con body | `PaymentPlanDto` / `List<PaymentPlanDto>` | `@APIResponse` sin `content` (se infiere) |
| Status fijo 204 sin body | `void` | `@APIResponse(responseCode = "204")` |
| Status fijo 201 con body | el DTO + `@ResponseStatus(201)` | `@APIResponseSchema(..., responseCode = "201")` |
| Status variable, o headers dinámicos | `RestResponse<T>` | `@APIResponse` sin `content` si el éxito es 200 |

`RestResponse<T>` es `org.jboss.resteasy.reactive.RestResponse`; `@ResponseStatus` es
`org.jboss.resteasy.reactive.ResponseStatus`. Los dos vienen con `quarkus-rest`, ya en el `pom.xml`.

`jakarta.ws.rs.core.Response` crudo deja de usarse. No queda ningún caso que lo requiera.

### Ejemplos

```java
// 200 fijo — el schema sale de la firma
@APIResponse(responseCode = "200", description = "List of payment plans")
public List<PaymentPlanDto> listAll() {
    return paymentPlanService.listAll();
}

// 204 fijo — void → 204, verificado en runtime (0 bytes de body)
@APIResponse(responseCode = "204", description = "Deleted")
public void delete(@PathParam("id") Long id) {
    paymentPlanService.delete(id);
}

// status variable
@APIResponse(responseCode = "200", description = "Draft found")
@APIResponse(responseCode = "204", description = "No draft for this entity")
public RestResponse<FinanceEventDto> getByEntityId(@PathParam("entityId") Long entityId) {
    return draftService.findFinanceEventDraftByEntityId(entityId)
        .map(RestResponse::ok)
        .orElseGet(RestResponse::noContent);
}
```

## Alcance

91 métodos que retornan `Response`, en 17 clases. Distribución:

| Resource | `Response` | 201 | 204 | headers | status dinámico |
|---|---:|---:|---:|---:|---:|
| PaymentPlanResource | 10 | 2 | 1 | | |
| EventResource | 9 | 1 | 1 | | |
| FinanceNodeResource | 8 | 1 | 3 | | 1 |
| CategoryResource | 7 | 1 | 3 | | |
| FileResource | 7 | 1 | 2 | 1 | |
| SubscriptionResource | 7 | 1 | 1 | | |
| TagGroupResource | 7 | 1 | 3 | | |
| TagResource | 7 | 1 | 3 | | |
| TimePeriodResource | 7 | 1 | 1 | | |
| DraftResource | 5 | 1 | 3 | | |
| TemplateResource | 5 | 1 | 1 | | |
| DuplicateResource | 3 | | 1 | | 1 |
| DuplicateSettingsResource | 3 | | 1 | | |
| DataTransferResource | 2 | | | 1 | |
| SelectionHistoryResource | 2 | | 1 | | |
| TransactionResource | 2 | | | | |
| ConfigResource | 0 | | | | |

`ConfigResource` ya está tipado. `DraftResource` está a medias: 5 métodos tipados y 5 con `Response`,
de los cuales 3 no lo necesitan (dos 204 y un 200 fijo).

## Orden de ejecución

Un commit por resource. Cada uno compila y pasa contract check por sí solo, así que la migración se
puede pausar o abandonar en cualquier punto sin dejar el repo a medias.

1. **`TransactionResource`** (2 métodos) — arranca acá: es el más chico y de paso arregla el bug
   abierto de `GET /transactions`. Sirve de plantilla para el resto.
2. **`DraftResource`** (5) — cierra la inconsistencia interna del único archivo mixto.
3. **`PaymentPlanResource`** — *ya migrado junto con la feature; no re-hacer.*
4. Los CRUD homogéneos, en cualquier orden: `CategoryResource`, `TagResource`, `TagGroupResource`,
   `TemplateResource`, `TimePeriodResource`, `SubscriptionResource`, `EventResource`,
   `DuplicateSettingsResource`, `SelectionHistoryResource`.
5. **`FinanceNodeResource`** — tiene un 404 explícito (`getById` retorna `Status.NOT_FOUND` cuando el
   servicio da `null`). Ver "Decisiones tomadas" abajo.
6. **Los binarios, al final**: `FileResource` (mime y `Content-Disposition` dinámicos) y
   `DataTransferResource` (zip). Son los únicos con headers variables; `RestResponse<byte[]>` los
   cubre pero conviene verificar la descarga a mano.

## Verificación por commit

```bash
cd mypaybyday && ./mvnw -q -DskipTests package   # compila y regenera target/openapi/openapi.json
cd chatbot    && pnpm gen:api && pnpm typecheck
cd frontend   && pnpm lint && pnpm tsc -b
```

Además, para cada resource migrado, **verificar los status en runtime** — el cambio de retorno es un
cambio de comportamiento, no solo de tipos. Levantar `java -jar target/quarkus-app/quarkus-run.jar` y
comprobar con `curl -w "%{http_code}"` que los 201 siguen siendo 201, los 204 devuelven 0 bytes, y
que los errores siguen saliendo por el `BusinessExceptionMapper`. Preferir endpoints cuyo efecto se
pueda revertir (crear un item y borrarlo) para no dejar datos de prueba en la DB de dev.

`api-contract-ci.yml` corre `pnpm gen:api:check`, así que **el `schema.d.ts` regenerado va en el
mismo commit** que el cambio del resource. Igual que con `gen:tools`.

## Qué esperar del diff generado

El spec va a cambiar más de lo que sugiere el cambio en Java: los tipos que hoy están mal (arrays
declarados como objeto) se corrigen solos, y eso se propaga a `schema.d.ts`. Un error de compilación
en el chatbot después de migrar un resource es normalmente el bug apareciendo, no una regresión —
verificar contra el `return` del método Java antes de "arreglarlo".

## Decisiones tomadas

**`@APIResponse` se conserva.** Solo se le saca el `schema =` del caso de éxito. Las descripciones y
los códigos de error siguen siendo información que el tipo no tiene.

**`FinanceNodeResource.getById` conserva su semántica actual** (404 vía `RestResponse.notFound()`) en
esta migración. Que el servicio retorne `null` en vez de tirar `BusinessException` — a diferencia del
resto de los resources, que usan la excepción y el `BusinessExceptionMapper` — es una inconsistencia
real, pero es un cambio de comportamiento y no entra acá.

**`DuplicateResource.getDuplicates` conserva su 400 manual** con `entity("type and status are
required")` — un String crudo donde el resto del sistema devuelve el JSON del
`BusinessExceptionMapper`. Migra a `RestResponse<List<DuplicateRecordDto>>`; normalizarlo a
`BusinessException` es cambio de comportamiento y va aparte.

## Fuera de alcance

- **Los `@APIResponse(responseCode = "404")` mienten.** Los servicios tiran `BusinessException`, que el
  `BusinessExceptionMapper` convierte en **400**. Verificado: `GET /payment-plans/999999` responde
  `400 {"error":"Payment plan not found: 999,999"}`, no 404. Está en todos los resources y no lo
  cambia el retorno tipado — es una decisión sobre el mapper, no sobre el tipo.

- Que `DraftResource` exponga `DraftEntity` (entidad JPA) al cliente en 3 endpoints, contra la regla
  de CLAUDE.md de que la capa de servicio solo expone DTOs. Deuda previa, independiente del tipo de
  retorno.
- Normalizar el manejo de errores de `FinanceNodeResource` y `DuplicateResource` (ver arriba).
- Los `PagedResponse` sin genérico en el spec (`GET /events`, `/files`, `/subscriptions`,
  `/templates`, `/time-periods` declaran `PagedResponse` a secas, sin el tipo del contenido). Es la
  misma familia de problema y el retorno tipado `PagedResponse<FinanceEventDto>` lo arreglaría, pero
  requiere revisar cómo SmallRye maneja el genérico y merece su propia evaluación.
