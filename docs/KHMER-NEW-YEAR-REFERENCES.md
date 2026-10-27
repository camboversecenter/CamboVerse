# Khmer New Year and shared ceremony exploration

26 October 2026. Local implementation; cultural review pending.

## Evidence consulted

- [National Museum of Cambodia: Khmer New Year](https://nmc.gov.kh/index.php/khmer-new-year). Read the Maha Sangkran description of welcoming the year and family observance.
- [National Radio of Cambodia: The summarized story of Traditional Khmer New year celebration](https://rnk.gov.kh/article/66127), Chuon Bona, 14 April 2026. The direct page did not return article text; the indexed article was consulted for the three-day framework, generosity, sand mounds, fragrant-water bathing and chhoung. Its broader historical assertions are not reproduced.
- [Ministry of Culture and Fine Arts: Tugging rituals and games](https://mcfa.gov.kh/world-heritage/tug-of-war/), 21 April 2026. The direct fetch timed out; indexed ministry text was consulted for recreational and ritual significance. No cutting of ropes, sacred contest or reward system is simulated.
- ICHCAP's comparative tugging publication and an embassy-hosted tourism PDF were located but could not be opened. They are not claimed as fully read or used as visual references.

## Interpretation

Five stations cover welcome offerings, generosity, sand mounds, respectful
water blessings and folk-game objects. They represent selected practices across
homes and pagodas, not five obligatory consecutive rites. The courtyard brings
them together for learning. It is not a named pagoda, surveyed site, historical
reconstruction or depiction of every regional practice.

Geometry is authored in Blender from text-guided concepts. No photograph has
been copied into a texture. Mound counts, food quantities, architecture, bunting
and colours are artistic choices. The rope and chhoung cloth represent different
activities. No participants, songs, deity for a particular year or astrological
arrival time are invented. English descriptions and Khmer terminology need
review with a Khmer cultural adviser. New Khmer labels remain unset.

## Assets and delivery

`scripts/build-khmer-new-year-blender.py` imports the shared craft helpers from
the Pchum Ben generator. That generator now builds only when run as its main
script; importing it does not overwrite Pchum Ben outputs.

`public/models/local/khmer-new-year-v1/` contains editable `.blend`, rendered
review, two embedded-resource GLBs, manifest and content license. Normal is
approximately 181 KB / 3,851 triangles and Ultra 530 KB / 14,431 triangles,
with 24 material batches. Consult the manifest for exact measured values.
These are export costs, not low-end-phone frame-rate guarantees.

All five object groups remain present throughout exploration. Lesson selection
changes the information board, not the availability of another station.
Normal retains the same stops and lessons as Ultra. Existing VR entry continues
to require Ultra. Desktop walking is suspended during an XR session; this change
does not add or claim tested headset locomotion or in-headset story controls.

## Walking across ceremonies

Wedding, housewarming and New Year now join Pchum Ben in using shared lab
movement: WASD/arrows, drag-look, on-screen joystick, E/double-tap/Read to open
a nearby story, Escape/Resume to continue. Places offers shortcuts. Notes pause
movement without resetting the visitor's position. On wide screens notes sit
to the right, leaving the centre of the scene visible. Overview remains available.

Wedding and housewarming preserve their existing Three.js models. They are not
represented as newly Blender-authored assets. Hidden picking halos and hidden
lesson meshes no longer act as physical surfaces. Invisible, explicitly marked
floor colliders bridge plank seams in the two houses; visible stairs and walls
remain collision surfaces.

## Verification

58 focused tests cover ceremony data, all four story routes, exported resources
and geometry budgets, Pchum Ben floor/doorway checks, hidden picking geometry,
and capture-walking regression checks. Browser checks exercised every New Year,
wedding and housewarming stop, walking up both houses' stairs, note pause/resume,
New Year object selection and Normal/Ultra switching. Physical phone/VR testing
and cultural sign-off remain outstanding.
