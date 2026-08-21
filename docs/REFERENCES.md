# References

**What the numbers in CamboVerse are actually founded on.**

This file exists because of one specific mislabel. The Grove Garden's CO₂ figure
was captioned *"a conservative estimate (Chave 2014 allometry)"* — which credited
a published pantropical model for a number that is really **four separate things
stacked together**, only one of which comes from that paper. The rest are an IPCC
default, bare stoichiometry, a seven-row wood-density table of ours, and — when
height was not measured — a height guess that appears in no literature at all.

The rule here: **an honest gap beats a confident guess.** Anything not confirmed
against a primary record is marked `UNVERIFIED` and stays that way until somebody
checks it. Nothing in this file is a fabricated volume, page range or DOI.

---

## The CO₂ estimate, component by component

`co2Kg` for one record is:

```
AGB  = 0.0673 × (ρ · D² · H)^0.976        ← Chave et al. (2014) Eq. 4
CO₂  = AGB × 0.47 × (44/12)               ← IPCC carbon fraction, then stoichiometry
```

Where each part comes from:

| # | Component | In the code | Source | Status |
|---|---|---|---|---|
| 1 | **Biomass model** — `AGB = 0.0673 × (ρD²H)^0.976` | [`grove.ts:175`](../src/grove/grove.ts) `estimateCarbon()` | Chave et al. (2014), **Eq. 4** — the height-inclusive pantropical model | Published |
| 2 | **Carbon fraction** — `0.47` | `CARBON_FRACTION` | IPCC, *Guidelines for National Greenhouse Gas Inventories*, Vol. 4 (AFOLU), Ch. 4 | Published, but **`UNVERIFIED` edition** — see below |
| 3 | **CO₂ per unit carbon** — `44/12 ≈ 3.6667` | `CO2_PER_C` | **Stoichiometry.** The molar mass of CO₂ over that of carbon. No citation exists or is needed — do not go looking for one | Not a citation |
| 4 | **Wood density ρ** — 7 species, `0.6` fallback | `WOOD_DENSITY`, `DEFAULT_WOOD_DENSITY` | **In-house.** Hand-entered, unsourced | **Weakest link** |
| 5 | **Height fallback** — `H ≈ 3√D`, capped at 30 m | `estHeightFromDbh()` | **In-house.** In no published paper | Ours |
| 6 | **Height-only fallback** — `D = 2H`, result halved | `estimateCarbon()`, third branch | **In-house.** In no published paper | Ours |

### 1. The biomass model — cite the equation, not the year

Chave et al. (2014) gives several models. The one implemented is **Equation 4**,
the model that takes measured height. Write *"Chave et al. (2014), Eq. 4"* in any
methods section: a reader needs to know whether the measured-height model or the
no-height model was used, and "Chave 2014" alone does not say.

### 2. The carbon fraction — `UNVERIFIED` edition

`CARBON_FRACTION = 0.47` is an IPCC default and **not** part of Chave et al.
(2014). It belongs to Vol. 4 (AFOLU), Ch. 4 of the IPCC national inventory
guidelines.

> ⚠ **`UNVERIFIED`:** which edition — the **2006 Guidelines** or the **2019
> Refinement** — has not been confirmed against the primary document, and the two
> differ in this table. The value was in the code before this file existed, with
> only the comment "IPCC default" to go on. Someone with access to the guidelines
> should confirm the edition, the table number and the forest type the 0.47 row
> applies to, then replace this warning with the exact citation.

Until then, cite it in a paper as an IPCC default **with the edition you verified
yourself**, not with one taken from here.

### 3. The CO₂ conversion — deliberately uncited

`44/12` is the ratio of the molar mass of CO₂ to that of carbon. It is arithmetic,
not a finding. Stated explicitly so nobody hunts for a reference that does not
exist.

### 4. Wood density — in-house, and the weakest link

`WOOD_DENSITY` holds **seven species** — mango, jackfruit, coconut, teak,
tamarind, longan, guava — hand-entered with no source recorded, and **every
unlisted species falls back to a constant `0.6 g/cm³`**. Since ρ enters the model
linearly, that fallback propagates straight into the result for any species not
in the table. Coconut is flagged in the code itself as approximate, because palms
do not follow tree allometry at all.

This table should be reconciled against the **Global Wood Density Database**
(Zanne et al. 2009; Chave et al. 2009), and every row given a source. Until that
happens, it is an in-house assumption and should be described as one.

### 5–6. The height fallbacks — ours, and not from any paper

When height is missing, `estHeightFromDbh()` substitutes `H ≈ 3√D` capped at
30 m. When DBH is missing too, the third branch assumes `D = 2H` and halves the
result. **Neither appears in any published model.** They are deliberately
conservative in-house approximations, chosen to under-count rather than
over-credit.

**Chave et al. (2014) Eq. 6/7 provide a fitted alternative** for exactly this
case, using the environmental stress factor **E** derived from climate at the
plot's coordinates. **We have not implemented it.** Implementing it would give
the no-height path a real citation; that is a separate change and is not done.

Do not describe a garden containing these fallbacks as "estimated using Chave et
al. (2014)" without qualification. The interface now makes this distinction
itself — see below.

---

## What the interface says

[`GroveGardenView.tsx`](../src/components/GroveGardenView.tsx) picks its wording
from `estimateBasis()` ([`grove.ts`](../src/grove/grove.ts)), which classifies
every record on screen and labels the total by its **weakest** basis. A garden is
only as well-founded as its flimsiest record.

| Basis | What was measured | Footer wording |
|---|---|---|
| `measured` | DBH **and** height | "CO₂ is an estimate — Chave et al. (2014) Eq. 4 from measured DBH and height, IPCC carbon fraction. Never a tradable credit." |
| `modelled-height` | DBH only | "CO₂ is a rough estimate — height was not measured for every plant, so an in-house approximation stands in for it. Never a tradable credit." |
| `height-only` | height only | "CO₂ is a rough estimate — trunk diameter was not measured, so an in-house approximation deliberately under-counts. Never a tradable credit." |
| `supplied` | biomass given directly | "CO₂ is an estimate — biomass was supplied by the recorder rather than derived from a measurement. Never a tradable credit." |

**"Never a tradable credit" appears in every branch.** That claim does not depend
on how well anything was measured, and it is not a caveat to be softened when the
measurements happen to be good.

`estimateBasis()` is a read-only classifier that mirrors `estimateCarbon()`'s
branches. It computes nothing and changes no result — labelling must not reach
into the carbon path.

---

## Full citations

### Chave et al. (2014) — the biomass model

Chave, J., Réjou-Méchain, M., Búrquez, A., Chidumayo, E., Colgan, M. S.,
Delitti, W. B. C., Duque, A., Eid, T., Fearnside, P. M., Goodman, R. C.,
Henry, M., Martínez-Yrízar, A., Mugasha, W. A., Muller-Landau, H. C.,
Mencuccini, M., Nelson, B. W., Ngomanda, A., Nogueira, E. M.,
Ortiz-Malavassi, E., Pélissier, R., Ploton, P., Ryan, C. M.,
Saldarriaga, J. G., & Vieilledent, G. (2014). Improved allometric models to
estimate the aboveground biomass of tropical trees. *Global Change Biology*,
20(10), 3177–3190. https://doi.org/10.1111/gcb.12629

```bibtex
@article{chave2014,
  author  = {Chave, J{\'e}r{\^o}me and R{\'e}jou-M{\'e}chain, Maxime and B{\'u}rquez, Alberto
             and Chidumayo, Emmanuel and Colgan, Matthew S. and Delitti, Welington B. C.
             and Duque, Alvaro and Eid, Tron and Fearnside, Philip M. and Goodman, Rosa C.
             and Henry, Matieu and Mart{\'i}nez-Yr{\'i}zar, Angelina and Mugasha, Wilson A.
             and Muller-Landau, Helene C. and Mencuccini, Maurizio and Nelson, Bruce W.
             and Ngomanda, Alfred and Nogueira, Euler M. and Ortiz-Malavassi, Edgar
             and P{\'e}lissier, Rapha{\"e}l and Ploton, Pierre and Ryan, Casey M.
             and Saldarriaga, Juan G. and Vieilledent, Ghislain},
  title   = {Improved allometric models to estimate the aboveground biomass of tropical trees},
  journal = {Global Change Biology},
  year    = {2014},
  volume  = {20},
  number  = {10},
  pages   = {3177--3190},
  doi     = {10.1111/gcb.12629}
}
```

### Zanne et al. (2009) — the wood density database

Zanne, A. E., Lopez-Gonzalez, G., Coomes, D. A., Ilic, J., Jansen, S.,
Lewis, S. L., Miller, R. B., Swenson, N. G., Wiemann, M. C., & Chave, J. (2009).
Data from: Towards a worldwide wood economics spectrum. Dryad.
https://doi.org/10.5061/dryad.234

> ⚠ **Ten authors.** A seven-author version of this citation circulates widely
> and omits **Ilic, Swenson and Wiemann**. Use the full list above.

```bibtex
@misc{zanne2009data,
  author = {Zanne, Amy E. and Lopez-Gonzalez, Gabriela and Coomes, David A.
            and Ilic, Jugo and Jansen, Steven and Lewis, Simon L.
            and Miller, Regis B. and Swenson, Nathan G. and Wiemann, Michael C.
            and Chave, J{\'e}r{\^o}me},
  title  = {Data from: Towards a worldwide wood economics spectrum},
  year   = {2009},
  publisher = {Dryad},
  doi    = {10.5061/dryad.234}
}
```

### Chave et al. (2009) — the paper behind the database — `UNVERIFIED`

> ⚠ **`UNVERIFIED`.** The details below have **not** been confirmed against the
> publisher's record. Check the volume, issue and page range on the publisher
> page before using this in anything citable.

Chave, J., Coomes, D., Jansen, S., Lewis, S. L., Swenson, N. G., & Zanne, A. E.
(2009). Towards a worldwide wood economics spectrum. *Ecology Letters*, 12(4),
351–366. https://doi.org/10.1111/j.1461-0248.2009.01285.x

### IPCC — the carbon fraction — `UNVERIFIED` edition

> ⚠ **`UNVERIFIED`.** Vol. 4 (AFOLU), Ch. 4 is the right chapter; **which
> edition the 0.47 was taken from is not established.** Do not cite an edition
> from this file — verify it and then update this entry.

IPCC. *Guidelines for National Greenhouse Gas Inventories*, Volume 4:
Agriculture, Forestry and Other Land Use, Chapter 4: Forest Land.

Candidates to check, in order:

- IPCC (2006). *2006 IPCC Guidelines for National Greenhouse Gas Inventories*.
- IPCC (2019). *2019 Refinement to the 2006 IPCC Guidelines for National
  Greenhouse Gas Inventories*.

---

## Why this file is worth keeping accurate

The Grove Garden's whole claim is that **nothing is trusted from a server** —
every record is verified on the reader's own device. A page that verifies
signatures rigorously and then mis-attributes its own arithmetic is undermining
itself in the same breath.

If you add a constant, a model or a table to CamboVerse, add its row here at the
same time. If you cannot source it, write `UNVERIFIED` and say who should check
it. A gap somebody can close is worth more than a citation somebody has to
retract.
