# Formatter

## .editorconfig (automatico)

El archivo `.editorconfig` define las reglas de formato base del proyecto. Los IDEs (VS Code, IntelliJ, etc.) lo aplican automaticamente al editar archivos.

### Reglas configuradas

| Tipo de archivo | Indentacion | Tamano | Trailing whitespace | Newline final |
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

## Import Sorting (impsort-maven-plugin, automatico)

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

## Reglas de formato manual para Java

Estas reglas NO son aplicadas automaticamente por ninguna herramienta. Se deben seguir manualmente al escribir codigo.

### 1. Llaves K&R (misma linea)

La llave de apertura `{` va en la misma linea que la declaracion.

```java
// Correcto
if (x) {
	doSomething();
}

public void method() {
	// ...
}

// Incorrecto
if (x)
{
	doSomething();
}
```

### 2. Sin limite de ancho de linea

No hay un limite estricto de caracteres por linea. Usar el criterio propio para decidir cuando romper una linea.

### 3. Espacios en comas y control de flujo

- Espacio despues de coma: `foo(a, b)` no `foo(a,b)`
- Espacio antes de parentesis en control de flujo: `if (x)` no `if(x)`
- Sin espacio dentro de parentesis: `(x)` no `( x )`

### 4. Dos lineas en blanco entre metodos

```java
public void metodoA() {
	// ...
}


public void metodoB() {
	// ...
}
```

### 5. Linea en blanco despues de la llave de apertura de clase

```java
public class MiClase {

	private String campo;

	// ...
}
```

### 6. Sin linea en blanco antes de return

```java
// Correcto
public String getName() {
	String result = processName();
	return result;
}

// Incorrecto
public String getName() {
	String result = processName();

	return result;
}
```

### 7. Sin llaves en if/for/while de una sola linea

```java
// Correcto
if (x)
	doSomething();

for (int i = 0; i < n; i++)
	process(i);

// Incorrecto
if (x) {
	doSomething();
}
```

### 8. Cada anotacion en su propia linea

```java
// Correcto
@Override
@Transactional
public void method() {
	// ...
}

@Schema(description = "Name")
String name;

// Incorrecto
@Override @Transactional
public void method() {
	// ...
}
```

### 9. Method chaining: cada llamada en su propia linea

```java
// Correcto
return OpenAiChatModel
		.builder()
		.baseUrl(baseUrl)
		.apiKey(apiKey)
		.timeout(Duration.ofSeconds(timeout))
		.build();

// Incorrecto
return OpenAiChatModel.builder().baseUrl(baseUrl).apiKey(apiKey).timeout(Duration.ofSeconds(timeout)).build();
```

### 10. Javadoc: @throws/@param en la misma linea que su descripcion

```java
// Correcto
/**
 * Valida las transacciones.
 *
 * @throws BusinessException if the rule is violated
 * @param event the event to validate
 */

// Incorrecto
/**
 * @throws BusinessException
 *             if the rule is violated
 */
```
