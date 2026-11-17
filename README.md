# Llopart Euroconsejo · Mapa animado de inmuebles

Vista isométrica 3D y animada de la cartera de inmuebles gestionados. Cada casa, piso, local o nave aparece en un barrio
con tráfico, peatones, grúa en las obras y sombras de nubes. Al hacer clic en un inmueble (o en su tarjeta de la
cartera) se abre su ficha con todos los detalles.

## Qué incluye

- **Escena 3D isométrica** (Three.js): 10 inmuebles de ejemplo de 8 tipos (chalet, adosados, edificio, ático, piso,
  local, oficinas y nave), cada uno con su modelo propio. Marcador flotante y borde de parcela con el color de su estado.
- **Animaciones**: entrada de los edificios, coches y furgonetas circulando, peatones, grúa trabajando en el piso en
  reforma, agua de las piscinas, árboles moviéndose y sombras de nubes.
- **Ficha del inmueble**: tipo y referencia, dirección, estado (alquilado / disponible / en reforma / reservado),
  propietario, renta, superficie, habitaciones, baños, año, certificado energético, inquilino y progreso del contrato,
  avance y presupuesto de la reforma, cobros de los últimos 6 meses, incidencias, características y próximo hito.
- **Panel de control**: KPIs (inmuebles, ocupación, renta mensual, incidencias), buscador, filtros por estado,
  actividad reciente, modo día/noche (las ventanas y farolas se encienden), zoom y vista general.
- Adaptado a móvil (la ficha se abre como hoja inferior).

## Uso

```bash
npm install
npm run dev          # servidor de desarrollo en http://localhost:5173
npm run build        # versión para publicar en dist/
npm run build:single # un único index.html autocontenido en dist-single/ (para compartir la demo)
```

## Datos

Los datos son **de ejemplo** y están en [`src/data.js`](src/data.js). Para usar la cartera real basta con sustituir el
array `PROPERTIES` (mismos campos) o cargarlo desde una API/JSON. La posición `position: [x, z]` coloca cada inmueble
en el mapa (las calles pasan por x = 0, z = 0 y el anillo exterior en ±28).

## Estructura

| Archivo | Contenido |
| --- | --- |
| `index.html` | Maquetación del panel |
| `src/main.js` | KPIs, filtros, buscador, ficha y controles |
| `src/scene.js` | Escena 3D, cámara, tráfico, interacción y modo noche |
| `src/builders.js` | Modelos low-poly de cada tipo de inmueble, vehículos y peatones |
| `src/data.js` | Inmuebles y actividad de ejemplo |
| `src/styles.css` | Estilos (claro/oscuro, responsive) |
