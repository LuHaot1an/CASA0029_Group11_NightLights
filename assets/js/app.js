(function () {
  const APP_CONFIG = {
    mapboxToken:
      "pk.eyJ1Ijoib3dscGFra2EiLCJhIjoiY21razJ3NTZqMG5sczNlc2RxZXJ3cmNudiJ9.CBNIbaI7xhTZ8GeNWqczqQ",
    baseStyle: "mapbox://styles/owlpakka/cmo5ykdcy016001qv9rnzhlhd",
    tilesetPrefix: "group11.ntl_",
    tilesetMapPath: "./assets/data/year-tilesets.json",
    regionsPath: "./assets/data/regions.json"
  };

  const startBtn = document.getElementById("startExploringBtn");
  const tokenWarning = document.getElementById("tokenWarning");

  let fullpageApi;
  let page1MapApi;
  let mapInitPromise;

  function tokenLooksValid(token) {
    return typeof token === "string" && token.startsWith("pk.");
  }

  async function initPageMap() {
    if (!tokenLooksValid(APP_CONFIG.mapboxToken)) {
      tokenWarning.classList.remove("d-none");
      return;
    }
    tokenWarning.classList.add("d-none");
    page1MapApi = await window.NightLightsMap.init(APP_CONFIG);
  }

  async function ensurePageMapInitialized() {
    if (page1MapApi) {
      return;
    }
    if (!mapInitPromise) {
      mapInitPromise = initPageMap();
    }
    await mapInitPromise;
  }

  function initFullpage() {
    // fullPage.js can run under GPL mode for educational projects.
    fullpageApi = new window.fullpage("#fullpage", {
      autoScrolling: true,
      navigation: true,
      anchors: ["cover", "page1"],
      scrollingSpeed: 720,
      licenseKey: "gplv3-license",
      async onLeave(origin, destination) {
        if (destination.anchor === "page1") {
          await ensurePageMapInitialized();
          if (page1MapApi) {
            window.setTimeout(() => page1MapApi.resize(), 120);
          }
        }
      }
    });

    startBtn.addEventListener("click", () => {
      fullpageApi.moveTo("page1");
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initFullpage();
    if (window.location.hash === "#page1") {
      await ensurePageMapInitialized();
      if (page1MapApi) {
        page1MapApi.resize();
      }
    }
  });
})();
