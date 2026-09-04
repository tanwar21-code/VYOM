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
OUTPUT_SHOT = os.path.abspath("about_screen_verified.png")
ARTIFACT_SHOT = r"C:\Users\himan\.gemini\antigravity-ide\brain\e7e82e1f-cffd-46df-b83e-11f1e1d463fb\about_screen_verified.png"

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
        "--window-size=1560,1200",
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
            await asyncio.sleep(2)

            # Click About tab in sidebar
            print("Clicking About tab in sidebar...", flush=True)
            await send_cmd("Runtime.evaluate", {
                "expression": """
                (() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const aboutBtn = buttons.find(b => b.textContent.includes('About'));
                    if (aboutBtn) {
                        aboutBtn.click();
                        return "CLICKED_ABOUT";
                    }
                    return "ABOUT_BTN_NOT_FOUND";
                })()
                """,
                "returnByValue": True
            })

            await asyncio.sleep(2)

            # Capture screenshot
            print("Capturing About screen screenshot...", flush=True)
            shot = await send_cmd("Page.captureScreenshot", {"format": "png"})
            b64_data = shot.get("data")
            if b64_data:
                img_bytes = base64.b64decode(b64_data)
                for out_path in [OUTPUT_SHOT, ARTIFACT_SHOT]:
                    with open(out_path, "wb") as f:
                        f.write(img_bytes)
                print(f"Screenshots saved to {OUTPUT_SHOT} and {ARTIFACT_SHOT}", flush=True)

            # Extract displayed metrics text
            dom_text = await send_cmd("Runtime.evaluate", {
                "expression": "document.body.innerText",
                "returnByValue": True
            })
            print("\n=== ABOUT SCREEN TEXT SUMMARY ===\n", flush=True)
            lines = dom_text.get("result", {}).get("value", "").split("\n")
            for line in lines:
                line_s = line.strip()
                if any(k in line_s for k in ["SUB-PIXEL", "0.82", "8.3%", "2.78", "INLIER", "CONVERGENCE", "AKAZE", "RIFT2", "SIFT"]):
                    print("  >> ", line_s, flush=True)

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(run_cdp())
