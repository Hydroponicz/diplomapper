# How Diplomapper sources equipment figures

Equipment data lives in `src/data/equipment.json`. It is curated by hand and reviewed in
pull requests. `validateEquipment()` in `src/core/equipment.ts` enforces the rules below
that can be checked automatically, and the build fails if any record breaks one.

## Seven kinds of record

Each record is exactly one kind. Kinds are never merged, averaged or relabelled.

| Kind | Meaning | Shown as |
| ---- | ------- | -------- |
| `reported` | A government's own published holdings figure | **Reported** |
| `operational` | A government's own commissioned, deployable or active figure (not total holdings) | **Operational status** |
| `published_estimate` | An estimate by a named organisation, including a foreign government, with reuse rights cleared | **Published estimate** |
| `our_estimate` | Diplomapper's calculation from cited inputs, using method M1, M2 or M3 | **Our estimate** |
| `deliveries` | Documented deliveries over a period: a flow, never a stock | **Delivered**, under "Deliveries (not current holdings)" |
| `presence` | Evidence that a type is in service, with no count | **Count unknown**, tagged official / state media claim / independent imagery |
| `no_figure` | We looked and found no usable figure | **Insufficient evidence**, **Rights pending** or **Not published** |

A country with no records shows **Not yet assessed**, which is different from
"insufficient evidence".

## Required for every record

Country, category (with the category definition in the app), kind, count basis, as-of
date, sources (title, publisher, link, table or page, access date), notes on uncertainty,
a reuse-rights review, and the date it was last checked. Estimates also need inputs, a
method, a formula, assumptions and a confidence level.

**Count basis** is recorded exactly as the source states it: `active`,
`in_service_may_include_stored`, `total_inventory`, `battle_force`, `delivered` or
`not_stated`. We never convert one basis into another.

## Our estimates: allowed methods

- **M1, same-source sum.** Add sub-types from one source, on one date, with one count
  basis. The validator checks that the total equals the sum of its inputs.
- **M2, official baseline plus documented changes.** Start from an official count no more
  than 5 years old and adjust it only by officially documented additions and removals.
  The result is a range, and each end of the range must be justified by a stated input.
- **M3, new type with delivery complete.** Only for a type the country did not operate
  before, whose delivery programme is officially complete, with a recorded check for
  publicly reported losses or transfers. The estimate is inventory, never an active count,
  and cannot exceed documented deliveries.

**Not allowed:** totals built from deliveries alone for types a country already had,
figures inferred from spending or other countries' fleets, inputs from unlicensed or
IISS-derived sources, and turning any holdings figure into an operational count.

**Confidence:** *high* means official inputs only, within 2 years, with no unexplained
gaps. *Medium* means official inputs with one documented assumption. Low-confidence
estimates are not published; the record becomes `presence` or `no_figure` instead.

## Reuse rights

- `cleared`: the source's licence allows reuse, e.g. the Open Government Licence, CC BY
  or public domain.
- `facts_cited`: a single fact stated with attribution and a link; nothing is copied.
- `pending`: not yet cleared. A record with a figure cannot ship while rights are
  pending.

**Excluded sources:** IISS *The Military Balance* (paywalled and copyrighted) and any site
repeating its figures, Global Firepower (its terms forbid reuse), and Wikipedia equipment
tables (they often cite IISS; we go to the official document the article cites instead).
SIPRI and UN Register data need permission beyond fair use and are not used until it is
granted.

## Conflicts and updates

- Figures are never averaged. The headline order is: reported, then operational status in
  its own row, then published estimate, then our estimate. Other figures are listed with
  their date and source.
- A new edition of a source is a new dated record. Our estimates are recalculated when an
  input changes.
- Estimates are withdrawn if their inputs are more than 5 years old or a rights review
  fails.
- We never add deliveries to holdings or subtract losses from them, except inside an
  M2 or M3 estimate whose method says so.

## Pilot coverage (September 2026)

| Country | What is shown |
| ------- | ------------- |
| United Kingdom | Reported tanks, aircraft, Apache helicopters and submarines from the MoD's 2026 official statistics; combat aircraft totals (M1), shown separately for all aircraft held and for "in service"; readiness not published |
| United States | Navy battle force (operational status); Abrams in service with no count |
| Norway | F-35A deliveries, and an F-35A inventory estimate (M3) |
| North Korea | Chonma-20 in service (state media claim); tank count pending reuse rights for South Korea's estimate |
| Eritrea | Insufficient evidence for tanks and combat aircraft |
