# Guía de Instalación (My Pay By Day)

Esta guía explica cómo ejecutar la aplicación completa (Frontend y Backend) utilizando Docker y Docker Compose.

## Requisitos previos

- Tener instalado [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/install/).

## Pasos para iniciar la aplicación

### 1. Configurar las variables de entorno

La aplicación requiere ciertas variables de entorno para funcionar correctamente, en especial para la encriptación de datos sensibles y la integración con la Inteligencia Artificial.

Copia el archivo de ejemplo para crear tu propio archivo `.env`:

```bash
cp .env.example .env
```

Abre el archivo `.env` en tu editor de texto favorito y configura **obligatoriamente** las siguientes variables:

- `DB_FIELD_ENCRYPTION_KEY`: Una clave secreta de al menos 32 caracteres que se usará para encriptar datos en la base de datos. ¡No la pierdas!
- `OPENROUTER_API_KEY`: Tu clave de API de [OpenRouter](https://openrouter.ai/) para utilizar los modelos de IA.

Las demás variables (como los modelos de IA: `AI_PRIMARY_MODEL`, `AI_VISION_MODEL`, `AI_AUDIO_MODEL`, `AI_AGENT_MODEL`, así como sus respectivos timeouts, base de datos y zona horaria) tienen valores por defecto y son opcionales, pero puedes ajustarlas según tus necesidades.

### 2. Preparar las carpetas de datos

El `backend` y el `chatbot` persisten sus bases SQLite en la carpeta `./data` del host (bind mount), no en volúmenes internos de Docker. Ambos contenedores corren como un usuario **no-root con UID 10001**, por lo que las carpetas del host deben pertenecer a ese UID; de lo contrario SQLite falla con `permission denied` al arrancar.

Creá las carpetas y asignales el ownership correcto **antes** del primer arranque:

```bash
mkdir -p data/backend data/chatbot
sudo chown -R 10001:10001 data
```

### 3. Iniciar los contenedores

Una vez configurado el `.env` y preparadas las carpetas, ejecutá en la raíz del proyecto para descargar las imágenes y levantar los servicios en segundo plano:

```bash
docker compose up -d
```

> Para construir las imágenes desde el código fuente en lugar de descargarlas, usá `docker compose -f docker-compose.local.yml up -d --build`.

### 4. Acceder a la aplicación

Después de que los contenedores se inicien, podrás acceder desde tu navegador:

- **Interfaz de Usuario (Frontend):** [http://localhost](http://localhost)
- **API (Backend):** [http://localhost/api](http://localhost/api)

> **Nota:** Las bases de datos SQLite se almacenan de forma persistente en `./data/backend` y `./data/chatbot` en el host, por lo que tu información se mantiene a salvo aunque reinicies o recrees los contenedores.

## Observabilidad (logs y dashboards)

El stack incluye una pila de observabilidad **solo de logs**, opcional: si la quitás, las aplicaciones siguen funcionando igual (los logs quedan accesibles con `docker logs <servicio>`).

**Pipeline:** cada servicio escribe a `stdout` → Docker (driver `json-file` con rotación) → **Alloy** lee vía `docker.sock`, normaliza cada formato y lo empuja a **Loki** → **Grafana** lo muestra.

- **Grafana:** [http://localhost:3000](http://localhost:3000) — usuario/clave por defecto `admin` / `admin` (configurable con `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`).

Los dashboards se cargan solos (auto-provisionados). Disponibles:

| Dashboard | Qué muestra |
|---|---|
| **MPBD — Transversal** | Visión del sistema: requests y errores totales, status codes, top endpoints, y **trace de un request** cruzando todos los servicios (pegá un `X-Request-Id` en la variable `requestId`). |
| **MPBD — Backend** | Requests, endpoint más solicitado, qué app usa más el backend (por `source`), errores por status/mensaje, latencia, filtros por `source` e IP. |
| **MPBD — Chatbot** | Tool calls por tipo, latencia de tools y del backend-client, tasks en background, errores del agente. |
| **MPBD — Frontend** | Requests servidos, status codes, top paths, fallos 4xx/5xx. |
| **MPBD — Health** | Actividad por servicio (timeline), tasa de errores y caídas de upstream (gateway 5xx) como señal de servicio caído. |

> **Nota:** el health se **deriva de los logs**, no hay probes activos. Un servicio sin tráfico no emite logs y aparece "sin datos" — eso no significa que esté caído. La señal más fiable de una caída real es el `5xx` de upstream del gateway.

Las versiones de las imágenes de observabilidad (`grafana/loki`, `grafana/alloy`, `grafana/grafana`) están fijadas a la última versión soportada. Ninguno de estos proyectos publica un track "LTS" formal: el modelo es rolling (se soportan las últimas 1-2 minors), así que conviene bumpear estos tags periódicamente.

## Detener la aplicación

Para detener la aplicación y los contenedores, ejecuta:

```bash
docker compose down
```
