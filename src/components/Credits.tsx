import { useEffect, useState } from "react";

/**
 * Attribution & provenance for a heritage site, read from the Asset rail.
 *
 * The heritage commons is licensed CC‑BY‑4.0, which *requires* attribution, and
 * the DPG charter commits us to visible provenance and steward consent. This
 * surfaces the site's licence, contributor, and cultural steward right in the
 * experience. If the rail is unreachable it still shows the commons defaults, so
 * attribution is never missing.
 */
interface AssetLike {
  license?: string;
  provenance?: { contributor?: string; method?: string };
  consent?: { steward?: string; consentRef?: string };
}

const DEFAULTS: Required<Pick<AssetLike, "license">> & {
  contributor: string;
  steward: string;
} = {
  license: "CC-BY-4.0",
  contributor: "CamboVerse Center / NUM",
  steward: "APSARA / Ministry of Culture and Fine Arts",
};

const LICENSE_URL: Record<string, string> = {
  "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
};

export function Credits({ spotId, onClose }: { spotId: string; onClose: () => void }) {
  const [asset, setAsset] = useState<AssetLike | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/v1/assets/ast_site_${encodeURIComponent(spotId)}`);
        if (r.ok && live) setAsset((await r.json()) as AssetLike);
      } catch {
        /* fall back to defaults below */
      }
    })();
    return () => {
      live = false;
    };
  }, [spotId]);

  const license = asset?.license ?? DEFAULTS.license;
  const contributor = asset?.provenance?.contributor ?? DEFAULTS.contributor;
  const method = asset?.provenance?.method;
  const steward = asset?.consent?.steward ?? DEFAULTS.steward;
  const licenseUrl = LICENSE_URL[license];

  return (
    <div className="credits" role="dialog" aria-label="Credits and licence">
      <div className="credits-card">
        <div className="credits-head">
          <span className="credits-title">Credits &amp; licence</span>
          <button className="credits-close" onClick={onClose} aria-label="Close credits">
            ✕
          </button>
        </div>
        <dl className="credits-list">
          <dt>Licence</dt>
          <dd>
            {licenseUrl ? (
              <a href={licenseUrl} target="_blank" rel="noreferrer">
                {license}
              </a>
            ) : (
              license
            )}{" "}
            <span className="credits-note">— reuse freely, with attribution</span>
          </dd>
          <dt>Contributor</dt>
          <dd>
            {contributor}
            {method ? <span className="credits-note"> · {method}</span> : null}
          </dd>
          <dt>Cultural steward</dt>
          <dd>{steward}</dd>
        </dl>
        <p className="credits-foot">
          Heritage data on CamboVerse is an open commons — shared with provenance and the consent
          of its custodians.
        </p>
      </div>
    </div>
  );
}
