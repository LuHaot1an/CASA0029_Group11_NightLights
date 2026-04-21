(function () {
 let page2Chart = null;
 let page2Data = [];
 let eventItems = [];
 let currentEventIndex = 0;

 function hasEvent(item) {
  return Boolean(
    item.event_title_en || item.event_text_en || item.image_file
  );
}

function updateEventPanel(item) {
  if (!item) return;

  const yearEl = document.getElementById("eventYear");
  const labelEl = document.getElementById("eventLabel");
  const titleEl = document.getElementById("eventTitle");
  const textEl = document.getElementById("eventText");
  const imageEl = document.getElementById("eventImage");
  const imageWrap = imageEl.parentElement;

  yearEl.textContent = item.year;
  labelEl.textContent = item.is_highlight ? "Highlighted Year" : "Annotated Year";
  titleEl.textContent = item.event_title_en || "";
  textEl.textContent = item.event_text_en || "";

  if (item.image_file) {
    imageEl.src = `./${item.image_file}`;
    imageEl.style.display = "block";
    imageWrap.style.display = "block";
  } else {
    imageEl.removeAttribute("src");
    imageEl.style.display = "none";
    imageWrap.style.display = "none";
  }
}

function setEventByIndex(index, syncChart = true) {
  if (!eventItems.length) return;

  if (index < 0) index = eventItems.length - 1;
  if (index >= eventItems.length) index = 0;

  currentEventIndex = index;

  const item = eventItems[currentEventIndex];
  updateEventPanel(item);

  if (syncChart && page2Chart) {
    const fullIndex = page2Data.findIndex(d => d.year === item.year);

    if (fullIndex !== -1) {
      page2Chart.dispatchAction({
        type: "showTip",
        seriesIndex: 0,
        dataIndex: fullIndex
      });
    }
  }
}

  function buildOption(data) {
    const years = data.map(d => d.year);
    const ntlTotal = data.map(d => d.ntl_total);
    const gdp = data.map(d => d.gdp_trillion_cny);
    const growth = data.map(d => d.ntl_growth_rate_pct);

    return {
      backgroundColor: "transparent",
      animationDuration: 800,
      tooltip: {
  trigger: "axis",
  backgroundColor: "rgba(8,14,30,0.95)",
  borderColor: "rgba(255,216,77,0.18)",
  textStyle: {
    color: "#f5f7fa"
  },
  axisPointer: {
    type: "line",
    lineStyle: {
      color: "rgba(255,216,77,0.55)",
      width: 1.2
    }
  },
  formatter: function (params) {
    const row = data[params[0].dataIndex];

    if (hasEvent(row)) {
      const idx = eventItems.findIndex(d => d.year === row.year);
      if (idx !== -1) {
        currentEventIndex = idx;
        updateEventPanel(row);
      }
    }

    return `
      <div style="line-height:1.7;">
        <strong style="color:#ffd84d;">${row.year}</strong><br/>
        Night Lights Total: ${Number(row.ntl_total).toLocaleString()} nW/cm²/sr<br/>
        GDP: ${Number(row.gdp_trillion_cny).toFixed(3)} trillion CNY<br/>
        NTL Growth: ${
          row.ntl_growth_rate_pct == null
            ? "N/A"
            : Number(row.ntl_growth_rate_pct).toFixed(1) + "%"
        }
      </div>
    `;
  }
},
      legend: {
        top: 8,
        textStyle: {
          color: "#f5f7fa"
        }
      },
      grid: {
        left: 70,
        right: 110,
        top: 70,
        bottom: 60
      },
      xAxis: {
        type: "category",
        data: years,
        axisLine: {
          lineStyle: { color: "rgba(255,255,255,0.18)" }
        },
        axisTick: { show: false },
        axisLabel: {
          color: "#9fb0cf"
        }
      },
      yAxis: [
  {
    type: "value",
    name: "NTL Total",
    position: "left",
    nameLocation: "end",
    nameGap: 18,
    nameTextStyle: { color: "#9fb0cf" },
    axisLabel: { color: "#9fb0cf" },
    axisLine: { show: false },
    splitLine: {
      lineStyle: { color: "rgba(255,255,255,0.08)" }
    }
  },
  {
    type: "value",
    name: "GDP",
    position: "right",
    offset: 0,
    nameLocation: "end",
    nameGap: 14,
    nameTextStyle: { color: "#9fb0cf" },
    axisLabel: { color: "#9fb0cf" },
    axisLine: { show: false },
    splitLine: { show: false }
  },
  {
    type: "value",
    name: "Growth %",
    position: "right",
    offset: 54,
    nameLocation: "end",
    nameGap: 14,
    nameTextStyle: { color: "#9fb0cf" },
    axisLabel: {
      color: "#9fb0cf",
      formatter: "{value}%"
    },
    axisLine: { show: false },
    splitLine: { show: false }
  }
],
      series: [
        {
          name: "NTL Total",
          type: "line",
          data: ntlTotal,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: "#ffd84d"
          },
          itemStyle: {
            color: "#ffd84d"
          }
        },
        {
          name: "GDP",
          type: "line",
          yAxisIndex: 1,
          data: gdp,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: "#7fb3ff"
          },
          itemStyle: {
            color: "#7fb3ff"
          }
        },
        {
          name: "NTL Growth %",
          type: "bar",
          yAxisIndex: 2,
          data: growth,
          barWidth: "42%",
          itemStyle: {
            color: "rgba(255,255,255,0.18)",
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: "rgba(255,216,77,0.45)"
            }
          }
        }
      ]
    };
  }

  async function initPage2Chart() {
    const chartDom = document.getElementById("page2Chart");
    if (!chartDom || typeof echarts === "undefined") return;

    try {
      const res = await fetch("./assets/data/page2_integrated_data_2000_2024.json");
      page2Data = await res.json();
      eventItems = page2Data.filter(hasEvent);

      page2Chart = echarts.init(chartDom);
      page2Chart.setOption(buildOption(page2Data));

    const defaultItem =
  eventItems.find(d => d.default_panel_year) ||
  eventItems.find(d => d.year === 2020) ||
  eventItems[0];

currentEventIndex = eventItems.findIndex(d => d.year === defaultItem.year);
updateEventPanel(defaultItem);

const eventPanel = document.querySelector(".page2-event-panel");

eventPanel.addEventListener(
  "wheel",
  function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.deltaY > 0) {
      setEventByIndex(currentEventIndex + 1, true);
    } else {
      setEventByIndex(currentEventIndex - 1, true);
    }
  },
  { passive: false }
);

      page2Chart.on("updateAxisPointer", function (event) {
        const info = event.axesInfo && event.axesInfo[0];
        if (!info) return;

        const year = Number(info.value);
        const item = page2Data.find(d => d.year === year);
        updateEventPanel(item);
      });

      window.addEventListener("resize", function () {
        if (page2Chart) page2Chart.resize();
      });

      setTimeout(() => {
        if (page2Chart) page2Chart.resize();
      }, 400);

    } catch (err) {
      console.error("Page 2 chart failed to load:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", initPage2Chart);
})();