# Evaluating the automatic crop on real photos

The automatic crop (`src/infrastructure/imaging/findMammogramArea.ts`) is designed for phone photos of a mammogram
shown on a monitor. Synthetic tests check its rules; this procedure checks it on **real photos**, which never go into
the repository (they are photos of mammograms).

## What counts as a hit

A hit is a crop that **leaves out the frame** (monitor edge, viewer background, icon bars) **and keeps the whole
mammogram**, judged by looking at the previews the procedure saves. The server's "is it a mammogram?" filter is also
reported, but it is not the measure of the crop: on photos of screens it is unstable (crops that differ by 1–2 % per
edge move its score between 0.3 and 0.7), and making it robust is planned work in the training repository.

## Procedure

Requirements: the server package with the ONNX backend installed in a Python environment
(`pip install -e "<server repo>[onnx]"`), a model bundle, and the app's `npm ci`.

1. Put the photos (JPEG; on an iPhone, choose "Most compatible" or export as JPEG) in a folder outside the repository
   and outside any synced folder (OneDrive, Google Drive, iCloud): they are photos of mammograms. The script refuses
   a working folder inside the repository or OneDrive.
2. Turn them upright (EXIF orientation) into a working folder:

   ```bash
   python scripts/crop_gate_check.py prepare <photos folder> <working folder>
   ```

3. Run the crop on every photo; it writes `crops.json` in the working folder:

   ```bash
   CROP_PHOTOS_DIR=<working folder> npx vitest run scripts/crop-evaluation.test.ts
   ```

4. Crop each photo at full resolution, run the filter and save the previews:

   ```bash
   python scripts/crop_gate_check.py check <working folder> <bundle folder>
   ```

5. Open `<working folder>/previews`: each photo has the proposed box drawn in cyan. Count the hits and note the
   failures (which border, and why).

The evaluation reduces the photo with an area average; the browser uses its own canvas scaling. The frame threshold
(60) is kept far from the black of a photographed screen (about 40–50) so both give the same box.

## Results

| Date | Photos | Hits | Accepted by the filter after the crop | Notes |
|---|---|---|---|---|
| 2026-10-21 | 1 (+ 1 original file) | 1/1 photo; the original file correctly left whole (`no_frame`) | Photo: p = 0.32 with the proposed box (0.03 without crop); accepted after moving the bottom edge up 4 % in the editor | Only one real photo so far; the user is collecting 10–15 more (different monitors, viewer backgrounds, angles, reflections) |
| 2026-10-21 | 19 photos of a monitor (11 source images: 1, 2 and 4 views; CC, MLO; gray and dark viewers; Windows taskbar; wall and desk in the frame) | 7/19 hits, 4 partial, 8 frame left; no tissue ever cut | 4/19 (good crops of multi-view images are still rejected) | The edge-scanning heuristic fails on non-uniform surroundings: the taskbar and what lies below the monitor, a wall with a light gradient, viewer title bars and menus. Next: detect the tissue texture directly, developed on 12 photos and tested on the 7 held out |
| 2026-10-21 | Same 19 photos, split by scene: 12 to develop, 7 held out | Texture-based prototype (seeds of tissue texture, hysteresis growth, sides moved in only over bright strips): 9/12 on development, **1/7 held out** (same boxes as the current algorithm); no tissue cut | — | Hand-written rules do not generalize from so few photos: skin lines look like icons, fatty tissue like background, textured walls like tissue. Not shipped. Next: a crop detector trained on synthetic photos of screens (planned with the gate retraining), measured on these 19 photos |
