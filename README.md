# Urban Expansion Imbalance — Seen from Night-Time Lights

An interactive, narrative-driven web visualization exploring **spatial inequality in urban growth** through nighttime light imagery, spanning **2000–2024** and scaling from **global patterns** down to **Chinese city-level dynamics**.

👉 **[Live Site](https://LuHaot1an.github.io/CASA0029_Group11_NightLights/)**

## Overview

The site is organized as a full-screen scrolling story with five analytical sections:

| Section | Focus |
|---------|-------|
| **Global NTL Map** | World-wide distribution of nighttime brightness, highlighting three dominant luminous clusters |
| **China Trend** | 25-year co-evolution of national NTL intensity and GDP, annotated with key events |
| **Bright Area Comparison** | New vs. stable bright areas (2014–2024) across YRD, PRD, and BTH regions |
| **Transport Corridors** | How four major rail corridors (Beijing–Guangzhou, Shanghai–Nanjing–Hangzhou, Guangzhou–Shenzhen, Chengdu–Chongqing) shape surrounding urban growth |
| **City Hierarchy** | Tier-based (T1/T2/T3) comparison of growth intensity, coordination, and POI functional structure |

## Data Sources

| Dataset | Source |
|---------|--------|
| Nighttime light (2000–2024) | Chen Z., Yu B. et al. *An Extended Time Series (2000–2018) of Global NPP-VIIRS-Like Nighttime Light Data from a Cross-Sensor Calibration.* Earth System Science Data, 2021, 13(3): 889–906 |
| Population (2000–2024) | [ORNL LandScan](https://landscan.ornl.gov) |
| GDP (2000–2024) | Chinese Government Statistical Yearbook |
| Railway & POI shapefiles | [OpenStreetMap](https://www.openstreetmap.org) |

## Methods

- **Nighttime light as urban proxy** — raster-level brightness is used as a spatially continuous indicator of economic activity and urbanization intensity.
- **Change detection** — new and stable bright areas are identified by comparing VIIRS composites between 2014 and 2024.
- **Corridor-based analysis** — transport lines are buffered to extract cities along each corridor; NTL, population, and GDP are compared across corridors over time.
- **City-tier profiling** — cities are classified into three tiers; growth trajectories, coordination indices, and POI distributions are analyzed per tier.

## Tech Stack

Mapbox GL JS · ECharts · fullPage.js · Bootstrap 5 — pure static site, no build step required.

## Team

Haotian Lu · Chenyi Zhao · Jiayi Cheng
