# User guide for physicians

> This app gives an **indicative triage** to help decide which studies to read first. It is not a diagnosis and never
> replaces the radiologist's reading.

## 1. Before you start

The pilot administrator will give you three things:

1. The **app address**: open it in your phone's browser. If you like, add it to your home screen from the browser
   menu, with "Install" or "Add to Home screen".
2. The **server address**: it ends in `/mcp`.
3. The **access key**: it has at least 24 characters.

Go to **Settings**, enter the server address and the key, and tap **Save and test connection**. If you see
"Connection OK", you are ready to analyze.

The key is not stored on the phone. If you tick "Remember the key while this tab is open", it is cleared when you
close the tab.

### Changing the language

The app is in English by default. To use it in Spanish, open the **Language** selector in the header (it shows
"English") and choose **Español**. The app remembers your choice on this device. To go back, choose **English** in the
same selector.

## 2. Taking a good photo

- Frame a single mammogram, or the views you want to compare, without the rest of the screen.
- Face the screen squarely, with no flash and no reflected lights.
- Tap the breast on the phone screen to focus, and keep your hand steady.
- If you have the original file (for example, a screenshot from the viewer or an export), use it: at **1500 px of
  height or more** the detailed analysis and the **heatmap** are enabled.

## 3. Analyzing

1. Tap **Take photo** (opens the camera) or **Choose saved image**.
2. Check the preview. If the image has several views side by side, you can answer "How many views are in the image?"
   and then, under "Optional: set the breast and the view of each panel", choose the **Breast** (Right or Left) and the
   **Projection** (CC or MLO) of each view. Views are counted left to right.
   - Views of the same breast are combined into one result **only if** you set the number of views and the breast of
     each one.
   - If you leave "Detect automatically" or "I don't know", each view is evaluated on its own.
3. Tap **Analyze image**. It usually takes 5 to 30 seconds. You can tap **Cancel analysis** at any time.

## 4. Reading the result

| You will see | It means | What to do |
|---|---|---|
| ⚠ **High priority** | The model found findings it associates with BI-RADS 4-5 | Read this study first |
| 👁 **Review** | Findings that deserve a careful look | Read it carefully; it neither confirms nor rules out anything |
| ✓ **No suspicious findings** | The model found nothing suspicious | The reading is still required |

You will also see:

- **Estimated probability per BI-RADS group** (1-2, 3 and 4-5). It is the model's estimate for comparison, not an
  exact clinical probability.
- **Heatmap:** in red, the areas that drew the model's attention the most. If it does not appear, the app explains
  why; it is almost always low resolution.
- **Quality warnings**, with what to do: move closer, focus, remove glare or crop.
- **Partial result:** some view did not look like a mammogram, or only the general model could be used.
- How many **text areas were covered** (possible personal data) before the analysis.

When you are done, tap **Analyze another image** (drops the image and the result) or **Back to the image**.

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
| The access key is not valid | Check Settings or ask for a new one |
| The server could not be reached | It may be off, or its address changed. Ask for the new address |
| The server is busy / Too many requests in a row | Wait a few seconds and tap **Try again** |
| No internet connection | Connect to a network. Your image is still selected |

## 6. Privacy

- Images are **not stored**, neither on the phone nor on the server. Tapping **Analyze another image** drops the image
  and the result.
- The app remembers only the server address and your language choice on the device.
- Even so, if you can, avoid photographing patient data: the app covers it automatically, but OCR may miss very faint
  text.
