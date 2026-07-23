# Guía de Instalación (My Pay By Day)

Esta guía explica cómo ejecutar la aplicación completa (Frontend y Backend) utilizando Docker y Docker Compose.

## Requisitos previos

- Tener instalado [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/install/).
- Tener instalado `git` (se usa para bajar los archivos de configuración que el stack monta en los contenedores).

## Pasos para iniciar la aplicación

### 1. Obtener los archivos necesarios

`docker-compose.yml` descarga las imágenes ya construidas, pero además monta archivos de configuración del repositorio dentro de los contenedores. Por eso no alcanza con copiar `docker-compose.yml` suelto al servidor: esos archivos tienen que existir en el host.

No hace falta el código fuente. Con un *sparse checkout* bajás solo los archivos que el stack monta, sin el frontend, el backend, el chatbot ni la documentación.

**En una carpeta nueva:**

```bash
git clone --filter=blob:none --sparse https://github.com/Joacohbc/my-pay-by-day.git my-pay-by-day-prod
cd my-pay-by-day-prod
git sparse-checkout set --no-cone /docker-compose.yml /.env.example '/docker/observability/**'
```

**En la carpeta actual** (si ya tenés ahí tu `.env` y tus datos, o si `git clone` se niega porque el directorio no está vacío), ejecutá esto **dentro** de la carpeta de deploy:

```bash
git init -b master
git remote add origin https://github.com/Joacohbc/my-pay-by-day.git
git sparse-checkout set --no-cone /docker-compose.yml /.env.example '/docker/observability/**'
git fetch --filter=blob:none origin master
git checkout master
```

El `--no-cone` es lo que mantiene el checkout mínimo: el modo por defecto (*cone*) siempre arrastra **todos** los archivos de la raíz del repositorio (`README.md`, `AGENTS.md`, `docker-compose.local.yml`, etc.), que acá no hacen falta. Con los patrones explícitos quedan solo estos archivos:

```text
docker-compose.yml
.env.example
docker/observability/config.alloy
docker/observability/loki-config.yml
docker/observability/grafana/provisioning/dashboards/*.json
docker/observability/grafana/provisioning/dashboards/dashboards.yml
docker/observability/grafana/provisioning/datasources/datasources.yml
```

Tu `.env` y la carpeta `data/` no se tocan: ambos están en `.gitignore`, y git aplica esas reglas aunque el propio `.gitignore` no esté materializado en el working tree. Si Docker había creado directorios vacíos donde tendría que haber archivos (ver [Solución de problemas](#not-a-directory-are-you-trying-to-mount-a-directory-onto-a-file)), el `checkout` los reemplaza por el archivo real.

Para actualizar más adelante, desde ese mismo directorio:

```bash
git pull
docker compose pull
docker compose up -d
```

> Si preferís el repositorio completo (por ejemplo para construir las imágenes localmente), usá un `git clone` normal sin `--sparse`. El resto de la guía es idéntico.

### 2. Configurar las variables de entorno

La aplicación requiere ciertas variables de entorno para funcionar correctamente, en especial para la encriptación de datos sensibles y la integración con la Inteligencia Artificial.

Copia el archivo de ejemplo para crear tu propio archivo `.env`:

```bash
cp .env.example .env
```

Abre el archivo `.env` en tu editor de texto favorito y configura **obligatoriamente** las siguientes variables:

- `DB_FIELD_ENCRYPTION_KEY`: Una clave secreta de al menos 32 caracteres que se usará para encriptar datos en la base de datos. ¡No la pierdas!
- `OPENROUTER_API_KEY`: Tu clave de API de [OpenRouter](https://openrouter.ai/) para utilizar los modelos de IA.
- `CLOUDFLARE_TUNNEL_TOKEN`: El token del túnel de Cloudflare, única vía de entrada al stack (ver [paso 5](#5-configurar-el-túnel-de-cloudflare)).

Las demás variables (los modelos de IA `MODEL_LARGE`, `MODEL_FAST` y `MODEL_AUDIO`, los límites del agente, la base de datos, la zona horaria y los niveles de log) tienen valores por defecto y son opcionales, pero puedes ajustarlas según tus necesidades.

### 3. Preparar las carpetas de datos

El `backend` y el `chatbot` persisten sus bases SQLite en la carpeta `./data` del host (bind mount), no en volúmenes internos de Docker. Ambos contenedores corren como un usuario **no-root con UID 10001**, por lo que las carpetas del host deben pertenecer a ese UID; de lo contrario SQLite falla con `permission denied` al arrancar.

Creá las carpetas y asignales el ownership correcto **antes** del primer arranque:

```bash
mkdir -p data/backend data/chatbot
sudo chown -R 10001:10001 data
```

### 4. Verificar los archivos de configuración montados

Antes del primer arranque, confirmá que están todas las rutas que el compose monta en los contenedores. Si clonaste el repositorio en el paso 1, ya deberían estar:

| Ruta en el host | Tipo | Servicio |
|---|---|---|
| `docker/observability/config.alloy` | archivo | `alloy` |
| `docker/observability/loki-config.yml` | archivo | `loki` |
| `docker/observability/grafana/provisioning` | directorio | `grafana` |
| `data/backend`, `data/chatbot` | directorios | `backend`, `chatbot` |

Comprobá que estén y que sean del tipo correcto:

```bash
ls -l docker/observability/config.alloy docker/observability/loki-config.yml
ls -ld docker/observability/grafana/provisioning
```

Los dos primeros deben aparecer como archivos regulares (la línea empieza con `-`). Si alguno aparece como directorio (empieza con `d`), mirá la sección [Solución de problemas](#solución-de-problemas).

### 5. Configurar el túnel de Cloudflare

**`docker-compose.yml` no publica ningún puerto en el host.** El único ingreso es un [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/): el contenedor `cloudflared` abre una conexión *saliente* hacia el borde de Cloudflare y desde ahí alcanza al `gateway` por la red interna de compose. El firewall del host no necesita ninguna regla de entrada, y ni la app ni Grafana quedan accesibles desde la red local del servidor.

En el panel de [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks → Tunnels**:

1. Creá un túnel del tipo **Remotely-managed** y copiá el token que te da.
2. Pegalo en el `.env` como `CLOUDFLARE_TUNNEL_TOKEN`. Es una credencial: quien lo tenga puede servir tráfico por tu túnel, así que no lo subas al repositorio (`.env` está en `.gitignore`).
3. En la pestaña **Public Hostname** del túnel, agregá **una sola** entrada:

    | Campo | Valor |
    |---|---|
    | Subdomain / Domain | el hostname público que quieras, ej. `app.midominio.com` |
    | Service Type | `HTTP` |
    | URL | `gateway:80` |

Con eso alcanza para todo: el gateway enruta internamente el frontend, la API, el chatbot y Grafana. No hace falta un hostname por servicio.

Por último, ajustá en el `.env` las variables que dependen del dominio público:

```bash
GRAFANA_ROOT_URL=https://app.midominio.com/grafana/
MYPAYBYDAY_CORS_ORIGINS=https://app.midominio.com
```

> **Grafana queda detrás del mismo hostname**, en `/grafana/`. Eso significa que cualquiera que llegue a la app puede llegar al login de Grafana. Antes de exponerlo, cambiá `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` y agregá una política de **Cloudflare Access** sobre la ruta `/grafana/*`.

### 6. Iniciar los contenedores

Una vez configurado el `.env`, preparadas las carpetas y creado el túnel, ejecutá en la raíz del proyecto para descargar las imágenes y levantar los servicios en segundo plano:

```bash
docker compose up -d
```

> Para construir las imágenes desde el código fuente en lugar de descargarlas, usá `docker compose -f docker-compose.local.yml up -d --build`. Esa variante **sí** publica puertos en el host (`80` y `3000`) y no incluye el túnel: es para desarrollo local.

### 7. Acceder a la aplicación

Una vez que los contenedores estén arriba y el túnel conectado (`docker compose logs cloudflared` debe mostrar las conexiones registradas), accedé por el dominio público:

- **Interfaz de Usuario (Frontend):** `https://app.midominio.com`
- **API (Backend):** `https://app.midominio.com/api`
- **Grafana:** `https://app.midominio.com/grafana/`

Desde el servidor no vas a poder entrar por `http://localhost`: no hay puertos publicados. Para probar sin pasar por Cloudflare, exponé un puerto temporalmente con `docker compose run --rm --service-ports gateway`, o usá `docker compose exec gateway wget -qO- http://frontend/healthz`.

> **Nota:** Las bases de datos SQLite se almacenan de forma persistente en `./data/backend` y `./data/chatbot` en el host, por lo que tu información se mantiene a salvo aunque reinicies o recrees los contenedores.

## Observabilidad (logs y dashboards)

El stack incluye una pila de observabilidad **solo de logs**, opcional: si la quitás, las aplicaciones siguen funcionando igual (los logs quedan accesibles con `docker logs <servicio>`).

**Pipeline:** cada servicio escribe a `stdout` → Docker (driver `json-file` con rotación) → **Alloy** lee vía `docker.sock`, normaliza cada formato y lo empuja a **Loki** → **Grafana** lo muestra.

- **Grafana:** `https://<tu-dominio>/grafana/` — servido por el gateway, sin puerto propio. Usuario/clave por defecto `admin` / `admin` (configurable con `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`). Al compartir hostname con la app, protegelo con Cloudflare Access.

El gateway resuelve el upstream de Grafana **por request** (no al arrancar), así que si sacás la pila de observabilidad del compose el gateway sigue levantando normal y `/grafana/` simplemente devuelve 502.

Los dashboards se cargan solos (auto-provisionados). Disponibles:

| Dashboard | Qué muestra |
|---|---|
| **MPBD — System** | Visión del sistema: requests y errores totales, status codes, top endpoints, **trace de un request** cruzando todos los servicios (pegá un `X-Request-Id` en la variable `requestId`), y **disponibilidad**: heartbeat de backend y chatbot, uptime, y caídas de upstream del gateway (502/503/504). |
| **MPBD — Backend** | Requests, endpoint más solicitado, qué app usa más el backend (por `source`), errores por status/mensaje, latencia, filtros por `source` e IP. Además los **jobs programados**: cuántas suscripciones generaron su Event recurrente y cuántas **fallaron**. |
| **MPBD — Chatbot** | Tool calls por tipo, latencia de tools y del backend-client, tasks en background, errores del agente. |
| **MPBD — Frontend** | Requests servidos, status codes, top paths, fallos 4xx/5xx, la latencia de las llamadas a la API **medida desde el navegador** (incluye red y proxy, cosa que la latencia del backend no ve), y la **cola offline**: eventos que guardaste sin conexión y el servidor nunca recibió. |

> **Nota:** todo esto se **deriva de los logs**, no hay probes activos ni backend de métricas.
>
> Backend y chatbot emiten un *heartbeat* cada minuto, haya tráfico o no — por eso en esos dos un hueco en el timeline sí significa algo (proceso caído, trabado, o pipeline de logs roto; no distingue entre esos casos). Para `gateway`, `frontend` y `markitdown` no hay heartbeat: no tienen dónde correrlo, y su señal de caída sigue siendo el `5xx` de upstream del gateway.
>
> Lo que **no** vas a encontrar acá: CPU, memoria, reinicios de contenedor ni disco. Un proceso no puede loguear su propio `SIGKILL`. Eso es monitoreo de host y queda fuera a propósito.

Las versiones de las imágenes de observabilidad (`grafana/loki`, `grafana/alloy`, `grafana/grafana`) están fijadas a la última versión soportada. Ninguno de estos proyectos publica un track "LTS" formal: el modelo es rolling (se soportan las últimas 1-2 minors), así que conviene bumpear estos tags periódicamente.

## Solución de problemas

### `not a directory: Are you trying to mount a directory onto a file?`

El contenedor de `alloy` (o `loki`) no arranca y Docker devuelve algo como:

```text
Error response from daemon: failed to create task for container: ... error mounting
"/ruta/al/deploy/docker/observability/config.alloy" to rootfs at "/etc/alloy/config.alloy":
not a directory: Are you trying to mount a directory onto a file (or vice-versa)?
```

**Causa:** el archivo `config.alloy` no existía en el host al levantar el stack. Cuando el origen de un bind mount no existe, Docker lo crea automáticamente **como directorio vacío**, y después falla al intentar montar ese directorio sobre un archivo dentro del contenedor. Pasa siempre que se copia al servidor solo `docker-compose.yml` y `.env`, salteando el clon del [paso 1](#1-obtener-los-archivos-necesarios).

**Solución:**

1. Bajá el stack para liberar los montajes:

    ```bash
    docker compose down
    ```

2. Confirmá que el path es efectivamente un directorio vacío creado por Docker (y no configuración tuya). Este comando no borra nada, solo muestra qué hay adentro:

    ```bash
    ls -la docker/observability/config.alloy
    ```

    Si es un directorio, se va a listar su contenido — que debería estar vacío. Si tuviera archivos adentro, movelos a un lugar seguro antes de seguir.

3. Eliminá el directorio vacío. Revisá la ruta antes de ejecutarlo, `rm -rf` no se puede deshacer:

    ```bash
    rm -rf docker/observability/config.alloy
    ```

4. Restaurá el archivo real desde el repositorio (no lo crees vacío con `touch`: Alloy sin configuración arranca pero no recolecta ningún log):

    ```bash
    git checkout -- docker/observability/config.alloy
    ```

    Si el directorio de deploy no es un clon de git, rehacelo con el sparse checkout del [paso 1](#1-obtener-los-archivos-necesarios) en una carpeta nueva y movéle la carpeta `data` con tus bases.

5. Verificá que ahora sea un archivo regular (la línea tiene que empezar con `-`) y volvé a levantar:

    ```bash
    ls -l docker/observability/config.alloy
    docker compose up -d
    ```

El mismo procedimiento aplica a `docker/observability/loki-config.yml`, cambiando el nombre del archivo. Para prevenirlo, mantené el directorio de deploy como el clon del [paso 1](#1-obtener-los-archivos-necesarios) y actualizalo con `git pull`, en vez de copiar archivos sueltos al servidor.

### `Permission denied` o `SQLITE_READONLY_DIRECTORY` al abrir la base

El contenedor `backend` (o `chatbot`) queda en estado `unhealthy` y el resto del stack no arranca con `dependency failed to start`. En los logs aparece alguno de estos dos errores:

```text
opening db: '/data/mypaybyday.db': Permission denied
```

```text
[SQLITE_READONLY_DIRECTORY] Process does not have permission to create a journal file
in the same directory as the database
```

**Causa:** las carpetas `data/backend` y `data/chatbot` del host no pertenecen al UID **10001**, que es el usuario no-root con el que corren ambos contenedores. Es el paso 2 de esta guía cuando se saltea, o cuando las carpetas las creó Docker (que las crea como `root`) al levantar el stack antes de haberlas preparado.

Los dos mensajes son la misma causa en distinto grado: el primero significa que no puede ni abrir el archivo; el segundo, que ya lo lee pero **el directorio** no es escribible. Como la base usa WAL, SQLite necesita crear los archivos `-wal` y `-shm` junto al `.db`, así que no alcanza con que el `.db` tenga permisos: el directorio que lo contiene también tiene que ser escribible por el UID 10001.

**Solución:**

1. Bajá el stack:

    ```bash
    docker compose down
    ```

2. Revisá el ownership actual. La tercera y cuarta columna son el UID y GID numéricos:

    ```bash
    ls -lan data data/backend data/chatbot
    ```

3. Si no dicen `10001 10001`, corregilo. Esto no borra datos, solo cambia el dueño de las carpetas y de las bases que ya existan:

    ```bash
    sudo chown -R 10001:10001 data
    sudo chmod -R u+rwX data
    ```

4. Levantá de nuevo y confirmá que el backend queda `healthy`:

    ```bash
    docker compose up -d
    docker compose ps
    ```

Aplicá siempre el `chown` sobre `data` completo y no solo sobre la carpeta del servicio que falló: `backend` y `chatbot` usan el mismo UID, y el segundo va a fallar igual apenas le toque arrancar.

## Detener la aplicación

Para detener la aplicación y los contenedores, ejecuta:

```bash
docker compose down
```
