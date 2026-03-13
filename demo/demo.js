// ─── Map setup ─────────────────────────────────────────────────────────────
const map = L.map("map").setView([48.2, 11.0], 5)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map)

// ─── Markers ───────────────────────────────────────────────────────────────
const markers = [
    {
        latlng: [48.8566, 2.3522],
        label: "📍 Paris",
        tooltipLatLng: [49.1, 3.2], // pre-set detached position
    },
    {
        latlng: [51.5074, -0.1278],
        label: "📍 London",
    },
    {
        latlng: [52.52, 13.405],
        label: "📍 Berlin",
    },
    {
        latlng: [41.9028, 12.4964],
        label: "📍 Rome",
    },
    {
        latlng: [40.4168, -3.7038],
        label: "📍 Madrid",
    },
]

const logEl = document.getElementById("event-log")
const emptyEl = document.getElementById("log-empty")

markers.forEach(({ latlng, label, tooltipLatLng }) => {
    const marker = L.marker(latlng, {
        draggableTooltip: true,
        ...(tooltipLatLng ? { tooltipLatLng } : {}),
    }).addTo(map)

    marker.bindTooltip(label, {
        offset: [0, -10],
    })

    // ─── Event log ─────────────────────────────────────────────────────────
    let dragLogEntry = null

    marker.on("tooltipdragstart", function () {
        if (emptyEl) emptyEl.remove()
        dragLogEntry = document.createElement("div")
        dragLogEntry.className = "log-entry dragstart"
        dragLogEntry.innerHTML = `<span class="event-name">dragstart</span> · ${label.replace("📍 ", "")}`
        logEl.prepend(dragLogEntry)
    })

    marker.on("tooltipdrag", function (ev) {
        if (!dragLogEntry) return
        const lat = ev.latlng.lat.toFixed(4)
        const lng = ev.latlng.lng.toFixed(4)
        dragLogEntry.className = "log-entry drag"
        dragLogEntry.innerHTML = `<span class="event-name">drag</span> · ${label.replace("📍 ", "")} [${lat}, ${lng}]`
    })

    marker.on("tooltipdragend", function (ev) {
        if (!dragLogEntry) return
        const lat = ev.latlng ? ev.latlng.lat.toFixed(4) : "—"
        const lng = ev.latlng ? ev.latlng.lng.toFixed(4) : "—"
        dragLogEntry.className = "log-entry dragend"
        dragLogEntry.innerHTML = `<span class="event-name">dragend</span> · ${label.replace("📍 ", "")} [${lat}, ${lng}]`
        dragLogEntry = null
    })
})
