"""
updater.py — Auto-update system for Focus Mode

Checks GitHub Releases for a newer version, downloads the new exe,
and swaps it in using a batch script (since a running exe can't
overwrite/delete itself on Windows).

Integration:
    from updater import check_for_update, download_and_apply_update

    latest_version, download_url = check_for_update()
    if latest_version:
        # show a prompt / tray notification to the user
        download_and_apply_update(download_url)
"""

import os
import sys
import subprocess
import requests

# ---- CONFIG: update these for your repo ----
GITHUB_REPO = "Purple2Blue/NO-DISTRACTION"   # change to your actual repo path
CURRENT_VERSION = "2.0.0"                  # bump this every release
# ---------------------------------------------

API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"


def _normalize(v: str) -> str:
    """Strip leading 'v' and whitespace so '2.0.0' == 'v2.0.0'."""
    return v.strip().lstrip("vV")


def check_for_update():
    """
    Returns (latest_version, download_url) if a newer version exists,
    otherwise (None, None). Fails silently (returns None, None) on any
    network error so the app never crashes due to a failed update check.
    """
    try:
        resp = requests.get(API_URL, timeout=6)
        resp.raise_for_status()
        data = resp.json()

        latest_version = _normalize(data.get("tag_name", ""))
        current_version = _normalize(CURRENT_VERSION)

        if not latest_version or latest_version == current_version:
            return None, None

        # simple string comparison works for x.y.z as long as you're consistent;
        # for real semver comparison see the note at the bottom of this file
        if _version_tuple(latest_version) <= _version_tuple(current_version):
            return None, None

        assets = data.get("assets", [])
        exe_asset = next(
            (a for a in assets if a["name"].lower().endswith(".exe")), None
        )
        if not exe_asset:
            return None, None

        return latest_version, exe_asset["browser_download_url"]

    except Exception as e:
        print(f"[updater] check failed: {e}")
        return None, None


def _version_tuple(v: str):
    """Convert '2.10.1' -> (2, 10, 1) for proper numeric comparison."""
    parts = []
    for p in v.split("."):
        digits = "".join(ch for ch in p if ch.isdigit())
        parts.append(int(digits) if digits else 0)
    return tuple(parts)


def download_and_apply_update(download_url: str, exe_name: str = "FocusMode.exe"):
    """
    Downloads the new exe next to the current one, writes a batch script
    that waits for this process to exit, swaps the files, relaunches the
    app, then deletes itself. Call sys.exit() / os._exit() right after this.
    """
    current_exe = sys.executable  # path to the currently running exe
    app_dir = os.path.dirname(current_exe)
    new_exe_path = os.path.join(app_dir, "FocusMode_new.exe")
    bat_path = os.path.join(app_dir, "_update.bat")

    print("[updater] downloading update...")
    with requests.get(download_url, stream=True, timeout=30) as r:
        r.raise_for_status()
        with open(new_exe_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)

    bat_contents = f"""@echo off
:wait_loop
tasklist /FI "IMAGENAME eq {exe_name}" 2>NUL | find /I "{exe_name}" >NUL
if "%ERRORLEVEL%"=="0" (
    timeout /t 1 /nobreak > nul
    goto wait_loop
)
del "{current_exe}"
ren "{new_exe_path}" "{exe_name}"
start "" "{current_exe}"
del "%~f0"
"""
    with open(bat_path, "w") as f:
        f.write(bat_contents)

    # launch the updater script detached from this process, then exit
    subprocess.Popen(
        ["cmd", "/c", bat_path],
        creationflags=subprocess.CREATE_NEW_CONSOLE | subprocess.DETACHED_PROCESS,
        cwd=app_dir,
    )
    sys.exit(0)


# NOTE on versioning:
# Keep CURRENT_VERSION in this file in sync with the git tag you push
# (e.g. tag "v2.1.0" -> CURRENT_VERSION = "2.1.0"). Easiest to bump this
# as the very first step of your release checklist, before building the exe.