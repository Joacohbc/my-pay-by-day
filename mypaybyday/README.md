# mypaybyday (Backend)

Backend del proyecto, construido con [Quarkus](https://quarkus.io/) (Java 17).

## Correr en modo desarrollo

```bash
./mvnw quarkus:dev
```

Dev UI disponible en: http://localhost:8080/q/dev/

## Empaquetar

```bash
./mvnw package
java -jar target/quarkus-app/quarkus-run.jar
```

## Formateo

Las reglas de formato estan definidas en [FORMATTER.md](FORMATTER.md). A continuacion un resumen de como aplicarlas:

### EditorConfig (automatico)

El `.editorconfig` aplica indentacion y trailing whitespace automaticamente en el IDE. Para aplicarlo masivamente:

```bash
npx editorconfig-checker   # validar
npx eclint fix              # corregir
```

### Import sorting (automatico)

```bash
./mvnw impsort:sort    # ordenar imports
./mvnw impsort:check   # solo validar
```

### Reglas manuales de Java

Estas reglas se aplican manualmente al escribir codigo. Ver [FORMATTER.md](FORMATTER.md) para ejemplos detallados:

1. Llaves K&R (misma linea)
2. Sin limite de ancho de linea
3. Espacio despues de coma y antes de parentesis en control de flujo
4. Dos lineas en blanco entre metodos
5. Linea en blanco despues de la llave de apertura de clase
6. Sin linea en blanco antes de `return`
7. Sin llaves en `if`/`for`/`while` de una sola linea
8. Cada anotacion en su propia linea
9. Method chaining: cada llamada en su propia linea
10. Javadoc: `@throws`/`@param` en la misma linea que su descripcion
