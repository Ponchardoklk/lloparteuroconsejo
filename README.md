# Llopart Euroconsejo · Mapa animado de inmuebles

Vista isométrica 3D y animada de la cartera de inmuebles gestionados, repartida en sus dos zonas: **Barcelona** (barrio
urbano con tráfico, peatones y grúa en las obras) y **Puigcerdà** (pueblo de montaña con el estany, el campanar, casas de
piedra y pizarra, pinos, humo en las chimeneas, nieve y el Pirineo al fondo), unidas por una carretera. Al hacer clic en un inmueble (o en su tarjeta de la
cartera) se abre su ficha con todos los detalles.

## Qué incluye

- **Dos zonas** con selector en la barra superior: Barcelona, Puigcerdà o ambas a la vez. Los KPIs, filtros y el listado
  se ajustan a la zona elegida; al abrir un inmueble de otra zona la cámara viaja hasta él.
- **Escena 3D isométrica** (Three.js): 10 inmuebles de ejemplo (chalets, adosados, edificio, ático, pisos, local,
  oficinas y casa de pueblo), cada uno con su modelo propio. Marcador flotante y borde de parcela con el color de su estado.
- **Animaciones**: entrada de los edificios, coches y furgonetas circulando, peatones, grúa trabajando en el piso en
  reforma, agua de las piscinas, árboles moviéndose y sombras de nubes.
- **Ficha del inmueble**: lo esencial para gestionar el alquiler. Inquilino con teléfono y correo (con botón de copiar)
  y las condiciones del contrato: renta, vencimiento, próxima revisión anual y fianza depositada en l'INCASÒL. En
  edificios o adosados con varios contratos se ven el resumen y la lista de inquilinos desplegable.
- **Biblioteca y contabilidad de cada inmueble** (botón en la ficha):
  - *Documentos*: carpetas tipo Dropbox (contratos y fianzas, recibos de alquiler, comunidad, honorarios, impuestos,
    seguros, suministros, mantenimiento, obras y otros), ordenadas por mes, con buscador, orden, vista previa de cada
    factura (base, IVA, total y estado) y subida de archivos con botón o arrastrando.
  - *Contabilidad*: por año, ingresos cobrados, gastos, resultado neto y pendiente de cobro; gráfico mensual de
    ingresos y gastos, gastos por categoría y lista de movimientos enlazada a su documento. Se pueden añadir gastos
    y exportar a CSV.
  - Los archivos y gastos que se añaden se guardan en el navegador (IndexedDB, `src/store.js`). Para compartirlos
    entre varias personas hay que conectar esa capa a un servidor o almacenamiento en la nube.
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
array `PROPERTIES` (mismos campos) o cargarlo desde una API/JSON. Cada inmueble indica su `zone` (`bcn` o `pcd`, ver
`ZONES`) y `position: [x, z]` relativa al centro de esa zona (en las dos las calles pasan por x = 0 y z = 0; Barcelona
tiene además el anillo exterior en ±28).

## Estructura

| Archivo | Contenido |
| --- | --- |
| `index.html` | Maquetación del panel |
| `src/main.js` | KPIs, filtros, buscador, ficha y controles |
| `src/scene.js` | Escena 3D, cámara, tráfico, interacción y modo noche |
| `src/builders.js` | Modelos low-poly de cada tipo de inmueble, vehículos y peatones |
| `src/town.js` | Puigcerdà: estany, campanar, casas, pinos, montañas y nieve |
| `src/paths.js` | Recorridos de los vehículos |
| `src/data.js` | Inmuebles, contratos y actividad de ejemplo |
| `src/ledger.js` | Movimientos y documentos de ejemplo de cada inmueble, resumen contable |
| `src/library.js` | Biblioteca de documentos y contabilidad |
| `src/store.js` | Guardado de archivos y gastos añadidos (IndexedDB) |
| `src/styles.css` | Estilos (claro/oscuro, responsive) |
