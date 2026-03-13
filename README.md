# leaflet-draggable-tooltip

A [Leaflet](https://leafletjs.com/) plugin that makes marker tooltips draggable and pinnable. Click a marker to keep its tooltip open, then drag it anywhere on the map.

---

## Features

- **Drag tooltips** freely across the map, detached from their marker
- **Pin tooltips** open with a single click — click again to close
- **Preset position** — set an initial detached position via `tooltipLatLng` marker option
- **Survives pan & zoom** — custom position is maintained as the map moves
- **Touch support** — drag works on mobile and tablet
- **Map drag protection** — disables map panning while a tooltip is being dragged
- **Custom events** — fires `tooltipdragstart`, `tooltipdrag`, and `tooltipdragend` on the marker
- **Non-destructive** — patches tooltip internals cleanly and fully restores them on close
- **Zero dependencies** — only requires Leaflet

---

## Installation

### npm

```bash
npm install leaflet-draggable-tooltip
```

```js
import "leaflet-draggable-tooltip/src/leaflet.draggable-tooltip.js"
```

### CDN

Once published to npm, available via unpkg or jsDelivr:

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet-draggable-tooltip/src/leaflet.draggable-tooltip.css" />
<script src="https://unpkg.com/leaflet-draggable-tooltip/src/leaflet.draggable-tooltip.js"></script>
```

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet-draggable-tooltip/src/leaflet.draggable-tooltip.css" />
<script src="https://cdn.jsdelivr.net/npm/leaflet-draggable-tooltip/src/leaflet.draggable-tooltip.js"></script>
```

### Manual

Download `leaflet.draggable-tooltip.js` and `leaflet.draggable-tooltip.css` from the [releases page](https://github.com/yourname/leaflet-draggable-tooltip/releases) and include them after Leaflet:

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
<link rel="stylesheet" href="leaflet.draggable-tooltip.css" />

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="leaflet.draggable-tooltip.js"></script>
```

---

## Usage

Set `draggableTooltip: true` in the marker options. That's it.

```js
L.marker([51.5, -0.09], {
    draggableTooltip: true,
})
.bindTooltip("Drag me!")
.addTo(map)
```

### With a preset tooltip position

```js
L.marker([51.5, -0.09], {
    draggableTooltip: true,
    tooltipLatLng: [51.56, 0.02], // tooltip starts here instead of next to the marker
})
.bindTooltip("Already detached!")
.addTo(map)
```

---

## Options

Set on the marker options directly:

| Option | Type | Default | Description |
|---|---|---|---|
| `draggableTooltip` | `Boolean` | `false` | Enables the plugin on this marker |
| `tooltipLatLng` | `LatLng` | `null` | Initial detached position for the tooltip |

Additional options can be passed via `draggableTooltipOptions`:

```js
L.marker([51.5, -0.09], {
    draggableTooltip: true,
    draggableTooltipOptions: {
        // future options go here
    },
})
```

---

## API

The handler is accessible at `marker.draggableTooltip` once the plugin is enabled.

| Method | Arguments | Returns | Description |
|---|---|---|---|
| `setTooltipLatLng(latlng)` | `LatLng \| null` | — | Moves the tooltip to a given position. Pass `null` to reset |
| `resetTooltipPosition()` | — | — | Returns the tooltip to its default position next to the marker |
| `getTooltipLatLng()` | — | `LatLng \| null` | Returns the current custom position, or `null` if unset |

```js
const marker = L.marker([51.5, -0.09], { draggableTooltip: true })
    .bindTooltip("Hello")
    .addTo(map)

// Move the tooltip programmatically
marker.draggableTooltip.setTooltipLatLng([51.56, 0.02])

// Reset it back to the marker
marker.draggableTooltip.resetTooltipPosition()

// Read current position
const latlng = marker.draggableTooltip.getTooltipLatLng()
```

---

## Events

All events are fired on the marker.

| Event | Properties | Description |
|---|---|---|
| `tooltipdragstart` | `latlng`, `marker`, `tooltip` | Fired when the user starts dragging |
| `tooltipdrag` | `latlng`, `marker`, `tooltip` | Fired continuously while dragging |
| `tooltipdragend` | `latlng`, `marker`, `tooltip` | Fired when dragging ends |

```js
marker.on("tooltipdragstart", function (e) {
    console.log("drag started at", e.latlng)
})

marker.on("tooltipdrag", function (e) {
    console.log("dragging to", e.latlng)
})

marker.on("tooltipdragend", function (e) {
    console.log("drag ended at", e.latlng)
    // persist the position somewhere
    savePosition(e.latlng)
})
```

---

## Interaction model

| Action | Result |
|---|---|
| Hover marker | Tooltip appears (standard Leaflet behaviour) |
| Move cursor away | Tooltip closes (standard Leaflet behaviour) |
| Click marker | Tooltip pins open — stays visible regardless of hover |
| Click marker again | Tooltip unpins and closes |
| Drag pinned tooltip | Tooltip detaches and moves freely on the map |
| Pan / zoom map | Tooltip stays at its custom position |

---

## Styling

The plugin adds a `leaflet-tooltip-draggable` class to the tooltip container while it is draggable. Use it to customise the cursor or appearance:

```css
.leaflet-tooltip-draggable {
    cursor: grab;
}

.leaflet-tooltip-draggable:active {
    cursor: grabbing;
}
```

---

## Browser support

All modern browsers. Requires Leaflet 1.x.

---

## License

MIT
