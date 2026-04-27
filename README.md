# Project Methodology Summary

An interactive web visualization exploring **spatial inequality in urban growth** through nighttime light imagery, spanning **2000–2024** and scaling from **global patterns** down to **Chinese city-level dynamics**.

👉 **[Check out the webpage!](https://LuHaot1an.github.io/CASA0029_Group11_NightLights/)**

---

## Data Sources

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

## Page-based Methodology and Visualisation Workflow


### Page 1: Global Night-time Light Overview

Page 1 was created from global night-time light raster data. The raster was checked for coordinate reference system and spatial coverage, then prepared in a web-friendly format for display. This page does not calculate derived indicators; instead, it introduces night-time light as a proxy for urban activity, infrastructure concentration, and uneven settlement intensity. The processed raster layer provides a global overview before the project narrows to China-based analysis.

### Page 2: China Night-time Light and GDP Trend

Page 2 compares China’s annual night-time light change with GDP trends. GDP data were cleaned into a year-based table, while night-time light layers were organised by year for consistent temporal comparison. The visualisation links economic growth with changing brightness intensity, helping establish night-time light as an analytical indicator of urban and economic change.

### Page 3: New and Stable Bright Areas

Page 3 identifies spatial change in bright areas using a temporal raster comparison method. Each night-time light raster was converted into a binary bright-area layer using a brightness threshold. Pixels above the threshold were classified as bright, and pixels below the threshold were classified as non-bright. Two categories were then calculated:

`new_bright_area = bright_later_year AND NOT bright_baseline_year`

`stable_bright_area = bright_later_year AND bright_baseline_year`

This method separates newly emerging urban brightness from areas that remained consistently bright. The resulting raster-derived layers were styled as map layers to show where urban light expansion occurred and where existing bright cores remained stable. This page therefore focuses on spatial change rather than total brightness.

### Page 4: Transport Corridors and Urban Expansion

Page 4 analyses whether urban growth is concentrated along selected transport corridors. Four corridor GeoJSON layers were prepared and imported into QGIS. Because distance-based calculations must be performed in metres, the corridor layers were projected into a metre-based coordinate system before buffering. A corridor influence zone was then generated around each corridor line using a fixed buffer distance:

`corridor_buffer = buffer(corridor_line, distance_km)`

The buffer polygons were used as spatial units for aggregation. Night-time light values were extracted from annual raster layers within each corridor buffer. GDP and population tables were cleaned into long format and joined to cities associated with each corridor. The final corridor-year table used this structure:

`corridor, year, ntl_value, gdp_value, population_value`

Growth rates were calculated from the baseline year to the final year:

`growth_rate = (value_2022 - value_2012) / value_2012`

These indicators were used to create corridor-level maps, summary cards, and charts, allowing users to compare how different corridors relate to changes in night-time light, GDP, and population.

### Page 5: City Hierarchy, Growth Coordination and Functional Support

Page 5 compares Chinese cities by hierarchy. A city point layer was joined with a city-tier lookup table and classified into `T1`, `T2`, and `T3`. Annual night-time light, GDP, and population datasets were cleaned into city-year tables and standardised to 2012–2022. For each city and each indicator, a 2012-based index was calculated:

`index_t = (value_t / value_2012) * 100`

This produced `ntl_index`, `gdp_index`, and `population_index`, which drive the time-series chart. City-level growth rates were calculated as:

`ntl_growth_rate = (ntl_2022 - ntl_2012) / ntl_2012`

`gdp_growth_rate = (gdp_2022 - gdp_2012) / gdp_2012`

`population_growth_rate = (population_2022 - population_2012) / population_2012`

Three analytical indicators were then derived. Growth intensity was calculated as:

`growth_intensity = (ntl_growth_rate + gdp_growth_rate + population_growth_rate) / 3`

Growth efficiency was calculated as:

`growth_efficiency = gdp_growth_rate / population_growth_rate`

Cities with near-zero population growth were treated carefully to avoid unstable values. Coordination was calculated by comparing the three growth rates with their average:

`average_growth = (ntl_growth_rate + gdp_growth_rate + population_growth_rate) / 3`

`coordination_index = 1 / (1 + |ntl_growth_rate - average_growth| + |gdp_growth_rate - average_growth| + |population_growth_rate - average_growth|)`

Functional support was calculated from OpenStreetMap POI data. Education, medical, and commercial POIs were filtered using the `fclass` field. A 25 km buffer was created around each city point, and POIs were counted within each buffer:

`edu_count = count(education POIs within 25 km city buffer)`

`medical_count = count(medical POIs within 25 km city buffer)`

`commercial_count = count(commercial POIs within 25 km city buffer)`

The support index was calculated using a log-transformed average:

`support_index = [ln(1 + edu_count) + ln(1 + medical_count) + ln(1 + commercial_count)] / 3`

The final city profile table was joined back to the city point layer and uploaded to Mapbox. The webpage uses this layer for the city map, while local CSV files drive the time-series and city-versus-tier comparison charts.


## Team

Group11 - Haotian Lu · Chenyi Zhao · Jiayi Cheng
