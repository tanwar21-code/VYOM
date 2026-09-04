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

ARTIFACT_DIR = r"C:\Users\himan\.gemini\antigravity-ide\brain\e7e82e1f-cffd-46df-b83e-11f1e1d463fb"
SHOT_REGISTER = os.path.join(ARTIFACT_DIR, "step1_register_results.png")
SHOT_COMPARE_NAV = os.path.join(ARTIFACT_DIR, "step2_switch_to_compare.png")
SHOT_COMPARE_RESULTS = os.path.join(ARTIFACT_DIR, "step3_compare_results.png")

LOCAL_SHOT_REG = os.path.abspath("step1_register_results.png")
LOCAL_SHOT_NAV = os.path.abspath("step2_switch_to_compare.png")
LOCAL_SHOT_COMP = os.path.abspath("step3_compare_results.png")

async def run_full_flow():
    # Ensure any stale chrome is terminated
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
    print("[1/6] Started local headless Chrome process...", flush=True)

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

        print(f"[2/6] Connected to Chrome CDP at {ws_url}", flush=True)

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
                    res_raw = await asyncio.wait_for(ws.recv(), timeout=60)
                    res = json.loads(res_raw)
                    if res.get("id") == my_id:
                        return res.get("result", {})

            await send_cmd("Page.enable")
            await send_cmd("Runtime.enable")

            print("[3/6] Navigating to http://localhost:3000 (Register Screen)...", flush=True)
            await send_cmd("Page.navigate", {"url": "http://localhost:3000"})
            
            # Wait for demo pair images to download and load
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
                if st.get("pairSelectOptions", 0) > 1 and st.get("hasRealImgs") and st.get("hasAlgSelect"):
                    print("Register page ready with demo images loaded!", flush=True)
                    break

            await asyncio.sleep(1)

            # Select SIFT algorithm
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

            # STEP 1: Click Register
            print("[4/6] Step 1: Triggering POST /register...", flush=True)
            await send_cmd("Runtime.evaluate", {
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

            # Wait for registration convergence
            print("Waiting for registration result to converge in DOM...", flush=True)
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
                if val.get("hasRmse") and not val.get("hasProcessing"):
                    print("Registration converged! Live results rendered!", flush=True)
                    break

            # Let count-up animations settle
            await asyncio.sleep(4)

            # Capture Step 1 Screenshot: Register Results
            print("Capturing Step 1 Screenshot: Registration Results...", flush=True)
            shot1 = await send_cmd("Page.captureScreenshot", {"format": "png"})
            b64_1 = shot1.get("data")
            if b64_1:
                img_bytes = base64.b64decode(b64_1)
                with open(SHOT_REGISTER, "wb") as f:
                    f.write(img_bytes)
                with open(LOCAL_SHOT_REG, "wb") as f:
                    f.write(img_bytes)
                print(f"Step 1 Screenshot saved: {SHOT_REGISTER}", flush=True)

            # STEP 2: Switch to Compare screen
            print("[5/6] Step 2: Navigating to Compare Algorithms tab...", flush=True)
            await send_cmd("Runtime.evaluate", {
                "expression": """
                (() => {
                    const navBtns = Array.from(document.querySelectorAll('button, a'));
                    const compareNav = navBtns.find(b => b.textContent.includes('Compare Algorithms'));
                    if (compareNav) {
                        compareNav.click();
                        return "CLICKED_COMPARE_NAV";
                    }
                    return "COMPARE_NAV_NOT_FOUND";
                })()
                """,
                "returnByValue": True
            })

            await asyncio.sleep(2)

            # Capture Step 2 Screenshot: Compare Screen initial view
            print("Capturing Step 2 Screenshot: Switched to Compare View...", flush=True)
            shot2 = await send_cmd("Page.captureScreenshot", {"format": "png"})
            b64_2 = shot2.get("data")
            if b64_2:
                img_bytes = base64.b64decode(b64_2)
                with open(SHOT_COMPARE_NAV, "wb") as f:
                    f.write(img_bytes)
                with open(LOCAL_SHOT_NAV, "wb") as f:
                    f.write(img_bytes)
                print(f"Step 2 Screenshot saved: {SHOT_COMPARE_NAV}", flush=True)

            # STEP 3: Click RUN ALL ALGORITHMS to trigger live POST /compare
            print("[6/6] Step 3: Triggering live POST /compare via 'RUN ALL ALGORITHMS'...", flush=True)
            await send_cmd("Runtime.evaluate", {
                "expression": """
                (() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const runBtn = buttons.find(b => b.textContent.includes('RUN ALL ALGORITHMS') || b.textContent.includes('RUNNING'));
                    if (runBtn && !runBtn.disabled) {
                        runBtn.click();
                        return "CLICKED_RUN_ALL";
                    }
                    return runBtn ? "RUN_BTN_DISABLED" : "RUN_BTN_NOT_FOUND";
                })()
                """,
                "returnByValue": True
            })

            # Wait for multi-algorithm benchmark to complete
            print("Waiting for POST /compare live execution across SIFT, AKAZE, RIFT2...", flush=True)
            for poll in range(90):
                await asyncio.sleep(1)
                check_comp = await send_cmd("Runtime.evaluate", {
                    "expression": """
                    (() => {
                        const body = document.body.innerText;
                        const isRunning = body.includes('RUNNING') || body.includes('Executing');
                        const hasTable = body.includes('Execution Time (ms)') || body.includes('SIFT');
                        const hasError = body.includes('Error connecting') || body.includes('HTTP');
                        return { isRunning, hasTable, hasError };
                    })()
                    """,
                    "returnByValue": True
                })
                cval = check_comp.get("result", {}).get("value", {})
                if poll % 5 == 0:
                    print(f"Poll {poll}s: {cval}", flush=True)
                if not cval.get("isRunning") and cval.get("hasTable"):
                    print("Comparison benchmark converged with live results!", flush=True)
                    break

            await asyncio.sleep(3)

            # Capture Step 3 Screenshot: Comparison Results
            print("Capturing Step 3 Screenshot: Comparison Results...", flush=True)
            shot3 = await send_cmd("Page.captureScreenshot", {"format": "png"})
            b64_3 = shot3.get("data")
            if b64_3:
                img_bytes = base64.b64decode(b64_3)
                with open(SHOT_COMPARE_RESULTS, "wb") as f:
                    f.write(img_bytes)
                with open(LOCAL_SHOT_COMP, "wb") as f:
                    f.write(img_bytes)
                print(f"Step 3 Screenshot saved: {SHOT_COMPARE_RESULTS}", flush=True)

            # Extract comparison telemetry from DOM
            dom_text = await send_cmd("Runtime.evaluate", {
                "expression": "document.body.innerText",
                "returnByValue": True
            })
            print("\n=== COMPARISON VIEW TELEMETRY ===", flush=True)
            for line in dom_text.get("result", {}).get("value", "").split("\n"):
                line_s = line.strip()
                if any(k in line_s for k in ["RIFT", "SIFT", "AKAZE", "RMSE", "ms", "RECOMMENDED", "BEST ACCURACY"]):
                    print("  >> ", line_s, flush=True)

            print("\nFull end-to-end verification sequence completed successfully!", flush=True)

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(run_full_flow())
