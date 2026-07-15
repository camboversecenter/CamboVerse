# Embedded Khmer fonts

CamboVerse embeds these Khmer fonts locally (self-contained — no external
requests) to render the Khmer script, including the **Khmer Alphabet Classroom**.
Both are from Google Fonts and licensed under the **SIL Open Font License 1.1**
(an open licence, compatible with our Digital-Public-Good discipline).

| Font | File | Used for | Licence | Source |
|---|---|---|---|---|
| **Noto Sans Khmer** | `NotoSansKhmer-Khmer.woff2` | the **normal** Khmer letter shapes | OFL-1.1 (`NotoSansKhmer-OFL.txt`) | google/fonts · notofonts/khmer |
| **Moul** | `Moul-Khmer.woff2` | the **Moul** (អក្សរមូល) ceremonial letter shapes | OFL-1.1 (`Moul-OFL.txt`) | google/fonts · danhhong/Moul |

Only the **Khmer subset** (`U+1780–17FF` + combining helpers) of each font is
vendored, to keep the download small for low-end phones. The `@font-face`
declarations live in `src/index.css`.

Attribution (required by the OFL):
- Noto Sans Khmer — © The Noto Project Authors.
- Moul — © The Moul Project Authors (https://github.com/danhhong/Moul).
