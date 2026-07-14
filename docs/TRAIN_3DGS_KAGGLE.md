# Training 3D Gaussian Splatting on Kaggle (free GPU)

**Yes — you can train 3DGS on Kaggle for free.** Kaggle Notebooks give you an
NVIDIA GPU (**Tesla T4 ×2** or **P100 16 GB**), about **30 GPU-hours per week**,
and up to **12 hours per session** — enough to turn a set of Wat Phnom photos
into a `.splat` the app can load.

This is the "compute" companion to the field guide
[`CAPTURE_WATPHNOM.md`](./CAPTURE_WATPHNOM.md) and the pipeline overview in
[`CAPTURE.md`](./CAPTURE.md). The end-to-end flow:

```
photos → COLMAP (camera poses) → train 3DGS → export .ply → convert to .splat
       → public/models/wat-phnom.splat
```

---

## Before you start — limits & account

- **Phone-verify your Kaggle account.** GPU *and* Internet access in notebooks
  are only unlocked for verified accounts (Settings → Phone verification).
- **Session limit:** 12 h max, and the machine is **ephemeral** — save/download
  your outputs before it ends.
- **Weekly quota:** ~30 GPU-hours/week (shared across sessions).
- **Disk:** ~20 GB of writable space at `/kaggle/working`.
- **First-run CUDA build:** the 3DGS rasterizer is a CUDA extension that compiles
  on first use; this is the most common source of friction (see Troubleshooting).

> **Colab works too** with the same commands — Kaggle just gives more predictable
> free GPU hours.

---

## Step 1 — Upload your photos as a Kaggle Dataset

1. **Datasets → New Dataset**, upload your images. Start with **one subject**
   (e.g. the stupa, ~150–400 photos) so you fit the disk and time budget.
2. Keep it **Private**, and put the **CC-BY provenance** note in the description
   (who shot it, when, licence) — it travels with the asset.
3. In your notebook, **Add Input** → your dataset. It mounts read-only at
   `/kaggle/input/<dataset-name>/`.

## Step 2 — Create the notebook

- **New Notebook** → **Settings**: **Accelerator = GPU T4 ×2** (or P100),
  **Internet = On**.

---

## Step 3 — Train (Option A, recommended: Nerfstudio + gsplat)

Nerfstudio's `splatfacto` uses **gsplat**, which builds more reliably on Kaggle
than the original CUDA submodules, and `ns-process-data` wraps COLMAP for you.

```python
# 1) System dep: COLMAP (structure-from-motion)
!apt-get update -qq && apt-get install -y -qq colmap

# 2) Nerfstudio (pulls in gsplat). If pip resolves a conflicting torch, pin to
#    the torch already on the image; see Troubleshooting.
!pip install -q nerfstudio
```

```python
# 3) Estimate camera poses from the images (this runs COLMAP — the slow step).
!ns-process-data images \
  --data /kaggle/input/watphnom-stupa/images \
  --output-dir /kaggle/working/proc
```

```python
# 4) Train the splat. 30k iters is full quality; 7k gives a quick preview.
!ns-train splatfacto \
  --data /kaggle/working/proc \
  --output-dir /kaggle/working/out \
  --viewer.quit-on-train-completion True \
  --max-num-iterations 30000
```

```python
# 5) Export a .ply. Find the auto-generated config first.
import glob
cfg = glob.glob('/kaggle/working/out/**/config.yml', recursive=True)[-1]
print('config:', cfg)
!ns-export gaussian-splat --load-config "{cfg}" --output-dir /kaggle/working/export
```

## Step 3 — Train (Option B: INRIA `gaussian-splatting`)

The research reference. Needs the CUDA arch flag matching the GPU
(**T4 = 7.5**, **P100 = 6.0**).

```python
!git clone https://github.com/graphdeco-inria/gaussian-splatting --recursive
%cd gaussian-splatting
import os
os.environ["TORCH_CUDA_ARCH_LIST"] = "7.5"   # 6.0 on a P100
!pip install -q ./submodules/diff-gaussian-rasterization ./submodules/simple-knn plyfile

# Put images at /kaggle/working/scene/input/*.jpg, then:
!python convert.py -s /kaggle/working/scene            # COLMAP poses
!python train.py -s /kaggle/working/scene \
                 -m /kaggle/working/model --iterations 30000
# → /kaggle/working/model/point_cloud/iteration_30000/point_cloud.ply
```

---

## Step 4 — Convert `.ply` → `.splat`

The app loads the antimatter15 **`.splat`** binary. Easiest, no install:

- Download the `.ply` (Step 5), open it in **SuperSplat**
  (the free web editor, PlayCanvas) and **Export → `.splat`**. You can also
  **reduce the splat count** there for mobile before exporting.

(If you prefer to convert in-notebook, use antimatter15's `ply → splat`
converter script; SuperSplat is simpler and lets you clean stray splats.)

## Step 5 — Get the file out of Kaggle

- Click **Save Version** to persist `/kaggle/working` to the run's **Output**
  (downloadable), **or** download files directly from the right-hand **Output**
  panel, **or** use the Kaggle API:
  ```bash
  kaggle kernels output <user>/<notebook> -p ./out
  ```

## Step 6 — Drop it into the app

1. Rename to the site's filename and place it (keep the **same name**):
   `public/models/wat-phnom.splat` (replaces the synthetic placeholder).
2. The in-app **◍ Photoreal** toggle will show it — **no code change** (the spot
   is already wired with `splat: "/models/wat-phnom.splat"`).
3. **Coordinate convention:** real 3DGS captures are already Y-down/Z-flipped and
   load **upright as-is** — do **not** apply the Y/Z pre-flip our *synthetic*
   generator uses. If it loads upside-down/underground, rotate the `<Splat>`
   180° about X (see `CAPTURE.md` §A.4).
4. **Mobile budget:** keep the splat count modest and **test on a real ~$150
   Android over 4G**. Downsample in SuperSplat if load/framerate is poor.

---

## Tips to fit Kaggle's limits

- **One subject per run.** Train the stupa, vihara, staircase, etc. separately;
  it's faster, fits memory, and matches the in-app POIs.
- **Cache COLMAP.** SfM is the slow part — save the processed folder
  (`/kaggle/working/proc`) as a **new Dataset** so re-training doesn't re-run it.
- **Downscale huge photos** (`ns-process-data` can) to save VRAM and time.
- **7k iterations** is a good preview if a session is running low on time; go to
  30k for the final.

## Troubleshooting

- **`pip install nerfstudio` fights the preinstalled torch** → note the image's
  torch/CUDA (`import torch; torch.__version__`, `torch.version.cuda`) and install
  a matching `gsplat`; or install nerfstudio with `--no-deps` after pinning torch.
- **CUDA extension fails to build** → make sure Accelerator is **GPU** (not CPU),
  set `TORCH_CUDA_ARCH_LIST` to the GPU's arch (T4 `7.5`, P100 `6.0`), and re-run
  the cell so it rebuilds.
- **Out of memory** → downscale images, reduce COLMAP feature count, or lower the
  splat/iteration count.
- **COLMAP finds no poses** → your photos lack overlap/parallax; re-shoot with
  ~70% overlap and real movement around the subject (see `CAPTURE_WATPHNOM.md`).
