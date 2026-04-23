document.addEventListener('DOMContentLoaded', () => {
  const MAP_CONFIG = {
    comparison: {
      src: './assets/images/comparison_map.png',
      title: 'Comparison Map',
      desc: 'New bright areas and stable bright areas shown together for 2014–2024.'
    },
    new: {
      src: './assets/images/new_bright_map.png',
      title: 'New Bright Areas Map',
      desc: 'Only newly emerged bright areas between 2014 and 2024 are highlighted.'
    },
    stable: {
      src: './assets/images/stable_bright_map.png',
      title: 'Stable Bright Areas Map',
      desc: 'Areas that remained bright in both 2014 and 2024 are isolated for comparison.'
    }
  };

  const CHART_DATA = [
    {
      region: 'YRD',
      label: 'Yangtze River Delta',
      newBrightArea: 29284.597817881902,
      stableBrightArea: 43520.2759180504,
      summary:
        'The Yangtze River Delta shows the largest absolute footprint of new bright areas, with expansion spreading from the Shanghai core into a dense multi-city urban belt.'
    },
    {
      region: 'PRD',
      label: 'Pearl River Delta',
      newBrightArea: 10692.1574212961,
      stableBrightArea: 16022.3802117974,
      summary:
        'The Pearl River Delta remains one of the most mature luminous regions, where new bright areas mainly extend around existing metropolitan clusters and transport corridors.'
    },
    {
      region: 'BTH',
      label: 'Beijing–Tianjin–Hebei',
      newBrightArea: 14520.4736796986,
      stableBrightArea: 18222.890325248198,
      summary:
        'Beijing–Tianjin–Hebei records substantial outward expansion, with new bright areas filling the inter-city space between major urban nodes and regional infrastructure axes.'
    }
  ];

  const mainImageEl = document.getElementById('page3MainMap');
  const mapTitleEl = document.getElementById('page3MapTitle');
  const mapDescEl = document.getElementById('page3MapDesc');
  const switchButtons = document.querySelectorAll('.page3-switch-btn');
  const regionCards = document.querySelectorAll('.page3-region-card');

  const viewportEl = document.getElementById('page3MapViewport');
  const panzoomEl = document.getElementById('page3MapPanzoom');
  const zoomInBtn = document.getElementById('page3ZoomIn');
  const zoomOutBtn = document.getElementById('page3ZoomOut');
  const resetBtn = document.getElementById('page3ResetView');
  const zoomValueEl = document.getElementById('page3ZoomValue');

  const totalNewEl = document.getElementById('page3TotalNew');
  const totalStableEl = document.getElementById('page3TotalStable');
  const expansionRatioEl = document.getElementById('page3ExpansionRatio');
  const leadRegionEl = document.getElementById('page3LeadRegion');

  const regionTitleEl = document.getElementById('page3RegionTitle');
  const regionSummaryEl = document.getElementById('page3RegionSummary');
  const regionNewEl = document.getElementById('page3RegionNew');
  const regionStableEl = document.getElementById('page3RegionStable');
  const regionRatioEl = document.getElementById('page3RegionRatio');

  let chart = null;
  let chartData = CHART_DATA;
  let activeRegion = 'YRD';
  let activeMapKey = 'comparison';

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  const MIN_SCALE = 1;
  const MAX_SCALE = 4;

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginX = 0;
  let dragOriginY = 0;

  function formatArea(value) {
    return `${Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} km²`;
  }

  function formatPercent(value) {
    return `${Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}%`;
  }

  function getRegionRatio(item) {
    if (!item || !item.stableBrightArea) return 0;
    return (item.newBrightArea / item.stableBrightArea) * 100;
  }

  function clampTranslate() {
    if (!viewportEl) return;

    const viewportWidth = viewportEl.clientWidth;
    const viewportHeight = viewportEl.clientHeight;

    const maxOffsetX = ((scale - 1) * viewportWidth) / 2;
    const maxOffsetY = ((scale - 1) * viewportHeight) / 2;

    translateX = Math.max(-maxOffsetX, Math.min(maxOffsetX, translateX));
    translateY = Math.max(-maxOffsetY, Math.min(maxOffsetY, translateY));
  }

  function applyTransform() {
    clampTranslate();
    panzoomEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    zoomValueEl.textContent = `${Math.round(scale * 100)}%`;
    viewportEl.classList.toggle('is-zoomed', scale > 1.01);
  }

  function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    applyTransform();
  }

  function zoomTo(newScale, originX = null, originY = null) {
    const previousScale = scale;
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    if (originX !== null && originY !== null && viewportEl) {
      const rect = viewportEl.getBoundingClientRect();
      const offsetX = originX - rect.left - rect.width / 2;
      const offsetY = originY - rect.top - rect.height / 2;
      const zoomFactor = scale / previousScale;

      translateX = (translateX - offsetX) * zoomFactor + offsetX;
      translateY = (translateY - offsetY) * zoomFactor + offsetY;
    }

    if (scale <= 1.001) {
      translateX = 0;
      translateY = 0;
    }

    applyTransform();
  }

  function setMap(mapKey) {
    const config = MAP_CONFIG[mapKey];
    if (!config || !mainImageEl) return;

    activeMapKey = mapKey;
    mainImageEl.src = config.src;
    mapTitleEl.textContent = config.title;
    mapDescEl.textContent = config.desc;

    switchButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.map === mapKey);
    });

    resetZoom();
  }

  function updateTopStats() {
    if (!chartData.length) return;

    const totalNew = chartData.reduce((sum, item) => sum + item.newBrightArea, 0);
    const totalStable = chartData.reduce((sum, item) => sum + item.stableBrightArea, 0);
    const leadRegion = [...chartData].sort((a, b) => b.newBrightArea - a.newBrightArea)[0];
    const ratio = totalStable ? (totalNew / totalStable) * 100 : 0;

    totalNewEl.textContent = formatArea(totalNew);
    totalStableEl.textContent = formatArea(totalStable);
    expansionRatioEl.textContent = formatPercent(ratio);
    leadRegionEl.textContent = `${leadRegion.region} · ${leadRegion.label}`;
  }

  function buildChartOption() {
    const regions = chartData.map((item) => item.region);
    const newBrightData = chartData.map((item) => item.newBrightArea);
    const stableBrightData = chartData.map((item) => item.stableBrightArea);

    const activeIndex = chartData.findIndex((item) => item.region === activeRegion);

    return {
      animationDuration: 500,
      grid: {
        top: 40,
        right: 24,
        bottom: 28,
        left: 54
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: 'rgba(8, 14, 25, 0.94)',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: {
          color: '#f5f7fa'
        },
        formatter(params) {
          const items = Array.isArray(params) ? params : [params];
          const title = items[0]?.axisValue || '';
          const lines = items.map((item) => {
            const value = Number(item.value).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
            return `${item.marker}${item.seriesName}: ${value} km²`;
          });
          return [title, ...lines].join('<br/>');
        }
      },
      legend: {
        top: 0,
        right: 0,
        textStyle: {
          color: '#dbe3f0',
          fontSize: 12
        },
        itemWidth: 14,
        itemHeight: 10
      },
      xAxis: {
        type: 'category',
        data: regions,
        axisTick: { show: false },
        axisLine: {
          lineStyle: { color: 'rgba(255,255,255,0.18)' }
        },
        axisLabel: {
          color: '#dbe3f0',
          fontSize: 12,
          fontWeight: 600
        }
      },
      yAxis: {
        type: 'value',
        name: 'km²',
        nameTextStyle: {
          color: '#94a7c6',
          padding: [0, 0, 4, 0]
        },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.08)' }
        },
        axisLabel: {
          color: '#9fb0cf',
          formatter: (value) => Number(value).toLocaleString()
        }
      },
      series: [
        {
          name: 'New Bright Areas',
          type: 'bar',
          barWidth: 26,
          itemStyle: {
            color: '#ff5a52',
            borderRadius: [8, 8, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: '#ff6f69'
            }
          },
          data: newBrightData.map((value, index) => ({
            value,
            itemStyle:
              index === activeIndex
                ? {
                    color: '#ff6f69',
                    shadowBlur: 14,
                    shadowColor: 'rgba(255, 90, 82, 0.35)'
                  }
                : undefined
          })),
          label: {
            show: true,
            position: 'top',
            color: '#ffffff',
            fontWeight: 700,
            formatter: ({ value }) =>
              Number(value).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })
          }
        },
        {
          name: 'Stable Bright Areas',
          type: 'bar',
          barWidth: 26,
          itemStyle: {
            color: '#9ca6b5',
            borderRadius: [8, 8, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: '#b5beca'
            }
          },
          data: stableBrightData.map((value, index) => ({
            value,
            itemStyle:
              index === activeIndex
                ? {
                    color: '#b5beca',
                    shadowBlur: 14,
                    shadowColor: 'rgba(156, 166, 181, 0.28)'
                  }
                : undefined
          })),
          label: {
            show: true,
            position: 'top',
            color: '#dbe3f0',
            fontWeight: 700,
            formatter: ({ value }) =>
              Number(value).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })
          }
        }
      ]
    };
  }

  function updateRegionFocus(regionCode) {
    activeRegion = regionCode;

    const selected = chartData.find((item) => item.region === regionCode);
    if (!selected) return;

    regionCards.forEach((card) => {
      card.classList.toggle('is-active', card.dataset.region === regionCode);
    });

    regionTitleEl.textContent = `${selected.region} · ${selected.label}`;
    regionSummaryEl.textContent = selected.summary;
    regionNewEl.textContent = formatArea(selected.newBrightArea);
    regionStableEl.textContent = formatArea(selected.stableBrightArea);
    regionRatioEl.textContent = formatPercent(getRegionRatio(selected));

    if (chart) {
      chart.setOption(buildChartOption(), true);
    }
  }

  function initChart() {
    const chartDom = document.getElementById('page3BarChart');
    if (!chartDom || typeof echarts === 'undefined') return;

    chart = echarts.init(chartDom);
    updateTopStats();
    updateRegionFocus(activeRegion);

    chart.on('click', (params) => {
      const item = chartData[params.dataIndex];
      if (item) {
        updateRegionFocus(item.region);
      }
    });

    window.addEventListener('resize', resize);
    setTimeout(resize, 300);
  }

  function resize() {
    if (chart) chart.resize();
    applyTransform();
  }

  function startDrag(event) {
    if (scale <= 1.01) return;
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = translateX;
    dragOriginY = translateY;
    viewportEl.classList.add('is-dragging');
    panzoomEl.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    if (!isDragging) return;
    translateX = dragOriginX + (event.clientX - dragStartX);
    translateY = dragOriginY + (event.clientY - dragStartY);
    applyTransform();
  }

  function endDrag(event) {
    isDragging = false;
    viewportEl.classList.remove('is-dragging');
    if (event && panzoomEl.hasPointerCapture(event.pointerId)) {
      panzoomEl.releasePointerCapture(event.pointerId);
    }
  }

  function initPanZoom() {
    if (!viewportEl || !panzoomEl) return;

    viewportEl.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const delta = event.deltaY < 0 ? 0.18 : -0.18;
        zoomTo(scale + delta, event.clientX, event.clientY);
      },
      { passive: false }
    );

    viewportEl.addEventListener('dblclick', (event) => {
      event.preventDefault();
      zoomTo(scale < 1.4 ? scale + 0.5 : 1, event.clientX, event.clientY);
    });

    viewportEl.addEventListener('pointerdown', startDrag);
    viewportEl.addEventListener('pointermove', moveDrag);
    viewportEl.addEventListener('pointerup', endDrag);
    viewportEl.addEventListener('pointerleave', endDrag);

    zoomInBtn?.addEventListener('click', () => zoomTo(scale + 0.2));
    zoomOutBtn?.addEventListener('click', () => zoomTo(scale - 0.2));
    resetBtn?.addEventListener('click', resetZoom);

    mainImageEl?.addEventListener('load', resetZoom);
  }

  function initControls() {
    switchButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setMap(button.dataset.map);
      });
    });

    regionCards.forEach((card) => {
      card.addEventListener('click', () => {
        updateRegionFocus(card.dataset.region);
      });
    });
  }

  function init() {
    initControls();
    initPanZoom();
    setMap(activeMapKey);
    initChart();
    applyTransform();
  }

  window.Page3View = { resize, resetZoom, setMap };
  init();
});