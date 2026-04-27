/**
 * page4.js — Transport Corridors and Urban Expansion
 * Map + bar chart + line chart with corridor-driven linkage.
 */
(function() {
  'use strict';

  // =========================================================
  // MAP SOURCE CONSTANTS — Mapbox tileset config
  // =========================================================
  // 每个数据源需要两个值：
  //   url: mapbox://用户名.tileset_id
  //   sourceLayer: 上传时的 source-layer 名（通常是文件名去掉扩展名）
  //
  // 如何查找 source-layer 名称：
  //   1. 打开 Mapbox Studio -> Tilesets -> 点击对应 tileset
  //   2. 在 tileset 详情页会看到 "Source layer" 或 "Layer name"
  //   3. 或者在 Style editor 中 Add layer -> 选择 source 后下拉会列出 source-layer
  //
  // ── corridors_display_wgs84.geojson ──
  const CORRIDORS_SOURCE_URL = 'mapbox://jiayicheng.7ulkse95';
  const CORRIDORS_SOURCE_LAYER = 'corridors_display_wgs84-dfeagm';

  // ── corridor_buffer_display_wgs84.geojson ──
  const BUFFER_SOURCE_URL = 'mapbox://jiayicheng.8f7ptllr';
  const BUFFER_SOURCE_LAYER = 'corridor_buffer_display_wgs84-bhlu1n';

  // ── corridor_cities_final_wgs84.geojson ──
  const CITIES_SOURCE_URL = 'mapbox://jiayicheng.3tp6byyk';
  const CITIES_SOURCE_LAYER = 'corridor_cities_final_wgs84-5k6vlm';

  function isPlaceholder(url) {
    return !url || url.startsWith('REPLACE_');
  }

  // ─── Corridor bounding boxes for fitBounds (sw, ne) ───
  const CORRIDOR_BOUNDS = {
    GS:  [[113.0, 22.1], [114.5, 23.4]],
    HNH: [[118.5, 29.6], [122.0, 32.4]],
    KG:  [[112.3, 22.9], [117.0, 40.2]],
    CY:  [[103.8, 29.3], [106.8, 30.9]]
  };

  const CORRIDOR_COLORS = {
    KG:  '#ff6b6b',
    HNH: '#4ecdc4',
    GS:  '#ffe66d',
    CY:  '#a29bfe'
  };

  const CORRIDOR_DISPLAY_LABELS = {
    CY: 'CC',
    GS: 'GS',
    HNH: 'SNH',
    KG: 'BG'
  };

  function corridorDisplayLabel(cid) {
    return CORRIDOR_DISPLAY_LABELS[cid] || cid;
  }

  const DEFAULT_CORRIDOR_ORDER = ['KG', 'HNH', 'GS', 'CY'];

  const CITY_EN_NAMES = {
    '广州市': 'Guangzhou',
    '深圳市': 'Shenzhen',
    '东莞市': 'Dongguan',
    '上海市': 'Shanghai',
    '南京市': 'Nanjing',
    '无锡市': 'Wuxi',
    '常州市': 'Changzhou',
    '苏州市': 'Suzhou',
    '杭州市': 'Hangzhou',
    '宁波市': 'Ningbo',
    '嘉兴市': 'Jiaxing',
    '绍兴市': 'Shaoxing',
    '北京市': 'Beijing',
    '石家庄市': 'Shijiazhuang',
    '邯郸市': 'Handan',
    '邢台市': 'Xingtai',
    '保定市': 'Baoding',
    '郑州市': 'Zhengzhou',
    '安阳市': 'Anyang',
    '鹤壁市': 'Hebi',
    '新乡市': 'Xinxiang',
    '许昌市': 'Xuchang',
    '信阳市': 'Xinyang',
    '驻马店市': 'Zhumadian',
    '武汉市': 'Wuhan',
    '长沙市': 'Changsha',
    '湘潭市': 'Xiangtan',
    '衡阳市': 'Hengyang',
    '岳阳市': 'Yueyang',
    '郴州市': 'Chenzhou',
    '韶关市': 'Shaoguan',
    '重庆市': 'Chongqing',
    '成都市': 'Chengdu',
    '内江市': 'Neijiang',
    '资阳市': 'Ziyang'
  };

  function cityEN(name) {
    return CITY_EN_NAMES[name] || name || '';
  }

  function cityLabelExpression() {
    return [
      'match',
      ['get', 'city'],
      ...Object.entries(CITY_EN_NAMES).flat(),
      ['get', 'city']
    ];
  }

  // ─── Page 4 State ───
  let currentCorridorId = null;
  let currentIndicator = 'ntl';
  let currentMode = 'total';
  let currentBottomMode = 'indicators';

  // ─── Data stores ───
  let summaryData = [];
  let yearData = [];
  let cityYearData = [];

  // ─── Chart instances ───
  let barChart = null;
  let lineChart = null;
  let page4Map = null;

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

  // =========================================================
  // DATA LOADING
  // =========================================================
  async function loadAllData() {
    const [sumText, yearText, cityText] = await Promise.all([
      fetch('assets/data/data/chat/corridor_summary_metrics.csv').then(r => r.text()),
      fetch('assets/data/data/chat/corridor_year_metrics.csv').then(r => r.text()),
      fetch('assets/data/data/chat/corridor_city_year_metrics.csv').then(r => r.text()),
    ]);
    summaryData = parseCSV(sumText);
    yearData = parseCSV(yearText);
    cityYearData = parseCSV(cityText);
  }

  // =========================================================
  // MAP INITIALIZATION
  // =========================================================
  const PAGE4_MAPBOX_TOKEN = 'pk.eyJ1Ijoib3dscGFra2EiLCJhIjoiY21razJ3NTZqMG5sczNlc2RxZXJ3cmNudiJ9.CBNIbaI7xhTZ8GeNWqczqQ';

  function initMap() {
    if (typeof mapboxgl === 'undefined') {
      console.warn('[Page4] mapboxgl not loaded.');
      return;
    }
    if (!mapboxgl.accessToken) {
      mapboxgl.accessToken = PAGE4_MAPBOX_TOKEN;
    }

    page4Map = new mapboxgl.Map({
      container: 'page4Map',
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [110, 32],
      zoom: 4.2,
      attributionControl: false
    });

    page4Map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    page4Map.on('load', async () => {
      await addMapSources();
      addMapLayers();
      setupMapInteractions();
      updateMapHighlight();
    });
  }

  async function addMapSources() {
    if (isPlaceholder(BUFFER_SOURCE_URL)) {
      const bufferData = await fetch('assets/data/data/map/corridor_buffer_display_wgs84.geojson').then(r => r.json());
      page4Map.addSource('corridor-buffer', { type: 'geojson', data: bufferData });
    } else {
      page4Map.addSource('corridor-buffer', { type: 'vector', url: BUFFER_SOURCE_URL });
    }

    if (isPlaceholder(CORRIDORS_SOURCE_URL)) {
      const corrData = await fetch('assets/data/data/map/corridors_display_wgs84.geojson').then(r => r.json());
      page4Map.addSource('corridors', { type: 'geojson', data: corrData });
    } else {
      page4Map.addSource('corridors', { type: 'vector', url: CORRIDORS_SOURCE_URL });
    }

    if (isPlaceholder(CITIES_SOURCE_URL)) {
      const citiesData = await fetch('assets/data/data/map/corridor_cities_final_wgs84.geojson').then(r => r.json());
      page4Map.addSource('corridor-cities', { type: 'geojson', data: citiesData });
    } else {
      page4Map.addSource('corridor-cities', { type: 'vector', url: CITIES_SOURCE_URL });
    }
  }

  // TODO: When raster nightlight tiles (2012–2022) are available as
  // preprocessed map tiles, add a background raster layer here.
  // Currently raster/ contains raw .tif files that browsers cannot
  // read directly, so the NTL background is omitted.

  function slFor(url, layer) {
    return isPlaceholder(url) ? {} : { 'source-layer': layer };
  }

  function addMapLayers() {
    // Buffer fill
    page4Map.addLayer({
      id: 'buffer-fill',
      type: 'fill',
      source: 'corridor-buffer',
      ...slFor(BUFFER_SOURCE_URL, BUFFER_SOURCE_LAYER),
      paint: {
        'fill-color': ['match', ['get', 'corridor_id'],
          'KG', CORRIDOR_COLORS.KG,
          'HNH', CORRIDOR_COLORS.HNH,
          'GS', CORRIDOR_COLORS.GS,
          'CY', CORRIDOR_COLORS.CY,
          '#888'
        ],
        'fill-opacity': 0.08
      }
    });

    // Buffer outline
    page4Map.addLayer({
      id: 'buffer-outline',
      type: 'line',
      source: 'corridor-buffer',
      ...slFor(BUFFER_SOURCE_URL, BUFFER_SOURCE_LAYER),
      paint: {
        'line-color': ['match', ['get', 'corridor_id'],
          'KG', CORRIDOR_COLORS.KG,
          'HNH', CORRIDOR_COLORS.HNH,
          'GS', CORRIDOR_COLORS.GS,
          'CY', CORRIDOR_COLORS.CY,
          '#888'
        ],
        'line-opacity': 0.2,
        'line-width': 1
      }
    });

    // Corridor lines — background (wider, dimmer)
    page4Map.addLayer({
      id: 'corridors-bg',
      type: 'line',
      source: 'corridors',
      ...slFor(CORRIDORS_SOURCE_URL, CORRIDORS_SOURCE_LAYER),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['match', ['get', 'corridor_id'],
          'KG', CORRIDOR_COLORS.KG,
          'HNH', CORRIDOR_COLORS.HNH,
          'GS', CORRIDOR_COLORS.GS,
          'CY', CORRIDOR_COLORS.CY,
          '#888'
        ],
        'line-width': 6,
        'line-opacity': 0.15
      }
    });

    // Corridor lines — foreground
    page4Map.addLayer({
      id: 'corridors-line',
      type: 'line',
      source: 'corridors',
      ...slFor(CORRIDORS_SOURCE_URL, CORRIDORS_SOURCE_LAYER),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['match', ['get', 'corridor_id'],
          'KG', CORRIDOR_COLORS.KG,
          'HNH', CORRIDOR_COLORS.HNH,
          'GS', CORRIDOR_COLORS.GS,
          'CY', CORRIDOR_COLORS.CY,
          '#888'
        ],
        'line-width': 3,
        'line-opacity': 0.85
      }
    });

    // City points
    page4Map.addLayer({
      id: 'cities-circle',
      type: 'circle',
      source: 'corridor-cities',
      ...slFor(CITIES_SOURCE_URL, CITIES_SOURCE_LAYER),
      paint: {
        'circle-radius': ['match', ['get', 'node_type'],
          'core', 8,
          'middle', 5,
          'peripheral', 3,
          4
        ],
        'circle-color': ['match', ['get', 'corridor_id'],
          'KG', CORRIDOR_COLORS.KG,
          'HNH', CORRIDOR_COLORS.HNH,
          'GS', CORRIDOR_COLORS.GS,
          'CY', CORRIDOR_COLORS.CY,
          '#888'
        ],
        'circle-opacity': 0.9,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.5)'
      }
    });

    // City labels
    page4Map.addLayer({
      id: 'cities-label',
      type: 'symbol',
      source: 'corridor-cities',
      ...slFor(CITIES_SOURCE_URL, CITIES_SOURCE_LAYER),
      layout: {
        'text-field': cityLabelExpression(),
        'text-size': 10,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
        'text-allow-overlap': false
      },
      paint: {
        'text-color': 'rgba(245, 247, 250, 0.7)',
        'text-halo-color': 'rgba(5, 7, 11, 0.8)',
        'text-halo-width': 1
      }
    });
  }

  // =========================================================
  // MAP INTERACTIONS
  // =========================================================
  function setupMapInteractions() {
    const tooltip = document.getElementById('page4MapTooltip');

    page4Map.on('click', 'corridors-line', (e) => {
      if (e.features && e.features.length) {
        setCurrentCorridor(e.features[0].properties.corridor_id);
      }
    });

    page4Map.on('mouseenter', 'corridors-line', () => {
      page4Map.getCanvas().style.cursor = 'pointer';
    });
    page4Map.on('mouseleave', 'corridors-line', () => {
      page4Map.getCanvas().style.cursor = '';
      tooltip.style.display = 'none';
    });
    page4Map.on('mousemove', 'corridors-line', (e) => {
      if (e.features && e.features.length) {
        const p = e.features[0].properties;
        tooltip.innerHTML = '<strong>' + p.corridor_nm + '</strong>'
          + '<div class="tt-row"><span>ID</span><span>' + p.corridor_id + '</span></div>';
        tooltip.style.display = 'block';
        tooltip.style.left = (e.point.x + 14) + 'px';
        tooltip.style.top = (e.point.y + 14) + 'px';
      }
    });

    page4Map.on('mouseenter', 'cities-circle', () => {
      page4Map.getCanvas().style.cursor = 'pointer';
    });
    page4Map.on('mouseleave', 'cities-circle', () => {
      page4Map.getCanvas().style.cursor = '';
      tooltip.style.display = 'none';
    });
    page4Map.on('mousemove', 'cities-circle', (e) => {
      if (e.features && e.features.length) {
        const p = e.features[0].properties;
        tooltip.innerHTML = '<strong>' + cityEN(p.city) + '</strong>'
          + '<div class="tt-row"><span>Corridor</span><span>' + (p.corridor_nm || '') + '</span></div>'
          + '<div class="tt-row"><span>Node type</span><span>' + (p.node_type || '') + '</span></div>';
        tooltip.style.display = 'block';
        tooltip.style.left = (e.point.x + 14) + 'px';
        tooltip.style.top = (e.point.y + 14) + 'px';
      }
    });

    page4Map.on('click', 'cities-circle', (e) => {
      if (e.features && e.features.length) {
        setCurrentCorridor(e.features[0].properties.corridor_id);
      }
    });
  }

  function updateMapHighlight() {
    if (!page4Map || !page4Map.isStyleLoaded()) return;

    const cid = currentCorridorId;

    page4Map.setPaintProperty('buffer-fill', 'fill-opacity', cid
      ? ['case', ['==', ['get', 'corridor_id'], cid], 0.18, 0.04]
      : 0.08
    );
    page4Map.setPaintProperty('buffer-outline', 'line-opacity', cid
      ? ['case', ['==', ['get', 'corridor_id'], cid], 0.5, 0.1]
      : 0.2
    );

    page4Map.setPaintProperty('corridors-line', 'line-opacity', cid
      ? ['case', ['==', ['get', 'corridor_id'], cid], 1, 0.2]
      : 0.85
    );
    page4Map.setPaintProperty('corridors-bg', 'line-opacity', cid
      ? ['case', ['==', ['get', 'corridor_id'], cid], 0.35, 0.05]
      : 0.15
    );

    page4Map.setPaintProperty('cities-circle', 'circle-opacity', cid
      ? ['case', ['==', ['get', 'corridor_id'], cid], 1, 0.25]
      : 0.9
    );
    page4Map.setPaintProperty('cities-label', 'text-opacity', cid
      ? ['case', ['==', ['get', 'corridor_id'], cid], 1, 0.2]
      : 0.7
    );
  }

  function flyToCorridor(cid) {
    if (!page4Map || !CORRIDOR_BOUNDS[cid]) return;
    page4Map.fitBounds(CORRIDOR_BOUNDS[cid], {
      padding: 40,
      duration: 1200
    });
  }

  // =========================================================
  // CORE STATE SETTER — drives all linkage
  // =========================================================
  function setCurrentCorridor(cid) {
    currentCorridorId = cid;
    updateMapHighlight();
    flyToCorridor(cid);
    updateBarChart();
    updateLineChart();
    updateInsight();
    updateBottomLabel();
    updateCorridorBtns();
  }

  function updateCorridorBtns() {
    document.querySelectorAll('#page4CorridorBtns .page4-corridor-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.cid === currentCorridorId);
    });
  }

  function updateBottomLabel() {
    const el = document.getElementById('page4BottomLabel');
    if (!el) return;
    if (currentCorridorId) {
      const row = summaryData.find(d => d.corridor_id === currentCorridorId);
      el.textContent = 'Current Corridor: ' + (row ? row.corridor_nm : currentCorridorId);
    } else {
      el.textContent = 'Current Corridor: --';
    }
  }

  // =========================================================
  // B. BAR CHART — right panel
  // =========================================================
  function initBarChart() {
    const dom = document.getElementById('page4BarChart');
    if (!dom) return;
    barChart = echarts.init(dom, null, { renderer: 'canvas' });
    window.addEventListener('resize', () => barChart && barChart.resize());
    updateBarChart();
  }

  function getBarData() {
    const ind = currentIndicator;
    const mode = currentMode;

    if (mode === 'structure') {
      if (ind === 'ntl') return null;
      const rows2022 = cityYearData.filter(d => d.year === 2022);
      const corridorIds = [...new Set(summaryData.map(d => d.corridor_id))];
      const nodeOrder = ['core', 'middle', 'peripheral'];

      const result = {};
      nodeOrder.forEach(nt => { result[nt] = {}; corridorIds.forEach(cid => { result[nt][cid] = 0; }); });

      rows2022.forEach(row => {
        const cid = row.corridor_id;
        const nt = row.node_type;
        if (!result[nt]) result[nt] = {};
        if (result[nt][cid] === undefined) result[nt][cid] = 0;
        const val = ind === 'gdp' ? row.gdp_value : row.population_value;
        result[nt][cid] += (val || 0);
      });

      return { type: 'stacked', corridorIds, nodeOrder, data: result };
    }

    const fieldMap = {
      total: { gdp: 'gdp_total_growth', population: 'population_total_growth', ntl: 'ntl_total_growth' },
      rate: { gdp: 'gdp_growth_rate', population: 'population_growth_rate', ntl: 'ntl_growth_rate' }
    };
    const field = fieldMap[mode][ind];
    return {
      type: 'simple',
      items: summaryData.map(d => ({
        corridor_id: d.corridor_id,
        corridor_nm: d.corridor_nm,
        value: d[field]
      }))
    };
  }

  function updateBarChart() {
    if (!barChart) return;

    const structBtn = document.querySelector('#page4ModeSwitch [data-mode="structure"]');
    if (currentIndicator === 'ntl' && currentMode === 'structure') {
      currentMode = 'total';
      document.querySelectorAll('#page4ModeSwitch .page4-switch-btn').forEach(b => {
        b.classList.toggle('is-active', b.dataset.mode === 'total');
      });
    }
    if (structBtn) {
      structBtn.classList.toggle('is-disabled', currentIndicator === 'ntl');
    }

    const bd = getBarData();
    if (!bd) {
      barChart.setOption({
        title: { text: 'Not available for Night Light', left: 'center', top: 'center',
          textStyle: { color: 'rgba(219,227,240,0.5)', fontSize: 14 } },
        xAxis: { show: false }, yAxis: { show: false }, series: []
      }, true);
      return;
    }

    const textColor = 'rgba(219,227,240,0.76)';
    const labelMap = { ntl: 'Night Light Growth', population: 'Population Growth', gdp: 'GDP Growth' };
    const modeLabel = { total: 'Total', rate: 'Growth Rate (%)', structure: 'Structure (2022)' };

    if (bd.type === 'simple') {
      const items = bd.items;
      const cats = items.map(d => d.corridor_id);
      const vals = items.map(d => d.value);

      barChart.setOption({
        title: {
          text: labelMap[currentIndicator] + ' — ' + modeLabel[currentMode],
          left: 10, top: 6,
          textStyle: { color: textColor, fontSize: 12, fontWeight: 600 }
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(8,14,30,0.92)',
          borderColor: 'rgba(255,190,60,0.35)',
          textStyle: { color: '#f5f7fa', fontSize: 12 }
        },
        grid: { left: 12, right: 20, top: 40, bottom: 44, containLabel: true },
        xAxis: {
          type: 'category',
          data: cats,
          axisLabel: { color: textColor, fontSize: 11, formatter: corridorDisplayLabel },
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: textColor, fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } }
        },
        series: [{
          type: 'bar',
          data: vals.map((v, i) => ({
            value: v,
            itemStyle: {
              color: currentCorridorId === cats[i]
                ? CORRIDOR_COLORS[cats[i]] || '#ffd84d'
                : (CORRIDOR_COLORS[cats[i]] || '#ffd84d') + '55',
              borderRadius: [4, 4, 0, 0]
            }
          })),
          barWidth: '45%'
        }]
      }, true);

    } else {
      const { corridorIds, nodeOrder, data } = bd;
      const nodeColors = { core: '#ff6b6b', middle: '#4ecdc4', peripheral: '#a29bfe' };

      barChart.setOption({
        title: {
          text: labelMap[currentIndicator] + ' — Structure (2022)',
          left: 10, top: 6,
          textStyle: { color: textColor, fontSize: 12, fontWeight: 600 }
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(8,14,30,0.92)',
          borderColor: 'rgba(255,190,60,0.35)',
          textStyle: { color: '#f5f7fa', fontSize: 12 }
        },
        legend: {
          data: nodeOrder, top: 6, right: 10,
          textStyle: { color: textColor, fontSize: 11 }
        },
        grid: { left: 12, right: 20, top: 36, bottom: 44, containLabel: true },
        xAxis: {
          type: 'category',
          data: corridorIds,
          axisLabel: { color: textColor, fontSize: 11, formatter: corridorDisplayLabel },
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: textColor, fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } }
        },
        series: nodeOrder.map(nt => ({
          name: nt,
          type: 'bar',
          stack: 'total',
          data: corridorIds.map(cid => {
            const val = data[nt] ? (data[nt][cid] || 0) : 0;
            return {
              value: val,
              itemStyle: {
                color: currentCorridorId === cid
                  ? nodeColors[nt]
                  : nodeColors[nt] + '44'
              }
            };
          }),
          barWidth: '45%'
        }))
      }, true);
    }
  }

  // =========================================================
  // C. LINE CHART — bottom panel
  // =========================================================
  function initLineChart() {
    const dom = document.getElementById('page4LineChart');
    if (!dom) return;
    lineChart = echarts.init(dom, null, { renderer: 'canvas' });
    window.addEventListener('resize', () => lineChart && lineChart.resize());
    updateLineChart();
  }

  function updateLineChart() {
    if (!lineChart || !currentCorridorId) {
      if (lineChart) {
        lineChart.setOption({
          title: { text: 'Select a corridor to view trends', left: 'center', top: 'center',
            textStyle: { color: 'rgba(219,227,240,0.4)', fontSize: 13 } },
          xAxis: { show: false }, yAxis: { show: false }, series: []
        }, true);
      }
      return;
    }

    if (currentBottomMode === 'indicators') {
      renderIndicatorsView();
    } else {
      renderCitiesView();
    }
  }

  function renderIndicatorsView() {
    const cid = currentCorridorId;
    const rows = yearData.filter(d => d.corridor_id === cid).sort((a, b) => a.year - b.year);
    if (!rows.length) return;

    const years = rows.map(d => d.year);
    const textColor = 'rgba(219,227,240,0.76)';
    const indicatorMap = {
      gdp: { field: 'gdp_index', name: 'GDP Index', color: '#ffe66d' },
      population: { field: 'population_index', name: 'Population Index', color: '#4ecdc4' },
      ntl: { field: 'ntl_index', name: 'Night Light Index', color: '#ff6b6b' }
    };

    const series = Object.keys(indicatorMap).map(key => {
      const info = indicatorMap[key];
      const isActive = key === currentIndicator;
      return {
        name: info.name,
        type: 'line',
        data: rows.map(d => d[info.field]),
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: isActive ? 3 : 1.5, opacity: isActive ? 1 : 0.3 },
        itemStyle: { color: info.color, opacity: isActive ? 1 : 0.3 },
        z: isActive ? 10 : 1
      };
    });

    lineChart.setOption({
      title: null,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(8,14,30,0.92)',
        borderColor: 'rgba(255,190,60,0.35)',
        textStyle: { color: '#f5f7fa', fontSize: 12 }
      },
      legend: {
        data: Object.values(indicatorMap).map(i => i.name),
        top: 4, right: 10,
        textStyle: { color: textColor, fontSize: 11 }
      },
      grid: { left: 46, right: 24, top: 32, bottom: 24 },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { color: textColor, fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: 'Index (2012=100)',
        nameTextStyle: { color: textColor, fontSize: 10, padding: [0, 0, 0, 4] },
        axisLabel: { color: textColor, fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } }
      },
      series: series,
      markLine: undefined
    }, true);

    const markLines = [2012, 2020, 2022].filter(y => years.includes(y)).map(y => ({
      xAxis: String(y),
      lineStyle: { color: 'rgba(255,216,77,0.25)', type: 'dashed', width: 1 },
      label: { show: true, formatter: String(y), color: 'rgba(255,216,77,0.5)', fontSize: 10 }
    }));
    if (markLines.length) {
      const opt = lineChart.getOption();
      opt.series[0].markLine = {
        silent: true,
        symbol: 'none',
        data: markLines
      };
      lineChart.setOption({ series: opt.series });
    }
  }

  function renderCitiesView() {
    const cid = currentCorridorId;
    let effectiveIndicator = currentIndicator;

    if (effectiveIndicator === 'ntl') {
      effectiveIndicator = 'gdp';
    }

    const rows = cityYearData.filter(d => d.corridor_id === cid).sort((a, b) => a.year - b.year);
    if (!rows.length) return;

    const cities = [...new Set(rows.map(d => d.city))];
    const years = [...new Set(rows.map(d => d.year))].sort();
    const textColor = 'rgba(219,227,240,0.76)';

    const field = effectiveIndicator === 'gdp' ? 'gdp_index' : 'population_index';
    const palette = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8',
      '#00cec9', '#fab1a0', '#81ecec', '#dfe6e9', '#74b9ff',
      '#ffeaa7', '#55efc4', '#636e72', '#b2bec3'];

    const series = cities.map((city, i) => {
      const cityRows = rows.filter(d => d.city === city).sort((a, b) => a.year - b.year);
      return {
        name: cityEN(city),
        type: 'line',
        data: years.map(y => {
          const r = cityRows.find(d => d.year === y);
          return r ? r[field] : null;
        }),
        smooth: true,
        symbol: 'circle',
        symbolSize: 3,
        lineStyle: { width: 2 },
        itemStyle: { color: palette[i % palette.length] }
      };
    });

    const ntlNote = currentIndicator === 'ntl'
      ? '  (Night Light city-level series not available — showing GDP)' : '';

    lineChart.setOption({
      title: null,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(8,14,30,0.92)',
        borderColor: 'rgba(255,190,60,0.35)',
        textStyle: { color: '#f5f7fa', fontSize: 11 },
        confine: true
      },
      legend: {
        data: cities.map(cityEN),
        top: 2, left: 10, right: 10,
        textStyle: { color: textColor, fontSize: 10 },
        type: 'scroll',
        pageTextStyle: { color: textColor },
        itemWidth: 14, itemHeight: 8,
        itemGap: 8
      },
      grid: { left: 46, right: 24, top: 38, bottom: 28 },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { color: textColor, fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: (effectiveIndicator === 'gdp' ? 'GDP' : 'Population') + ' Index' + ntlNote,
        nameTextStyle: { color: textColor, fontSize: 9, padding: [0, 0, 0, 4] },
        axisLabel: { color: textColor, fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } }
      },
      series: series
    }, true);
  }

  // =========================================================
  // INSIGHT BOX
  // =========================================================
  function updateInsight() {
    const el = document.getElementById('page4InsightBox');
    if (!el) return;

    const labelMap = { ntl: 'Night Light', population: 'Population', gdp: 'GDP' };
    const modeLabel = { total: 'Total', rate: 'Growth Rate', structure: 'Structure' };
    const ind = currentIndicator;
    const mode = currentMode;

    if (mode === 'structure' && ind === 'ntl') {
      el.textContent = 'Structure view is not available for Night Light (no city-level NTL data).';
      return;
    }

    const bd = getBarData();
    if (!bd) {
      el.textContent = 'Select an indicator and mode to see insights.';
      return;
    }

    let topName = '';
    let topVal = 0;

    if (bd.type === 'simple') {
      bd.items.forEach(d => {
        if (d.value > topVal) { topVal = d.value; topName = d.corridor_nm; }
      });
      const valStr = mode === 'rate' ? topVal.toFixed(1) + '%' : topVal.toLocaleString();
      el.textContent = 'Under ' + labelMap[ind] + ' ' + modeLabel[mode]
        + ' mode, ' + topName + ' shows the largest value (' + valStr + ').';
    } else {
      const totals = {};
      bd.corridorIds.forEach(cid => {
        totals[cid] = 0;
        bd.nodeOrder.forEach(nt => { totals[cid] += (bd.data[nt][cid] || 0); });
      });
      let maxCid = bd.corridorIds[0];
      bd.corridorIds.forEach(cid => { if (totals[cid] > totals[maxCid]) maxCid = cid; });
      const row = summaryData.find(d => d.corridor_id === maxCid);
      topName = row ? row.corridor_nm : maxCid;
      el.textContent = 'Under ' + labelMap[ind] + ' Structure (2022), '
        + topName + ' has the largest total aggregated value.';
    }
  }

  // =========================================================
  // CONTROL PANEL WIRING
  // =========================================================
  function wireControls() {
    document.querySelectorAll('#page4IndicatorSwitch .page4-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentIndicator = btn.dataset.indicator;
        document.querySelectorAll('#page4IndicatorSwitch .page4-switch-btn').forEach(b => {
          b.classList.toggle('is-active', b === btn);
        });
        updateBarChart();
        updateLineChart();
        updateInsight();
      });
    });

    document.querySelectorAll('#page4ModeSwitch .page4-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('is-disabled')) return;
        currentMode = btn.dataset.mode;
        document.querySelectorAll('#page4ModeSwitch .page4-switch-btn').forEach(b => {
          b.classList.toggle('is-active', b === btn);
        });
        updateBarChart();
        updateInsight();
      });
    });

    document.querySelectorAll('#page4BottomModeSwitch .page4-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentBottomMode = btn.dataset.bmode;
        document.querySelectorAll('#page4BottomModeSwitch .page4-switch-btn').forEach(b => {
          b.classList.toggle('is-active', b === btn);
        });
        updateLineChart();
      });
    });

    document.querySelectorAll('#page4CorridorBtns .page4-corridor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setCurrentCorridor(btn.dataset.cid);
      });
    });

    if (barChart) {
      barChart.on('click', (params) => {
        const cid = params.name;
        if (summaryData.find(d => d.corridor_id === cid)) {
          setCurrentCorridor(cid);
        }
      });
    }
  }

  // =========================================================
  // BOOTSTRAP
  // =========================================================
  async function initPage4() {
    await loadAllData();

    for (const cid of DEFAULT_CORRIDOR_ORDER) {
      if (summaryData.find(d => d.corridor_id === cid)) {
        currentCorridorId = cid;
        break;
      }
    }

    initMap();
    initBarChart();
    initLineChart();
    wireControls();

    updateBarChart();
    updateLineChart();
    updateInsight();
    updateBottomLabel();
    updateCorridorBtns();
  }

  function patchFullPage() {
    var fpSections = document.querySelectorAll('#fullpage .section');
    if (fpSections.length >= 5) {
      var page4Section = fpSections[4];
      if (page4Section && !page4Section.getAttribute('data-anchor')) {
        page4Section.setAttribute('data-anchor', 'page4');
      }
    }

    var navLinks = document.querySelectorAll('.cover-nav-link');
    navLinks.forEach(function(link) {
      if (link.textContent.trim() === 'Layers') {
        link.setAttribute('href', '#page4');
      }
    });

    if (typeof fullpage_api !== 'undefined') {
      document.addEventListener('fullpage:afterLoad', function() {
        if (window.location.hash === '#page4') {
          if (page4Map) page4Map.resize();
          if (barChart) barChart.resize();
          if (lineChart) lineChart.resize();
        }
      });
    }

    window.addEventListener('hashchange', function() {
      if (window.location.hash === '#page4') {
        setTimeout(function() {
          if (page4Map) page4Map.resize();
          if (barChart) barChart.resize();
          if (lineChart) lineChart.resize();
        }, 300);
      }
    });
  }

  function boot() {
    patchFullPage();
    initPage4();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(boot, 50);
    });
  } else {
    setTimeout(boot, 50);
  }

})();
