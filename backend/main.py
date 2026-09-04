"""FastAPI application wrapping the registration_engine for the VYOM lunar registration project."""

import os
import sys
from pathlib import Path
import tempfile
import base64
import time
import shutil
import cv2
import numpy as np
import concurrent.futures

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

# Ensure project root is on sys.path so registration_engine is importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from registration_engine.pipeline import run_pipeline
from registration_engine.matchers import SUPPORTED_ALGORITHMS

app = FastAPI(
    title="VYOM Lunar Image Registration API",
    description="Backend API wrapping registration_engine for multi-modal lunar image alignment.",
    version="1.0.0",
)

# Enable CORS for frontend development server (Vite on port 3000, 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = PROJECT_ROOT / "data" / "demo_pairs"

DEMO_METADATA = {
    "ohrc_nac_crater_x": {
        "title": "OHRC / LROC NAC Crater X (South Pole)",
        "source_sensor": "OHRC",
        "reference_sensor": "LROC NAC",
        "source_file": "source.png",
        "reference_file": "reference.png",
        "description": "High-latitude crater rim with extreme solar phase disparity (CH-2 OHRC 0.25m/px vs LRO NAC 0.50m/px).",
    },
    "synthetic_validation": {
        "title": "Synthetic Validation Pair",
        "source_sensor": "OHRC (Simulated)",
        "reference_sensor": "LROC NAC (Simulated)",
        "source_file": "source.png",
        "reference_file": "target.png",
        "description": "Controlled affine perspective transform with ground-truth verification.",
    },
}


def normalize_algorithm(algorithm: str) -> str:
    """Normalize human-readable algorithm name or ID into supported engine identifier."""
    alg_lower = (algorithm or "sift").strip().lower()
    if "rift" in alg_lower:
        return "rift2"
    if "akaze" in alg_lower:
        return "akaze"
    if "sift" in alg_lower:
        return "sift"
    if alg_lower in SUPPORTED_ALGORITHMS:
        return alg_lower
    return "sift"


@app.get("/health")
def health_check():
    """Health check endpoint confirming API availability."""
    return {"status": "ok", "service": "vyom-registration-backend", "timestamp": time.time()}


@app.get("/demo-pairs")
def get_demo_pairs():
    """Return available demo pair folders with sensor metadata and file information."""
    pairs = []
    if DATA_DIR.exists():
        for d in sorted(DATA_DIR.iterdir()):
            if d.is_dir() and not d.name.startswith("."):
                meta = DEMO_METADATA.get(d.name, {})
                files = [f.name for f in d.iterdir() if f.is_file() and not f.name.startswith(".")]

                source_file = meta.get("source_file")
                if not source_file:
                    for candidate in ["source.png", "source_ohrc.tif", "source.tif"]:
                        if (d / candidate).exists():
                            source_file = candidate
                            break

                ref_file = meta.get("reference_file")
                if not ref_file:
                    for candidate in ["reference.png", "target.png", "reference_nac.tif"]:
                        if (d / candidate).exists():
                            ref_file = candidate
                            break

                pairs.append({
                    "id": d.name,
                    "title": meta.get("title", d.name.replace("_", " ").title()),
                    "source_sensor": meta.get("source_sensor", "OHRC"),
                    "reference_sensor": meta.get("reference_sensor", "LROC NAC"),
                    "source_file": source_file,
                    "reference_file": ref_file,
                    "description": meta.get("description", "Multimodal lunar orbiter image pair."),
                    "files": files,
                    "source_url": f"/demo-pairs/{d.name}/source" if source_file else None,
                    "reference_url": f"/demo-pairs/{d.name}/reference" if ref_file else None,
                })
    return pairs


@app.get("/demo-pairs/{pair_id}/source")
def get_demo_source_image(pair_id: str):
    """Serve the source image file for a given demo pair."""
    pair_dir = DATA_DIR / pair_id
    if not pair_dir.exists():
        raise HTTPException(status_code=404, detail=f"Demo pair '{pair_id}' not found.")
    meta = DEMO_METADATA.get(pair_id, {})
    candidates = [meta.get("source_file"), "source.png", "source_ohrc.tif", "source.tif"]
    for c in candidates:
        if c and (pair_dir / c).exists():
            media_type = "image/tiff" if c.endswith((".tif", ".tiff")) else "image/png"
            return FileResponse(pair_dir / c, media_type=media_type)
    raise HTTPException(status_code=404, detail="Source image file not found in demo pair.")


@app.get("/demo-pairs/{pair_id}/reference")
def get_demo_reference_image(pair_id: str):
    """Serve the reference image file for a given demo pair."""
    pair_dir = DATA_DIR / pair_id
    if not pair_dir.exists():
        raise HTTPException(status_code=404, detail=f"Demo pair '{pair_id}' not found.")
    meta = DEMO_METADATA.get(pair_id, {})
    candidates = [meta.get("reference_file"), "reference.png", "target.png", "reference_nac.tif", "ref.png"]
    for c in candidates:
        if c and (pair_dir / c).exists():
            media_type = "image/tiff" if c.endswith((".tif", ".tiff")) else "image/png"
            return FileResponse(pair_dir / c, media_type=media_type)
    raise HTTPException(status_code=404, detail="Reference image file not found in demo pair.")


@app.post("/register")
def register_images(
    source_image: UploadFile = File(...),
    reference_image: UploadFile = File(...),
    sensor_pair: str = Form("OHRC -> LROC NAC"),
    algorithm: str = Form("sift"),
):
    """Register source image onto reference image using registration_engine pipeline.

    Returns JSON containing:
      - success (bool)
      - registered_image (base64 data URL)
      - registered_image_base64 (raw base64 string)
      - matches (list of tie-points with coordinates and residuals)
      - metrics (dict of RMSE, inliers, ratio, distribution score, runtime)
      - transform_matrix (3x3 homography matrix)
      - algorithm (normalized algorithm used)
      - error (error message if failed)
    """
    normalized_alg = normalize_algorithm(algorithm)

    with tempfile.TemporaryDirectory() as tmpdir:
        src_ext = Path(source_image.filename or "source.png").suffix or ".png"
        ref_ext = Path(reference_image.filename or "reference.png").suffix or ".png"

        src_path = os.path.join(tmpdir, f"source{src_ext}")
        ref_path = os.path.join(tmpdir, f"reference{ref_ext}")

        with open(src_path, "wb") as f_src:
            shutil.copyfileobj(source_image.file, f_src)

        with open(ref_path, "wb") as f_ref:
            shutil.copyfileobj(reference_image.file, f_ref)

        result = run_pipeline(src_path, ref_path, algorithm=normalized_alg)

        if not result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": False,
                    "algorithm": normalized_alg,
                    "sensor_pair": sensor_pair,
                    "registered_image": None,
                    "registered_image_base64": None,
                    "matches": [],
                    "metrics": None,
                    "transform_matrix": None,
                    "error": result.get("error", "Registration pipeline failed to align images."),
                },
            )

        # Encode warped image to PNG base64
        warped_img = result["warped_image"]
        registered_b64 = None
        registered_data_url = None
        if warped_img is not None and isinstance(warped_img, np.ndarray):
            encode_success, buffer = cv2.imencode(".png", warped_img)
            if encode_success:
                registered_b64 = base64.b64encode(buffer).decode("utf-8")
                registered_data_url = f"data:image/png;base64,{registered_b64}"

        # Format matches with coordinate mappings and reprojection residual
        good_matches = result["matches"] or []
        kp_source = result["kp_source"] or []
        kp_reference = result["kp_reference"] or []
        transform_matrix = result["transform_matrix"]

        formatted_matches = []
        if good_matches and kp_source and kp_reference and transform_matrix is not None:
            try:
                src_pts = np.float32([kp_source[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                ref_pts = np.float32([kp_reference[m.trainIdx].pt for m in good_matches])
                projected = cv2.perspectiveTransform(src_pts, transform_matrix).reshape(-1, 2)
                residuals = np.sqrt(np.sum((projected - ref_pts) ** 2, axis=1))

                for i, (m, res) in enumerate(zip(good_matches, residuals)):
                    sx, sy = kp_source[m.queryIdx].pt
                    rx, ry = kp_reference[m.trainIdx].pt
                    formatted_matches.append({
                        "id": f"KP-{1000 + i}",
                        "x": round(float(sx), 2),
                        "y": round(float(sy), 2),
                        "refX": round(float(rx), 2),
                        "refY": round(float(ry), 2),
                        "dx": round(float(rx - sx), 2),
                        "dy": round(float(ry - sy), 2),
                        "residual": round(float(res), 2),
                        "confidence": round(float(max(0.05, min(0.99, 1.0 - (m.distance / 250.0)))), 2)
                        if m.distance > 0 else 0.88,
                    })
            except Exception as e:
                # Fallback format if perspective projection fails on points
                for i, m in enumerate(good_matches):
                    sx, sy = kp_source[m.queryIdx].pt
                    rx, ry = kp_reference[m.trainIdx].pt
                    formatted_matches.append({
                        "id": f"KP-{1000 + i}",
                        "x": round(float(sx), 2),
                        "y": round(float(sy), 2),
                        "refX": round(float(rx), 2),
                        "refY": round(float(ry), 2),
                        "dx": round(float(rx - sx), 2),
                        "dy": round(float(ry - sy), 2),
                        "residual": 0.0,
                        "confidence": 0.85,
                    })

        matrix_list = (
            transform_matrix.tolist() if isinstance(transform_matrix, np.ndarray) else None
        )

        return {
            "success": True,
            "algorithm": normalized_alg,
            "sensor_pair": sensor_pair,
            "registered_image": registered_data_url,
            "registered_image_base64": registered_b64,
            "matches": formatted_matches,
            "metrics": result["metrics"],
            "transform_matrix": matrix_list,
            "error": None,
        }


@app.post("/compare")
def compare_algorithms(
    source_image: UploadFile = File(...),
    reference_image: UploadFile = File(...),
    sensor_pair: str = Form("OHRC -> LROC NAC"),
):
    """Run registration pipeline across multiple algorithms and return comparative benchmarks."""
    eval_algorithms = [
        {"id": "rift2", "name": "RIFT2-style (Phase Congruency)", "tag": "RECOMMENDED", "engine": "Phase Congruency + Max Moments"},
        {"id": "akaze", "name": "AKAZE", "tag": "NON-LINEAR", "engine": "Fast Explicit Diffusion (FED)"},
        {"id": "sift", "name": "SIFT", "tag": "CLASSICAL", "engine": "Difference of Gaussians (DoG)"},
    ]

    with tempfile.TemporaryDirectory() as tmpdir:
        src_ext = Path(source_image.filename or "source.png").suffix or ".png"
        ref_ext = Path(reference_image.filename or "reference.png").suffix or ".png"

        src_path = os.path.join(tmpdir, f"source{src_ext}")
        ref_path = os.path.join(tmpdir, f"reference{ref_ext}")

        with open(src_path, "wb") as f_src:
            shutil.copyfileobj(source_image.file, f_src)

        with open(ref_path, "wb") as f_ref:
            shutil.copyfileobj(reference_image.file, f_ref)

        def eval_single(item):
            alg_id = item["id"]
            pipe_res = run_pipeline(src_path, ref_path, algorithm=alg_id)

            if pipe_res["success"] and pipe_res["metrics"]:
                m = pipe_res["metrics"]
                return {
                    "id": alg_id,
                    "name": item["name"],
                    "tag": item["tag"],
                    "engine": item["engine"],
                    "success": True,
                    "rmse": round(float(m["rmse"]), 2),
                    "inliers": int(m["inlier_count"]),
                    "ratio": round(float(m["inlier_ratio"] * 100), 1),
                    "score": round(float(m["distribution_score"]), 2),
                    "runtime": round(float(m.get("runtime", 0.0)), 2),
                    "metrics": m,
                    "error": None,
                }
            else:
                return {
                    "id": alg_id,
                    "name": item["name"],
                    "tag": item["tag"],
                    "engine": item["engine"],
                    "success": False,
                    "rmse": None,
                    "inliers": 0,
                    "ratio": 0.0,
                    "score": 0.0,
                    "runtime": 0.0,
                    "metrics": None,
                    "error": pipe_res.get("error", "Failed to compute inliers."),
                }

        with concurrent.futures.ThreadPoolExecutor(max_workers=len(eval_algorithms)) as executor:
            results = list(executor.map(eval_single, eval_algorithms))

    # Flag best performance attributes among successful algorithms
    successful = [r for r in results if r["success"] and r["rmse"] is not None]
    if successful:
        best_rmse = min(r["rmse"] for r in successful)
        best_inliers = max(r["inliers"] for r in successful)
        best_ratio = max(r["ratio"] for r in successful)
        best_score = max(r["score"] for r in successful)
        best_runtime = min(r["runtime"] for r in successful)

        for r in results:
            if r["success"]:
                r["isBestRmse"] = (r["rmse"] == best_rmse)
                r["isBestInliers"] = (r["inliers"] == best_inliers)
                r["isBestRatio"] = (r["ratio"] == best_ratio)
                r["isBestScore"] = (r["score"] == best_score)
                r["isBestRuntime"] = (r["runtime"] == best_runtime)

    return {
        "sensor_pair": sensor_pair,
        "results": results,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
