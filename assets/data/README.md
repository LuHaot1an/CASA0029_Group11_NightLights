# Page1 Data Preparation (Mapbox)

This folder stores configuration files used by `page1`.

## Required files

- `year-tilesets.json`: maps each year (`2000`-`2024`) to one Mapbox raster tileset ID.
- `regions.json`: predefined camera targets for region jump buttons.

## Recommended workflow for NTL raster data

1. Reproject yearly NTL rasters to `EPSG:4326`.
2. Keep one GeoTIFF per year using a stable naming rule: `ntl_YYYY.tif`.
3. Use a consistent value range/stretch for all years to avoid visual flicker.
4. Upload each year to Mapbox as one raster tileset (Studio Uploads or Upload API).
5. Fill `year-tilesets.json` with the real uploaded IDs.

Example entry:

```json
{
  "2024": "group11.ntl_2024"
}
```
