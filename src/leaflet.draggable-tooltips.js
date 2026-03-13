(function (factory) {
    if (typeof define === "function" && define.amd) {
        define(["leaflet"], factory)
    } else if (typeof module !== "undefined" && module.exports) {
        module.exports = factory(require("leaflet"))
    } else {
        factory(window.L)
    }
})(function (L) {
    "use strict"
    const DraggableTooltipHandler = L.Handler.extend({
        initialize: function (marker) {
            this._marker = marker
            this._tooltip = null

            this._tooltipLatLng = null // Position of the tooltip (null = next/close to marker)

            this._pinned = false

            this._isDragging = false
            this._mapDraggingWasEnabled = true
            this._dragStartClientX = 0
            this._dragStartClientY = 0
            this._dragStartLatLng = null

            this._mousedownHandler = null
            this._tooltipClickHandler = null
            this._mousemoveHandler = null
            this._mouseupHandler = null


            L.setOptions(this, L.extend({}, this.options, marker.options.draggableTooltipOptions || {}))
        },

        addHooks: function () {
            this._marker.on("tooltipopen", this._onTooltipOpen, this)
            this._marker.on("tooltipclose", this._onTooltipClose, this)
            this._marker.on("click", this._onMarkerClick, this)
            this._marker.on("dblclick", this._onMarkerDblClick, this)

            const existing = this._marker.getTooltip()
            if (existing && this._marker.isTooltipOpen && this._marker.isTooltipOpen()) {
                this._onTooltipOpen({ tooltip: existing })
            }
        },

        removeHooks: function () {
            this._marker.off("tooltipopen", this._onTooltipOpen, this)
            this._marker.off("tooltipclose", this._onTooltipClose, this)
            this._marker.off("click", this._onMarkerClick, this)
            this._marker.off("dblclick", this._onMarkerDblClick, this)

            this._cleanup()
        },

        setTooltipLatLng: function (latlng) {
            this._tooltipLatLng = latlng ? L.latLng(latlng) : null
            if (this._tooltip) {
                this._updateTooltipPosition()
            }
        },

        resetTooltipPosition: function () {
            this.setTooltipLatLng(null)
        },

        getTooltipLatLng: function () {
            return this._tooltipLatLng ? L.latLng(this._tooltipLatLng) : null
        },

        _pinTooltip: function () {
            if (this._pinned) return
            const tooltip = this._marker.getTooltip()
            if (!tooltip) return

            this._pinned = true

            // Intercept close() so nothing (mouseout, map click, other markers) can close it
            if (!tooltip._pinnedOriginalClose) {
                const handler = this
                const originalClose = tooltip.close.bind(tooltip)
                tooltip._pinnedOriginalClose = originalClose
                tooltip.close = function () {
                    if (handler._pinned) return  // silently block while pinned
                    originalClose()
                }
            }

            if (!this._marker.isTooltipOpen()) {
                this._marker.openTooltip()
            }
        },

        _unpinTooltip: function () {
            if (!this._pinned) return
            this._pinned = false
            const tooltip = this._marker.getTooltip()
            if (!tooltip) return

            // Restore close() first, THEN close — so the close actually goes through
            if (tooltip._pinnedOriginalClose) {
                tooltip.close = tooltip._pinnedOriginalClose
                delete tooltip._pinnedOriginalClose
            }

            this._marker.closeTooltip()
        },

        _onMarkerClick: function (e) {
            L.DomEvent.stop(e)
            if (this._pinned) {
                this._unpinTooltip()
            } else {
                this._pinTooltip()
            }
        },

        _onMarkerDblClick: function (e) {
            L.DomEvent.stop(e) // Prevent map zooming when double-clicking the marker because is annoying but is not really necessary
        },

        _onTooltipOpen: function (e) {
            const tooltip = e.tooltip
            const map = this._marker._map

            if (!map || !tooltip) return

            this._tooltip = tooltip

            // to set custom tooltip position if tooltipLatLng option is set
            if (!this._tooltipLatLng && this._marker.options.tooltipLatLng) {
                this._tooltipLatLng = L.latLng(this._marker.options.tooltipLatLng)
            }

            // Patch the tooltip so our custom LatLng overrides default positioning.
            this._patchTooltip(tooltip)
            this._updateTooltipPosition()

            // Enable drag behaviour on the tooltip element.
            this._makeDraggable(tooltip, map)
        },

        _onTooltipClose: function () {
            if (this._pinned) return  // safety guard, shouldn't reach here while pinned
            this._cleanup()
        },
        // Override `tooltip._updatePosition` so that, when a custom LatLng is set,
        // it is used instead of the marker's LatLng.  The original method is stored
        // and restored during cleanup.
        _patchTooltip: function (tooltip) {
            if (tooltip._draggableTooltipPatched) return

            tooltip._draggableTooltipPatched = true

            const handler = this
            const originalUpdatePosition = tooltip._updatePosition.bind(tooltip)
            tooltip._originalUpdatePosition = originalUpdatePosition

            tooltip._updatePosition = function () {
                if (handler._tooltipLatLng && this._map) {
                    const position = this._map.latLngToLayerPoint(handler._tooltipLatLng)
                    if (typeof this._setPosition === "function") {
                        // In newer Leaflet versions, the tooltip instance itself has a setPosition method that handles offsets and map pane transformations, so use that if available.
                        this._setPosition(position)
                    } else {
                        // Fallback for older Leaflet versions that don't have setPosition on the tooltip instance itself.
                        const offset = L.point(this.options.offset || [0, 0])
                        L.DomUtil.setPosition(this._container, position.add(offset))
                    }
                } else {
                    originalUpdatePosition()
                }
            }

        },

        _unpatchTooltip: function (tooltip) {
            if (!tooltip || !tooltip._draggableTooltipPatched) return
            if (tooltip._originalUpdatePosition) {
                tooltip._updatePosition = tooltip._originalUpdatePosition
                delete tooltip._originalUpdatePosition
            }

            delete tooltip._draggableTooltipPatched
        },

        _updateTooltipPosition: function () {
            if (this._tooltip && this._tooltip._map) {
                this._tooltip._updatePosition()
            }
        },

        _makeDraggable: function (tooltip, map) {
            const container = tooltip._container
            if (!container || container._draggableTooltipBound) return

            container._draggableTooltipBound = true
            container.classList.add("leaflet-tooltip-draggable")

            const handler = this

            this._mousedownHandler = function (e) {
                handler._startDrag(e, map)
            }

            // Prevent clicks on the tooltip from bubbling up to the marker and
            // accidentally triggering _onMarkerClick (which would unpin/close it).
            this._tooltipClickHandler = function (e) {
                L.DomEvent.stopPropagation(e)
            }

            L.DomEvent.on(container, "mousedown", this._mousedownHandler)
            L.DomEvent.on(container, "click", this._tooltipClickHandler)
        },

        _removeDraggable: function () {
            const tooltip = this._tooltip

            if (tooltip && tooltip._container) {
                tooltip._container.classList.remove("leaflet-tooltip-draggable")
                delete tooltip._container._draggableTooltipBound

                if (this._mousedownHandler) {
                    L.DomEvent.off(tooltip._container, "mousedown", this._mousedownHandler)
                }
                if (this._tooltipClickHandler) {
                    L.DomEvent.off(tooltip._container, "click", this._tooltipClickHandler)
                }
            }

            this._mousedownHandler = null
            this._tooltipClickHandler = null
            this._clearDocumentListeners()
        },

        _startDrag: function (e, map) {
            L.DomEvent.stop(e)

            this._isDragging = true
            this._mapDraggingWasEnabled = map.dragging.enabled()
            map.dragging.disable()


            const position = e.touches && e.touches.length > 0 ? e.touches[0] : e
            this._dragStartClientX = position.clientX
            this._dragStartClientY = position.clientY


            this._dragStartLatLng = this._tooltipLatLng
                ? L.latLng(this._tooltipLatLng)
                : L.latLng(this._marker.getLatLng())

            const handler = this

            this._mousemoveHandler = function (e) {
                if (!handler._isDragging) return

                e.preventDefault()
                handler._onDragMove(e, map)
            }

            this._mouseupHandler = function (e) {
                handler._endDrag(map)
            }

            L.DomEvent.on(document, "mousemove", this._mousemoveHandler)

            document.addEventListener("touchmove", this._mousemoveHandler, {
                passive: false,
            })

            L.DomEvent.on(document, "mouseup", this._mouseupHandler)
            L.DomEvent.on(document, "touchend", this._mouseupHandler)

            this._marker.fire("tooltipdragstart", {
                latlng: L.latLng(this._dragStartLatLng),
                marker: this._marker,
                tooltip: this._tooltip,
            })
        },

        _onDragMove: function (e, map) {
            const position = e.touches && e.touches.length > 0 ? e.touches[0] : e
            const deltaX = position.clientX - this._dragStartClientX
            const deltaY = position.clientY - this._dragStartClientY

            // Convert the drag origin to a container pixel, apply the deltas, then
            // convert back to LatLng.
            const originPoint = map.latLngToContainerPoint(this._dragStartLatLng || this._marker.getLatLng())
            const newPoint = L.point(originPoint.x + deltaX, originPoint.y + deltaY)

            this._tooltipLatLng = map.containerPointToLatLng(newPoint)
            this._updateTooltipPosition()

            this._marker.fire("tooltipdrag", {
                latlng: L.latLng(this._tooltipLatLng),
                marker: this._marker,
                tooltip: this._tooltip,
            })
        },

        _endDrag: function (map) {
            if (!this._isDragging) {
                return
            }
            this._isDragging = false

            if (this._mapDraggingWasEnabled) {
                map.dragging.enable()
            }

            this._clearDocumentListeners()

            this._marker.fire("tooltipdragend", {
                latlng: this._tooltipLatLng ? L.latLng(this._tooltipLatLng) : null,
                marker: this._marker,
                tooltip: this._tooltip,
            })
        },

        _clearDocumentListeners: function () {
            if (this._mousemoveHandler) {
                L.DomEvent.off(document, "mousemove", this._mousemoveHandler)
                document.removeEventListener("touchmove", this._mousemoveHandler)
                this._mousemoveHandler = null
            }
            if (this._mouseupHandler) {
                L.DomEvent.off(document, "mouseup", this._mouseupHandler)
                L.DomEvent.off(document, "touchend", this._mouseupHandler)
                this._mouseupHandler = null
            }
        },

        _cleanup: function () {
            // Restore close() intercept if cleanup is called while tooltip still exists
            if (this._tooltip && this._tooltip._pinnedOriginalClose) {
                this._tooltip.close = this._tooltip._pinnedOriginalClose
                delete this._tooltip._pinnedOriginalClose
            }
            this._pinned = false
            this._removeDraggable()
            this._unpatchTooltip(this._tooltip)
            this._tooltip = null
            this._isDragging = false
            this._dragStartLatLng = null
        },
    })


    L.Marker.addInitHook(function () {
        if (this.options.draggableTooltip) {
            this.draggableTooltip = new DraggableTooltipHandler(this)
            this.draggableTooltip.enable()
        }
    })

    L.DraggableTooltipHandler = DraggableTooltipHandler

    return L
})
