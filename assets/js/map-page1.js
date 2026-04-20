/**
 * map-page1.js — Mapbox GL map for the "Global Nighttime Lights" section.
 * Loads raster tiles, overlays continent boundaries with hover stats,
 */
(function () {
  // Currently locked to a single year; extend later if a timeline is added
  const FIXED_YEAR = 2024;

  // Mapbox source/layer identifiers
  const SOURCE_ID = "ntl-raster-source";
  const LAYER_ID = "ntl-raster-layer";

  const CONTINENT_SOURCE = "continent-source";
  const CONTINENT_LINE = "continent-line";
  const CONTINENT_TILESET = "owlpakka.dnzapjz2";
  const CONTINENT_SOURCE_LAYER = "_join-daqxr6";

  // Static positions for continent name labels and leader lines
  const CONTINENT_LABELS = [
    { name: "Asia",          labelPos: [72, 52],    anchorPos: [85, 35],   anchor: "bottom" },
    { name: "North America", labelPos: [-118, 58],  anchorPos: [-100, 45], anchor: "bottom" },
    { name: "Europe",        labelPos: [-5, 62],    anchorPos: [15, 52],   anchor: "bottom" },
    { name: "Africa",        labelPos: [8, -18],    anchorPos: [22, 5],    anchor: "top" },
    { name: "South America", labelPos: [-78, -38],  anchorPos: [-60, -18], anchor: "top" },
    { name: "Oceania",       labelPos: [176, -30],  anchorPos: [170, -18], anchor: "top" },
    { name: "Australia",     labelPos: [115, -42],  anchorPos: [134, -26], anchor: "top" },
    { name: "Antarctica",    labelPos: [0, -72],    anchorPos: [0, -78],   anchor: "top" }
  ];

  /* ──────────────────────────────────────────
     Tileset mapping (year → Mapbox tileset ID)
     ────────────────────────────────────────── */

  // Fallback: generate IDs from a prefix when the JSON file is unavailable
  function buildTilesetMapping(prefix) {
    const mapping = {};
    for (let year = 2000; year <= 2024; year += 1) {
      mapping[year] = `${prefix}${year}`;
    }
    return mapping;
  }

  // Try to load the mapping from a JSON file, fall back to generated IDs
  async function loadTilesetMapping(tilesetMapPath, fallbackPrefix) {
    if (!tilesetMapPath) {
      return buildTilesetMapping(fallbackPrefix);
    }
    try {
      const response = await fetch(tilesetMapPath);
      if (!response.ok) throw new Error("tileset mapping fetch failed");
      return response.json();
    } catch (error) {
      console.warn("Use fallback tileset mapping:", error);
      return buildTilesetMapping(fallbackPrefix);
    }
  }

  /* ──────────────────────────────────────────
     NTL raster layer
     ────────────────────────────────────────── */

  // Swap the raster source/layer to display a given tileset
  function ensureRasterLayer(map, tilesetId) {
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

    map.addSource(SOURCE_ID, {
      type: "raster",
      url: `mapbox://${tilesetId}`,
      tileSize: 256
    });

    // Custom colour ramp: dark → blue → green → yellow to visualise brightness
    map.addLayer({
      id: LAYER_ID,
      type: "raster",
      source: SOURCE_ID,
      paint: {
        "raster-color-mix": [0.2126, 0.7152, 0.0722, 0],
        "raster-color-range": [0, 0.08],
        "raster-color": [
          "interpolate",
          ["linear"],
          ["raster-value"],
          0,      "rgba(8, 12, 50, 0)",
          0.0002, "rgba(10, 30, 100, 0.4)",
          0.001,  "rgba(0, 60, 140, 0.6)",
          0.003,  "rgba(0, 110, 100, 0.75)",
          0.008,  "rgba(20, 170, 60, 0.85)",
          0.02,   "rgba(120, 210, 40, 0.92)",
          0.05,   "rgba(220, 235, 30, 0.97)",
          0.08,   "rgba(255, 240, 60, 1)"
        ],
        "raster-opacity": 1,
        "raster-contrast": 0.75,
        "raster-saturation": 0.5,
        "raster-brightness-min": 0,
        "raster-brightness-max": 1,
        "raster-emissive-strength": 1,
        "raster-resampling": "nearest",
        "raster-fade-duration": 0
      }
    });
  }

  /* ──────────────────────────────────────────
     Continent vector layers
     ────────────────────────────────────────── */

  // The Studio style may include its own continent layers; remove them
  function removeStudioContinentLayers(map) {
    const layers = map.getStyle().layers || [];
    for (const layer of layers) {
      if (!layer["source-layer"]) continue;
      if (layer["source-layer"] === CONTINENT_SOURCE_LAYER ||
          layer["source-layer"] === "join-daqxr6") {
        map.removeLayer(layer.id);
      }
    }
  }

  // Add continent outlines as a line layer (no fill to keep the basemap visible)
  function addContinentLayers(map) {
    map.addSource(CONTINENT_SOURCE, {
      type: "vector",
      url: `mapbox://${CONTINENT_TILESET}`,
      promoteId: "OBJECTID"
    });

    // Line is hidden by default; shown per-continent on hover via setFilter
    map.addLayer({
      id: CONTINENT_LINE,
      type: "line",
      source: CONTINENT_SOURCE,
      "source-layer": CONTINENT_SOURCE_LAYER,
      paint: {
        "line-color": "#ff4444",
        "line-width": 0.8,
        "line-opacity": 0.9,
        "line-emissive-strength": 1
      },
      filter: ["==", "CONTINENT", ""]
    });
  }

  /* ──────────────────────────────────────────
     Continent annotations (leader lines + labels)
     ────────────────────────────────────────── */

  function addContinentAnnotations(map) {
    const lineFeatures = [];
    const labelFeatures = [];

    CONTINENT_LABELS.forEach((c) => {
      // Leader line from the continent body to the label position
      lineFeatures.push({
        type: "Feature",
        properties: { name: c.name },
        geometry: {
          type: "LineString",
          coordinates: [c.anchorPos, c.labelPos]
        }
      });
      // Label point at the end of the leader line
      labelFeatures.push({
        type: "Feature",
        properties: { name: c.name, anchor: c.anchor },
        geometry: {
          type: "Point",
          coordinates: c.labelPos
        }
      });
    });

    map.addSource("continent-lines", {
      type: "geojson",
      data: { type: "FeatureCollection", features: lineFeatures }
    });
    map.addSource("continent-labels", {
      type: "geojson",
      data: { type: "FeatureCollection", features: labelFeatures }
    });

    // Dashed leader lines
    map.addLayer({
      id: "continent-leader-lines",
      type: "line",
      source: "continent-lines",
      paint: {
        "line-color": "rgba(255, 255, 255, 0.5)",
        "line-width": 0.8,
        "line-dasharray": [4, 3],
        "line-emissive-strength": 1
      }
    });

    // Small dot at the label end of each leader line
    map.addLayer({
      id: "continent-leader-dots",
      type: "circle",
      source: "continent-labels",
      paint: {
        "circle-radius": 2.5,
        "circle-color": "rgba(255, 255, 255, 0.7)",
        "circle-stroke-width": 0,
        "circle-emissive-strength": 1
      }
    });

    // Continent name text
    map.addLayer({
      id: "continent-label-name",
      type: "symbol",
      source: "continent-labels",
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
        "text-size": 14,
        "text-anchor": [
          "case",
          ["==", ["get", "anchor"], "top"], "top",
          "bottom"
        ],
        "text-offset": [
          "case",
          ["==", ["get", "anchor"], "top"],
          ["literal", [0, 0.8]],
          ["literal", [0, -0.8]]
        ],
        "text-allow-overlap": true,
        "text-ignore-placement": true
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0, 0, 0, 0.7)",
        "text-halo-width": 1.5,
        "text-emissive-strength": 1
      }
    });
  }

  /* ──────────────────────────────────────────
     Point-in-polygon helpers (ray-casting)
     ────────────────────────────────────────── */

  // Classic ray-casting algorithm for a single polygon ring
  function pointInRing(lng, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      if ((yi > lat) !== (yj > lat) &&
          lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Supports both Polygon and MultiPolygon geometries
  function pointInFeature(lng, lat, geom) {
    if (geom.type === "Polygon") {
      return pointInRing(lng, lat, geom.coordinates[0]);
    }
    if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        if (pointInRing(lng, lat, poly[0])) return true;
      }
    }
    return false;
  }

  // Normalise longitude to [-180, 180]
  function normLng(lng) {
    return ((lng % 360) + 540) % 360 - 180;
  }

  // Test the cursor position against continent polygons,
  // accounting for antimeridian wrapping
  function hitTestFeatures(lng, lat, features) {
    const wrapped = normLng(lng);
    const candidates = [wrapped, wrapped - 360, wrapped + 360];
    for (const f of features) {
      for (const testLng of candidates) {
        if (pointInFeature(testLng, lat, f.geometry)) return f;
      }
    }
    return null;
  }

  /* ──────────────────────────────────────────
     Hover interaction (tooltip + outline)
     ────────────────────────────────────────── */

  function setupHoverInteraction(map) {
    let hoveredContinent = null;

    // Dynamic tooltip element appended to the map container
    const tooltip = document.createElement("div");
    tooltip.className = "continent-tooltip";
    document.getElementById("mapContainer").appendChild(tooltip);

    map.on("mousemove", (e) => {
      const lngLat = e.lngLat;
      // Query all loaded continent features from the vector source
      const srcFeatures = map.querySourceFeatures(CONTINENT_SOURCE, {
        sourceLayer: CONTINENT_SOURCE_LAYER
      });

      const hit = hitTestFeatures(lngLat.lng, lngLat.lat, srcFeatures);

      // Clear highlight when the cursor leaves all continents
      if (!hit) {
        if (hoveredContinent !== null) {
          hoveredContinent = null;
          map.setFilter(CONTINENT_LINE, ["==", "CONTINENT", ""]);
          map.getCanvas().style.cursor = "";
          tooltip.style.display = "none";
        }
        return;
      }

      const props = hit.properties;
      const continent = props.CONTINENT || props.CONTINEN_1 || "";

      // Update the outline filter only when the continent changes
      if (continent !== hoveredContinent) {
        hoveredContinent = continent;
        map.setFilter(CONTINENT_LINE, ["==", "CONTINENT", continent]);
      }

      map.getCanvas().style.cursor = "pointer";

      // Populate tooltip with NTL statistics for this continent
      const unit = "nW/cm\u00B2/sr";
      tooltip.style.display = "block";
      tooltip.innerHTML =
        `<strong>${continent}</strong>` +
        `<div class="ct-unit">${unit}</div>` +
        `<div class="ct-row"><span>Mean Intensity</span><span>${Number(props.MEAN).toFixed(4)}</span></div>` +
        `<div class="ct-row"><span>Total Sum</span><span>${Number(props.SUM).toLocaleString("en", { maximumFractionDigits: 0 })}</span></div>` +
        `<div class="ct-row"><span>Median</span><span>${Number(props.MEDIAN).toFixed(2)}</span></div>` +
        `<div class="ct-row"><span>Max</span><span>${Number(props.MAX).toFixed(4)}</span></div>`;

      // Position the tooltip near the cursor
      tooltip.style.left = e.point.x + 16 + "px";
      tooltip.style.top = e.point.y + 16 + "px";
    });
  }

  /* ──────────────────────────────────────────
     Region quick-jump buttons
     ────────────────────────────────────────── */

  function clearActiveRegion() {
    document.querySelectorAll(".page1-region-btn.is-active")
      .forEach((b) => b.classList.remove("is-active"));
  }

  // Build region buttons from the loaded JSON and wire up flyTo actions
  function createRegionButtons(regions, map, onJump) {
    const wrapper = document.getElementById("regionButtons");
    wrapper.innerHTML = "";

    let flyingTo = false;
    const buttons = [];

    regions.forEach((region) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "page1-region-btn";
      btn.textContent = region.label;

      if (region.id === "global") {
        btn.classList.add("is-active");
      }

      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        flyingTo = true;
        onJump(region);
      });

      buttons.push(btn);
      wrapper.appendChild(btn);
    });

    // Clear active state when the user drags the map manually
    map.on("movestart", () => {
      if (flyingTo) return;
      clearActiveRegion();
    });
    map.on("moveend", () => {
      flyingTo = false;
    });
  }

  async function loadRegions(regionsPath) {
    const response = await fetch(regionsPath);
    if (!response.ok) throw new Error(`Failed to load regions from ${regionsPath}`);
    return response.json();
  }

  /* ──────────────────────────────────────────
     Public API exposed to app.js
     ────────────────────────────────────────── */

  window.NightLightsMap = {
    async init(config) {
      mapboxgl.accessToken = config.mapboxToken;

      const map = new mapboxgl.Map({
        container: "mapContainer",
        style: config.baseStyle,
        center: [15, 18],
        zoom: 1.35,
        projection: "mercator",
        attributionControl: true
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      // Load the year → tileset ID mapping
      const tilesetsByYear = await loadTilesetMapping(
        config.tilesetMapPath,
        config.tilesetPrefix
      );

      const tilesetId = tilesetsByYear[FIXED_YEAR];
      if (!tilesetId) {
        throw new Error(`No tileset found for year ${FIXED_YEAR}`);
      }

      // Once the style is loaded, add all custom layers
      map.on("load", () => {
        removeStudioContinentLayers(map);
        ensureRasterLayer(map, tilesetId);
        addContinentLayers(map);
        addContinentAnnotations(map);
        setupHoverInteraction(map);
      });
      map.on("error", (event) => {
        console.error("Mapbox render/source error:", event && event.error);
      });

      // Load region presets and build the jump buttons
      try {
        const regions = await loadRegions(config.regionsPath);
        createRegionButtons(regions, map, (region) => {
          map.flyTo({
            center: region.center,
            zoom: region.zoom,
            speed: 0.7,
            curve: 1.25,
            essential: true
          });
        });
      } catch (error) {
        console.error(error);
      }

      return {
        map,
        resize() { map.resize(); },
        // Animate the camera to China; resolves when the flight ends
        flyToChina() {
          return new Promise((resolve) => {
            map.once("moveend", resolve);
            map.flyTo({
              center: [104.5, 35.8],
              zoom: 3.1,
              speed: 0.7,
              curve: 1.25,
              essential: true
            });
          });
        },
        destroy() { map.remove(); }
      };
    }
  };
})();
