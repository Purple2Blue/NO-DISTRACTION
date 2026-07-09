import json
import os
import subprocess
import sys
import ctypes
import threading

import pystray
import webview
from PIL import Image

if __package__ in (None, ""):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api import FocusApi
from updater import check_for_update, download_and_apply_update


def get_base_path():
    """Works both when run as a plain script and when bundled by PyInstaller."""
    if getattr(sys, "frozen", False):
        return sys._MEIPASS

    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_frontend_path():
    return os.path.join(get_base_path(), "frontend", "index.html")


def get_icon_path():
    return os.path.join(get_base_path(), "assets", "icon.ico")


def is_running_as_admin():
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except OSError:
        return False


def relaunch_as_admin():
    if getattr(sys, "frozen", False):
        executable = sys.executable
        params = subprocess.list2cmdline(sys.argv[1:])
        cwd = os.path.dirname(sys.executable)
    else:
        executable = sys.executable
        params = subprocess.list2cmdline(["-m", "backend.app", *sys.argv[1:]])
        cwd = get_base_path()

    result = ctypes.windll.shell32.ShellExecuteW(
        None,
        "runas",
        executable,
        params,
        cwd,
        1,
    )
    return result > 32


class FocusModeApp:
    def __init__(self):
        self.api = FocusApi()
        self.window = None
        self.tray_icon = None
        self.is_quitting = False
        self._pending_update_url = None
        self.api.on_update_requested = self.start_update_from_frontend

    def create_window(self):
        # Added text_select=False and easy_drag=False to secure the UI,
        # preventing users from highlighting text or revealing underlying web mechanics.
        self.window = webview.create_window(
            title="Focus Mode",
            url=get_frontend_path(),
            js_api=self.api,
            width=600,
            height=780,
            resizable=True,
            min_size=(460, 620),
            text_select=False,
            easy_drag=False
        )
        self.window.events.closing += self.on_window_closing

    def create_tray_icon(self):
        image = Image.open(get_icon_path())
        menu = pystray.Menu(
            pystray.MenuItem("Open Focus Mode", self.show_window, default=True),
            pystray.MenuItem("Check for Updates", self.on_check_for_updates_clicked),
            pystray.MenuItem("Quit", self.quit_app),
        )
        self.tray_icon = pystray.Icon("FocusMode", image, "Focus Mode", menu)
        self.tray_icon.run_detached()

    def show_window(self, icon=None, item=None):
        if self.window:
            self.window.show()
            self.window.restore()
            self.refresh_frontend()

    def refresh_frontend(self):
        if self.window:
            state_json = json.dumps(self.api.get_initial_state())
            self.window.evaluate_js(f"renderState({state_json})")

    def on_window_closing(self):
        # In pywebview closing handlers, returning False cancels the native close.
        if self.is_quitting:
            return True

        result = self.api.turn_off_focus_mode()
        if not result["success"]:
            self.window.create_confirmation_dialog(
                "Focus Mode",
                "Could not turn off Focus Mode. Please run the app as Administrator.",
            )
            return False

        if self.window:
            self.window.hide()
        return False

    def quit_app(self, icon=None, item=None):
        self.is_quitting = True
        result = self.api.turn_off_focus_mode()
        if not result["success"]:
            self.is_quitting = False
            self.show_window()
            if self.window:
                self.window.create_confirmation_dialog(
                    "Focus Mode",
                    "Could not turn off Focus Mode. Please run the app as Administrator.",
                )
            return

        if self.tray_icon:
            self.tray_icon.stop()
        if self.window:
            self.window.destroy()

    # ------------------------------------------------------------------
    # Auto-update
    # ------------------------------------------------------------------

    def check_for_updates_on_startup(self):
        """Silent, non-blocking check. Shows the in-app banner (and a tray
        notification as backup) — doesn't auto-download, so the user isn't
        surprised by a restart they didn't ask for."""
        def _worker():
            try:
                latest_version, download_url = check_for_update()
                if latest_version:
                    self._pending_update_url = download_url
                    if self.window:
                        self.window.evaluate_js(f"showUpdateBanner('{latest_version}')")
                    if self.tray_icon:
                        try:
                            self.tray_icon.notify(
                                f"Focus Mode {latest_version} is available.",
                                title="Update available",
                            )
                        except Exception:
                            pass
            except Exception:
                pass
        threading.Thread(target=_worker, daemon=True).start()

    def on_check_for_updates_clicked(self, icon=None, item=None):
        """Manual check from the tray menu. This one does download + install,
        since clicking it is explicit user intent."""
        def _worker():
            try:
                # reuse a pending url from the startup check if we already found one,
                # otherwise check again in case the user hasn't restarted since then
                download_url = self._pending_update_url
                latest_version = None
                if not download_url:
                    latest_version, download_url = check_for_update()

                if not download_url:
                    if self.tray_icon:
                        try:
                            self.tray_icon.notify(
                                "You're already on the latest version.", title="Focus Mode"
                            )
                        except Exception:
                            pass
                    return

                if self.tray_icon:
                    try:
                        self.tray_icon.notify(
                            "Downloading update... Focus Mode will restart shortly.",
                            title="Focus Mode",
                        )
                    except Exception:
                        pass
                self._shutdown_and_apply_update(download_url)
            except Exception:
                if self.tray_icon:
                    try:
                        self.tray_icon.notify(
                            "Update failed. Please try again later.",
                            title="Focus Mode",
                        )
                    except Exception:
                        pass

        threading.Thread(target=_worker, daemon=True).start()

    def start_update_from_frontend(self):
        """Called via self.api.on_update_requested when the user clicks
        'Update Now' in the app window."""
        try:
            download_url = self._pending_update_url
            if not download_url:
                latest_version, download_url = check_for_update()
                if not download_url:
                    return {"success": False, "error": "No update available"}

            self._shutdown_and_apply_update(download_url)
            return {"success": True}
        except Exception:
            self.is_quitting = False
            return {"success": False, "error": "Update download failed. Please try again."}

    def _shutdown_and_apply_update(self, download_url):
        """Cleanly turns off hosts-file blocking, downloads the replacement exe,
        then lets the updater process terminate and swap the app."""
        self.is_quitting = True
        result = self.api.turn_off_focus_mode()
        if not result["success"]:
            # don't proceed with the update if we can't safely clean up
            self.is_quitting = False
            if self.tray_icon:
                self.tray_icon.notify(
                    "Couldn't safely close Focus Mode for the update. "
                    "Please run as Administrator and try again.",
                    title="Update failed",
                )
            return

        exe_name = os.path.basename(sys.executable)
        download_and_apply_update(download_url, exe_name=exe_name)


def main():
    if not is_running_as_admin():
        relaunch_as_admin()
        return

    app = FocusModeApp()
    app.create_window()
    app.create_tray_icon()
    app.check_for_updates_on_startup()

    # Explicitly forced debug=False to completely disable Chromium DevTools,
    # ensuring right-clicking the window won't bring up the inspection panels.
    webview.start(debug=False, icon=get_icon_path())


if __name__ == "__main__":
    main()
