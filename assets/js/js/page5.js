/**
 * page5.js — City Hierarchy, Growth Coordination & Functional Support
 * Three-panel swipe-compare map + trajectory chart + comparison chart + radar.
 */
(function () {
  'use strict';

  // PAGE 5 START
  // =========================================================
  // MAP SOURCE CONSTANTS — replace with actual Mapbox values
  // =========================================================
  const PAGE5_CITY_SYMBOLS_SOURCE_URL = 'mapbox://jiayicheng.dhkw7hkv';
  const PAGE5_CITY_SYMBOLS_SOURCE_LAYER = 'city_hierarchy_symbols-dvpkla';

  const PAGE5_MAPBOX_TOKEN =
    'pk.eyJ1Ijoib3dscGFra2EiLCJhIjoiY21razJ3NTZqMG5sczNlc2RxZXJ3cmNudiJ9.CBNIbaI7xhTZ8GeNWqczqQ';

  const TIERS = ['T1', 'T2', 'T3'];

  // ─── State ───
  let maps = {};          // { T1: mapboxgl.Map, T2: …, T3: … }
  let trajChart = null;
  let compChart = null;
  let radarChart = null;
  let selectedCity = null;
  let geojsonCache = null;
  let loadedCount = 0;

  // Divider positions (percentage of container width)
  let div1Pct = 33.33;
  let div2Pct = 66.67;

  // ─── Data stores ───
  let yearMetrics = [];
  let profileData = [];
  let tierMeanData = [];
  let cityNameMap = {}; // cn → en

  // =========================================================
  // CSV PARSING
  // =========================================================
  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = parseCSVLine(lines[0]);
    return lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const obj = {};
      headers.forEach((h, i) => {
        let v = (values[i] || '').replace(/^"|"$/g, '');
        obj[h] = isNaN(v) || v === '' ? v : Number(v);
      });
      return obj;
    });
  }

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
      else { current += ch; }
    }
    result.push(current);
    return result.map(s => s.trim());
  }

  function isPlaceholder(url) { return !url || url.startsWith('REPLACE_'); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function fmt(v, d) { const n = Number(v); return isFinite(n) ? n.toFixed(d) : '--'; }

  // =========================================================
  // DATA LOADING
  // =========================================================
  async function loadData() {
    const [yearText, profText, tierText, geoJson] = await Promise.all([
      fetch('assets/data/page5data/chat/city_hierarchy_year_metrics.csv').then(r => r.text()),
      fetch('assets/data/page5data/chat/city_hierarchy_profile_2022.csv').then(r => r.text()),
      fetch('assets/data/page5data/chat/tier_group_profile_mean.csv').then(r => r.text()),
      fetch('assets/data/page5data/map/city_hierarchy_symbols.geojson').then(r => r.json())
    ]);
    yearMetrics = parseCSV(yearText);
    profileData = parseCSV(profText);
    tierMeanData = parseCSV(tierText);

    geoJson.features.forEach(f => {
      const p = f.properties;
      if (p.city_cn && p.city) cityNameMap[p.city_cn] = p.city;
    });

    profileData.forEach(d => { if (cityNameMap[d.city]) d.city_en = cityNameMap[d.city]; });
    yearMetrics.forEach(d => { if (cityNameMap[d.city]) d.city_en = cityNameMap[d.city]; });
  }

  function slFor() { return {}; }

  // =========================================================
  // THREE-MAP SYSTEM
  // Stacking order (bottom → top): T3 → T2 → T1
  // T1 and T2 are clipped via clip-path; T3 is full-width.
  // =========================================================
  function initMaps() {
    if (typeof mapboxgl === 'undefined') return;
    if (!mapboxgl.accessToken) mapboxgl.accessToken = PAGE5_MAPBOX_TOKEN;

    const shared = {
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [104, 35],
      zoom: 3.8,
      attributionControl: false
    };

    TIERS.forEach(tier => {
      const map = new mapboxgl.Map({ container: 'page5Map' + tier, ...shared });
      maps[tier] = map;

      map.on('load', async () => {
        await addSourceToMap(map);
        addLayersToMap(map, tier);
        setupMapHover(map, tier);
        setupMapClick(map);

        loadedCount++;
        if (loadedCount === 3) selectDefault();
      });
    });

    setupCameraSync();
    setupDividers();
    setupZoomControls();
    updateClipPositions();
  }

  async function addSourceToMap(map) {
    if (!geojsonCache) {
      geojsonCache = await fetch('assets/data/page5data/map/city_hierarchy_symbols.geojson').then(r => r.json());
    }
    map.addSource('p5-data', { type: 'geojson', data: geojsonCache });
  }

  function addLayersToMap(map, tier) {
    const sl = slFor();
    const tf = ['==', ['get', 'tier_group'], tier];

    map.addLayer({
      id: 'p5-cities', type: 'circle', source: 'p5-data', ...sl,
      filter: tf,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'],
          ['to-number', ['get', 'growth_intensity'], 0.5],
          0, 3, 0.5, 5, 1, 7, 1.5, 10, 2, 13, 3, 17
        ],
        'circle-color': [
          'interpolate', ['linear'],
          ['to-number', ['get', 'coordination_index'], 0.3],
          0.1, '#4a9eff', 0.35, '#4ecdc4', 0.55, '#7ae582', 0.75, '#ffd84d'
        ],
        'circle-opacity': 0.85,
        'circle-stroke-width': [
          'interpolate', ['linear'],
          ['max', 0, ['to-number', ['get', 'growth_efficiency'], 0]],
          0, 0.5, 10, 1.5, 30, 2.5, 60, 4
        ],
        'circle-stroke-color': 'rgba(255,255,255,0.45)'
      }
    });

    map.addLayer({
      id: 'p5-highlight', type: 'circle', source: 'p5-data', ...sl,
      filter: ['all', tf, ['==', ['get', 'city_cn'], '__none__']],
      paint: {
        'circle-radius': [
          'interpolate', ['linear'],
          ['to-number', ['get', 'growth_intensity'], 0.5],
          0, 7, 0.5, 9, 1, 11, 1.5, 14, 2, 17, 3, 21
        ],
        'circle-color': 'transparent',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffd84d'
      }
    });

    map.addLayer({
      id: 'p5-labels', type: 'symbol', source: 'p5-data', ...sl,
      filter: tf,
      layout: {
        'text-field': ['get', 'city'], 'text-size': 10,
        'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-allow-overlap': false
      },
      paint: {
        'text-color': 'rgba(245,247,250,0.6)',
        'text-halo-color': 'rgba(5,7,11,0.8)', 'text-halo-width': 1
      }
    });
  }

  // =========================================================
  // CAMERA SYNC — prevent infinite loops with a flag
  // =========================================================
  let syncing = false;

  function setupCameraSync() {
    TIERS.forEach(tier => {
      maps[tier].on('move', () => syncFrom(tier));
    });
  }

  function syncFrom(src) {
    if (syncing) return;
    syncing = true;
    const s = maps[src];
    const opts = {
      center: s.getCenter(), zoom: s.getZoom(),
      bearing: s.getBearing(), pitch: s.getPitch()
    };
    TIERS.forEach(t => { if (t !== src) maps[t].jumpTo(opts); });
    syncing = false;
  }

  // =========================================================
  // DIVIDERS — drag to adjust tier boundaries
  // =========================================================
  function setupDividers() {
    const area = document.getElementById('page5MapArea');
    const d1 = document.getElementById('page5Div1');
    const d2 = document.getElementById('page5Div2');
    let dragging = null;

    function pct(clientX) {
      const r = area.getBoundingClientRect();
      return Math.max(8, Math.min(92, ((clientX - r.left) / r.width) * 100));
    }

    function move(clientX) {
      if (!dragging) return;
      let p = pct(clientX);
      if (dragging === 1) { div1Pct = Math.min(p, div2Pct - 6); }
      else { div2Pct = Math.max(p, div1Pct + 6); }
      updateClipPositions();
    }

    function end() {
      dragging = null;
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMM);
      document.removeEventListener('mouseup', end);
      document.removeEventListener('touchmove', onTM);
      document.removeEventListener('touchend', end);
      Object.values(maps).forEach(m => m.resize());
    }

    function onMM(e) { move(e.clientX); }
    function onTM(e) { if (e.touches.length) { e.preventDefault(); move(e.touches[0].clientX); } }

    function start(which, e) {
      e.preventDefault();
      dragging = which;
      document.body.style.cursor = 'ew-resize';
      document.addEventListener('mousemove', onMM);
      document.addEventListener('mouseup', end);
      document.addEventListener('touchmove', onTM, { passive: false });
      document.addEventListener('touchend', end);
    }

    d1.addEventListener('mousedown', e => start(1, e));
    d1.addEventListener('touchstart', e => start(1, e), { passive: false });
    d2.addEventListener('mousedown', e => start(2, e));
    d2.addEventListener('touchstart', e => start(2, e), { passive: false });
  }

  function updateClipPositions() {
    document.getElementById('page5MapT1').style.clipPath =
      'inset(0 ' + (100 - div1Pct) + '% 0 0)';
    document.getElementById('page5MapT2').style.clipPath =
      'inset(0 ' + (100 - div2Pct) + '% 0 0)';

    document.getElementById('page5Div1').style.left = div1Pct + '%';
    document.getElementById('page5Div2').style.left = div2Pct + '%';

    const l1 = document.getElementById('page5LabelT1');
    const l2 = document.getElementById('page5LabelT2');
    const l3 = document.getElementById('page5LabelT3');
    if (l1) l1.style.left = Math.max(8, div1Pct / 2 - 2) + '%';
    if (l2) l2.style.left = ((div1Pct + div2Pct) / 2 - 2) + '%';
    if (l3) l3.style.left = Math.min(92, (div2Pct + 100) / 2 - 2) + '%';
  }

  // =========================================================
  // CUSTOM ZOOM CONTROLS — shared across all three maps
  // =========================================================
  function setupZoomControls() {
    const zi = document.getElementById('page5ZoomIn');
    const zo = document.getElementById('page5ZoomOut');
    if (zi) zi.addEventListener('click', () => maps.T1 && maps.T1.zoomIn());
    if (zo) zo.addEventListener('click', () => maps.T1 && maps.T1.zoomOut());
  }

  // =========================================================
  // HOVER — lightweight: city name + tier only
  // =========================================================
  function setupMapHover(map, tier) {
    const tooltip = document.getElementById('page5MapTooltip');

    map.on('mouseenter', 'p5-cities', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'p5-cities', () => {
      map.getCanvas().style.cursor = '';
      tooltip.style.display = 'none';
    });

    map.on('mousemove', 'p5-cities', e => {
      if (!e.features || !e.features.length) return;
      const p = e.features[0].properties;
      tooltip.innerHTML =
        '<strong>' + (p.city || '') + '</strong>' +
        '<span class="page5-tip-tier">' + (p.tier_label || '') + '</span>';
      tooltip.style.display = 'block';
      tooltip.style.left = (e.point.x + 14) + 'px';
      tooltip.style.top = (e.point.y + 14) + 'px';
    });
  }

  // =========================================================
  // CLICK — select city
  // =========================================================
  function setupMapClick(map) {
    map.on('click', 'p5-cities', e => {
      if (e.features && e.features.length) {
        selectCity(e.features[0].properties.city_cn);
      }
    });
  }

  // =========================================================
  // CITY SELECTION — drives all linkage
  // =========================================================
  function cityEN(cnName) { return cityNameMap[cnName] || cnName; }

  function selectCity(name) {
    selectedCity = name;
    updateHighlight();
    updateTrajectory();
    updateComparison();
    updateRadar();

    const input = document.getElementById('page5SearchInput');
    if (input) input.value = cityEN(name);
  }

  function selectDefault() {
    const bj = profileData.find(d => d.city === '北京市');
    if (bj) { selectCity('北京市'); return; }
    if (profileData.length) selectCity(profileData[0].city);
  }

  function updateHighlight() {
    TIERS.forEach(tier => {
      const map = maps[tier];
      if (!map || !map.isStyleLoaded()) return;

      const prof = selectedCity ? profileData.find(d => d.city === selectedCity) : null;
      const show = prof && prof.tier_group === tier;

      map.setFilter('p5-highlight', [
        'all',
        ['==', ['get', 'tier_group'], tier],
        ['==', ['get', 'city_cn'], show ? selectedCity : '__none__']
      ]);
    });
  }

  // =========================================================
  // SEARCH — autocomplete city name lookup
  // =========================================================
  function setupSearch() {
    const input = document.getElementById('page5SearchInput');
    const box = document.getElementById('page5SearchResults');
    if (!input || !box) return;

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { box.style.display = 'none'; return; }

      const hits = profileData
        .filter(d => {
          const en = (d.city_en || '').toLowerCase();
          const cn = (d.city || '').toLowerCase();
          return en.includes(q) || cn.includes(q);
        })
        .slice(0, 8);

      if (!hits.length) { box.innerHTML = '<div class="page5-search-empty">No results</div>'; box.style.display = 'block'; return; }

      box.innerHTML = hits.map(d =>
        '<div class="page5-search-item" data-city="' + d.city + '">' +
        '<span>' + cityEN(d.city) + '</span>' +
        '<span class="page5-search-tier">' + (d.tier_label || d.tier_group) + '</span>' +
        '</div>'
      ).join('');
      box.style.display = 'block';

      box.querySelectorAll('.page5-search-item').forEach(item => {
        item.addEventListener('click', () => {
          selectCity(item.dataset.city);
          box.style.display = 'none';
        });
      });
    });

    input.addEventListener('focus', () => { if (input.value.trim()) input.dispatchEvent(new Event('input')); });

    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !box.contains(e.target)) box.style.display = 'none';
    });
  }

  // =========================================================
  // TRAJECTORY CHART (unchanged logic)
  // =========================================================
  function initTrajectory() {
    const dom = document.getElementById('page5TrajectoryChart');
    if (!dom) return;
    trajChart = echarts.init(dom, null, { renderer: 'canvas' });
    window.addEventListener('resize', () => trajChart && trajChart.resize());
  }

  function updateTrajectory() {
    if (!trajChart || !selectedCity) return;
    const rows = yearMetrics.filter(d => d.city === selectedCity).sort((a, b) => a.year - b.year);
    const prof = profileData.find(d => d.city === selectedCity);
    const titleEl = document.getElementById('page5TrajectoryTitle');
    if (titleEl) titleEl.textContent = cityEN(selectedCity) + (prof ? ' · ' + prof.tier_label : '');

    if (!rows.length) {
      trajChart.setOption({
        title: { text: 'No trajectory data', left: 'center', top: 'center',
          textStyle: { color: 'rgba(219,227,240,0.4)', fontSize: 13 } },
        xAxis: { show: false }, yAxis: { show: false }, series: []
      }, true);
      return;
    }

    const years = rows.map(d => d.year);
    const tc = 'rgba(219,227,240,0.76)';
    const inds = [
      { field: 'ntl_index', name: 'NTL Index', color: '#ff6b6b' },
      { field: 'gdp_index', name: 'GDP Index', color: '#ffe66d' },
      { field: 'population_index', name: 'Population Index', color: '#4ecdc4' }
    ];

    trajChart.setOption({
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(8,14,30,0.92)',
        borderColor: 'rgba(255,190,60,0.35)', textStyle: { color: '#f5f7fa', fontSize: 12 } },
      legend: { data: inds.map(i => i.name), top: 4, right: 10,
        textStyle: { color: tc, fontSize: 10 } },
      grid: { left: 44, right: 16, top: 34, bottom: 24 },
      xAxis: { type: 'category', data: years,
        axisLabel: { color: tc, fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }, axisTick: { show: false } },
      yAxis: { type: 'value', name: 'Index (2012=100)',
        nameTextStyle: { color: tc, fontSize: 10, padding: [0, 0, 0, 4] },
        axisLabel: { color: tc, fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
      series: inds.map(ind => ({
        name: ind.name, type: 'line',
        data: rows.map(r => r[ind.field]),
        smooth: true, symbol: 'circle', symbolSize: 4,
        lineStyle: { width: 2.5 }, itemStyle: { color: ind.color }
      }))
    }, true);
  }

  // =========================================================
  // COMPARISON CHART (horizontal grouped bar)
  // =========================================================
  function initComparison() {
    const dom = document.getElementById('page5ComparisonChart');
    if (!dom) return;
    compChart = echarts.init(dom, null, { renderer: 'canvas' });
    window.addEventListener('resize', () => compChart && compChart.resize());
  }

  function updateComparison() {
    if (!compChart || !selectedCity) return;
    const prof = profileData.find(d => d.city === selectedCity);
    if (!prof) {
      compChart.setOption({ title: { text: 'No profile data', left: 'center', top: 'center',
        textStyle: { color: 'rgba(219,227,240,0.4)', fontSize: 13 } },
        xAxis: { show: false }, yAxis: { show: false }, series: [] }, true);
      return;
    }
    const mean = tierMeanData.find(d => d.tier_group === prof.tier_group);
    if (!mean) return;

    const titleEl = document.getElementById('page5ComparisonTitle');
    if (titleEl) titleEl.textContent = cityEN(selectedCity) + ' vs ' + prof.tier_label + ' Mean';

    const metrics = [
      { k: 'support_index', label: 'Support', mk: 'support_index_mean' },
      { k: 'coordination_index', label: 'Coordination', mk: 'coordination_index_mean' },
      { k: 'growth_efficiency', label: 'Efficiency', mk: 'growth_efficiency_mean' },
      { k: 'growth_intensity', label: 'Intensity', mk: 'growth_intensity_mean' }
    ];
    const tc = 'rgba(219,227,240,0.76)';

    compChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(8,14,30,0.92)', borderColor: 'rgba(255,190,60,0.35)',
        textStyle: { color: '#f5f7fa', fontSize: 12 } },
      legend: { data: [cityEN(selectedCity), prof.tier_label + ' Mean'], top: 2, right: 10,
        textStyle: { color: tc, fontSize: 10 } },
      grid: { left: 10, right: 50, top: 28, bottom: 8, containLabel: true },
      xAxis: { type: 'value',
        axisLabel: { color: tc, fontSize: 10, formatter: v => Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1) },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
      yAxis: { type: 'category', data: metrics.map(m => m.label),
        axisLabel: { color: tc, fontSize: 11 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }, axisTick: { show: false } },
      series: [
        { name: cityEN(selectedCity), type: 'bar', data: metrics.map(m => num(prof[m.k])), barWidth: 8,
          itemStyle: { color: '#ffd84d', borderRadius: [0, 3, 3, 0] },
          label: { show: true, position: 'right', formatter: p => fmt(p.value, 2), color: tc, fontSize: 10 } },
        { name: prof.tier_label + ' Mean', type: 'bar', data: metrics.map(m => num(mean[m.mk])), barWidth: 8,
          itemStyle: { color: 'rgba(78,205,196,0.7)', borderRadius: [0, 3, 3, 0] },
          label: { show: true, position: 'right', formatter: p => fmt(p.value, 2), color: tc, fontSize: 10 } }
      ]
    }, true);
  }

  // =========================================================
  // RADAR CHART — POI distribution (Education / Medical / Commercial)
  // =========================================================
  function initRadar() {
    const dom = document.getElementById('page5RadarChart');
    if (!dom) return;
    radarChart = echarts.init(dom, null, { renderer: 'canvas' });
    window.addEventListener('resize', () => radarChart && radarChart.resize());
  }

  function updateRadar() {
    if (!radarChart || !selectedCity) return;
    const prof = profileData.find(d => d.city === selectedCity);
    if (!prof) return;

    const edu = num(prof.edu_count);
    const med = num(prof.medical_count);
    const com = num(prof.commercial_count);

    function percentileMax(arr, pct) {
      const sorted = arr.slice().sort((a, b) => a - b);
      return sorted[Math.min(Math.floor(sorted.length * pct), sorted.length - 1)] || 1;
    }
    const eduVals = profileData.map(d => num(d.edu_count)).filter(v => v > 0);
    const medVals = profileData.map(d => num(d.medical_count)).filter(v => v > 0);
    const comVals = profileData.map(d => num(d.commercial_count)).filter(v => v > 0);

    const maxEdu = Math.max(edu * 1.3, percentileMax(eduVals, 0.75));
    const maxMed = Math.max(med * 1.3, percentileMax(medVals, 0.75));
    const maxCom = Math.max(com * 1.3, percentileMax(comVals, 0.75));

    const tc = 'rgba(219,227,240,0.76)';

    radarChart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(8,14,30,0.92)',
        borderColor: 'rgba(255,190,60,0.35)',
        textStyle: { color: '#f5f7fa', fontSize: 11 }
      },
      radar: {
        shape: 'polygon',
        center: ['50%', '55%'],
        radius: '65%',
        indicator: [
          { name: 'Education\n' + edu, max: maxEdu },
          { name: 'Medical\n' + med, max: maxMed },
          { name: 'Commercial\n' + com, max: maxCom }
        ],
        splitNumber: 3,
        axisName: { color: tc, fontSize: 10, lineHeight: 16 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      series: [{
        type: 'radar',
        data: [{
          value: [edu, med, com],
          name: cityEN(selectedCity),
          areaStyle: { color: 'rgba(255,216,77,0.15)' },
          lineStyle: { color: '#ffd84d', width: 2 },
          itemStyle: { color: '#ffd84d' },
          symbol: 'circle', symbolSize: 5
        }]
      }]
    }, true);
  }

  // =========================================================
  // FULLPAGE PATCH
  // =========================================================
  function patchFP() {
    const sections = document.querySelectorAll('#fullpage .section');
    if (sections.length >= 5 && !sections[4].getAttribute('data-anchor')) {
      sections[4].setAttribute('data-anchor', 'page4');
    }
    if (sections.length >= 6 && !sections[5].getAttribute('data-anchor')) {
      sections[5].setAttribute('data-anchor', 'page5');
    }

    function resizeAll() {
      Object.values(maps).forEach(m => m && m.resize());
      if (trajChart) trajChart.resize();
      if (compChart) compChart.resize();
      if (radarChart) radarChart.resize();
    }

    if (typeof fullpage_api !== 'undefined') {
      document.addEventListener('fullpage:afterLoad', () => {
        if (window.location.hash === '#page5') setTimeout(resizeAll, 200);
      });
    }

    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#page5') setTimeout(resizeAll, 300);
    });
  }

  // =========================================================
  // BOOTSTRAP
  // =========================================================
  async function init() {
    await loadData();
    initMaps();
    initTrajectory();
    initComparison();
    initRadar();
    setupSearch();
  }

  function boot() { patchFP(); init(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 100));
  } else {
    setTimeout(boot, 100);
  }

  // PAGE 5 END
})();
