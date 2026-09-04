# SIH Problem-to-Project Blueprint
## Multi-modal, Sun-Angle and Scale Invariant Image Correspondence for Chandrayaan-2 Optical Images

**Organization:** ISRO / Department of Space | **Category:** Software | **Theme:** Space Technology
**Prepared for:** A beginner team building this end-to-end with Antigravity (AI IDE) + GitHub, without a dedicated hardware/data-science background.

---

## 1. EXECUTIVE SUMMARY

This problem asks you to build software that can look at two pictures of the same patch of the Moon — one taken by a Chandrayaan-2 camera, one taken by a different mission's camera (usually NASA's LRO) — and figure out **which pixel in image A corresponds to which pixel in image B**, even though the two pictures were taken:

- at a different **time of lunar day** (so shadows fall differently — "sun angle" problem),
- from a different **altitude/angle** (so the same crater looks shifted, tilted, or stretched — "viewpoint" problem), and
- at a completely different **zoom level / sensor type** (a 25 cm/pixel photo vs an 80-meter/pixel spectral scan — "scale + multimodal" problem).

This is a real, unsolved-at-full-scale problem for ISRO because it currently requires a lot of manual, expert effort to line up (register) images from different lunar missions. Solving it — even partially — helps ISRO build mosaics, verify landing sites, and combine data from different instruments automatically.

**What we recommend building for SIH:** A focused, honest, working **image-registration pipeline and demo application**, not a landing-site AI or a full ISRO production system. The MVP takes two lunar images (one Chandrayaan-2 image, one reference image), runs them through a preprocessing + feature-matching + outlier-filtering pipeline tuned for lunar illumination differences, and outputs:
1. the source image warped/aligned onto the reference image,
2. the list of matched points, and
3. accuracy metrics (RMSE, inlier count, inlier ratio, and a **spatial-uniformity score** — because the problem statement explicitly asks for matches that are evenly spread across the image, not clustered in one corner).

This is fundamentally a **computer-vision / classical-algorithm engineering project**, not a typical CRUD web app and not a project that strictly requires deep learning or a database. We say so explicitly below, and we explain exactly what to build, in what order, with exact prompts for Antigravity.

We found and used one directly relevant, real research paper (Makharia et al., 2025, *"Comparative Evaluation of Traditional and Deep Learning Feature Matching Algorithms using Chandrayaan-2 Lunar Data,"* arXiv:2509.04775) that benchmarks SIFT, ASIFT, AKAZE, RIFT2, and SuperGlue on exactly the OHRC–LROC NAC, IIRS–LROC WAC, and DFSAR–SELENE pairs this problem statement names. We use its real, published numbers to ground our recommendations instead of inventing accuracy figures. This paper is also extremely useful as "prior art" you can cite to judges to show you understand the state of the field.

---

## 2. PROBLEM STATEMENT IN VERY SIMPLE LANGUAGE

**Imagine two tourists photographing the same mountain.** One uses a drone at noon (harsh shadows, top-down view, very sharp zoomed-in photo). The other uses a phone from a hillside at sunset (long shadows, angled view, a wider zoomed-out photo). If you wanted to draw a red dot on a rock in photo 1 and find the *exact same rock* in photo 2, you'd have to mentally undo the differences in angle, lighting, and zoom. That mental exercise, done automatically and precisely by software, is "image registration."

1. **What is the problem actually saying?** Build software that automatically finds matching points between a Chandrayaan-2 image (OHRC/TMC-2/IIRS) and a reference image (mainly LRO's NAC, but also SELENE's imagery), then uses those matches to align ("register") the Chandrayaan-2 image onto the reference image's coordinate system.
2. **What real-world problem exists?** Different lunar missions photograph the same terrain under different sun angles, orbital geometries, and sensor resolutions. Comparing or combining this data (for landing-site studies, mosaics, change detection) requires everything to be on the same "grid" first.
3. **Who experiences this problem?** ISRO scientists and image-processing teams who currently do this matching partly by hand or with generic tools not built for the Moon's extreme lighting and repetitive crater-covered terrain.
4. **How is it currently solved?** With classical computer-vision feature matchers (SIFT, ASIFT, AKAZE, etc.), semi-manual tie-point selection, and increasingly some deep-learning matchers — with mixed success, especially in polar regions where shadows are long and terrain is harsh.
5. **Why is the current approach insufficient?** Classical algorithms built for ordinary photographs (SIFT etc.) rely on gradients/intensity patterns that change unpredictably between sensors and lighting conditions on the Moon; they frequently fail or need heavy manual tuning, especially near the poles or across very different sensor types (optical vs hyperspectral vs radar).
6. **What does ISRO actually want?** A *generic* software solution — meaning it should work across multiple image pairs and conditions, not one hardcoded case — that finds correspondences with **sub-pixel accuracy** and **spreads its matches evenly across the image** (not just in one easy, high-contrast corner).
7. **What are we expected to build?** A software pipeline + demonstrable product that: accepts a source (Chandrayaan-2) and reference image, registers them, and reports quantitative accuracy metrics.
8. **What goes INTO the system?** Two image crops of the same lunar region (different missions/sensors/times) — plus, ideally, rough metadata (approximate coordinates) to narrow the search.
9. **What happens INSIDE the system?** Preprocessing (resampling, illumination correction) → feature detection → feature matching → outlier removal (RANSAC) → geometric transform estimation → warping → metric computation.
10. **What comes OUT of the system?** A registered (aligned) image, the list of match points (pixel coordinates in both images), a visual overlay, and evaluation metrics.
11. **What would success look like?** Correct, evenly-distributed matches with low RMSE (sub-pixel to a few pixels) on at least one real Chandrayaan-2 ↔ reference image pair, plus honest metrics — not a black box claiming perfection.

**Simple example:** You give the tool a Chandrayaan-2 OHRC image of a crater rim (0.25 m/pixel, photographed near lunar noon) and an LRO NAC image of the same crater (0.5 m/pixel, photographed at a different sun angle). The tool detects ~40 well-spread matching points along the crater rim and boulders, discards 8 bad ones using RANSAC, warps the OHRC image to sit exactly on top of the NAC image, and reports "32 inlier matches, RMSE = 1.4 pixels, matches spread across 85% of the image grid."

---

## 3. WHAT WE ARE ACTUALLY BUILDING

**Product objective (one sentence):** A tool that takes two lunar images of the same region from different Chandrayaan-2/reference sensors and automatically produces an accurately aligned (registered) output image with quantitative match-quality metrics.

**Primary user:** For the real world — an ISRO image-analyst / lunar-mission planner. For the SIH demo — the judge, who will act as that analyst: they will upload/select two images and watch the system register them live.

**Non-essential features (explicitly do NOT build for MVP):**
- Full photogrammetric orbit/pointing correction using SPICE kernels (this is what ISRO's own operational pipeline does — far beyond a hackathon).
- A full crater-detection deep-learning model trained from scratch.
- User accounts, login, or multi-user collaboration.
- Automatic global search over the entire lunar surface to *find* a matching reference image (we assume the user provides roughly co-located image pairs, or we provide a small pre-selected demo set).
- Mobile app version.
- Radar (DFSAR) support (mentioned in the paper as a stretch case) — optical/hyperspectral only for MVP.

> **Our MVP is essentially:** *"Upload two lunar image crops of the same region → the system preprocesses, matches, filters, and warps one onto the other → you see the aligned result plus RMSE / inlier-ratio / distribution metrics."*

---

## 4. REAL-WORLD USER FLOW

1. User opens the web app.
2. User picks (or uploads) a **source image** (Chandrayaan-2: OHRC, TMC-2, or IIRS crop) and a **reference image** (LROC NAC/WAC or SELENE crop) of the same region — we ship a few pre-loaded demo pairs so judges don't need to hunt for files.
3. User selects the sensor pair type (this tells the pipeline which preprocessing recipe to use — e.g., OHRC↔NAC uses CLAHE + inversion; IIRS↔WAC uses histogram matching + shadow normalization, mirroring the real published approach).
4. User clicks "Register."
5. **Processing (shown live with a progress indicator):** resampling → preprocessing → feature detection → matching → RANSAC filtering (with uniform-distribution enforcement) → warping → metric computation.
6. **Result screen:** side-by-side viewer (source / reference / warped overlay / checkerboard blend), a scatter plot of match points, and a metrics panel (RMSE, inlier count, inlier ratio, distribution score, algorithm used, runtime).
7. User can download the registered image + a CSV of match points + a JSON metrics report.

---

## 5. PROBLEM DECOMPOSITION

```
MAIN PROBLEM: Register Chandrayaan-2 images to reference lunar images
        |
        ├── Subproblem 1: Acquire & prepare comparable image pairs
        |        (get real data, crop to overlapping region, know rough scale/location)
        |
        ├── Subproblem 2: Normalize scale differences
        |        (resample both images to a common ground sampling distance)
        |
        ├── Subproblem 3: Normalize illumination / radiometric differences
        |        (CLAHE, histogram matching, shadow correction, phase-congruency features)
        |
        ├── Subproblem 4: Detect and describe distinctive keypoints
        |        (craters, boulders, ridges — features that survive lighting/sensor change)
        |
        ├── Subproblem 5: Match keypoints between the two images
        |        (find candidate correspondences; must handle multimodal + wide baseline)
        |
        ├── Subproblem 6: Reject bad matches & enforce spatial spread
        |        (RANSAC + grid-based / non-maximal-suppression coverage control)
        |
        ├── Subproblem 7: Estimate geometric transform & warp the source image
        |        (affine / projective / polynomial transform, then resample source onto reference grid)
        |
        └── Subproblem 8: Evaluate & present results
                 (RMSE, inlier ratio, inlier count, distribution score, visual overlays)
```

| Subproblem | Required? | Difficulty | Can AI/coding-assistant help? | External data/services needed? |
|---|---|---|---|---|
| 1. Data acquisition | MUST | Medium (bureaucratic, not technical) | Partially — Antigravity can write download/parsing scripts, but *you* must register on ISSDC/download files | ISSDC PRADAN, LROC PDS |
| 2. Scale normalization | MUST | Low–Medium | Yes | None |
| 3. Illumination normalization | MUST | Medium–High | Yes | None |
| 4. Keypoint detection | MUST | Medium | Yes (OpenCV has SIFT/AKAZE built in) | None |
| 5. Matching | MUST | Medium–High | Yes | None |
| 6. Outlier rejection + spread | MUST | Medium | Yes | None |
| 7. Transform + warp | MUST | Low–Medium | Yes | None |
| 8. Evaluation + UI | MUST | Low–Medium | Yes | None |

**Dependency map:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (strictly sequential — you cannot meaningfully test matching (5) until preprocessing (2–3) exists, and you cannot evaluate (8) until warping (7) exists). This dictates our build order in Part 35.

---

## 6–7. MVP DEFINITION & MUST/SHOULD/NICE-TO-HAVE

| Feature | Priority | Why |
|---|---|---|
| Load two lunar images (from disk / pre-bundled demo set) | MUST | Nothing works without input |
| Resample to common resolution | MUST | Required before any matching can work across 0.25 m vs 80 m sensors |
| Illumination-robust preprocessing (CLAHE, histogram matching) | MUST | This is *the* core challenge named in the problem statement |
| Classical feature matching (SIFT/AKAZE baseline) | MUST | Fast, reliable baseline, fully open-source, no license issues |
| RANSAC outlier filtering | MUST | Required for "sub-pixel accuracy" — raw matches are noisy |
| Grid-based / ANMS spatial-spread enforcement | MUST | The problem statement explicitly asks for uniform match distribution — most student teams skip this; doing it well is a genuine differentiator |
| Image warping + aligned output | MUST | This is literally "registration" — without it you've only done matching |
| Metrics: RMSE, inlier count, inlier ratio, distribution score | MUST | Explicitly requested evaluation metrics in the problem statement |
| Simple web UI to run this interactively | MUST | Needed for any live SIH demo |
| Illumination-invariant algorithm (RIFT2-style, phase congruency) as a second, switchable matcher | SHOULD | Directly targets the "sun angle invariant" requirement; classical SIFT alone measurably fails on this per the benchmark paper below |
| Support for more than one sensor pair (OHRC↔NAC *and* IIRS↔WAC) | SHOULD | Proves "generic," not hardcoded to one image |
| Downloadable report (image + CSV + JSON) | SHOULD | Professional touch, low effort |
| Deep-learning matcher (SuperGlue) as an optional third mode | NICE TO HAVE | Best published accuracy, but needs a GPU, pretrained weights, and (per Magic Leap's official release) a non-commercial research license — good to demo, risky to depend on |
| Run-history dashboard with persistent storage | NICE TO HAVE | Only useful once the core pipeline is solid |
| Batch processing of many image pairs | NICE TO HAVE | Real ISRO use case, but not needed to prove the concept |
| SAR (DFSAR) support | NOT NOW | Radar image characteristics are a different problem; explicitly out of scope for MVP |

---

## 8. INPUT → PROCESSING → OUTPUT

```
USER INPUT (two image files + sensor-pair choice)
        ↓
FRONTEND (Streamlit page: file upload / demo picker, "Register" button)
        ↓
BACKEND / PROCESSING LAYER (Python function called directly by Streamlit — see Part 9)
        ↓
   STEP 1: Load images (rasterio/tifffile) + resample to common GSD (scipy/OpenCV resize)
        ↓
   STEP 2: Preprocess for illumination (CLAHE / histogram matching / phase congruency map)
        ↓
   STEP 3: Detect + describe keypoints (OpenCV SIFT/AKAZE, or custom RIFT2-style descriptor)
        ↓
   STEP 4: Match descriptors (FLANN / brute-force + ratio test)
        ↓
   STEP 5: RANSAC filter + grid-based spatial-spread enforcement
        ↓
   STEP 6: Estimate homography/affine transform, warp source image
        ↓
   STEP 7: Compute RMSE, inlier ratio, inlier count, distribution score
        ↓
RESULT (registered image array + match list + metrics dict) — held in memory, no DB needed
        ↓
FRONTEND (renders overlay, scatter plot, metrics table, download buttons)
        ↓
USER (views result, downloads files)
```

**Where information is stored:** Nothing needs to persist between sessions for the MVP — everything lives in memory for the duration of one "Register" click, and output files are offered as direct downloads. (See Part 15, Database Analysis, for exactly why.)

---

## 9. COMPLETE SYSTEM ARCHITECTURE

### Text architecture diagram

```
                    ┌────────────────────────┐
                    │   User's Browser        │
                    │  (Streamlit web page)   │
                    └───────────┬─────────────┘
                                │  HTTP (handled by Streamlit itself)
                    ┌───────────▼─────────────┐
                    │  Streamlit App Process   │
                    │  (Python, single process)│
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │ UI Layer (app.py)  │  │
                    │  └─────────┬──────────┘  │
                    │            │ function call │
                    │  ┌─────────▼──────────┐  │
                    │  │ Registration Engine │  │
                    │  │ (Python package:    │  │
                    │  │  preprocessing,     │  │
                    │  │  matching, ransac,  │  │
                    │  │  metrics)           │  │
                    │  └─────────┬──────────┘  │
                    │            │              │
                    │  ┌─────────▼──────────┐  │
                    │  │ Image files on disk │  │
                    │  │ (/data folder,      │  │
                    │  │  uploaded or demo)  │  │
                    │  └────────────────────┘  │
                    └──────────────────────────┘
```

There is **no separate backend server, no database, and no external API call** in the MVP — everything runs inside one Streamlit process. This is a deliberate simplification explained in Part 10/11.

### Component explanations (simple language)

- **Frontend/UI layer:** The part the judge clicks on — file pickers, buttons, image displays. Built with Streamlit, which lets you write a normal Python script and get a web page automatically, with no separate HTML/CSS/JavaScript needed.
- **Registration engine:** The actual "brain" — a plain Python package (not a web framework) containing functions for each processing step. Kept separate from the UI code so it can be tested on its own (`pytest`) and reused (e.g., from a command-line script, or later wrapped in a FastAPI backend if you outgrow Streamlit).
- **File storage:** Just the local filesystem during development, and a small bundled `demo_data/` folder of pre-cropped, pre-approved image pairs so the live demo never depends on internet access or ISSDC login during judging.

### Alternatives considered and rejected

| Alternative | Why rejected for MVP |
|---|---|
| React frontend + FastAPI backend + Postgres | Three moving parts to install, configure, and keep in sync for a team with "very limited coding knowledge" — pure overhead for a single-user CV demo. Listed as a SHOULD/NICE upgrade path in Part Y, not the MVP. |
| Deep learning (SuperGlue) as the *only* matcher | Needs a GPU for real-time demo speed, needs to justify a non-commercial-license dependency to judges, and hides "how it works" behind a black box — risky for a team that must explain their algorithm live. Classical + RIFT2-style methods are transparent and CPU-friendly. |
| Full ISIS3/SPICE photogrammetric pipeline | This is literally what USGS's own planetary-image software suite does, and even professionals need days of training to use it. Not feasible in a hackathon. We use already-orthorectified/derived products instead (see Part 12–13). |
| Neon Postgres for everything | No genuine persistent, relational, multi-user data in the MVP. Forcing it in adds an external dependency, credentials, and connection-pooling headaches for zero functional benefit. See Part 15. |

---

## 10–11. TECHNOLOGY STACK & WHY EACH WAS CHOSEN

| Layer | Technology | What it is (simple) | Why chosen for this project |
|---|---|---|---|
| Language | **Python 3.11** | The programming language most computer-vision and remote-sensing libraries are written in | OpenCV, NumPy, scikit-image, rasterio, and every algorithm in the reference research paper are Python/C++ based; using Python keeps everything in one language |
| Image processing core | **OpenCV (`opencv-contrib-python`)** | A free library that already implements SIFT, AKAZE, ORB, RANSAC, homography estimation, and image warping | Battle-tested, fast (C++ under the hood), and avoids reinventing extremely well-solved math (feature detection, RANSAC) |
| Scientific computing | **NumPy / SciPy** | Libraries for fast array math | Needed for resampling, custom metric calculations, and any custom descriptor (like a phase-congruency map) |
| Phase congruency (illumination-robust features) | **`phasepack`** (Python port of Kovesi's phase congruency) | Computes an "edge map" that stays similar even when brightness changes a lot | This is the mathematical core of RIFT/RIFT2, the algorithm shown to handle lunar illumination differences best among non-deep-learning methods in the benchmark paper |
| Image I/O incl. GeoTIFF | **`tifffile` + `Pillow`** | Libraries to read/write TIFF/PNG/JPEG pixel data | ISSDC's *derived* OHRC/TMC-2 products are shipped as GeoTIFF — `tifffile` reads the pixels directly without needing the full GDAL/rasterio geospatial stack, which is much heavier to install and deploy |
| (Optional, SHOULD) Full geospatial support | **`rasterio`** | Adds real-world coordinate awareness to image arrays | Only needed if you want to use each product's embedded lat/lon georeferencing to auto-crop the reference mosaic; otherwise pre-crop manually (see Part 12) |
| Frontend/UI | **Streamlit** | A Python library that turns a script into a web app (buttons, file uploads, image display) with no HTML/CSS/JS | Simplest possible way for a beginner to get an interactive, demoable web app from pure Python; avoids needing a separate frontend framework and API layer |
| Data visualization | **Matplotlib** (built into the app) | Plotting library | For the match-point scatter plot, checkerboard overlay, and RMSE bar chart |
| Database | **None for MVP** (SQLite if SHOULD-have run-history is added; Neon Postgres only if publicly deployed with shared history — see Part 15) | — | The MVP has no genuinely persistent, relational, multi-user data need |
| Version control | **Git + GitHub** | Track changes to code, back it up, collaborate | Standard, free, and expected for any SIH submission |
| AI coding IDE | **Google Antigravity** | An agent-first coding environment where you describe a task in plain English and it edits files, runs code, and verifies results (including using a browser sub-agent to click through your own web app) | This is your assigned development environment; using its "Editor View" for hands-on edits and its "Agent Manager" for larger delegated tasks fits the phased plan in Part 22 |
| Deployment | **Streamlit Community Cloud** (primary) or **Hugging Face Spaces** (fallback if dependencies get heavy) | Free hosting made specifically for Streamlit apps | Zero-config deploy directly from a GitHub repo — ideal for a student team with no DevOps experience |

**What we deliberately did NOT include, and why:**
- **Authentication/user accounts** — single-user demo tool, no per-user data to protect.
- **A message queue / async job system** — MVP images are small demo crops that process in seconds; not at the scale where you need background workers.
- **Kubernetes/Docker orchestration** — one Streamlit process is enough; Docker is only mentioned later as an optional deployment fallback (Part 28).

---

## 12–13. DATA REQUIREMENTS & DATASET / API SOURCES

**Be realistic:** the SIH problem statement itself says *"Specific datasets link will be provided – TBD"* for the hackathon round, and lists the general portals. Do not assume you'll get curated, pre-matched pairs handed to you. Plan to source and crop your own demo pairs.

### What each real data source actually contains (verified, not invented)

| Sensor | Mission | Ground Sampling Distance | Swath | Band(s) | Where to get it |
|---|---|---|---|---|---|
| **OHRC** (Orbiter High Resolution Camera) | Chandrayaan-2 | 0.25 m/pixel (nadir, from 100 km orbit) | ~3 km | Panchromatic (visible) | ISSDC PRADAN — `pradan.issdc.gov.in/ch2/` |
| **TMC-2** (Terrain Mapping Camera-2) | Chandrayaan-2 | 5 m/pixel | 20 km | Panchromatic, 0.4–0.85 µm, stereo triplet (fore/nadir/aft) | ISSDC PRADAN |
| **IIRS** (Imaging Infrared Spectrometer) | Chandrayaan-2 | 80 m/pixel | 20 km | Hyperspectral, 0.8–5.0 µm, ~250 contiguous bands | ISSDC PRADAN |
| **LROC NAC** (Narrow Angle Camera) | LRO (NASA) | 0.5–2.0 m/pixel | ~5 km combined (2 cameras) | Panchromatic | Public LROC PDS archive — `pds.lroc.im-ldi.com`, browse via `quickmap.lroc.im-ldi.com` |
| **LROC WAC** (Wide Angle Camera) global mosaic | LRO (NASA) | ~100 m/pixel | Global | Multi-band (partially color) | Same LROC PDS archive |
| **SELENE Terrain Camera (TC)** | Kaguya (JAXA) | ~10 m/pixel | Regional/global mosaics | Panchromatic | JAXA's SELENE data archive (linked from the problem statement) |
| **SELENE Multiband Imager (MI)** | Kaguya (JAXA) | 20–62 m/pixel | Regional | Multispectral | JAXA SELENE data archive |

### Realistic access notes (do this early — it is the #1 project-killing risk)

- **ISSDC PRADAN** (`pradan.issdc.gov.in/ch2/`) hosts Chandrayaan-2 data in **PDS4** format. According to ISSDC's own FAQ, each downloaded product bundle unzips into `data / geometry / browse` folders; the `data` folder is further split into `raw / calibrated / derived`. **The `derived` folder is what you want as a beginner** — it contains DEMs and **orthorectified images already in GeoTIFF format**, which any beginner-friendly Python library can open directly, without needing PDS4/ISIS3 expertise. Raw/calibrated products are generic binary image data plus an XML label file and typically need specialist software (ISIS) to turn into a usable image easily.
- **LROC NAC** raw (EDR) products officially require **USGS ISIS software** (Linux/Mac only, complex to install) to calibrate properly. To avoid this entirely, prefer **already map-projected / calibrated RDR products** or **quicklook browse JPEGs** from the LROC website/QuickMap for your demo pairs — these are viewable directly.
- **Both PRADAN and LROC downloads can be very large** (a single OHRC or NAC strip can be gigabytes). For your demo, download **only small, pre-identified crops/tiles** covering a shared, well-known feature (e.g., a named crater near the equator, which the benchmark paper confirms is the easiest and most reliable case to start with).
- Register early on ISSDC/PRADAN (it typically requires a free account) — do this in **Phase 1**, not the week before demo day.

### Practical fallback / simplification (stated honestly, not hidden)

Because getting a perfectly co-registered, ground-truth-verified real Chandrayaan-2 ↔ LROC pair can take real bureaucratic and bandwidth time, we recommend a **two-track data strategy**:

1. **Synthetic validation set (build this first, Day 1–2):** Take *any* single high-resolution real lunar image (even a LROC NAC quicklook), and programmatically generate 3–5 warped copies of it with **known** synthetic transformations: simulated shadow/illumination change (gamma/gradient shading), scale change (resize), and viewpoint change (affine warp + rotation). Because you *know* the exact transform you applied, you can compute a **true, objective RMSE** — this is how you *prove* your algorithm's accuracy claim to judges instead of eyeballing it. This is a standard, legitimate technique for validating registration algorithms and does not require any special dataset.
2. **Real cross-mission pair (add by Day 5–7):** At least one real OHRC (or TMC-2) crop registered against a real LROC NAC crop of the same named crater, to prove it isn't only working on synthetic data.

### Dataset/keyword search suggestions (for supplementary material — do not assume these exist without checking)

- Kaggle: `"lunar surface craters"`, `"moon crater detection dataset"`, `"chandrayaan"` — useful only as *extra* illustrative material (e.g., crater outlines for a bonus visualization), not as your primary registration pairs, since Kaggle mirrors are rarely calibrated PDS4 products.
- `data.gov.in` and ISRO's own portal (`isro.gov.in`) — background/context material, mission fact sheets.
- GitHub: search `"RIFT multimodal image matching"` and `"phase congruency python"` for reference implementations to study (see Part 14).

---

## 14. AI/ML/ALGORITHM ANALYSIS

**Does this genuinely need AI/ML?** Partially, and the *type* matters a lot — this is a **classical computer-vision / signal-processing problem** at its core, with an *optional* deep-learning upgrade, not a "train a neural network from scratch" problem.

### 1–2. What problem, and what type?

This is a **feature detection & correspondence (image matching) problem**, followed by **robust geometric model fitting (RANSAC)**. It is *not* a classification problem, *not* a generative problem, and does not inherently require labeled training data.

### 3–10. Model options, in beginner language, from simplest to most advanced

**Think of the whole pipeline like this:** first you find "interesting, memorable spots" in each photo (a crater rim, a sharp boulder shadow edge) — that's *feature detection*. Then you compare the "fingerprint" of each interesting spot between the two photos and decide which ones are the same real place — that's *matching*. Because some fingerprints will be wrong (they always are), you use a voting scheme (RANSAC) that keeps only the matches that agree with one consistent geometric explanation and throws away the rest.

| Method | Beginner explanation | Needs training data? | Verdict for this project |
|---|---|---|---|
| **SIFT** (Scale-Invariant Feature Transform) | A classic, decades-old "fingerprint" method built into OpenCV. Good at handling zoom and rotation differences, weaker when lighting changes a lot. | No — it's a fixed mathematical algorithm | **MUST HAVE** as your baseline. Free, fast to implement, industry-standard, and gives you something to compare everything else against. |
| **AKAZE** | A faster, more modern cousin of SIFT, also built into OpenCV. Good general-purpose speed/accuracy trade-off. | No | **SHOULD HAVE** as a second baseline — cheap to add once SIFT works, and useful for comparison in your demo/report. |
| **ASIFT** (Affine-SIFT) | Simulates the photo from many different camera tilts before running SIFT on each — much better at big viewpoint differences, but 2×+ slower. | No | NICE TO HAVE — good talking point, but expensive; add only if SIFT/AKAZE aren't handling viewpoint change well enough in your test pairs. |
| **RIFT / RIFT2** (phase-congruency-based) | Instead of "how bright/dark is this pixel," it looks at "where do edges/structures line up in *shape*, regardless of brightness" (called phase congruency). This is specifically designed for exactly this project's core challenge — matching images with very different lighting or even different sensor types. | No (it's a fixed algorithm, not a trained model) | **SHOULD HAVE** — this is your strongest, most defensible answer to the "sun-angle invariant" part of the problem statement. A real published benchmark (see below) shows it clearly beating SIFT/AKAZE on multi-sensor lunar pairs, while remaining CPU-only and open-source. |
| **SuperGlue** (deep-learning graph matcher, usually paired with a SuperPoint detector) | A neural network trained to look at both images together and directly predict which points match, learning patterns a hand-designed formula might miss. | Uses a **pretrained** model (no training needed by you) but was trained on ordinary photos, not lunar images, so it's using "learned general intuition," not lunar-specific knowledge | **NICE TO HAVE.** In the referenced benchmark it had the best accuracy and speed overall, including at the poles where classical methods failed outright — a genuinely strong result worth demonstrating if you have GPU access. Flag two honest caveats to judges: (a) it is not lunar-domain-trained, so its confidence shouldn't be over-claimed, and (b) Magic Leap's official SuperGlue release is distributed under a **non-commercial research license**, which matters if this were ever turned into a deployed product. |

### Real benchmark evidence (not invented — grounds your claims)

A 2025 study by Makharia, Singla, Amitabh, Dube, and Sharma (Space Applications Centre, ISRO, and Manipal University Jaipur), *"Comparative Evaluation of Traditional and Deep Learning Feature Matching Algorithms using Chandrayaan-2 Lunar Data"* (arXiv:2509.04775), tested exactly SIFT, ASIFT, AKAZE, RIFT2, and SuperGlue on OHRC↔LROC NAC, IIRS↔LROC WAC, and DFSAR↔SELENE pairs, in both equatorial and polar regions. Their key, citable findings (paraphrased, numbers as published):

- On the OHRC↔NAC equatorial pair, SuperGlue achieved the lowest RMSE (roughly 0.6 pixels in each axis) and ran in under 4 seconds; RIFT2 was the best non-deep-learning method (roughly 1.1–1.5 pixel RMSE) and much faster than SIFT/ASIFT/AKAZE (tens of seconds vs 600–800+ seconds on their hardware).
- On the polar OHRC↔NAC pair, classical SIFT/ASIFT/AKAZE **failed to register at all**; only SuperGlue succeeded reliably (RIFT2 also had documented trouble here).
- On IIRS↔WAC, all methods performed reasonably (this pair has less extreme geometric distortion), with SuperGlue again best, and AKAZE/ASIFT competitive.
- Their overall recommendation: SuperGlue for best all-around accuracy/robustness if resources allow it; RIFT2 as the strongest lightweight, non-deep-learning option for multimodal pairs; SIFT/ASIFT/AKAZE as viable only for the easier equatorial, single-sensor-type cases.

**This directly justifies our MUST/SHOULD/NICE tiering above** — it is not a guess.

### What we recommend building, concretely

1. **MVP matcher:** OpenCV SIFT + AKAZE (both built-in, zero extra dependencies), with a ratio test and RANSAC. This alone will visibly work on your synthetic validation set and on easy equatorial real pairs, and gives you a solid, explainable core to demo on Day 1 of integration testing.
2. **SHOULD-have matcher:** A phase-congruency-based feature layer (using `phasepack`), reproducing the RIFT/RIFT2 idea — detect keypoints on the phase-congruency map instead of raw intensity, describe them with a simple, explainable descriptor (e.g., histogram of oriented phase-congruency gradients), and match with the same RANSAC pipeline. This is real, achievable engineering work for a hackathon team (not "train a giant model"), and it's the single feature most likely to visibly impress ISRO judges, because it's a direct, working answer to the literal words "sun angle invariant" in the problem title.
3. **NICE-to-have matcher:** Wire in a pretrained SuperGlue/SuperPoint checkpoint (widely available open-source PyTorch implementations exist) as a third selectable mode in the UI, clearly labeled "deep-learning matcher (pretrained, non-commercial license)" — only attempt this after 1 and 2 are solid and tested, and only if a teammate has GPU access or is comfortable with slower CPU inference.

**What we are explicitly NOT doing:** training any model from scratch. There is no realistic labeled lunar-image-matching training set available to a student team in a hackathon timeframe, and it is not necessary — every method above is either a fixed algorithm or a usable pretrained model.

---

## 15. DATABASE ANALYSIS

**Is persistent database storage actually required for the MVP? No.**

Walk through what data exists in this system:
- The two input images — user-supplied or bundled demo files, not relational data.
- The processing result (warped image, match list, metrics) — computed fresh every time the user clicks "Register," needed only for the current session, and naturally represented as an image file + a small JSON/CSV, not rows in a relational table.
- No user accounts, no multi-user shared state, no need to query/filter/join records across many past runs during the demo.

> **"A database is not required for the MVP. Do not use Neon at this stage."**

**If you later add the SHOULD-have "run history" feature** (e.g., "show me the last 10 registrations and their RMSE, so I can compare algorithms over time"), that *is* a legitimate, small relational need — but it is genuinely local/single-user, so **SQLite** (a database that's just a single file, no server or credentials needed) is the correct, simplest tool, not Neon.

**When would Neon Postgres actually become justified?** Only if you deploy the demo publicly and want *multiple simultaneous users/judges* to see a **shared** history dashboard (e.g., a leaderboard of "which algorithm won on which image pair"), because that's a genuine multi-writer, always-on, remotely-accessible use case that a single SQLite file handles poorly. Design for this as a **future/NICE-TO-HAVE** possibility (Part 33), not part of the MVP build.

If/when you do reach that point, a minimal schema would be:

```
registration_runs
├── id (primary key)
├── created_at (timestamp)
├── source_sensor (text: 'OHRC' | 'TMC2' | 'IIRS')
├── reference_sensor (text: 'LROC_NAC' | 'LROC_WAC' | 'SELENE_TC')
├── algorithm (text: 'SIFT' | 'AKAZE' | 'RIFT2' | 'SuperGlue')
├── inlier_count (integer)
├── inlier_ratio (float)
├── rmse_pixels (float)
├── distribution_score (float)
├── runtime_seconds (float)
└── output_image_path (text)
```

What belongs in this table: only small, structured *summary numbers* per run. What must NOT go in a database: the actual image files (store those as files on disk/object storage and just keep a file path/URL in the table) and anything resembling API keys or credentials (those belong in environment variables — see Part 27).
---

## 16. FRONTEND PLAN

Because the MVP is a single Streamlit app, "frontend" here means **one Python script that Streamlit turns into a web page**, organized as logical sections/pages rather than separate HTML files.

### Pages / Screens

**Page 1 — Home / Register**
- **Purpose:** The whole demo happens here.
- **Inputs:** Two image pickers (dropdown: "Use a demo pair" OR file-uploader for your own images), a sensor-pair selector (OHRC↔NAC, TMC-2↔NAC, IIRS↔WAC), an algorithm selector (SIFT, AKAZE, RIFT2-style, [SuperGlue if built]).
- **Buttons:** "Register images," "Reset."
- **Outputs:** Side-by-side source/reference thumbnails immediately on selection; after clicking Register — a 2×2 result panel (warped source, checkerboard overlay, match-point scatter plot, metrics table) plus download buttons (PNG of registered image, CSV of match points, JSON of metrics).
- **Loading state:** A Streamlit spinner with step labels ("Resampling…", "Detecting features…", "Matching…", "Filtering outliers…", "Warping…") so judges see it's really doing multi-step work, not an instant fake result.
- **Error states:** If no overlap is found (0 inliers), show a clear message: *"No reliable matches found between these images — try a different pair or algorithm,"* not a crash.
- **Empty state:** Before any run, show a short explanation panel of what the tool does + a labeled diagram (reuse the Part 8 pipeline diagram).

**Page 2 — Algorithm Comparison (SHOULD have)**
- **Purpose:** Run 2–3 algorithms on the same pair back-to-back and show metrics side by side — this is a strong judge-facing page because it *proves* your claims with numbers instead of one cherry-picked result.
- **Inputs:** Same image pair as Page 1 (reuse the current session's selection).
- **Outputs:** A bar chart of RMSE per algorithm, a table of inlier counts/ratios/runtimes.

**Page 3 — About / Methodology (SHOULD have)**
- **Purpose:** One static page explaining the pipeline, the datasets used, and citing the benchmark paper — useful both for judges reading on their own and as your own presentation notes.

### Navigation
Streamlit's built-in multipage sidebar (`pages/` folder convention) — no custom routing needed.

### Design direction
- **Layout:** Simple two-column layout (inputs on the left/top, results on the right/below); avoid a cluttered dashboard.
- **Information hierarchy:** Metrics numbers should be the most visually prominent thing after clicking Register — judges should be able to read RMSE and inlier ratio from across a room.
- **Visual style:** Dark, high-contrast background suits lunar grayscale imagery well and looks intentional rather than default — but this is a nice-to-have polish item, not a priority over functionality.
- **Responsiveness/accessibility:** Streamlit is responsive by default; make sure font sizes for metrics are large (`st.metric` component) and don't rely on color alone to signal "good vs bad" RMSE (add numeric labels).

---

## 17. BACKEND PLAN

There is no separate backend *server* in the MVP — but there is a clean backend **module** (`registration_engine/`) that the Streamlit UI calls as plain Python functions. Explained simply: think of it as the "kitchen" behind the "restaurant counter" (the UI) — the counter never cooks anything itself, it just calls into the kitchen and displays what comes back.

**Core functions (this *is* your API, even without HTTP):**

```
load_and_resample(source_path, reference_path, target_gsd) -> (source_img, reference_img)
preprocess(image, method: "clahe" | "hist_match" | "phase_congruency") -> processed_image
detect_and_match(source_img, reference_img, algorithm: "sift" | "akaze" | "rift2") -> raw_matches
filter_matches(raw_matches, grid_size) -> inlier_matches, transform_matrix
warp_image(source_img, transform_matrix, reference_shape) -> warped_image
compute_metrics(inlier_matches, transform_matrix) -> {rmse, inlier_count, inlier_ratio, distribution_score}
run_pipeline(source_path, reference_path, sensor_pair, algorithm) -> full result dict   # orchestrates all of the above
```

**Validation:** check both files are readable images, non-empty, and not absurdly large before processing; check the chosen algorithm string is one of the supported options; catch "zero matches found" as a handled case, not an unhandled exception.

**Business logic:** lives entirely in `registration_engine/`, unit-testable independent of Streamlit (see Part 25).

**Error handling:** every step wraps in a `try/except` that returns a structured `{"success": False, "error": "human-readable message"}` rather than letting Streamlit show a raw Python traceback to a judge.

### If you outgrow Streamlit later (SHOULD/NICE, not MVP)

Should you want a "real" web-app feel with a separate frontend, wrap the exact same `run_pipeline()` function in a tiny **FastAPI** backend. Beginner explanation of an API in this context: *an API is the counter window between the kitchen (your Python registration engine) and any dining room (a web page, a mobile app, or even another script) — the dining room places an order (an HTTP request) and gets a plate back (a JSON response), without needing to know how the kitchen works inside.*

### API table (only relevant if/when you add the optional FastAPI layer)

| Endpoint | Method | Purpose | Input | Output |
|---|---|---|---|---|
| `/register` | POST | Run the full registration pipeline | multipart form: `source_image`, `reference_image`, `sensor_pair`, `algorithm` | JSON: `{registered_image_url, matches[], metrics{}}` |
| `/algorithms` | GET | List available algorithms for the UI dropdown | — | JSON list of `{id, label, description}` |
| `/demo-pairs` | GET | List bundled demo image pairs | — | JSON list of `{id, label, source_sensor, reference_sensor}` |
| `/health` | GET | Simple uptime check for deployment monitoring | — | `{"status": "ok"}` |

Each endpoint explained simply: `/register` is "do the work and give me the result"; `/algorithms` and `/demo-pairs` just let the frontend know what options to show in dropdowns without hardcoding them twice; `/health` is a tiny endpoint hosting platforms ping to check your app hasn't crashed.

---

## 18. API DESIGN — see the table directly above (Part 17). For the MVP (pure Streamlit), skip this section entirely — there is no network API, only direct Python function calls, which is intentional and simpler.

---

## 19. COMPLETE PROJECT STRUCTURE

```
lunar-image-registration/
├── app.py                        # Streamlit entry point (Page 1: Register)
├── pages/
│   ├── 2_Algorithm_Comparison.py # Streamlit auto-detects this as Page 2
│   └── 3_About.py                # Page 3
├── registration_engine/          # The "backend" — plain, testable Python
│   ├── __init__.py
│   ├── io_utils.py               # load_and_resample()
│   ├── preprocessing.py          # clahe(), histogram_match(), phase_congruency_map()
│   ├── matchers.py               # sift_match(), akaze_match(), rift2_match()
│   ├── ransac_filter.py          # filter_matches() incl. grid-based spread enforcement
│   ├── warp.py                   # warp_image()
│   ├── metrics.py                # compute_metrics()
│   └── pipeline.py               # run_pipeline() orchestrator
├── data/
│   └── demo_pairs/                # small, pre-approved real + synthetic image pairs for the live demo
│       ├── ohrc_nac_crater_x/
│       └── synthetic_validation/
├── scripts/
│   └── generate_synthetic_pairs.py  # builds the Day-1 synthetic validation set (Part 22 / Phase 3)
├── tests/
│   ├── test_preprocessing.py
│   ├── test_matchers.py
│   ├── test_ransac_filter.py
│   └── test_pipeline_end_to_end.py
├── docs/
│   └── methodology.md            # mirrors Page 3 "About" content; also your SIH report source
├── .env.example                  # documents any config vars, even if empty for MVP (see Part 27)
├── .gitignore
├── requirements.txt
└── README.md
```

**What each important item does:**
- `registration_engine/` is deliberately UI-independent — this is what lets you test the actual science with `pytest` without clicking through the web app every time, and what would let you reuse it in a future FastAPI backend with zero rewriting.
- `data/demo_pairs/` — small, curated files (a few MB each, not full mission archives) committed to the repo (or, if large, tracked via **Git LFS** — see Part 21) so the live demo never depends on internet access to ISSDC/LROC during judging.
- We deliberately do **not** create `backend/`, `frontend/`, `models/`, or `config/` folders — they'd be empty ceremony for this project's actual size.

---

## 20. ENVIRONMENT SETUP FROM ABSOLUTE ZERO (Windows-first instructions)

| # | Tool | Why needed | Install | Verify | Common error → fix |
|---|---|---|---|---|---|
| 1 | **Git** | Version control; required by GitHub and by Antigravity to track changes | Download from git-scm.com, run installer with default options | `git --version` in a terminal | `'git' is not recognized` → restart terminal, or re-run installer and check "Add to PATH" |
| 2 | **GitHub account** | Free code hosting, required for SIH submission | Sign up at github.com | Log in successfully | Forgot password → use GitHub's reset flow |
| 3 | **Python 3.11** | Runs all our code | Download from python.org; **check "Add Python to PATH"** during install | `python --version` | `'python' is not recognized` → reinstall and tick "Add to PATH," or use `py --version` instead |
| 4 | **Google Antigravity** | Your AI coding IDE | Download from antigravity.google, install like any desktop app (Windows/Mac/Linux supported) | Open the app, it should show an Editor View and an Agent Manager | Login/model errors → confirm you're signed in with a Google account and have network access |
| 5 | **A virtual environment** | Keeps this project's Python packages separate from your system Python, avoiding version conflicts with other projects | In the project folder: `python -m venv venv` | `venv\Scripts\activate` (Windows) then `python -m pip --version` shows a path inside `venv` | "cannot be loaded because running scripts is disabled" (PowerShell) → run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt instead of PowerShell |
| 6 | **Project dependencies** | OpenCV, NumPy, Streamlit, etc. | Activate venv, then `pip install -r requirements.txt` (file created in Phase 2) | `python -c "import cv2, streamlit; print('ok')"` | `opencv-contrib-python` build errors on old pip → run `pip install --upgrade pip` first |
| 7 | (Optional, SHOULD) **Git LFS** | Handles the demo image files without bloating the repo | Download from git-lfs.github.com, then `git lfs install` once | `git lfs version` | Large files rejected by GitHub push → confirm `git lfs track "*.tif"` was run *before* committing those files |
| 8 | (Optional, only if using `rasterio`) **GDAL-dependent geospatial stack** | True lat/lon georeferencing | `pip install rasterio` (prebuilt wheels available on Windows for most Python versions) | `python -c "import rasterio; print('ok')"` | Install failures on Windows → this is exactly why the MVP defaults to `tifffile` instead, avoiding GDAL entirely; only attempt this as a SHOULD-have upgrade with time to spare |

**Environment variables:** the MVP needs none (no API keys, no database credentials) — `.env.example` exists mainly as a placeholder for the future Neon `DATABASE_URL` if you build the optional run-history feature later.

---

## 21. GITHUB SETUP

1. **Create the repository:** on GitHub, click "New repository," name it `lunar-image-registration`, keep it **public** (SIH submissions are typically expected to be publicly reviewable), initialize with a `.gitignore` (Python template) and a README.
2. **Clone it locally:** in Antigravity's terminal or your system terminal: `git clone https://github.com/<your-username>/lunar-image-registration.git`
3. **Basic day-to-day commands** (this is genuinely all you need):
   ```
   git add .
   git commit -m "short description of what changed"
   git push
   ```
4. **Pulling latest changes** (if working across multiple machines or teammates): `git pull` before you start working.
5. **Branches:** for a small student team working sequentially through phases, **stay on `main`** — introducing feature branches adds merge-conflict risk without real benefit at this scale. Only create a branch if two people must edit the same files at the same time.
6. **`.gitignore`:** make sure it excludes `venv/`, `__pycache__/`, `.env`, and any large raw downloaded mission archives you don't intend to commit (keep only your small curated `data/demo_pairs/`).
7. **Secrets:** the MVP has none. If you add Neon later, its `DATABASE_URL` goes in a local `.env` file (never committed — it's already in `.gitignore`) and is set as an environment variable on your deployment platform's dashboard instead.

---

## 22. ANTIGRAVITY VIBE-CODING WORKFLOW

Antigravity gives you two modes, and this plan uses both deliberately:
- **Editor View** — for hands-on, single-file edits where you want to watch and steer closely (early phases, and any bug you're debugging together).
- **Agent Manager** — for larger, well-scoped background tasks you can delegate and check on later (e.g., "build the preprocessing module," "wire up the Streamlit page") while you work on something else. Antigravity's browser sub-agent can even click through your running Streamlit app itself and report back with screenshots — use this to verify UI phases.

**Golden rules for every prompt you give it (baked into every prompt template below):**
- Always tell it to inspect the current project state first.
- Always name the exact files it should touch.
- Always tell it not to modify unrelated files or "improve" things you didn't ask for.
- Always ask for tests and a plain-English summary of what changed.

---

## 23–24. COMPLETE IMPLEMENTATION PHASES + COPY-PASTE ANTIGRAVITY PROMPTS

### PHASE 0 — Understanding and planning
**Goal:** Team agreement on scope (this document), and picking your first target sensor pair (recommend starting with **OHRC ↔ LROC NAC, equatorial** — confirmed the easiest, most reliable case in the benchmark paper).
**Deliverable:** A one-page internal note: "we are building X, not Y." No Antigravity prompt needed yet — this is a human discussion.
**Done when:** Everyone on the team can say the MVP sentence from Part 6 from memory.

### PHASE 1 — Environment setup
**Goal:** Every teammate's machine can run Python + Git + Antigravity.
**Tasks:** Follow Part 20 exactly, on every machine.
**Done when:** `python --version`, `git --version`, and a successful `pip install streamlit` all work for every teammate.
**No Antigravity prompt needed** — this is manual installation.

### PHASE 2 — Project initialization
**Objective:** Create the repo skeleton from Part 19, with a working "hello world" Streamlit page, before any real algorithm code exists.
**Why now:** Proves your environment and deployment path work before you invest time in algorithms — cheapest possible point to catch setup problems.

**Antigravity prompt:**
```
I'm starting a new Python project called "lunar-image-registration". Before making any
changes, inspect the current (empty or near-empty) project folder so you understand what
already exists.

Create this exact folder/file structure:
- app.py (a minimal Streamlit app that just shows the title "Lunar Image Registration" and
  one line of description text — no real functionality yet)
- registration_engine/__init__.py (empty package marker)
- data/demo_pairs/.gitkeep
- scripts/.gitkeep
- tests/.gitkeep
- requirements.txt (include: streamlit, opencv-contrib-python, numpy, scipy, tifffile,
  Pillow, matplotlib, pytest, phasepack)
- .gitignore (Python template: venv/, __pycache__/, .env, *.pyc)
- README.md (project title, one-paragraph description of what this tool does, and a
  "How to run" section with the exact commands: create venv, activate it, pip install -r
  requirements.txt, streamlit run app.py)

Do not add any other files or folders. Do not add authentication, a database, or a backend
framework — this project intentionally has none of those yet.

After creating the files, run `streamlit run app.py` in the terminal to confirm it starts
without errors, then summarize what you created and confirm the app launched successfully.
```
**Expected result:** Running `streamlit run app.py` opens a browser tab showing your title and description.
**Verification:** You personally see the page in a browser; `git status` shows exactly the files you asked for.
**Common errors:** `streamlit: command not found` → the venv isn't activated; port already in use → close other Streamlit instances or note the alternate port Streamlit picks automatically.

### PHASE 3 — Prove the core concept: synthetic validation harness
**Objective:** Before touching real lunar data, prove the *registration math itself* works, using one real lunar image transformed into a known "before/after" pair — this is the riskiest technical component, so we test it first (see Part 35, Build Order).
**Why now:** If your matching/RANSAC/warping math is wrong, you want to know on Day 3, not Day 20.

**Antigravity prompt:**
```
Inspect the current project structure (registration_engine/, scripts/, data/demo_pairs/)
before making changes.

Create scripts/generate_synthetic_pairs.py, a standalone Python script that:
1. Loads a single grayscale image from data/demo_pairs/synthetic_validation/source.png
   (assume this file will be provided by me — if it's missing, print a clear message telling
   me to add it, and stop, rather than crashing with a traceback).
2. Applies a KNOWN synthetic transform: a small rotation (5 degrees), a scale change (resize
   to 80%), and a brightness/gamma change to simulate a different sun angle.
3. Saves the transformed image to data/demo_pairs/synthetic_validation/target.png
4. Saves the exact transformation matrix used to
   data/demo_pairs/synthetic_validation/ground_truth_transform.npy using numpy, so we can
   later compare our algorithm's estimated transform against this known ground truth.

Use only numpy, opencv (cv2), and Pillow. Add clear comments explaining each transform step
in plain English for a beginner. Add a short docstring at the top of the file explaining why
this synthetic pair exists (to get an objective accuracy number before using messier real
data).

After creating it, run the script and confirm it produces both output files without errors.
Then write a summary of what the script does and what the ground-truth transform values are.
```
**Expected result:** `target.png` and `ground_truth_transform.npy` appear in the demo folder.
**Verification:** Open `source.png` and `target.png` side by side — target should look visibly rotated, slightly smaller, and differently lit.
**Common errors:** "file not found" → you forgot to actually place a `source.png` in that folder first; do this manually (any real lunar image crop works).

### PHASE 4 — Preprocessing module
**Objective:** Build `registration_engine/preprocessing.py` and `io_utils.py`.

**Antigravity prompt:**
```
Inspect registration_engine/ and tests/ before making changes. Do not modify app.py or
scripts/generate_synthetic_pairs.py in this task.

In registration_engine/io_utils.py, implement:
  load_and_resample(source_path: str, reference_path: str, target_gsd: float | None = None)
  -> tuple[np.ndarray, np.ndarray]
  - Loads both images as grayscale numpy arrays (support .png, .jpg, .tif using Pillow and
    tifffile as appropriate based on file extension).
  - If target_gsd is provided, resize both images so their pixel spacing matches it
    (for the MVP, assume the caller passes the correct resize ratio directly if known;
    otherwise just return the images unresized — add a TODO comment explaining that full
    ground-sampling-distance-aware resizing needs each product's metadata, which is a later
    enhancement).
  - Raise a clear, custom RegistrationInputError (define this exception class) with a
    human-readable message if a file can't be read, rather than letting a raw exception
    propagate.

In registration_engine/preprocessing.py, implement three functions, each taking a grayscale
numpy image and returning a processed numpy image of the same shape:
  - clahe(image: np.ndarray) -> np.ndarray   # use cv2.createCLAHE
  - histogram_match(image: np.ndarray, reference: np.ndarray) -> np.ndarray   # use
    skimage.exposure.match_histograms if scikit-image is available, otherwise implement a
    simple manual histogram matching function
  - phase_congruency_map(image: np.ndarray) -> np.ndarray   # use the phasepack library's
    phasecong function; return its combined edge-strength/moment output normalized to 0-255

Add scikit-image to requirements.txt if you use it.

Write tests/test_preprocessing.py using pytest: create a small synthetic numpy test image
(e.g. a 50x50 array with a simple gradient or shape) and assert that each function runs
without error and returns an array of the same shape and dtype uint8.

Run the tests and show me the output. Do not proceed if any test fails — instead, show me
the error and your proposed fix before applying it.
```
**Expected result:** `pytest tests/test_preprocessing.py` passes.
**Verification:** Run pytest yourself; also manually call `clahe()` on the Phase-3 synthetic image and visually confirm it looks different (more contrast) than the input.
**Common errors:** `phasepack` import errors → confirm it's in `requirements.txt` and was installed in the active venv; shape mismatch errors → check grayscale vs RGB loading consistency.

### PHASE 5 — Baseline matcher (SIFT/AKAZE) + RANSAC + metrics
**Objective:** Get a full, working (if basic) end-to-end pipeline on the synthetic pair — this is your first real proof of concept.

**Antigravity prompt:**
```
Inspect registration_engine/ (especially io_utils.py and preprocessing.py from the previous
task — reuse them, do not duplicate their logic) before making changes.

Implement registration_engine/matchers.py with:
  detect_and_match(source_img: np.ndarray, reference_img: np.ndarray, algorithm: str)
  -> list[cv2.DMatch], list[cv2.KeyPoint], list[cv2.KeyPoint]
  - Support algorithm values "sift" and "akaze" using cv2.SIFT_create() and
    cv2.AKAZE_create().
  - Use a brute-force matcher with a ratio test (Lowe's ratio, threshold 0.75) to filter
    obviously bad matches before returning them.
  - Raise a clear error if algorithm is not one of the supported values.

Implement registration_engine/ransac_filter.py with:
  filter_matches(matches, kp_source, kp_reference, grid_size: int = 4)
  -> tuple[np.ndarray transform_matrix, list good_matches]
  - Use cv2.findHomography with RANSAC to estimate a homography and identify inliers.
  - THEN enforce spatial spread: divide the reference image into a grid_size x grid_size
    grid of cells, and if any single cell contains more than (say) 3x the average number of
    inliers per cell, keep only the strongest 3x-average matches in that cell and discard the
    rest. Add a clear comment explaining this step exists because the SIH problem statement
    specifically requires matches to be evenly distributed across the image, not clustered.
  - Return the final transform matrix and the filtered list of good matches.

Implement registration_engine/warp.py with:
  warp_image(source_img, transform_matrix, output_shape) -> np.ndarray
  using cv2.warpPerspective.

Implement registration_engine/metrics.py with:
  compute_metrics(good_matches, kp_source, kp_reference, transform_matrix, grid_size=4)
  -> dict with keys: rmse, inlier_count, inlier_ratio (inliers / total raw matches),
  distribution_score (fraction of the grid_size x grid_size cells that contain at least
  one inlier match, from 0.0 to 1.0)

Finally, implement registration_engine/pipeline.py with:
  run_pipeline(source_path, reference_path, algorithm="sift") -> dict
  that calls load_and_resample -> clahe (on both images) -> detect_and_match ->
  filter_matches -> warp_image -> compute_metrics, and returns a dict with keys:
  success, warped_image, matches, metrics, error (error is None on success).
  Wrap the whole thing in a try/except that sets success=False and a human-readable error
  message instead of crashing.

Write tests/test_pipeline_end_to_end.py that runs run_pipeline() on the Phase-3 synthetic
source.png/target.png pair with algorithm="sift", asserts success is True, and asserts
metrics["rmse"] is a reasonable low value (print it so I can see the actual number — do not
hardcode an assumed pass/fail threshold yet, since we don't know the real number until we
run it).

Run the test and show me the actual RMSE, inlier_count, and distribution_score it produces
on the synthetic pair. Summarize the results in plain English.
```
**Expected result:** A printed RMSE (should be small — likely under 2 pixels on the synthetic pair, since it's a "clean" known transform), an inlier count, and a distribution score.
**Verification:** Sanity-check manually: does the RMSE number look plausible (not 0.0 exactly — that would suggest a bug like comparing an image to itself; not enormous either)?
**Common errors:** `findHomography` returns `None` → not enough good matches were found (check the ratio-test threshold and that CLAHE is actually being applied); silent shape mismatches between source/reference sizes → confirm `load_and_resample` returns same-sized outputs when needed by `warp_image`.

### PHASE 6 — Illumination-robust matcher (RIFT2-style / phase congruency)
**Objective:** Add the SHOULD-have matcher that targets the "sun angle invariant" requirement head-on.

**Antigravity prompt:**
```
Inspect registration_engine/matchers.py and registration_engine/preprocessing.py before
making changes. Do not break the existing "sift" and "akaze" options — add to the same
detect_and_match function.

Add a new algorithm option "rift2" to detect_and_match() in registration_engine/matchers.py:
1. Compute the phase congruency map of both source and reference images using the existing
   phase_congruency_map() function from preprocessing.py.
2. Detect keypoints on the phase congruency maps using cv2.AKAZE_create() or cv2.ORB_create()
   (phase congruency maps are already illumination-invariant, so a fast standard detector run
   ON them approximates the RIFT2 approach, which is a reasonable, honest simplification of
   the full published RIFT2 algorithm — add a code comment saying exactly this, citing that
   this is a simplified reimplementation inspired by Li, Hu & Ai's RIFT paper (IEEE TIP 2020)
   and its RIFT2 follow-up, not a byte-for-byte reproduction).
3. Match and ratio-test as with the other algorithms.

Update tests/test_pipeline_end_to_end.py to also run run_pipeline() with algorithm="rift2"
on BOTH the synthetic pair AND (if the files exist) a real image pair at
data/demo_pairs/ohrc_nac_crater_x/ — if that real folder doesn't exist yet, skip that part of
the test with a clear pytest.skip() message rather than failing.

Run all tests and report the RMSE/inlier_count/distribution_score for "rift2" next to the
existing "sift" and "akaze" numbers so we can compare them directly. Summarize which
algorithm performed best on the synthetic pair and by how much.
```
**Expected result:** A side-by-side comparison of metrics across algorithms on the same pair.
**Verification:** On the *synthetic* pair (moderate brightness change only), SIFT/AKAZE should already do fine; the real differentiator shows up once you test on a real pair with genuinely different sun angles (Phase 9) — note that expectation explicitly so you don't over- or under-interpret Phase 6's synthetic-only results.
**Common errors:** Too few keypoints on the phase congruency map → check the map isn't accidentally near-blank (print its min/max values); this usually means a normalization bug in `phase_congruency_map()`.

### PHASE 7 — Streamlit frontend wired to the engine
**Objective:** Build Page 1 (Part 16) as a real, clickable UI on top of the now-working pipeline.

**Antigravity prompt:**
```
Inspect app.py and registration_engine/pipeline.py before making changes. Reuse
run_pipeline() exactly as it is — do not duplicate its logic inside app.py.

Rewrite app.py into the full Register page described here:
- Title and one-paragraph description at the top.
- A selectbox to choose a demo pair from the folders inside data/demo_pairs/ (list folder
  names dynamically, don't hardcode them) OR two st.file_uploader widgets for the user's own
  source/reference images.
- A selectbox for algorithm: sift, akaze, rift2.
- A "Register images" button.
- While processing, show a spinner with these sequential status messages: "Resampling...",
  "Preprocessing...", "Detecting and matching features...", "Filtering outliers...",
  "Warping image...", "Computing metrics..." (these don't need to reflect real intermediate
  timing precisely — just call run_pipeline() and show the spinner around the whole call,
  since it's fast enough not to need granular progress).
- After processing: if result["success"] is False, show result["error"] using st.error() and
  stop. If successful, show:
  - Four st.metric() widgets across the top: RMSE (pixels), Inlier Count, Inlier Ratio,
    Distribution Score.
  - Below that, three images side by side using st.columns(3): source, reference, and the
    warped/registered output.
  - Below that, a matplotlib scatter plot of the match points overlaid on the reference
    image (use st.pyplot()).
  - Three download buttons: the warped image as PNG, the match points as CSV (columns:
    source_x, source_y, reference_x, reference_y), and the metrics as JSON.

Do not add a database, login, or any feature not listed above. Keep all business logic in
registration_engine/ — app.py should only call run_pipeline() and render its output.

After making these changes, use your browser sub-agent to actually open the running
Streamlit app, select a demo pair, run a registration, and take a screenshot of the result
screen so I can see it worked. Report back what you saw, including the actual metric values
shown.
```
**Expected result:** A working, clickable demo you can show a judge.
**Verification:** The screenshot/walkthrough Antigravity's browser sub-agent produces; also click through it yourself once.
**Common errors:** File uploader returns a Streamlit `UploadedFile` object, not a path — make sure `io_utils.py`'s loader can accept either a path or a file-like object, or save uploads to a temp file first.

### PHASE 8 — Real data integration
**Objective:** Replace/add real Chandrayaan-2 + LROC crops to `data/demo_pairs/`, following Part 12–13's access notes, and confirm the pipeline still works on them (not just synthetic data).
**This phase is mostly manual (downloading and cropping real files) — use Antigravity for the supporting script:**

**Antigravity prompt:**
```
Inspect data/demo_pairs/ before making changes. I will manually place two real image files
at data/demo_pairs/ohrc_nac_crater_x/source_ohrc.tif and
data/demo_pairs/ohrc_nac_crater_x/reference_nac.tif.

Create scripts/crop_and_prepare_real_pair.py, a command-line script (using argparse) that:
1. Takes --source and --reference file paths as arguments, plus optional --crop-source and
   --crop-reference arguments as "x,y,width,height" strings.
2. Loads each image using tifffile (fall back to Pillow if tifffile fails to open the file),
   applies the crop if given, converts to 8-bit grayscale PNG if not already, and saves the
   result into a new subfolder under data/demo_pairs/ named after a --output-name argument.
3. Prints the final image dimensions and file sizes so I can sanity-check they're reasonably
   small (a few MB, appropriate for a demo, not a multi-gigabyte mission strip).

Add clear --help text since I'll be running this manually with real coordinates I look up
myself using QuickMap or the ISSDC browse tool. Do not attempt to automatically download
anything from ISSDC or LROC — assume I already have the files locally.
```
**Expected result:** A reusable cropping utility; you personally run it after manually downloading real ISSDC/LROC files.
**Verification:** Run `run_pipeline()` (via the Streamlit UI) on this new real demo pair and visually confirm the warped output actually lines up with the reference image.
**Common errors:** Real OHRC/NAC crops may have wildly different apparent brightness — this is exactly what Phase 4's preprocessing and Phase 6's `rift2` mode are for; if `sift`/`akaze` fail here but `rift2` succeeds, that is a **success story** for your demo, not a bug.

### PHASE 9 — Integration & algorithm comparison page
**Objective:** Build the SHOULD-have Page 2 (Part 16) using the now-proven pipeline across multiple algorithms and both demo pairs.

**Antigravity prompt:**
```
Inspect app.py, registration_engine/pipeline.py, and the pages/ folder (create it if it
doesn't exist) before making changes.

Create pages/2_Algorithm_Comparison.py as a new Streamlit page:
- Reuse the same demo-pair selector logic as app.py (consider moving the shared
  "list available demo pairs" logic into registration_engine/io_utils.py as a small
  list_demo_pairs() function if it isn't already, and have both app.py and this new page
  call that shared function instead of duplicating the folder-listing code).
- A "Run all algorithms" button that calls run_pipeline() once per algorithm (sift, akaze,
  rift2) on the selected pair.
- Display a matplotlib bar chart comparing RMSE across the three algorithms, and a table
  comparing inlier_count, inlier_ratio, distribution_score, and runtime (measure runtime
  yourself around each run_pipeline() call using Python's time module — add a "runtime"
  key to the metrics dict returned by run_pipeline() if it isn't already there).

After this, use your browser sub-agent to open this new page, run the comparison on one demo
pair, and screenshot the result so I can confirm it renders correctly.
```
**Expected result:** A side-by-side comparison chart/table you can screenshot for your SIH report and show live to judges.
**Verification:** Screenshot + your own click-through.
**Common errors:** If `list_demo_pairs()` refactor breaks `app.py`, ask Antigravity to re-run `tests/` after the refactor before considering the phase done.

### PHASE 10 — Testing & debugging pass
See Part 25 for the full checklist; the prompt below asks Antigravity to systematically work through it.

**Antigravity prompt:**
```
Inspect the full project (registration_engine/, tests/, app.py, pages/) before making
changes.

Go through this edge-case checklist and add a pytest test for each one in the appropriate
test file (create tests/test_edge_cases.py if that's cleaner than spreading them across
existing files):
1. run_pipeline() called with a path to a file that doesn't exist -> should return
   success=False with a clear error, not crash.
2. run_pipeline() called with two images that have zero overlapping content (e.g., two
   unrelated random noise images) -> should return success=False or a metrics dict with
   inlier_count of 0, not crash.
3. run_pipeline() called with an unsupported algorithm string -> should return a clear error.
4. filter_matches() called with an empty matches list -> should not crash, should return an
   empty result.
5. A very small image (e.g. 20x20 pixels) run through the full pipeline -> should not crash,
   even if results are poor.

For each failing test you find, fix the underlying code in registration_engine/ to handle
that case gracefully, then re-run the full test suite (all files under tests/) and confirm
everything passes. Show me the full pytest output and a summary of every bug you fixed.
```
**Expected result:** A green, fully-passing test suite that explicitly covers failure modes, not just the happy path.
**Verification:** `pytest tests/ -v` output showing every test, all passing.

### PHASE 11 — Deployment
See Part 28 for exact platform steps. Antigravity prompt for the deployment-readiness pass:

**Antigravity prompt:**
```
Inspect requirements.txt, app.py, and the whole project before making changes.

Prepare this project for deployment on Streamlit Community Cloud:
1. Confirm requirements.txt lists exact, pinned versions for every dependency actually
   imported anywhere in the codebase (search all .py files for import statements and cross-
   check).
2. Confirm there are no hardcoded local file paths (like "C:\Users\...") anywhere in
   registration_engine/ or app.py — all paths should be relative to the project root using
   Python's pathlib, so the app works identically on the cloud.
3. Add a .streamlit/config.toml with a small theme configuration (e.g. a dark background) if
   one doesn't already exist.
4. Double check data/demo_pairs/ files are committed to git and not excluded by .gitignore
   (list what .gitignore currently excludes and confirm none of it matches our demo data
   files).

Report a checklist of what you checked and fixed, and confirm the app still runs correctly
locally after these changes by running `streamlit run app.py` once more.
```
**Expected result:** A codebase with no local-machine assumptions, ready to push.
**Verification:** `streamlit run app.py` still works locally; then follow Part 28's manual deployment steps (connecting the GitHub repo on Streamlit Community Cloud is a one-time manual action outside Antigravity).

### PHASE 12 — SIH polish & demo preparation
**Objective:** Final presentation-readiness pass — no new features, only clarity and robustness.

**Antigravity prompt:**
```
Inspect the whole project before making changes. Do not add any new features in this task —
only polish existing ones.

1. In app.py and pages/, review every user-facing text string (titles, button labels, error
   messages) and make sure they are clear and professional, with no leftover debug text or
   placeholder text like "TODO" or "test123".
2. Create pages/3_About.py: a static page summarizing the problem statement in plain
   language (I will provide the final wording — for now use the structure: Problem, Our
   Approach, Datasets Used, Algorithms Used, Key Metrics, Limitations), styled consistently
   with the rest of the app.
3. Double-check that if a demo pair or algorithm produces a poor result (e.g. low inlier
   count), the UI displays this honestly (e.g. a warning banner) rather than hiding it —
   we want to show real results, not force a fake "success" appearance.
4. Run the full test suite one final time and report the results.

Summarize every change you made as a bullet list I can review before I present this.
```
**Expected result:** A demo-ready application with an honest, judge-facing "About" page and clean UI copy.
**Verification:** Full manual click-through by every team member the night before the demo, plus a fresh `pytest tests/` run.
---

## 25. TESTING PLAN

**Manual testing (do this every time you change something, not just at the end):**
- Click through every page as if you were a judge who has never seen the app.
- Try every algorithm on every demo pair at least once.
- Try uploading your own image files (not just the bundled demo pairs) to catch upload-path bugs.

**Automated testing (`pytest tests/`, built up across Phases 4–10):**

| Layer | What to test |
|---|---|
| `io_utils.py` | Loading valid PNG/TIFF files; a missing file raises a clear error, not a crash |
| `preprocessing.py` | Each function returns correct shape/dtype; output visibly differs from input on a test image |
| `matchers.py` | Each algorithm returns a non-crashing result on a normal image pair; unsupported algorithm string raises a clear error |
| `ransac_filter.py` | Empty match list handled gracefully; grid-based spread logic actually reduces over-concentrated matches (test with a synthetic set of matches deliberately clustered in one corner) |
| `metrics.py` | RMSE computed correctly on a hand-constructed set of points with a known, calculable answer (write this test with numbers you compute by hand or with a simple script, not numbers you assume) |
| `pipeline.py` (end-to-end) | Full run on the synthetic pair (Phase 3) produces a low, plausible RMSE; full run on a real pair (once available) doesn't crash |

**Edge cases (formalized in Phase 10, Part 24):**
- Nonexistent file path
- Two completely unrelated images (no true overlap) — should degrade gracefully to "no reliable matches," not crash or silently report a fake success
- Unsupported algorithm name
- Empty match list into the filter step
- Very small images
- Very large images (confirm processing time stays reasonable — a few seconds, not minutes — on your actual demo-pair sizes; if it's slow, that's a legitimate finding to document, not something to hide)
- A source/reference pair with almost no illumination difference (should be "easy mode" — sanity check that results are at least as good as the harder cases)
- Network failure — irrelevant for the offline MVP (no external API calls), but relevant once deployed (see Deployment) — confirm the deployed app doesn't silently depend on any internet resource at request-time
- Missing/wrong sensor-pair selection — confirm the preprocessing recipe choice doesn't crash if the "wrong" sensor pair is picked for a given image (it may just give a worse result, which is acceptable and honestly reportable)

**How to know it "actually works," not just "looks good":** the synthetic validation pair (Phase 3) is your ground truth — because you know the exact transform you applied, a correct pipeline should recover a transform very close to it and report a low RMSE. If your synthetic-pair RMSE is unexpectedly high, something in your pipeline is genuinely broken, no matter how good the UI looks.

---

## 26. DEBUGGING GUIDE

Since you'll return to Antigravity repeatedly with errors, structure every debugging request like this:
1. Paste the **exact error message / traceback**, not a paraphrase.
2. State **what you expected** vs **what happened**.
3. Tell it **which file(s)** you believe are involved, if you have a guess (fine to say "not sure").
4. Ask it to **inspect before editing**, and to explain the root cause in plain English before fixing it, so you learn *why*, not just get a patched file.

**Common failure categories you'll likely hit, and where to look:**
- **"No matches found" / homography is None:** almost always a preprocessing problem (illumination difference too large for the chosen algorithm) or a genuinely non-overlapping image pair — check Phase 4/6 logic before assuming a bug in RANSAC.
- **Shape mismatch errors during warping:** source and reference weren't resampled to consistent, compatible sizes — check `load_and_resample()`.
- **Streamlit shows a raw traceback instead of your friendly error message:** you forgot to wrap that code path in the `try/except` pattern established in Phase 5's `run_pipeline()` — every new code path should route errors through the same `{"success": False, "error": ...}` structure.
- **Works locally, breaks when deployed:** almost always a hardcoded local path or a dependency missing from `requirements.txt` — this is exactly what Phase 11's deployment-readiness prompt checks for.

---

## 27. SECURITY

Realistic, scoped-to-this-project security concerns only:

| Concern | Relevant here? | What to do |
|---|---|---|
| API keys / secrets | Not for the MVP (no external APIs) | If you add any later (e.g. a map tile API), store in `.env`, never commit it, and confirm `.gitignore` excludes it |
| `.env` handling | Only relevant if/when you add Neon | Keep `.env.example` with variable *names* only (no real values) committed; keep the real `.env` local-only and in `.gitignore` |
| Authentication/authorization | Not needed — no user accounts, no private data | — |
| SQL injection | Not applicable in the MVP (no database); if you add Neon later, always use parameterized queries (e.g. via SQLAlchemy or `psycopg`'s query parameters), never string-formatted SQL | Ask Antigravity explicitly for "parameterized queries, not string formatting" when you add any DB code |
| File upload safety | Relevant — users can upload arbitrary files via Streamlit's uploader | Validate the uploaded file is actually a readable image (via Pillow/tifffile) before processing; set Streamlit's `maxUploadSize` in `.streamlit/config.toml` to a sane limit (e.g. 50 MB) to prevent someone uploading an enormous file that stalls the demo |
| Malicious input | Low risk (no code execution from user input, no shell commands built from user strings) | Keep it that way — never pass user-supplied filenames/strings into a shell command or `eval()` |
| Rate limiting | Not needed for a hackathon demo with a handful of concurrent judges | Revisit only under "Future Scalability" (Part 33) if ever deployed at real scale |
| Exposed secrets in a public GitHub repo | Real risk if you ever do add credentials | Always double-check `git log` and the repo's file list before making it public; if a secret is ever accidentally committed, treat it as compromised — rotate it, don't just delete the file |

---

## 28. DEPLOYMENT

**Local development vs production, explained simply:** locally, you run `streamlit run app.py` on your own laptop and only you can see it. "Production" here just means a hosted, public URL that a judge (or anyone) can open in their own browser without installing anything.

### Steps (Streamlit Community Cloud — primary recommendation)

1. Push your finished, tested code to GitHub (`git push`), including your `data/demo_pairs/` files.
2. Go to **share.streamlit.io**, sign in with your GitHub account.
3. Click "New app," select your `lunar-image-registration` repository, branch `main`, and set the main file path to `app.py`.
4. Click "Deploy." Streamlit Cloud will read `requirements.txt` and install everything automatically — no manual build commands needed.
5. Once deployed, you get a public URL like `https://<something>.streamlit.app` — this is what you share with judges.
6. **Environment variables/secrets:** if you added the optional Neon database later, set `DATABASE_URL` under the app's "Settings → Secrets" in the Streamlit Cloud dashboard (in TOML format) — never put it in your code or `requirements.txt`.

### Fallback: Hugging Face Spaces (use this if Streamlit Cloud struggles with heavier dependencies like `phasepack` or `rasterio`)

1. Create a free account at huggingface.co, create a new "Space," choose the **Streamlit** SDK.
2. Push the same GitHub repo's contents to the Space's own git remote (Hugging Face Spaces are themselves git repositories) or connect it to sync from GitHub.
3. It will build and host it similarly, with generally more generous build resources for heavier dependencies than Streamlit Cloud's free tier.

### Build/production configuration

- Pin exact package versions in `requirements.txt` (Phase 11 already checks this) so the deployed environment matches what you tested locally.
- Keep `data/demo_pairs/` small (a few MB total) so deploys stay fast and reliable — this is also good practice regardless of hosting platform.

---

## 29. FINAL DEMO FLOW

A good SIH demo tells a **story**, not just clicks through screens.

1. **Start from the real-world problem (30 seconds):** "ISRO has multiple lunar cameras — Chandrayaan-2's OHRC, TMC-2, IIRS — and needs to line their images up with reference missions like LRO. Doing this by hand is slow, and existing tools struggle when the sun angle or sensor type changes a lot." (Show one still image of a shadow-heavy lunar crater to make this visceral.)
2. **Introduce the user:** "Imagine an ISRO image analyst who needs to fuse this OHRC crater image with LRO's reference image of the same spot."
3. **Provide input, live:** Select a real demo pair in the app; show the two images looking visibly different (lighting, scale).
4. **Show system processing:** Click "Register," let the spinner show the real processing steps.
5. **Show intelligent functionality:** Point at the match-point scatter plot and specifically call out that matches are **spread across the image**, not clustered — tie this directly back to the problem statement's explicit requirement.
6. **Show output:** The warped/aligned image next to the reference — ideally with a checkerboard or slider overlay so the alignment is visually obvious.
7. **Show practical value with numbers, not adjectives:** Read out the actual RMSE, inlier count, and inlier ratio — real numbers, not "very accurate."
8. **Show measurable improvement:** Flip to the Algorithm Comparison page and show that your illumination-robust (`rift2`-style) method outperforms plain SIFT on the harder pair — this is your single strongest "we understood the actual challenge" moment.
9. **Show scalability/future potential:** Briefly mention Part 33 (more sensor pairs, SuperGlue mode, batch processing, Neon-backed shared history) as *deliberate, honest* next steps — not things you're pretending are already built.

---

## 30. SIH JUDGE PERSPECTIVE

**What will impress judges:**
- A working, live demo on real (not only synthetic) Chandrayaan-2 and LRO data.
- Explicitly engineering for the "uniform distribution" requirement most teams will overlook.
- Honest, real accuracy metrics with a synthetic ground-truth validation to back them up.
- Citing real prior work (the benchmark paper) and explaining how your approach relates to it, rather than claiming to have invented something out of nowhere.

**What's weak, and how to handle it honestly:**
- No full photogrammetric/orbital correction — say so directly; explain it's out of scope for a hackathon and describe how a production version would add it (Part 33).
- Limited real-data testing (a handful of curated pairs, not a global system) — frame this explicitly as a **prototype validated on representative cases**, not a production-ready global registration service.
- The `rift2` mode is a simplified reimplementation of the published idea, not the full original algorithm — say this proactively; judges respect precision about what was and wasn't fully implemented far more than vague claims.

**Technical claims that must be backed up, and how:**
- "Sub-pixel accuracy" → show the actual RMSE number on your synthetic ground-truth pair, and be clear about what the RMSE is on real pairs (it may be more than 1 pixel there — say so).
- "Generic solution" → show it working across at least two different sensor pairs (e.g., OHRC↔NAC and IIRS↔WAC), not just one hardcoded case.
- "Handles illumination variation" → the Algorithm Comparison page, showing `rift2` beating plain SIFT on your hardest real pair, is your evidence.

**What could look like a "fake AI feature":** if you only ever demo the synthetic pair, or only ever show one cherry-picked successful run — judges in a space-technology track are likely to ask pointed technical questions, so always have at least one real, harder pair ready and be willing to show a case where results are imperfect.

**What differentiates this from a basic CRUD app:** there is genuine, nontrivial algorithm engineering here (illumination-invariant feature matching, spatial-spread-aware outlier filtering, quantitative validation against a known ground truth) — make sure your presentation spends time on *this*, not just the UI.

**Innovation you can honestly claim:** the explicit, engineered enforcement of spatially-uniform match distribution (most public implementations of SIFT/RANSAC-based registration do not do this), and a working, benchmarked comparison across multiple lunar sensor pairs and multiple algorithms in one tool.

---

## 31. LIKELY JUDGE QUESTIONS + ANSWERS

**Q: Why did you choose this architecture (Streamlit, no separate backend/database)?**
- *Simple answer:* "Our core challenge is the image-matching algorithm, not building a distributed web system — so we kept the app to one simple, testable Python program and put our engineering effort into the actual registration accuracy."
- *Technical answer:* "The registration engine is a UI-independent Python package with its own test suite, so we can swap in a FastAPI backend or a database later without rewriting the core logic — we deliberately avoided premature infrastructure complexity."

**Q: Why this algorithm (RIFT2-style / phase congruency) and not just SIFT?**
- *Simple:* "SIFT looks at brightness patterns, which change a lot on the Moon depending on the sun's angle. Phase congruency looks at where shapes and edges line up, which stays similar even when brightness changes — so it handles the Moon's lighting problem better."
- *Technical:* "We reimplemented the core idea from Li et al.'s RIFT paper (IEEE TIP 2020) — detecting keypoints on a phase-congruency map instead of raw intensity gradients — as a simplified, from-scratch version, and validated it against SIFT/AKAZE baselines on the same image pairs."

**Q: Why not just use SuperGlue for everything, since it performed best in the published benchmark?**
- *Simple:* "It needs a GPU to run fast, it wasn't trained specifically on lunar images, and its official release has a non-commercial license — so we built it as an optional extra mode, not our core dependency."

**Q: Where does your data come from? Is it real ISRO data?**
- *Simple:* "Yes — we downloaded real Chandrayaan-2 [OHRC/TMC-2/IIRS] data from ISSDC's PRADAN portal and real LRO reference images from NASA's public LROC PDS archive, cropped to a shared region."
- *Technical:* Be ready to name the exact product IDs/region you used, and to explain that you used already-orthorectified/derived GeoTIFF products rather than raw PDS4 to avoid needing the full ISIS3 photogrammetric pipeline.

**Q: How accurate is it, really?**
- *Simple:* "On our synthetic test — where we know the exact right answer — our RMSE was [your real number] pixels. On real cross-mission data it was [your real number], which is honest and in the same range as classical methods in the published benchmark we compared against."
- Never state a number you haven't actually measured.

**Q: What happens when the input images don't actually overlap, or matching fails?**
- *Simple:* "We handle that explicitly — the app shows a clear message instead of a crash or a fake result." (Demo this live if asked — it's a strong trust-building moment.)

**Q: How does the database work? Why Neon/why not?**
- *Simple:* "We don't use a database in the current version — there's no data that genuinely needs to persist between sessions. We designed an optional run-history feature using Neon Postgres for a future, publicly-deployed version with shared results across users."

**Q: What happens if a required package/API fails?**
- *Simple:* "Every processing step is wrapped in error handling that reports a clear message instead of crashing the app; there are no external network calls in the core pipeline, so there's nothing to 'go down' during a live demo."

**Q: How can this scale to the whole Moon / production use?**
- See Part 33 — answer with the phased roadmap (batch processing, SPICE-based georeferencing, GPU-backed deep learning mode, cloud database), not a vague "it just scales."

**Q: How secure is it?**
- *Simple:* "There's no sensitive user data in this version, so the main things we handled were validating uploaded files and never hardcoding secrets — see our security section for what would need to be added for a production, multi-user deployment."

**Q: What is your actual innovation, compared to existing tools/research?**
- *Simple:* "We specifically engineered for the 'uniform distribution of matches' requirement in the problem statement — most general-purpose registration tools don't do this — and we built and benchmarked multiple lunar-specific matchers side by side in one usable tool, backed by a real, known-ground-truth validation method."

**Q: How is this better than the existing (manual/generic-tool) approach?**
- *Simple:* "It's automatic, it gives quantitative accuracy numbers instead of a human eyeballing alignment, and it's built specifically around the Moon's illumination and multimodal-sensor challenges rather than being a generic photo-stitching tool."

---

## 32. LIMITATIONS AND REALITY CHECK

**What our prototype can actually prove:**
- The chosen algorithms (SIFT/AKAZE baseline, phase-congruency-based `rift2` mode) can register real, curated Chandrayaan-2 ↔ LROC image crops of moderate difficulty, with measurable accuracy validated against a known synthetic ground truth.
- Enforcing spatial spread of matches is implementable and measurably changes match distribution.

**What it cannot prove:**
- Reliable performance across the *entire* lunar surface, all lighting conditions (especially permanently-shadowed polar regions), and all sensor combinations (we did not build DFSAR/radar support).
- Production-grade geodetic accuracy — we do not implement full orbital/pointing (SPICE-based) photogrammetric correction, which is what ISRO's actual operational pipeline would need.
- Long-term robustness at scale (thousands of image pairs, automated global mosaicking).

**Assumptions made, stated plainly:**
- Input image pairs roughly cover the same region already (we do not solve "find which reference image corresponds to this Chandrayaan-2 image" — a search/indexing problem of its own).
- Using already-orthorectified/derived GeoTIFF products where available, rather than working from raw PDS4 + ISIS3.

**What's simulated vs real:**
- The Phase-3 synthetic pair (known transform) is simulated, used purely for **validation**, and is clearly labeled as such in the app.
- Demo pairs under `ohrc_nac_crater_x/` (or similarly named folders) are real ISSDC/LROC data, cropped for demo size.

**Which parts use pretrained models / are placeholders:**
- The optional SuperGlue mode (if built) uses a pretrained, general-purpose (non-lunar-specific) checkpoint — flagged clearly in the UI as such.
- The `rift2` mode is our own simplified reimplementation of a published idea, not the original authors' code.

**What would require government/industry infrastructure for real production use:** full SPICE/orbital metadata integration, ISIS3-based calibration pipelines, access to the complete (not just curated-crop) mission archives, and compute infrastructure for global-scale batch processing — all explicitly out of scope, and we say so to judges rather than implying otherwise.

---

## 33. FUTURE SCALABILITY

**Prototype → Pilot:**
- Add SPICE-based georeferencing (via USGS's ISIS3 or the `spiceypy` Python bindings) to auto-locate the correct reference-image crop for a given Chandrayaan-2 image, instead of requiring manually pre-matched pairs.
- Expand the demo-pair library to dozens of real, diverse regions (equatorial and polar), and start tracking historical run results in Neon Postgres for multi-user comparison.

**Pilot → Production:**
- Move the registration engine behind a proper FastAPI backend with a task queue (e.g., for batch-processing many image pairs asynchronously) so the frontend isn't blocked waiting on long jobs.
- Add the DFSAR (radar) sensor pair, which needs specialized preprocessing distinct from the optical/hyperspectral cases we built.
- Introduce automated regression testing against a larger, curated ground-truth benchmark set (extending what Makharia et al.'s 2025 study started).

**Production → National/large-scale deployment:**
- GPU-backed infrastructure to run the SuperGlue-class deep-learning matcher at scale, potentially fine-tuned on lunar-specific data if ISRO curates a labeled training set (a genuine future research contribution, not something to claim as already done).
- Integration with ISRO's own data pipelines/PRADAN so registered products can flow directly back into ISRO's archive rather than being a standalone external tool.
- Standard production concerns at that scale: monitoring/logging, access control if the tool touches non-public data, and reliability engineering (retries, autoscaling) — none of which are meaningful to build before the core algorithm is proven, which is exactly why they're deferred here.

---

## 34. FINAL MASTER CHECKLIST

**Understanding**
- [ ] Problem explained in plain language to the whole team (Part 2)
- [ ] Primary user and MVP sentence agreed (Part 3)
- [ ] Inputs/outputs of the system are unambiguous (Part 8)

**Development**
- [ ] Python, Git, Antigravity installed and verified on every machine (Part 20)
- [ ] GitHub repository created and first push done (Part 21)
- [ ] Streamlit "hello world" running locally (Phase 2)
- [ ] Synthetic validation pair generated with known ground truth (Phase 3)
- [ ] Preprocessing module implemented and unit-tested (Phase 4)
- [ ] Baseline SIFT/AKAZE + RANSAC + metrics pipeline working end-to-end on synthetic data (Phase 5)
- [ ] Illumination-robust (`rift2`-style) matcher implemented and compared against baseline (Phase 6)
- [ ] Streamlit UI wired to the real pipeline (Phase 7)
- [ ] At least one real Chandrayaan-2 ↔ LROC pair integrated and tested (Phase 8)
- [ ] Algorithm-comparison page built (Phase 9)

**Data**
- [ ] Registered on ISSDC PRADAN and downloaded at least one real OHRC/TMC-2/IIRS product (Part 13)
- [ ] Downloaded at least one real LROC NAC/WAC (or SELENE) reference product (Part 13)
- [ ] Real data cropped to demo-appropriate size (Phase 8)
- [ ] Synthetic ground-truth validation set generated and used to report an objective accuracy number (Phase 3, Part 25)

**Quality**
- [ ] Edge cases (missing file, no-overlap images, bad algorithm name, empty matches, tiny image) all tested and handled gracefully (Phase 10, Part 25)
- [ ] Security basics checked: no secrets committed, upload size limited, no string-built SQL if a DB is added (Part 27)
- [ ] Performance is acceptable for a live demo (processing completes in a few seconds on your actual demo pairs)

**Deployment**
- [ ] App deployed publicly (Streamlit Community Cloud or Hugging Face Spaces) (Part 28)
- [ ] No hardcoded local file paths remain (Phase 11)
- [ ] Deployed version manually re-tested end-to-end, not just the local version

**SIH**
- [ ] Demo flow rehearsed start to finish, including at least one real (not only synthetic) pair (Part 29)
- [ ] Every team member can explain the architecture and why each technology was chosen (Parts 9–11)
- [ ] Judge Q&A answers prepared and rehearsed, with real (not invented) numbers ready to quote (Part 31)
- [ ] Limitations openly acknowledged and rehearsed as part of the pitch, not hidden (Part 32)
- [ ] Innovation claim (uniform-distribution enforcement + multi-sensor, multi-algorithm benchmarking tool) clearly and specifically articulated (Part 30)

---

## 35. FINAL RECOMMENDED BUILD ORDER

This is the safest sequence — it front-loads the riskiest technical unknown (does our matching/RANSAC/warping math actually work at all?) before investing in UI or real-data polish, and it never leaves you without *something* demoable if time runs out.

1. **Prove the concept first, cheaply:** synthetic validation pair with known ground truth (Phase 3) — if this doesn't work, nothing downstream will, and it's the fastest possible way to find out.
2. **Build the smallest real skeleton:** empty Streamlit app + repo structure (Phase 2) — do this *before or in parallel with* step 1, since it's nearly zero-risk and unblocks deployment testing early.
3. **Build the simplest functional core:** preprThe project includes a high-performance FastAPI service that wraps the Python `registration_engine` and provides RESTful endpoints consumed by the React/Vite web application.

### Installation

1. **Backend Dependencies**:
```bash
pip install -r requirements.txt
```

2. **Frontend Dependencies**:
```bash
cd frontend   # (or cd refer)
npm install
```

---

### Running the Full Stack for Local Development

To run the full stack locally, launch the backend and frontend servers in two separate terminal windows:

#### Terminal 1: Backend API (FastAPI)
Run the uvicorn development server from the repository root:
```bash
uvicorn backend.main:app --reload
```
- Server URL: `http://localhost:8000`
- Interactive OpenAPI / Swagger Docs: `http://localhost:8000/docs`

#### Terminal 2: Frontend Web Studio (Vite + React)
Navigate into the `frontend/` directory (or `refer/`) and start the Vite development server:
```bash
cd frontend
npm run dev
```
- Web Application URL: `http://localhost:3000`
- The frontend connects to the backend using `VITE_API_BASE_URL=http://localhost:8000` configured in `frontend/.env`.

---

### Key API Endpoints
1. **`GET /health`**: Health check status (`{"status": "ok"}`).
2. **`GET /demo-pairs`**: Returns available lunar demo pairs located in `data/demo_pairs/` with sensor metadata and asset endpoints.
3. **`GET /demo-pairs/{pair_id}/source`** & **`GET /demo-pairs/{pair_id}/reference`**: Serves raw satellite images for demo pairs.
4. **`POST /register`**: Accepts `source_image`, `reference_image` (multipart files), `sensor_pair`, and `algorithm` form parameters. Executes `registration_engine.pipeline.run_pipeline()` and returns the base64-encoded registered image, inlier match points with reprojection residuals, homography matrix, and quantitative metrics (RMSE, inliers, inlier ratio, distribution score, runtime).
5. **`POST /compare`**: Concurrently benchmarks multiple algorithms (`rift2`, `akaze`, `sift`) on the provided image pair and returns comparative performance metrics.
underlying registration actually produces a correct alignment. Everything in this build order exists to surface that risk on day 3, not day 20.

---

## 36. FASTAPI BACKEND API (`backend/main.py`)

The project includes a high-performance FastAPI service that wraps the Python `registration_engine` and provides RESTful endpoints consumed by the React/Vite web application.

### Installation
Ensure all backend dependencies are installed:
```bash
pip install -r requirements.txt
```

### Running the Backend Server
Start the backend with auto-reload:
```bash
uvicorn backend.main:app --reload --port 8000
```
The API documentation (Swagger UI) is automatically available at:
- `http://localhost:8000/docs`

### Key Endpoints
1. **`GET /health`**: Health check status (`{"status": "ok"}`).
2. **`GET /demo-pairs`**: Returns all available demo pairs located in `data/demo_pairs/` alongside sensor profiles and file endpoints.
3. **`GET /demo-pairs/{pair_id}/source`** & **`GET /demo-pairs/{pair_id}/reference`**: Serves raw satellite images for demo pairs.
4. **`POST /register`**: Accepts `source_image`, `reference_image` (multipart files), `sensor_pair`, and `algorithm` form parameters. Executes `registration_engine.pipeline.run_pipeline()` and returns the base64-encoded registered image, inlier match points with reprojection residuals, and quantitative metrics (RMSE, inliers, inlier ratio, distribution score, runtime).
5. **`POST /compare`**: Runs the pipeline across multiple algorithms (`rift2`, `akaze`, `sift`) and returns comparative benchmark telemetry.