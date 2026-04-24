/**
 * app.js — Main entry point.
 * Wires together fullPage.js navigation, the Mapbox map,
 * and all interactive UI controls on the page.
 */
(function () {
  // Central configuration shared across modules
  const APP_CONFIG = {
    mapboxToken:
      "pk.eyJ1Ijoib3dscGFra2EiLCJhIjoiY21razJ3NTZqMG5sczNlc2RxZXJ3cmNudiJ9.CBNIbaI7xhTZ8GeNWqczqQ",
    baseStyle: "mapbox://styles/owlpakka/cmo5ykdcy016001qv9rnzhlhd",
    tilesetPrefix: "group11.ntl_",
    tilesetMapPath: "./assets/data/year-tilesets.json",
    regionsPath: "./assets/data/regions.json"
  };

  // Key DOM elements
  const startBtn = document.getElementById("startExploringBtn");
  const zoomChinaBtn = document.getElementById("zoomChinaBtn");
  const tokenWarning = document.getElementById("tokenWarning");

  let fullpageApi;
  let page1MapApi;
  let mapInitPromise;

  // Quick sanity check for the Mapbox token format
  function tokenLooksValid(token) {
    return typeof token === "string" && token.startsWith("pk.");
  }

  // Create the Mapbox map instance for page 1
  async function initPageMap() {
    if (!tokenLooksValid(APP_CONFIG.mapboxToken)) {
      tokenWarning.classList.remove("d-none");
      return;
    }
    tokenWarning.classList.add("d-none");
    page1MapApi = await window.NightLightsMap.init(APP_CONFIG);
  }

  // Lazy-init: only start the map the first time it is needed
  async function ensurePageMapInitialized() {
    if (page1MapApi) {
      return;
    }
    if (!mapInitPromise) {
      mapInitPromise = initPageMap();
    }
    await mapInitPromise;
  }

  // Set up fullPage.js with section anchors and scroll callbacks
  function initFullpage() {
    fullpageApi = new window.fullpage("#fullpage", {
      autoScrolling: true,
      navigation: true,
      scrollOverflow: true,
      // OUR TEAM PAGE START — added "team" anchor
      anchors: ["cover", "page1", "page2", "page3", "page4", "page5", "team"],
      // OUR TEAM PAGE END
      scrollingSpeed: 720,
      normalScrollElements: ".page2-event-panel, .page3-map-viewport",
      licenseKey: "gplv3-license", // fullPage.js GPL mode for educational use
      async onLeave(origin, destination) {
        // Init and resize the map when scrolling into page 1
        if (destination.anchor === "page1") {
          await ensurePageMapInitialized();
          if (page1MapApi) {
            window.setTimeout(() => page1MapApi.resize(), 120);
          }
        }
      }
    });

    // "Start Exploring" jumps from the cover to the map section
    startBtn.addEventListener("click", () => {
      fullpageApi.moveTo("page1");
    });

    // "Zoom into China" flies the map camera, then scrolls to page 2
    if (zoomChinaBtn) {
      zoomChinaBtn.addEventListener("click", async () => {
        if (!page1MapApi) return;
        zoomChinaBtn.disabled = true;

        // Fade out the narrative panel while the camera moves
        const panel = document.querySelector(".page1-panel");
        if (panel) panel.classList.add("is-fading-out");

        await page1MapApi.flyToChina();
        await new Promise((r) => setTimeout(r, 400));

        fullpageApi.moveTo("page2");

        // Reset panel state after the transition
        setTimeout(() => {
          zoomChinaBtn.disabled = false;
          if (panel) panel.classList.remove("is-fading-out");
        }, 800);
      });
    }
  }

  // Toggle the collapsible project description on the cover
  function initToggleDesc() {
    const btn = document.getElementById("toggleDescBtn");
    const desc = document.getElementById("coverDesc");
    if (!btn || !desc) return;

    btn.addEventListener("click", () => {
      const showing = desc.classList.toggle("is-visible");
      if (showing) {
        desc.removeAttribute("hidden");
      } else {
        desc.setAttribute("hidden", "");
      }
      btn.textContent = showing ? "Hide Research Logic" : "View Research Logic";
    });
  }

  // Bootstrap everything once the DOM is ready
  document.addEventListener("DOMContentLoaded", async () => {
    initFullpage();
    initToggleDesc();
    // If the user navigates directly to #page1, init the map immediately
    if (window.location.hash === "#page1") {
      await ensurePageMapInitialized();
      if (page1MapApi) {
        page1MapApi.resize();
      }
    }
  });
})();
