# User guide for physicians

> This app gives an **indicative triage** to help decide which studies to read first. It is not a diagnosis and never
> replaces the radiologist's reading.

## 1. Before you start

**In the pilot (https://app.mammotriage.com):** open the address in your phone's browser and sign in with the e-mail
the pilot administrator approved. You receive a one-time code by e-mail; the session lasts a week. The server address
is already set, and you need no access key. If you like, add the app to your home screen from the browser menu, with
"Install" or "Add to Home screen".

When the session expires, the app says **"Your session has expired"**: tap **Reload the page** and sign in again.

**With another server**, the pilot administrator gives you its address (it ends in `/mcp`) and, if it does not use
sign-in by e-mail, an **access key** of at least 24 characters. Go to **Settings**, enter them and tap **Save and test
connection**. If you see "Connection OK", you are ready to analyze. The key is not stored on the phone. If you tick
"Remember the key while this tab is open", it is cleared when you close the tab.

### Changing the language

The app opens in your phone's language: Spanish if the phone is in Spanish, English otherwise. To change it, open
the **Language** selector in the header and choose **Español** or **English**. The app remembers your choice on this
device.

## 2. Taking a good photo

- Move closer until the mammogram fills most of the photo. The app crops the monitor's edge, the viewer's gray
  background and the icon bars by itself (see "Checking the area to analyze" below), but the closer you are, the
  more resolution is left for the analysis.
- Frame a single mammogram, or the views you want to compare.
- Face the screen squarely, with no flash and no reflected lights.
- Tap the breast on the phone screen to focus, and keep your hand steady.
- If you have the original file (for example, a screenshot from the viewer or an export), use it: at **1500 px of
  height or more** the detailed analysis and the **heatmap** are enabled.

## 3. Analyzing

1. Tap **Take photo** (opens the camera) or **Choose saved image**.
2. Check the preview. If the image has several views side by side, you can answer "How many views are in the image?"
   and then, under "Optional: set the breast and the view of each panel", choose the **Breast** (Right or Left) and the
   **Projection** (CC or MLO) of each view. Views are counted left to right.
   - For a figure with four views in two rows (A and B on top, C and D below), choose **4 views in a 2 × 2 grid**:
     the image is split into four equal parts, counted left to right, top row first. Automatic detection also finds
     grids, but only when white lines separate the views.
   - Views of the same breast are combined into one result **only if** you set the number of views and the breast of
     each one.
   - If you leave "Detect automatically" or "I don't know", each view is evaluated on its own.
3. Tap **Analyze image**. It usually takes 5 to 30 seconds. You can tap **Cancel analysis** at any time.

### Checking the area to analyze

On **Review image**, the photo shows a cyan box: **only what is inside is analyzed**. The app proposes it by itself,
leaving out the monitor's edge, the viewer's gray background and the icon bars; with several views side by side, the
box covers all of them.

- If something is missing or left over, move the corners: **drag** one, or **tap** it and then **tap** where it
  should go. With a keyboard, the arrow keys move the focused corner (Shift for larger steps). Under **Adjust with
  buttons**, each edge can also be moved in or out, which works with a screen reader.
- **Reset the crop** brings back the proposal; **Use the whole image** analyzes everything.
- If the app could not find the mammogram with confidence, it says so and proposes the whole image: move the corners
  onto the mammogram before analyzing.
- If the result says **The image doesn't look like a mammogram** or **The image is too large**, tap **Adjust the
  crop**: you go back to the same photo and box. (**The image is too large to open** is different: the file has too
  many pixels for the phone, and no crop helps; choose a smaller photo or a screenshot.) A box that still includes part of the monitor or the viewer's background is the most common cause.
  Photos of screens are still harder for the analysis than the original file.

## 4. Reading the result

| You will see | It means | What to do |
|---|---|---|
| ⚠ **High priority** | The model found findings it associates with BI-RADS 4-5 | Read this study first |
| 👁 **Review** | Findings that deserve a careful look | Read it carefully; it neither confirms nor rules out anything |
| ✓ **No suspicious findings** | The model found nothing suspicious | The reading is still required |

You will also see:

- **Estimated probability per BI-RADS group** (1-2, 3 and 4-5), as a colored bar and as a list with the exact
  percentages. It is the model's estimate for comparison, not an exact clinical probability.
- **Heatmap:** in red, the areas that drew the model's attention the most. Turn off **Show heatmap** under the image to
  see the tissue under the red areas, while the numbered boxes still mark where to look; **Show markers** hides the
  boxes. Turn them on again to compare. If the heatmap does not appear, the app explains why; it is almost always
  low resolution (the image needs at least 1500 px of height).
- **Marked areas** on the heatmap (see below).
- **Quality warnings**, with what to do: move closer, focus, remove glare or crop.
- **Partial result:** some view did not look like a mammogram, or only the general model could be used.
- How many **text areas were covered** (possible personal data) before the analysis.

When you are done, tap **Analyze another image** (drops the image and the result) or **Back to the image**. On a
phone these buttons are at the end of the result; on a wide screen they are under the overall result.

### Marked areas: where the model looks

On each heatmap, up to **three numbered boxes** mark the areas the model found most suspicious. Box **1** is the
strongest. Under the image, the box **Where the model looks** says where each one is in words, for example "Area 1:
anterior third (near the nipple), upper part of the breast".

- **Depth** goes from the chest wall to the nipple: *posterior third* (near the chest wall), *middle third* or
  *anterior third* (near the nipple). In the image the chest wall is on the left.
- **Upper, middle or lower** is the third of the breast's height in this view, as it appears in the image. It is not
  a clock position or a quadrant.
- Untick **Show markers** to see the heatmap without the boxes. The list in words stays.
- If the app says "No single area stands out clearly in this view", the model did not find any area that stands out.
- Without a heatmap (low resolution) there are no marked areas either.

The boxes guide your reading; they are **not the outline of a lesion**. A box covers a whole window that the model
scanned, the model can mark normal tissue, and a finding can lie outside every box. Read the whole image as usual.

### Expected performance (on good-resolution files)

These figures are **per breast**, measured on the held-out half of the VinDr-Mammo test set with good-resolution
images:

- Of every 100 breasts with BI-RADS 4-5 findings, about **87 are flagged**: ~70 as High priority and ~17 as Review.
- Of every 100 normal or benign breasts, about **7 come out as High priority** (false alarms) and ~21 as Review.

High priority is calibrated to about 5 % false alarms (6.5 % measured on the held-out half). With photos of a screen or
of film, performance may be lower. It has not yet been validated in real-world conditions.

## 5. If something goes wrong

Each error says what happened and what you can do. If it keeps happening, share the **Reference code** with the pilot
administrator.

| Message | What to do |
|---|---|
| The image doesn't look like a mammogram | Only 2D mammograms (CC or MLO) are analyzed. Ultrasound, MRI and tomosynthesis are not |
| Access was denied | If you use an access key, check it in Settings or ask for a new one. If you sign in with your e-mail, reload the page; if it keeps happening, tell the pilot administrator |
| Your session has expired | Tap **Reload the page** and sign in again with your e-mail and the code |
| The server could not be reached | It may be off, or its address changed. Ask for the new address |
| The server is busy / Too many requests in a row | Wait a few seconds and tap **Try again** |
| No internet connection | Connect to a network. Your image is still selected |
| A new version of the app is available | Tap **Reload the page**. Your settings are kept; choose the image again after reloading |

## 6. Privacy

- Images are **not stored**, neither on the phone nor on the server. Tapping **Analyze another image** drops the image
  and the result.
- The app remembers only the server address and your language choice on the device.
- Even so, if you can, avoid photographing patient data: the app covers it automatically, but OCR may miss very faint
  text.
