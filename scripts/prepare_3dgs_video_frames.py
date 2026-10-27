"""Extract sharp, evenly spaced video frames for 3D Gaussian Splatting.

The source videos are never modified. Each temporal window contributes its
clearest usable frame, after which near-duplicates and unusually blurry frames
are removed without allowing large gaps in the camera path.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import shutil
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np


VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".avi"}


@dataclass
class Candidate:
    video: str
    video_index: int
    source_frame: int
    time_seconds: float
    sharpness: float
    mean_luma: float
    dark_clip: float
    bright_clip: float
    score: float
    candidate_path: str
    preview: np.ndarray
    dhash: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--interval", type=float, default=0.75)
    parser.add_argument("--sample-fps", type=float, default=5.0)
    parser.add_argument("--jpeg-quality", type=int, default=96)
    parser.add_argument("--max-gap", type=float, default=1.6)
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace an existing output directory instead of stopping.",
    )
    return parser.parse_args()


def frame_metrics(frame: np.ndarray) -> tuple[float, float, float, float, float, np.ndarray, int]:
    height, width = frame.shape[:2]
    review_width = min(width, 960)
    review_height = max(1, round(height * review_width / width))
    small = cv2.resize(frame, (review_width, review_height), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    mean_luma = float(gray.mean())
    dark_clip = float(np.mean(gray < 12))
    bright_clip = float(np.mean(gray > 248))

    # Exposure and clipping penalties keep the score interpretable while the
    # logarithm prevents a few high-texture frames from overwhelming a window.
    exposure_penalty = abs(mean_luma - 128.0) / 128.0
    clipping_penalty = 2.5 * (dark_clip + bright_clip)
    score = math.log1p(sharpness) - 1.5 * exposure_penalty - clipping_penalty

    preview = cv2.resize(gray, (160, 90), interpolation=cv2.INTER_AREA)
    hash_source = cv2.resize(gray, (9, 8), interpolation=cv2.INTER_AREA)
    bits = hash_source[:, 1:] > hash_source[:, :-1]
    dhash = 0
    for bit in bits.flat:
        dhash = (dhash << 1) | int(bit)
    return sharpness, mean_luma, dark_clip, bright_clip, score, preview, dhash


def hamming(left: int, right: int) -> int:
    return (left ^ right).bit_count()


def extract_candidates(
    video_path: Path,
    video_index: int,
    candidate_dir: Path,
    interval: float,
    sample_fps: float,
    jpeg_quality: int,
) -> tuple[list[Candidate], dict]:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Could not open {video_path}")

    fps = float(capture.get(cv2.CAP_PROP_FPS))
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = frame_count / fps if fps else 0.0
    sample_stride = max(1, round(fps / sample_fps))

    candidates: list[Candidate] = []
    active_window = -1
    best: tuple[Candidate, np.ndarray] | None = None
    source_frame = -1

    def flush_best() -> None:
        nonlocal best
        if best is None:
            return
        candidate, image = best
        filename = f"v{video_index:02d}_t{candidate.time_seconds:08.3f}.jpg"
        destination = candidate_dir / filename
        if not cv2.imwrite(
            str(destination), image, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality]
        ):
            raise RuntimeError(f"Could not write {destination}")
        candidate.candidate_path = str(destination)
        candidates.append(candidate)
        best = None

    while True:
        ok, frame = capture.read()
        if not ok:
            break
        source_frame += 1
        if source_frame % sample_stride:
            continue

        time_seconds = source_frame / fps
        window = int(time_seconds / interval)
        if active_window < 0:
            active_window = window
        elif window != active_window:
            flush_best()
            active_window = window

        sharpness, mean_luma, dark_clip, bright_clip, score, preview, dhash = frame_metrics(frame)
        candidate = Candidate(
            video=video_path.name,
            video_index=video_index,
            source_frame=source_frame,
            time_seconds=time_seconds,
            sharpness=sharpness,
            mean_luma=mean_luma,
            dark_clip=dark_clip,
            bright_clip=bright_clip,
            score=score,
            candidate_path="",
            preview=preview,
            dhash=dhash,
        )
        if best is None or candidate.score > best[0].score:
            best = (candidate, frame.copy())

    flush_best()
    capture.release()
    metadata = {
        "video": video_path.name,
        "width": width,
        "height": height,
        "fps": fps,
        "frames": frame_count,
        "duration_seconds": duration,
        "candidates": len(candidates),
    }
    return candidates, metadata


def choose_frames(candidates: list[Candidate], max_gap: float) -> list[Candidate]:
    selected: list[Candidate] = []
    by_video: dict[int, list[Candidate]] = {}
    for candidate in candidates:
        by_video.setdefault(candidate.video_index, []).append(candidate)

    for video_candidates in by_video.values():
        sharpness_values = np.array([item.sharpness for item in video_candidates])
        blur_floor = float(np.quantile(sharpness_values, 0.12))
        last: Candidate | None = None

        for index, candidate in enumerate(video_candidates):
            next_time = (
                video_candidates[index + 1].time_seconds
                if index + 1 < len(video_candidates)
                else math.inf
            )
            forced_for_coverage = (
                last is None
                or candidate.time_seconds - last.time_seconds >= max_gap
                or next_time - (last.time_seconds if last else 0.0) > max_gap
            )
            exposure_ok = candidate.dark_clip <= 0.42 and candidate.bright_clip <= 0.32
            sharp_enough = candidate.sharpness >= blur_floor

            near_duplicate = False
            if last is not None:
                hash_distance = hamming(candidate.dhash, last.dhash)
                mean_difference = float(
                    np.mean(np.abs(candidate.preview.astype(np.int16) - last.preview.astype(np.int16)))
                )
                near_duplicate = hash_distance <= 3 and mean_difference < 1.7

            if forced_for_coverage or (exposure_ok and sharp_enough and not near_duplicate):
                selected.append(candidate)
                last = candidate

    return selected


def write_contact_sheets(selected: list[Candidate], review_dir: Path) -> None:
    if not selected:
        return
    thumb_width, thumb_height = 320, 180
    columns, rows = 4, 4
    page_size = columns * rows
    for page_number, start in enumerate(range(0, len(selected), page_size), start=1):
        page_items = selected[start : start + page_size]
        canvas = np.full((rows * 220, columns * thumb_width, 3), 245, dtype=np.uint8)
        for offset, candidate in enumerate(page_items):
            row, column = divmod(offset, columns)
            image = cv2.imread(candidate.candidate_path)
            thumbnail = cv2.resize(image, (thumb_width, thumb_height), interpolation=cv2.INTER_AREA)
            y, x = row * 220, column * thumb_width
            canvas[y : y + thumb_height, x : x + thumb_width] = thumbnail
            label = f"{start + offset + 1:04d}  v{candidate.video_index:02d}  {candidate.time_seconds:06.2f}s"
            cv2.putText(
                canvas,
                label,
                (x + 8, y + 205),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (25, 25, 25),
                1,
                cv2.LINE_AA,
            )
        cv2.imwrite(str(review_dir / f"contact-sheet-{page_number:02d}.jpg"), canvas)


def main() -> None:
    args = parse_args()
    source = args.source.resolve()
    output = args.output.resolve()
    frames_dir = output / "frames"
    review_dir = output / "review"
    candidate_dir = output / "candidates"

    videos = sorted(
        path for path in source.iterdir() if path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS
    )
    if not videos:
        raise SystemExit(f"No supported videos found in {source}")

    if output.exists() and not args.overwrite:
        raise SystemExit(
            f"Output already exists: {output}. Use --overwrite to replace it."
        )
    if output.exists():
        shutil.rmtree(output)
    frames_dir.mkdir(parents=True)
    review_dir.mkdir(parents=True)
    candidate_dir.mkdir(parents=True)

    all_candidates: list[Candidate] = []
    video_metadata: list[dict] = []
    for video_index, video_path in enumerate(videos, start=1):
        candidates, metadata = extract_candidates(
            video_path,
            video_index,
            candidate_dir,
            args.interval,
            args.sample_fps,
            args.jpeg_quality,
        )
        all_candidates.extend(candidates)
        video_metadata.append(metadata)
        print(f"{video_path.name}: {len(candidates)} best-window candidates")

    selected = choose_frames(all_candidates, args.max_gap)
    manifest_rows: list[dict] = []
    for output_index, candidate in enumerate(selected, start=1):
        filename = f"clock_{output_index:04d}.jpg"
        destination = frames_dir / filename
        shutil.copy2(candidate.candidate_path, destination)
        manifest_rows.append(
            {
                "output_file": filename,
                "source_video": candidate.video,
                "source_frame": candidate.source_frame,
                "time_seconds": round(candidate.time_seconds, 3),
                "sharpness": round(candidate.sharpness, 3),
                "mean_luma": round(candidate.mean_luma, 3),
                "dark_clip": round(candidate.dark_clip, 6),
                "bright_clip": round(candidate.bright_clip, 6),
                "quality_score": round(candidate.score, 6),
            }
        )

    with (output / "frame-manifest.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=manifest_rows[0].keys())
        writer.writeheader()
        writer.writerows(manifest_rows)

    summary = {
        "source": str(source),
        "output": str(output),
        "selection_method": "best sharp/exposure-safe frame per temporal window, then blur and near-duplicate filtering with coverage guard",
        "interval_seconds": args.interval,
        "sample_fps": args.sample_fps,
        "max_gap_seconds": args.max_gap,
        "source_videos": video_metadata,
        "candidate_frames": len(all_candidates),
        "selected_frames": len(selected),
        "output_resolution": video_metadata[0]["width"],
        "output_height": video_metadata[0]["height"],
    }
    (output / "selection-summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )
    write_contact_sheets(selected, review_dir)
    shutil.rmtree(candidate_dir)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
