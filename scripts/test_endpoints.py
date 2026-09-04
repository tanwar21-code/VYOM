import json
import os
import sys
from pathlib import Path
from starlette.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.main import app

client = TestClient(app)

print("=== 1. TESTING GET /health ===")
r_health = client.get("/health")
print("Status:", r_health.status_code)
print("Response:", r_health.json())

print("\n=== 2. TESTING GET /demo-pairs ===")
r_demo = client.get("/demo-pairs")
print("Status:", r_demo.status_code)
demo_pairs = r_demo.json()
print("Found pairs:", len(demo_pairs))
print(json.dumps(demo_pairs, indent=2))

print("\n=== 3. TESTING POST /register (SIFT) ===")
src_path = PROJECT_ROOT / "data" / "demo_pairs" / "ohrc_nac_crater_x" / "source.png"
ref_path = PROJECT_ROOT / "data" / "demo_pairs" / "ohrc_nac_crater_x" / "reference.png"

with open(src_path, "rb") as f_src, open(ref_path, "rb") as f_ref:
    files = {
        "source_image": ("source.png", f_src, "image/png"),
        "reference_image": ("reference.png", f_ref, "image/png")
    }
    data = {
        "sensor_pair": "OHRC -> LROC NAC",
        "algorithm": "sift"
    }
    r_reg = client.post("/register", files=files, data=data)
    print("Status:", r_reg.status_code)
    reg_json = r_reg.json()
    # Summarize large base64 image for clean console output
    summary = dict(reg_json)
    if summary.get("registered_image"):
        summary["registered_image"] = summary["registered_image"][:40] + "... [truncated]"
    if summary.get("registered_image_base64"):
        summary["registered_image_base64"] = summary["registered_image_base64"][:40] + "... [truncated]"
    if "matches" in summary:
        summary["matches_count"] = len(summary["matches"])
        summary["sample_matches"] = summary["matches"][:3]
        del summary["matches"]
    print(json.dumps(summary, indent=2))

print("\n=== 4. TESTING POST /compare ===")
with open(src_path, "rb") as f_src, open(ref_path, "rb") as f_ref:
    files = {
        "source_image": ("source.png", f_src, "image/png"),
        "reference_image": ("reference.png", f_ref, "image/png")
    }
    data = {
        "sensor_pair": "OHRC -> LROC NAC"
    }
    r_comp = client.post("/compare", files=files, data=data)
    print("Status:", r_comp.status_code)
    print(json.dumps(r_comp.json(), indent=2))

print("\n=== ALL BACKEND ENDPOINT TESTS COMPLETE ===")
