# Formatter

## .editorconfig

El archivo `.editorconfig` define las reglas de formato base del proyecto. Los IDEs (VS Code, IntelliJ, etc.) lo aplican automaticamente al editar archivos.

### Reglas configuradas

| Tipo de archivo | Indentacion | Tamaño | Trailing whitespace | Newline final |
|---|---|---|---|---|
| `*.java` | Tabs | 4 | Eliminado | Si |
| `*.xml` | Spaces | 4 | Eliminado | Si |
| `*.yml` / `*.yaml` | Spaces | 2 | Eliminado | Si |
| `*.properties` | Spaces | 4 | Eliminado | Si |

### Aplicar a todos los archivos

El `.editorconfig` solo aplica al editar archivos en el IDE. Para aplicarlo masivamente a todos los archivos existentes:

```bash
npm install -g eclint
eclint fix
```

O para solo validar cuales archivos no cumplen:

```bash
npx editorconfig-checker
```

## Import Sorting (impsort-maven-plugin)

El plugin `impsort-maven-plugin` ordena y limpia los imports de Java.

### Orden de imports

1. `java.*`
2. `javax.*`
3. `jakarta.*`
4. Todo lo demas

Los imports estaticos van al final, con el mismo orden de agrupacion. Los imports no usados se eliminan automaticamente.

### Comandos

```bash
# Ordenar y limpiar imports
./mvnw impsort:sort

# Solo validar sin cambiar nada
./mvnw impsort:check
```
