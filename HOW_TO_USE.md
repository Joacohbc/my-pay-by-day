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

Las demás variables (como los modelos de IA, base de datos y zona horaria) tienen valores por defecto y son opcionales, pero puedes ajustarlas según tus necesidades.

### 2. Iniciar el contenedor

Una vez configurado el archivo `.env`, ejecuta el siguiente comando en la raíz del proyecto para descargar la imagen y levantar los servicios en segundo plano:

```bash
docker compose up -d
```

### 3. Acceder a la aplicación

Después de que el contenedor se inicie, podrás acceder a la aplicación desde tu navegador:

- **Interfaz de Usuario (Frontend):** [http://localhost](http://localhost)
- **API (Backend):** [http://localhost/api](http://localhost/api)

> **Nota:** La base de datos SQLite se almacenará de forma persistente en un volumen de Docker (`db_data`), por lo que tu información se mantendrá a salvo aunque reinicies el contenedor.

## Detener la aplicación

Para detener la aplicación y los contenedores, ejecuta:

```bash
docker compose down
```
