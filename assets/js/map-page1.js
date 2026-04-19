(function () {
  const START_YEAR = 2000;
  const END_YEAR = 2024;
  const SOURCE_ID = "ntl-raster-source";
  const LAYER_ID = "ntl-raster-layer";

  const yearInsights = {
    2000: "Early baseline: major light cores are concentrated in North America, Europe, and East Asia.",
    2005: "Manufacturing and infrastructure expansion starts to brighten selected Asian corridors.",
    2010: "Rapid urbanization and inter-city linkages make more continuous light belts visible.",
    2015: "Regional differences become sharper, with strong growth in South and Southeast Asia.",
    2020: "Growth remains active, while some mature regions show slower intensity increases.",
    2024: "Mature cores persist and emerging regions show wider, connected expansion patterns."
  };

  function getInsight(year) {
    if (yearInsights[year]) {
      return yearInsights[year];
    }
    const nearest = [2000, 2005, 2010, 2015, 2020, 2024]
      .sort((a, b) => Math.abs(a - year) - Math.abs(b - year))[0];
    return yearInsights[nearest];
  }

  function buildTilesetMapping(prefix) {
    const mapping = {};
    for (let year = START_YEAR; year <= END_YEAR; year += 1) {
      mapping[year] = `${prefix}${year}`;
    }
    return mapping;
  }

  async function loadTilesetMapping(tilesetMapPath, fallbackPrefix) {
    if (!tilesetMapPath) {
      return buildTilesetMapping(fallbackPrefix);
    }

    try {
      const response = await fetch(tilesetMapPath);
      if (!response.ok) {
        throw new Error("tileset mapping fetch failed");
      }
      return response.json();
    } catch (error) {
      console.warn("Use fallback tileset mapping:", error);
      return buildTilesetMapping(fallbackPrefix);
    }
  }

  function parseAvailableYears(tilesetsByYear) {
    return Object.keys(tilesetsByYear)
      .map((year) => Number(year))
      .filter((year) => Number.isInteger(year))
      .sort((a, b) => a - b);
  }

  function findNearestYear(targetYear, availableYears) {
    return availableYears.reduce((bestYear, candidateYear) => {
      if (Math.abs(candidateYear - targetYear) < Math.abs(bestYear - targetYear)) {
        return candidateYear;
      }
      return bestYear;
    }, availableYears[0]);
  }

  function ensureRasterLayer(map, tilesetId) {
    if (map.getLayer(LAYER_ID)) {
      map.removeLayer(LAYER_ID);
    }
    if (map.getSource(SOURCE_ID)) {
      map.removeSource(SOURCE_ID);
    }

    map.addSource(SOURCE_ID, {
      type: "raster",
      url: `mapbox://${tilesetId}`,
      tileSize: 256
    });

    map.addLayer({
      id: LAYER_ID,
      type: "raster",
      source: SOURCE_ID,
      paint: {
        // Keep the same mapping structure, only switch to yellow palette.
        "raster-color-mix": [0.2126, 0.7152, 0.0722, 0],
        "raster-color-range": [0, 0.08],
        "raster-color": [
          "interpolate",
          ["linear"],
          ["raster-value"],
          0,
          "rgba(255, 242, 120, 0)",
          0.0002,
          "rgba(255, 244, 160, 0.3)",
          0.001,
          "rgba(255, 238, 120, 0.56)",
          0.005,
          "rgba(255, 230, 80, 0.8)",
          0.02,
          "rgba(255, 224, 40, 0.95)",
          0.08,
          "rgba(255, 215, 0, 1)"
        ],
        "raster-opacity": 1,
        "raster-contrast": 0.75,
        "raster-saturation": 0.5,
        "raster-brightness-min": 0,
        "raster-brightness-max": 1,
        // Keep raster visible under Mapbox Standard night light preset.
        "raster-emissive-strength": 1,
        "raster-resampling": "nearest",
        "raster-fade-duration": 0
      }
    });
  }

  function createRegionButtons(regions, onJump) {
    const wrapper = document.getElementById("regionButtons");
    wrapper.innerHTML = "";

    regions.forEach((region) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm btn-outline-info";
      btn.textContent = region.label;
      btn.addEventListener("click", () => onJump(region));
      wrapper.appendChild(btn);
    });
  }

  async function loadRegions(regionsPath) {
    const response = await fetch(regionsPath);
    if (!response.ok) {
      throw new Error(`Failed to load regions from ${regionsPath}`);
    }
    return response.json();
  }

  window.NightLightsMap = {
    async init(config) {
      const yearLabelEl = document.getElementById("yearLabel");
      const yearRangeEl = document.getElementById("yearRange");
      const yearInsightEl = document.getElementById("yearInsight");
      const playPauseBtn = document.getElementById("playPauseBtn");

      mapboxgl.accessToken = config.mapboxToken;
      const map = new mapboxgl.Map({
        container: "mapContainer",
        style: config.baseStyle,
        center: [105, 30],
        zoom: 2.3,
        projection: "mercator",
        attributionControl: true
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      const tilesetsByYear = await loadTilesetMapping(
        config.tilesetMapPath,
        config.tilesetPrefix
      );
      const availableYears = parseAvailableYears(tilesetsByYear);
      if (availableYears.length === 0) {
        throw new Error("No available tilesets found in year mapping");
      }

      const minAvailableYear = availableYears[0];
      const maxAvailableYear = availableYears[availableYears.length - 1];
      yearRangeEl.min = String(minAvailableYear);
      yearRangeEl.max = String(maxAvailableYear);

      let currentYear = Number(yearRangeEl.value);
      if (currentYear < minAvailableYear || currentYear > maxAvailableYear) {
        currentYear = maxAvailableYear;
      }
      if (availableYears.length === 1) {
        playPauseBtn.disabled = true;
        playPauseBtn.textContent = "Single Year";
      }
      let autoplayHandle = null;

      const applyYear = (year) => {
        const boundedYear = Math.min(END_YEAR, Math.max(START_YEAR, year));
        const resolvedYear = tilesetsByYear[boundedYear]
          ? boundedYear
          : findNearestYear(boundedYear, availableYears);
        currentYear = resolvedYear;
        yearRangeEl.value = String(resolvedYear);
        yearLabelEl.textContent = String(resolvedYear);
        yearInsightEl.textContent = getInsight(resolvedYear);

        if (map.isStyleLoaded()) {
          ensureRasterLayer(map, tilesetsByYear[resolvedYear]);
        } else {
          map.once("load", () => ensureRasterLayer(map, tilesetsByYear[resolvedYear]));
        }
      };

      const stopAutoplay = () => {
        if (autoplayHandle) {
          window.clearInterval(autoplayHandle);
          autoplayHandle = null;
        }
        playPauseBtn.textContent = "Play";
      };

      const startAutoplay = () => {
        stopAutoplay();
        playPauseBtn.textContent = "Pause";
        autoplayHandle = window.setInterval(() => {
          const nextYear = currentYear + 1 > END_YEAR ? START_YEAR : currentYear + 1;
          applyYear(nextYear);
        }, 1300);
      };

      map.on("load", () => {
        applyYear(currentYear);
      });
      map.on("error", (event) => {
        console.error("Mapbox render/source error:", event && event.error);
      });

      yearRangeEl.addEventListener("input", (event) => {
        stopAutoplay();
        applyYear(Number(event.target.value));
      });

      playPauseBtn.addEventListener("click", () => {
        if (playPauseBtn.disabled) {
          return;
        }
        if (autoplayHandle) {
          stopAutoplay();
          return;
        }
        startAutoplay();
      });

      try {
        const regions = await loadRegions(config.regionsPath);
        createRegionButtons(regions, (region) => {
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
        resize() {
          map.resize();
        },
        destroy() {
          stopAutoplay();
          map.remove();
        }
      };
    }
  };
})();
