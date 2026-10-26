# Typhoon size and map calibration

Researched 26 October 2026 for 《李氏力場》. These are physical scale references for a playable approximation, not parameters for a forecast model.

## What “size” measures

There is no single correct typhoon diameter. Keep the following quantities separate:

| Quantity                                  | Primary-source evidence                                                                                                                                                                                                                                                                                                      | Prototype recommendation                                                                                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloud-free eye diameter                   | HKO says most eyes are **30–60 km** across, with a much wider observed range. [HKO: Structure of Typhoons](https://www.hko.gov.hk/en/education/tropical-cyclone/classification-naming-characteristics/00147-structure-of-typhoons.html)                                                                                      | **30 km** for a compact mature storm; do not call the whole eyewall the eye.                                                                                                             |
| Radius of maximum wind, RMW               | This is the distance to the strongest winds, generally near the inner eyewall, not the outside of the storm. [NOAA/NWS glossary](https://forecast.weather.gov/glossary.php?word=radius+of+maximum+winds)                                                                                                                     | **30 km**, independently specified from the eye and outer circulation.                                                                                                                   |
| RMW observations around Hong Kong         | An HKO coauthored empirical model reports approximately **30–50 km** for past direct-hit HK storms; its model chooses **30 km**. Its cited 2001–2007 western North Pacific dataset spans roughly **10–110 km**. [Cheung, Cheung & Lam, 2009, section 2.1](https://www.hko.gov.hk/tc/publica/reprint/files/r799.pdf)          | A fixed 30 km is a defensible compact default, not a universal constant.                                                                                                                 |
| Gale-force wind radius, approximately R34 | The same HKO paper reproduces a Nuri (2008) bulletin: maximum wind 75 kt; wind radii over 33/47/63 kt of 100/60/30 nautical miles, approximately **185/111/56 km**. These are separate wind contours. [HKO paper, table 1](https://www.hko.gov.hk/tc/publica/reprint/files/r799.pdf)                                         | Target approximately **150 km R34** at the chosen reference intensity for a compact storm. This is a design choice, slightly more compact than the Nuri example, not a measured average. |
| Visible cloud shield                      | HKO describes Rose (1971) as having a relatively small satellite cloud mass **240–360 miles** across, approximately **386–579 km**. Its gale area near HK was only about **120 miles diameter**, approximately **193 km**, then shrank over land. [HKO: Typhoon Rose](https://www.hko.gov.hk/en/informtc/no10/rose/rose.htm) | Aim initially for approximately **450 km diameter** including the main cloud shield. Let advected wisps and rainbands extend beyond that; cloud density has no hard circular edge.       |

The eye, eyewall, low-level winds and upper cirrus canopy need not share an edge. HKO describes the visible canopy and spiral cloud bands separately, with the strongest winds confined around the eyewall. [HKO: Nature and Structure of Tropical Cyclones](https://www.hko.gov.hk/en/informtc/nature.htm)

## Variability and intensity

NOAA gives roughly **483 km** as a typical hurricane-strength cyclone width, while stressing substantial variation and that size does not establish intensity. Its examples range from Marco's approximately **18.5 km gale radius** to Tip's approximately **1,087 km gale radius**. These extremes are not suitable default sizes. [NOAA JetStream: Tropical Cyclone Structure](https://www.noaa.gov/jetstream/tropical/tropical-cyclone-introduction/tropical-cyclone-structure)

JMA explicitly classifies _size_ using the radius of winds at least **15 m/s**, whereas _strength_ uses maximum wind speed. Its “large” size starts at a **500 km radius**, and “very large” at **800 km**. That 15 m/s threshold is 54 km/h, so it must not be mislabeled as HKO's 63 km/h gale contour. Asymmetric radii are averaged for JMA's size classification. [JMA typhoon terminology](https://www.jma.go.jp/jma/kishou/know/yougo_hp/haichi2.html)

Keep a size parameter independent of maximum wind/intensity. A declining maximum wind can still move a particular wind-threshold contour inward; that does not require the cloud shield to shrink instantly. A visible eye should also fade when an organized typhoon weakens, rather than remaining a fixed hole at every intensity. HKO's classes use **maximum 10-minute mean wind near the centre**, separately from local Hong Kong winds. [HKO classification](https://www.hko.gov.hk/en/informtc/class.htm)

## Why the current view looks oversized

Code inspection, rather than a meteorological observation: the original map crop is 111.6–116.6°E and 19.2–23.5°N stretched into 1000 × 840 world units. Near 22°N that covers only about **516 × 478 km**. A realistic 450 km cloud mass almost fills its width. The fixed 160-world-unit wind radius represents only about **83–91 km**, depending on axis, because the projection stretches the axes differently. Therefore, the current apparent cloud oversize cannot be fixed honestly by claiming all real typhoons have a tiny wind footprint.

Use one kilometre-to-world conversion on both axes. Recommended regional framing: **108–122°E, approximately 15–26°N**, about **1,450 × 1,220 km**, covering the South China coast, Taiwan and northern Luzon as in the reference image. Set the exact north edge from the desired aspect ratio and a reference latitude near 21°N, so distances stay consistent. This is a framing/design recommendation inferred from the supplied image, not an official meteorological map extent.

With a 1,450 km map width and 1000 world units, useful approximate world dimensions are:

| Feature                    | Kilometres | World units |
| -------------------------- | ---------: | ----------: |
| Eye diameter               |         30 |        20.7 |
| RMW                        |         30 |        20.7 |
| Reference gale radius      |        150 |       103.4 |
| Main cloud-shield diameter |        450 |       310.3 |

Draw a real **100 km** scale bar from that same conversion. Reproject all HK sample regions and coastline geometry with it. Keep the land-contact area explicitly labeled as a gameplay wind/inflow footprint; counting every thin cirrus wisp as surface landfall would conflate different layers. Avoid an abrupt zero-wind cutoff at the gale radius: it is a threshold crossing, not the edge of all circulation.

These defaults describe one deliberately compact storm. They do not reconstruct the unidentified reference cyclone or imply a precise radius can be recovered from that image alone.
