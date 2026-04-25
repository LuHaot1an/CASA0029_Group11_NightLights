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

## Team

Group11 - Haotian Lu · Chenyi Zhao · Jiayi Cheng
