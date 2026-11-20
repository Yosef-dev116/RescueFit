# PEI candidate directory and impact-method sources

Checked 2026-11-19. Research-only handoff; not an enrolled-partner directory or live routing dataset. No organizations contacted. No capacities, acceptance status, pickup arrangements, coordinates, or operating hours verified. Missing street addresses must stay missing; town-level entries must not become precise map pins. Public listing does not establish permission to deliver food. Community fridges are locations, not necessarily separate recipient agencies.

## Primary operator / association sources: 13 locations

[A: Upper Room contact page](https://www.urhm.org/contact-us/) supplies its contact address; confirm the actual receiving entrance before delivery.

| Candidate | Published location | Source |
|---|---|---|
| Upper Room Hospitality Ministry | 15 Plywood Place, Charlottetown | A |

[B: PEI Food Banks association directory](https://www.urhm.org/contact-us/pei-food-banks/) lists the following. Upper Room describes itself as association/head office, not a regulator. Towns below come from names/location labels, not inferred street addresses.

| Candidate | Published location | Source |
|---|---|---|
| Salvation Army Charlottetown | Charlottetown | B |
| Southern Kings and Queens | Montague | B |
| Souris Food Bank | Souris | B |
| Kensington Food Bank | Kensington | B |
| Summerside Salvation Army | Summerside | B |
| Trinity United Church | Summerside | B |
| West Prince Caring Cupboard | Alberton | B |
| West Prince Caring Cupboard | Bloomfield/O’Leary | B |
| West Prince Caring Cupboard | Tignish | B |
| West Prince Caring Cupboard | Tyne Valley | B |
| The Shoppe (Malsano’Kuo’m) | 19 Indian Feather Path, Lennox Island | B |
| Cornwall Food Bank, Society of Saint Vincent de Paul | St. Francis of Assisi basement, 5 Lowther Drive, Cornwall | B |

## Secondary directory: 9 additional locations

[C: 211 PEI community-fridge directory](https://pe.211.ca/household-goods-and-hygiene-products/community-fridges-and-pantries-in-pei-2). These listings have not been independently confirmed with operators. 211 says donation rules vary and must be checked at each site. Names and addresses below are directory evidence only.

| Candidate | Published location | Source |
|---|---|---|
| Community Cupboard, St Peters Bay | Jim MacAulay Complex, 1968 Cardigan Road, St-Peters Bay | C |
| Alberton Community Fridge | 3 Emma Drive, Alberton | C |
| Sherwood Community Fridge | 10 Maple Hills Avenue, Charlottetown | C |
| West Royalty Community Fridge | 1 Kirkdale Road, Charlottetown | C |
| Montague Community Fridge | 513 Main Street, Lower Montague | C |
| Montague Rotary Library Community Fridge | 21 Sullivan Lane, Lower Montague | C |
| Murray Harbour Community Fridge | 1382 Main Street, Murray Harbour | C |
| Stratford Community Fridge | 25 Hopeton Road, Stratford | C |
| West River Community Fridge | Afton Community Centre, 1552 Route 19, New Dominion | C |

## Food storage: primary Canadian guidance

[Health Canada safe food storage](https://www.canada.ca/en/health-canada/services/general-food-safety-tips/safe-food-storage.html): refrigerator at 4°C or colder, freezer at -18°C or colder. Refrigerated examples: fresh beef/pork/lamb 2–4 days; ground meat 1–2; fresh chicken/turkey 2–3; cooked meat/vegetable dishes 3–4; soups 2–3; opened milk 3 days. Freezer durations concern quality, not the same refrigerator safety clock.

Do not implement a universal category shelf-life or restart a clock when food is donated. Item, preparation/opening date, packaging, storage history, label, and applicable safety review matter. These examples are not automated clearance for food donations. Broad produce, dairy, meat, and bakery categories cannot safely share one expiry rule. Keep unknown dates unknown and require review.

## Meal-equivalent conversion

[Feeding America methodology](https://www.feedingamerica.org/ways-to-give/faq/about-our-claims) uses roughly 1.2 pounds per meal: 0.544310844 kg. Optional demo formula: donated edible kg / 0.544310844 = estimated meal equivalents. This is a US reporting convention, not a Canadian nutritional serving standard, actual meals served, or recipient capacity. Keep a separate actual-meals-served field; never count planned redirects as delivered meals. If adopted, prominently disclose the chosen convention.

## Canadian prices

[Statistics Canada table 18-10-0245-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810024501): monthly average retail product prices, Canada and provinces. No individual numerical price was extracted in this research pass. Select the explicit product, geography, reference month, value, and unit before populating a factor. Convert package prices to CAD/kg only using a known package mass; do not treat litres as kilograms without an explicit density assumption. Retail price is not necessarily a kitchen’s purchase price or donation tax value. For avoided purchasing use actual displaced purchasing and the kitchen’s invoices where available, not the full weight offered. Unverified category prices must remain empty or explicitly illustrative assumptions.

## CO2e: optional landfill-counterfactual scenario, not measured impact

[EPA: Modeling Food Donation in WARM, Table 2](https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P10149EF.txt) gives avoided-landfilling factors per short ton donated, already adjusted for assumed donation losses:

| Category | Metric tons CO2e / short ton donated |
|---|---:|
| Beef | 0.43 |
| Poultry | 0.46 |
| Grains | 0.42 |
| Bread | 0.43 |
| Fruit and vegetables | 0.44 |
| Dairy | 0.42 |

Convert factor × 1000 / 907.18474 to kgCO2e/kg. Do not apply donation-loss discounts twice. This is a US average landfill model, not a verified PEI disposal baseline, net transport-adjusted benefit, or automatic upstream production savings. If composting is the alternative, these landfill factors do not represent that comparison. Label output “modelled avoided-landfill scenario” and show assumptions; suppress a default claimed CO2 saving if the counterfactual is unknown.

[WARM v16 organic-materials documentation](https://www.epa.gov/system/files/documents/2023-12/warm_organic_materials_v16_dec.pdf) is a separate, newer source. Do not mix its factors with the donation note above or imply the note is v16. Document version and counterfactual explicitly.

## Build boundaries

- Keep observed directory fields separate from simulated capacity/demand/demo routing fields.
- Display “candidate; acceptance unconfirmed,” not “available recipient.” No contact or eligibility inference.
- Do not map town centroids as exact recipient locations. Geocoding, if added later, needs provenance and precision labels.
- Distinguish offered, recommended, accepted, received, used, remaining, wasted, and redirected-confirmed quantities.
- Only confirmed fulfilled quantities belong in actual impact. Simulated scenarios must stay labelled simulated.
