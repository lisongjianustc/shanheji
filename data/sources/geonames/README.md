# GeoNames registration subset

Creator: GeoNames contributors. Source: [cities15000.zip](https://download.geonames.org/export/dump/cities15000.zip), downloaded 2026-10-05. License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), as stated in the [dump readme](https://download.geonames.org/export/dump/readme.txt) and [GeoNames about page](https://www.geonames.org/about.html).

`registration-cities.json` retains ten named city records, IDs, WGS84 coordinates, modification dates, archive SHA-256 and license. Changes: select these records, convert the tab-delimited fields into JSON, retain only registration fields. No endorsement is implied.

These modern city locations are approximate references for fitting small-scale historical maps. They do not establish ancient city centers, battlefield coordinates or ancient administrative boundaries. Fitted and held-out pixel points are separately recorded in `data/registration/`. They are not introduced into the application's ancient-place catalog.

## Regional references · updated 2026-10-06

`regional-references.json` separately preserves six selected country-dump records: Ezhou, Nanjing, Kyoto, Luoyang, Dengfeng and Fengxiang. The country archives, SHA-256, source fields and coordinates are recorded there. Coordinates use GeoNames [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); selection and JSON conversion are project changes, with no endorsement implied.

Fengxiang is record 7353795, modern Shaanxi/Baoji district town, at 107.39127°E/34.52301°N. Similar names in other provinces were excluded. Its 907 and 924 event dots indicate the modern regional reference, not an ancient palace or ceremony location. These event coordinates are distinct from map registration control points.
