# Palabrea

Juego de adivinar una palabra de 5 letras en español en 6 intentos. Hecho con HTML, CSS y JavaScript, sin librerías ni instalación.

## Estructura

```
palabrea/
├── index.html        Estructura: cabecera, tablero, teclado y ventanas
├── css/
│   └── styles.css    Colores, animaciones, modo oscuro y diseño para móvil
├── js/
│   ├── palabras.js   Lista de soluciones (≈430) y de palabras aceptadas (≈17.500)
│   └── app.js        Lógica del juego, teclado, estadísticas y compartir
└── README.md
```

`palabras.js` se carga antes que `app.js`, porque el juego necesita las listas para funcionar.

## Cómo usarlo

1. Descomprime el .zip.
2. Abre `index.html` con doble clic.

## Reglas

| Color | Significado |
|---|---|
| Verde | La letra está en la palabra y en su sitio |
| Ámbar | La letra está en la palabra, en otra posición |
| Gris | La letra no está en la palabra |

- Las tildes no cuentan (escribir "árbol" equivale a "arbol"). La Ñ es una letra propia.
- **Palabra del día:** la misma para todo el mundo, cambia a medianoche.
- **Partida libre:** palabra al azar, sin límite de partidas.

## Personalizar

- **Añadir soluciones:** edita el array `SOLUCIONES` en `js/palabras.js`. Cada palabra debe tener 5 letras, en minúscula y sin tildes.
- **Cambiar colores:** modifica `--acierto`, `--presente` y `--ausente` en `css/styles.css`.

## Datos

Las estadísticas y la partida del día se guardan en el `localStorage` del navegador: se mantienen al cerrar la página, pero solo en ese navegador y ese equipo.
