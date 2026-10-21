"""Evaluates the automatic crop with the server's 'is it a mammogram?' filter (see docs/crop-evaluation.md).

  prepare <photos> <workdir>   copy the JPEG/PNG/HEIC-converted photos upright (EXIF orientation) into workdir
  check <workdir> <bundle>     crop each photo with crops.json (full resolution), run the filter on the whole
                               photo and on the crop, and save previews/<photo> with the box drawn for the visual
                               review (a hit leaves out the frame and keeps the whole mammogram)

Needs the server package with the ONNX backend (pip install -e "<server repo>[onnx]") and a model bundle. Photos of
mammograms stay outside the repository.
"""
from __future__ import annotations

import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

PHOTO_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
REPOSITORY = Path(__file__).resolve().parents[1]


def inside(folder: Path, name: str) -> Path:
    """A file directly inside `folder`: names from crops.json can never point elsewhere."""
    path = (folder / Path(name).name).resolve()
    if path.parent != folder.resolve():
        raise SystemExit(f"Refusing a path outside {folder}: {name}")
    return path


def prepare(photos: Path, workdir: Path) -> None:
    photos, workdir = photos.resolve(), workdir.resolve()
    if workdir == photos:
        raise SystemExit("The working folder must not be the photos folder: the originals would be overwritten.")
    if workdir.is_relative_to(REPOSITORY):
        raise SystemExit("The working folder must be outside the repository: photos of mammograms are never committed.")
    if any(part.lower().startswith("onedrive") for part in workdir.parts):
        raise SystemExit("The working folder must be outside OneDrive: photos of mammograms must not sync to the cloud.")
    workdir.mkdir(parents=True, exist_ok=True)
    for path in sorted(p for p in photos.iterdir() if p.suffix.lower() in PHOTO_SUFFIXES):
        target = workdir / f"{path.stem}.jpg"
        if target.exists():
            raise SystemExit(f"{target.name} already exists in the working folder (two photos with the same name?).")
        upright = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
        upright.save(target, quality=95)
        print(f"{path.name} -> {target.name} {upright.size}")


def check(workdir: Path, bundle: Path) -> None:
    from mammo_application.abstractions import EncodedImage
    from mammo_infrastructure import create_ports

    ports = create_ports(bundle, "auto", True)

    def gate(img: Image.Image) -> tuple[float, bool, int]:
        """Lowest filter score among the views, whether every view was accepted, and how many views."""
        buf = io.BytesIO()
        img.save(buf, "PNG")
        masked = ports.masker.mask(EncodedImage(buf.getvalue(), "image/png"))
        verdicts = [ports.gate.check(p) for p in ports.splitter.split(masked.image, None)]
        return min(v.confidence for v in verdicts), all(v.is_mammogram for v in verdicts), len(verdicts)

    crops = json.loads((workdir / "crops.json").read_text(encoding="utf-8"))
    previews = workdir / "previews"
    previews.mkdir(exist_ok=True)
    accepted = 0
    print(f"{'photo':40s} {'source':10s} {'p whole':>8s} {'p crop':>8s}  crop size   result")
    for name, proposal in crops.items():
        img = Image.open(inside(workdir, name)).convert("RGB")
        w, h = img.size
        b = proposal["box"]
        box = (round(b["x"] * w), round(b["y"] * h), round((b["x"] + b["width"]) * w), round((b["y"] + b["height"]) * h))
        cropped = img.crop(box)
        preview = img.copy()
        ImageDraw.Draw(preview).rectangle(box, outline=(0, 220, 255), width=max(3, w // 150))
        preview.thumbnail((600, 600))
        preview.save(inside(previews, name), quality=85)
        p_whole, _, _ = gate(img)
        p_crop, ok, panels = gate(cropped)
        accepted += ok
        print(f"{name:40s} {proposal['source']:10s} {p_whole:8.3f} {p_crop:8.3f}  {cropped.size[0]:>4}x{cropped.size[1]:<5}"
              f" {'accepted' if ok else 'REJECTED'} ({panels} view(s))")
    print(f"\nAccepted by the filter after the crop: {accepted}/{len(crops)} "
          f"({100 * accepted / max(1, len(crops)):.0f} %). Review {previews} to count the hits.")


if __name__ == "__main__":
    command, *args = sys.argv[1:]
    {"prepare": prepare, "check": check}[command](*map(Path, args))
