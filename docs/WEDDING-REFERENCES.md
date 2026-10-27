# Traditional wedding: reading and modelling record

Updated 26 October 2026. This is an interpretive educational scene, pending Khmer cultural review, not a reconstruction of one dated wedding. The user requested book-based traditional practice rather than contemporary wedding decor.

## Consulted books

1. Ker Nou and Nhieuk Nou, **Kpuon âbâh-bibâh ou le livre de mariage des Khmers**, translated and edited by Saveros Lewitz, *Bulletin de l'École française d'Extrême-Orient* 60 (1973), pp. 243–328.
   - [Issue contents](https://www.persee.fr/issue/befeo_0336-1519_1973_num_60_1).
   - [Contents of the book](https://www.persee.fr/doc/befeo_0336-1519_1973_num_60_1_5458).
   - [Commoner marriage chapter, pp. 263–285](https://www.persee.fr/doc/befeo_0336-1519_1973_num_60_1_5463). Its account is explicitly dated 1925. The accessible opening page concerns intermediaries and family negotiations. The full chapter was not accessible in this research session; do not attribute the exact scene or nine-step sequence to a complete reading of it.
   - [1965 Khmer edition catalogue](https://ci.nii.ac.jp/ncid/BC18592349). Catalogue verification only; the full Khmer text was not consulted.
   - Royal and commoner chapters are distinct. Do not mix royal costume or court arrangement into a purported ordinary household reconstruction.
2. **Cultural Understanding through Paintings of Southeast Asia and Korea**, SEAMEO SPAFA / APCEIU / SEAMEO, section “Pithi Mangkul Kar”, printed pp. 22–25, PDF pages 12–13.
   - [Book PDF](https://www.seameo-spafa.org/wp-content/uploads/2015/10/EIU_paintings.pdf#page=12).
   - The wedding text was consulted for the bride's house, temporary groom shelter, regional variation, seated couple, popil blessing, white wrist thread, sheathed sword, areca blossoms and cloth-leading.
   - The text discusses a **1990s mural** at Wat Ang Simpili, Kandal, depicting a prince and princess following folk wedding traditions. This is not a 1925 photograph or an ancient eyewitness image. No book image was copied into the product. The mural image itself could not be visually inspected during this session.
   - This book cites the Khmer marriage book and *Rite of Passage* (Ang Choulean, Peap Chanmara and Sun Chandep, 2007). The latter has not been read here.

## What changed

- Wedding-only timber home and study platform, woven mats, domestic shelter and selectable objects replace the generic pink marquee and ribbon gift boxes.
- White wrist threads replace red threads in the wedding description.
- The popil is shown with a candle instead of seven independent candle props. Its leaf-like shape and viewing support remain a modelling interpretation; an expert-verified object reference is still needed.
- The sheathed sword, branching areca flowers and cloth-leading are represented as separate study objects.
- The existing stable moment IDs remain; flower blessing and cloth-leading add two IDs. Nine **selected moments** are shown, not an authoritative complete ceremony order or fixed two-day timetable. Historical day/time fields remain for data compatibility but are not displayed as a historical schedule in this viewer.
- Procession, ancestor respect, monk blessing and symbolic haircut were retained from the existing template and remain pending detailed historical verification. The family meal is explicitly contextual.
- Participants, movement, music and incantations are not reconstructed. Cushions indicate seats; they do not claim a particular historical furnishing arrangement.
- Colours, dimensions, exact object counts, house form and spatial layout are artistic choices, not measured reproductions. The temporary shelter and study platform should not be interpreted as a prescribed ceremonial ground plan.
- Khmer translations remain unset pending native review. Source links are available under Learn more, not forced into every ritual description.

## Implementation and acceptance

`TraditionalWedding.tsx` supplies authored Three.js geometry, not Blender exports. It merges repeated timber and generates small wood-grain and weave textures locally, without new network assets. Normal keeps every teaching object with fewer radial segments and no shadows. Ultra adds smoother shapes and shadows; the existing VR entry raises fidelity to Ultra.

Review all nine steps, object buttons and direct object selection, closer/whole-setting framing, roof cutaway, Normal/Ultra, and notes visibility. Headset and low-end Android performance must be checked on real devices before making performance claims.

Next cultural review should verify object silhouettes (especially popil), traditional domestic placement, the selected sequence and its regional attribution, clothing and gestures before adding people, Khmer names, and any narration or music.
