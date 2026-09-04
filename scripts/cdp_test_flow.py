import asyncio
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request
import websockets

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9222
USER_DATA_DIR = os.path.abspath("chrome_profile_tmp")
OUTPUT_SHOT = os.path.abspath("live_registration_success.png")
ARTIFACT_SHOT = r"C:\Users\himan\OneDrive\Desktop\SIH 2026\VYOM\VYOM\artifacts_screenshot.png"
BRAIN_SHOT = r"C:\Users\himan\.gemini\antigravity-ide\brain\e7e82e1f-cffd-46df-b83e-11f1e1d463fb\live_registration_success.png"

async def run_cdp():
    subprocess.run(["powershell", "-Command", "Get-Process -Name chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"], capture_output=True)
    time.sleep(1)

    cmd = [
        CHROME_PATH,
        f"--remote-debugging-port={PORT}",
        f"--user-data-dir={USER_DATA_DIR}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=1600,1200",
        "about:blank"
    ]
    proc = subprocess.Popen(cmd)
    print("Started Chrome process...", flush=True)

    try:
        ws_url = None
        for _ in range(25):
            time.sleep(0.5)
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version", timeout=1) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    ws_url = data.get("webSocketDebuggerUrl")
                    if ws_url:
                        break
            except Exception:
                pass

        if not ws_url:
            raise RuntimeError("Failed to connect to Chrome debugging port")

        print(f"Connected to Chrome CDP at {ws_url}", flush=True)

        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list", timeout=1) as resp:
            pages = json.loads(resp.read().decode("utf-8"))
            page_ws = pages[0]["webSocketDebuggerUrl"]

        async with websockets.connect(page_ws, max_size=50*1024*1024) as ws:
            msg_id = 0

            async def send_cmd(method, params=None):
                nonlocal msg_id
                msg_id += 1
                my_id = msg_id
                payload = {"id": my_id, "method": method, "params": params or {}}
                await ws.send(json.dumps(payload))
                while True:
                    res_raw = await asyncio.wait_for(ws.recv(), timeout=20)
                    res = json.loads(res_raw)
                    if res.get("id") == my_id:
                        return res.get("result", {})

            await send_cmd("Page.enable")
            await send_cmd("Runtime.enable")

            print("Navigating to http://localhost:3000...", flush=True)
            await send_cmd("Page.navigate", {"url": "http://localhost:3000"})
            
            # Wait for demo pair and images to finish loading
            print("Waiting for demo pair images to download and load...", flush=True)
            for attempt in range(25):
                await asyncio.sleep(1)
                eval_res = await send_cmd("Runtime.evaluate", {
                    "expression": """
                    (() => {
                        const selects = Array.from(document.querySelectorAll('select'));
                        const pairSelect = selects[0];
                        const algSelect = selects.find(s => Array.from(s.options).some(o => o.value.includes('SIFT')));
                        const imgs = Array.from(document.querySelectorAll('img'));
                        const hasRealImgs = imgs.some(i => i.src && (i.src.includes('blob:') || i.src.includes('http')));
                        return {
                            pairSelectOptions: pairSelect ? pairSelect.options.length : 0,
                            hasAlgSelect: !!algSelect,
                            hasRealImgs,
                            imgCount: imgs.length
                        };
                    })()
                    """,
                    "returnByValue": True
                })
                st = eval_res.get("result", {}).get("value", {})
                print(f"Attempt {attempt}: {st}", flush=True)
                if st.get("pairSelectOptions", 0) > 1 and st.get("hasRealImgs") and st.get("hasAlgSelect"):
                    print("Page ready with loaded demo images!", flush=True)
                    break

            await asyncio.sleep(1)

            # Select SIFT algorithm for fast, reliable verification
            print("Selecting SIFT algorithm...", flush=True)
            await send_cmd("Runtime.evaluate", {
                "expression": """
                (() => {
                    const selects = Array.from(document.querySelectorAll('select'));
                    const algSelect = selects.find(s => Array.from(s.options).some(o => o.value.includes('SIFT')));
                    if (algSelect) {
                        algSelect.value = 'SIFT (Scale-Invariant Feature Transform)';
                        algSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        return 'SIFT_SELECTED';
                    }
                    return 'ALG_SELECT_NOT_FOUND';
                })()
                """,
                "returnByValue": True
            })

            await asyncio.sleep(1)

            # Click the Register button
            print("Clicking REGISTER IMAGES...", flush=True)
            click_res = await send_cmd("Runtime.evaluate", {
                "expression": """
                (() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const regBtn = buttons.find(b => b.textContent.includes('REGISTER IMAGES'));
                    if (regBtn && !regBtn.disabled) {
                        regBtn.click();
                        return "CLICKED_SUCCESS";
                    }
                    return regBtn ? "BTN_DISABLED" : "BTN_NOT_FOUND";
                })()
                """,
                "returnByValue": True
            })
            print(f"Click response: {click_res.get('result', {}).get('value')}", flush=True)

            # Wait for registration result to converge in DOM
            print("Waiting for registration result to converge in DOM...", flush=True)
            converged = False
            for poll in range(40):
                await asyncio.sleep(1)
                check_res = await send_cmd("Runtime.evaluate", {
                    "expression": """
                    (() => {
                        const body = document.body.innerText;
                        const hasRmse = body.includes('RMSE (Pixel)');
                        const hasInliers = body.includes('Inlier Count');
                        const hasProcessing = body.includes('SOLVING CORRESPONDENCES');
                        const hasError = body.includes('REGISTRATION ANOMALY');
                        return { hasRmse, hasInliers, hasProcessing, hasError };
                    })()
                    """,
                    "returnByValue": True
                })
                val = check_res.get("result", {}).get("value", {})
                print(f"Poll {poll}: {val}", flush=True)
                if val.get("hasRmse") and not val.get("hasProcessing"):
                    print("Registration converged! Results and telemetry tiles are rendered!", flush=True)
                    converged = True
                    break
                if val.get("hasError"):
                    print("Registration returned error banner:", val, flush=True)
                    break

            # Wait 4 seconds for count-up numbers and radar animations to finish animating
            print("Allowing animations to settle completely...", flush=True)
            await asyncio.sleep(4)

            # Capture viewport screenshot
            print("Capturing converged results screenshot...", flush=True)
            shot = await send_cmd("Page.captureScreenshot", {"format": "png"})
            b64_data = shot.get("data")
            if b64_data:
                img_bytes = base64.b64decode(b64_data)
                for out_path in [OUTPUT_SHOT, ARTIFACT_SHOT, BRAIN_SHOT]:
                    with open(out_path, "wb") as f:
                        f.write(img_bytes)
                print(f"Screenshots written to:\n- {OUTPUT_SHOT}\n- {ARTIFACT_SHOT}\n- {BRAIN_SHOT}", flush=True)

            # Extract displayed metrics from page
            metrics_summary = await send_cmd("Runtime.evaluate", {
                "expression": """
                (() => {
                    const text = document.body.innerText;
                    return text;
                })()
                """,
                "returnByValue": True
            })
            print("\n=== DOM METRICS SUMMARY ===\n", flush=True)
            full_text = metrics_summary.get("result", {}).get("value", "")
            for line in full_text.split("\n"):
                line_s = line.strip()
                if any(k in line_s for k in ["RMSE", "Inlier", "Dispersion", "Registration", "TIE-POINT", "CONVERGED", "HOMOGRAPHY"]):
                    print("  >> ", line_s, flush=True)

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(run_cdp())
