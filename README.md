# Project Methodology Summary

An interactive web visualization exploring **spatial inequality in urban growth** through nighttime light imagery, spanning **2000–2024** and scaling from **global patterns** down to **Chinese city-level dynamics**.

👉 **[Check out the webpage!](https://LuHaot1an.github.io/CASA0029_Group11_NightLights/)**

---

### Data Sources

| Dataset                    | Period    | Format | Source                                                                                                                                                                                       |
|:--------------------------:|:---------:|:------:|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|
| Nighttime light composite  | 2000–2024 | `.tif` | Chen Z., Yu B. et al. *An Extended Time Series (2000–2018) of Global NPP-VIIRS-Like Nighttime Light Data from a Cross-Sensor Calibration.* Earth System Science Data, 2021, 13(3): 889–906 |
| Population grid            | 2000–2024 | `.tif` | [ORNL LandScan](https://landscan.ornl.gov)                                                                                                                                                  |
| GDP statistics             | 2000–2024 | `.csv` | [Chinese Government Statistical Yearbook](https://data.stats.gov.cn/dg/website/page.html#/pc/national/fsYearData)                                                                                                                                                      |
| Railway & POI shapefiles   | 2024      | `.shp` | [OpenStreetMap](https://www.openstreetmap.org)                                                                                                                                               |

### Raster Data Preprocessing

Raw NTL rasters are global TIFFs that can exceed **11 GB** per year. To make them usable for mapbox, we developed a three-step pipeline in ArcGIS Pro:

**1. Resample**

The original raster is resampled to a **0.02° × 0.02°** cell size using **bilinear interpolation**, which brings the dimensions down to roughly 18 000 × 8 600 pixels. The coordinate system stays in WGS 84 throughout.

**2. Value cleaning**

Using the **Raster Calculator**, NoData and negative values are set to 0, preventing abnormal data from affecting the visualization.

**3. 8-bit conversion for web delivery**

Mapbox raster tile sources require 8-bit imagery, so the cleaned raster is exported as an **8-bit unsigned TIFF** with the *Scale Pixel Value* option enabled. **LZW compression** is also applied at this stage, producing a lightweight file.

This same pipeline is applied consistently across all TIFFs.

---

---
## Technical Stack

This project was developed as a static web-based urban data visualisation website. It uses front-end web technologies and open-source visualisation libraries to present night-time light data, interactive maps, charts, and narrative sections.

| Layer | Tools / Libraries | Role in the Project |
|:--------------------|:--------------------|:------------------------------|
| Front-end structure | **HTML** | Provides the main structure of the website, including page sections, navigation elements, text content, image containers, chart containers, and map containers. |
| Styling and layout | **CSS** | Controls the visual style of the website, including typography, colours, spacing, page layout, responsive design, transitions, hover effects, and overall visual consistency. |
| Interaction logic | **JavaScript (ES6)** | Handles user interactions such as button clicks, section changes, chart updates, map switching, hover effects, event panels, and dynamic content updates. |
| Full-screen page navigation | **fullPage.js 4.0.20** | Creates the full-screen scrolling structure of the website, allowing the project to follow a clear step-by-step storytelling format. |
| Responsive layout support | **Bootstrap 5.3.3** | Supports responsive layout design and helps organise interface components across different screen sizes. |
| Landing page animation | **Canvas API** | Used to create the animated visual background on the landing page, helping introduce the night-time light theme in a more dynamic way. |
| Statistical visualisation | **Apache ECharts 5** | Used to create interactive charts, including line charts, bar charts, radar charts, tooltips, comparison charts, and linked information panels. |
| Interactive web mapping | **Mapbox GL JS 3.16.0** | Used to build interactive maps, display spatial layers, show night-time light patterns, support map zooming, layer switching, and regional focusing. |
| Spatial data preparation | **QGIS**, **ArcGIS Pro** | Used to process raster and vector spatial data, including night-time light imagery, regional boundaries, coordinate systems, and map outputs. |
| Web map publishing | **Mapbox Studio / Mapbox Tilesets** | Used to publish and manage web-ready spatial layers, including raster tiles, vector boundaries, city points, and regional map layers. |
| Data formats | **GeoTIFF**, **GeoJSON**, **CSV**, **JSON**, **PNG / JPG** | Used to store and display different types of project data, including raster night-time light data, spatial boundaries, chart data, configuration files, and visual assets. |
| Deployment | **GitHub Pages** | Used to host the final project as a static website that can be accessed online without a backend server. |
| Development environment | **Visual Studio Code**, **Live Server** | Used for writing, editing, testing, and previewing the website locally during development. Live Server was used to ensure local assets and JavaScript interactions loaded correctly. |

Overall, this project was developed as a lightweight static website using HTML, CSS, and Vanilla JavaScript. The technical stack combines narrative web design, interactive mapping, statistical visualisation, and spatial data processing tools. fullPage.js supports the full-screen storytelling structure, while ECharts and Mapbox GL JS are used to present chart-based and map-based visualisations. Spatial datasets were prepared with QGIS, ArcGIS Pro, and Mapbox Studio, and the final website was deployed through GitHub Pages. This technical approach allows the project to remain easy to access, transparent to review, and suitable for presenting urban night-time light data through an interactive web-based format.

---

## Team

Group11 - Haotian Lu · Chenyi Zhao · Jiayi Cheng
