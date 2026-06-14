import requests
import os
import sys
import customtkinter as ctk
from PIL import Image
from io import BytesIO
import blocker
import pystray
import threading

# ── Palette ──────────────────────────────────────────────────────────────────
BG          = "#0d0d0d"
SURFACE     = "#1a1a1a"
CARD        = "#1e1e1e"
ACCENT      = "#0078ff"
ACCENT_HOVER = "#0066dd"
TEXT        = "#ffffff"
TEXT_MUTED  = "#666666"
TEXT_SECONDARY = "#999999"
DANGER      = "#ff4444"
DANGER_HOVER = "#cc3333"
SUCCESS     = "#22c55e"
WARNING     = "#f59e0b"

favicon_cache = {}


def resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


def get_favicon(url):
    if url in favicon_cache:
        return favicon_cache[url]
    try:
        favicon_url = f"https://www.google.com/s2/favicons?domain={url}&sz=32"
        response = requests.get(favicon_url, timeout=5)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        photo = ctk.CTkImage(image, size=(28, 28))
        favicon_cache[url] = photo
        return photo
    except Exception as e:
        print(f"Error fetching favicon: {e}")
        return None


ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")


class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.data = blocker.load_json()
        self._syncing = False
        self.title("Focus Mode")
        self.iconbitmap(resource_path("assets/icon.ico"))
        self.geometry("520x760")
        self.minsize(480, 600)
        self.configure(fg_color=BG)

        # ── Header ───────────────────────────────────────────────────────────
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.pack(fill="x", padx=32, pady=(36, 8))

        ctk.CTkLabel(
            header,
            text="Focus Mode",
            font=ctk.CTkFont(size=32, weight="bold"),
            text_color=TEXT,
        ).pack(anchor="center")

        ctk.CTkLabel(
            header,
            text="Stay focused. Block distractions.",
            font=ctk.CTkFont(size=14),
            text_color=TEXT_SECONDARY,
        ).pack(anchor="center", pady=(6, 0))

        # ── Master toggle ────────────────────────────────────────────────────
        toggle_section = ctk.CTkFrame(self, fg_color="transparent")
        toggle_section.pack(fill="x", padx=32, pady=(24, 8))

        self.top_switch = ctk.CTkSwitch(
            toggle_section,
            text="Enable Focus Mode",
            font=ctk.CTkFont(size=15, weight="bold"),
            command=self.toggle_focus_mode,
            progress_color=ACCENT,
            button_color=ACCENT,
            button_hover_color=ACCENT_HOVER,
            width=56,
            height=28,
        )
        self.top_switch.pack(anchor="center")

        # ── Blocked sites list ───────────────────────────────────────────────
        ctk.CTkLabel(
            self,
            text="Blocked Sites",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=TEXT_SECONDARY,
            anchor="w",
        ).pack(fill="x", padx=32, pady=(20, 8))

        self.scroll_frame = ctk.CTkScrollableFrame(
            self,
            fg_color=SURFACE,
            corner_radius=14,
            border_width=0,
        )
        self.scroll_frame.pack(fill="both", expand=True, padx=24, pady=(0, 12))
        self.scroll_frame.columnconfigure(0, weight=1)

        # ── Status notification bar ─────────────────────────────────────────
        self.status_bar = ctk.CTkFrame(
            self,
            fg_color=SURFACE,
            corner_radius=10,
            height=44,
        )
        self.status_bar.pack(fill="x", padx=24, pady=(0, 12))
        self.status_bar.pack_propagate(False)

        self.status_label = ctk.CTkLabel(
            self.status_bar,
            text=" ",
            font=ctk.CTkFont(size=13),
            text_color=TEXT_MUTED,
            anchor="w",
        )
        self.status_label.pack(fill="both", expand=True, padx=16, pady=10)

        # ── Bottom input bar ─────────────────────────────────────────────────
        bottom = ctk.CTkFrame(self, fg_color="transparent")
        bottom.pack(fill="x", padx=24, pady=(0, 28))
        bottom.columnconfigure(0, weight=1)

        self.site_entry = ctk.CTkEntry(
            bottom,
            placeholder_text="Enter site URL...",
            height=44,
            corner_radius=22,
            border_width=1,
            border_color="#2a2a2a",
            fg_color=CARD,
            font=ctk.CTkFont(size=14),
        )
        self.site_entry.grid(row=0, column=0, sticky="ew", padx=(0, 12))

        self.add_button = ctk.CTkButton(
            bottom,
            text="Add",
            width=80,
            height=44,
            corner_radius=22,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color=ACCENT,
            hover_color=ACCENT_HOVER,
            command=self.add_site,
        )
        self.add_button.grid(row=0, column=1)

        self.render_sites()
        self._sync_master_switch()
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        self.setup_tray()
        self.mainloop()

    def render_sites(self):
        for index, site in enumerate(self.data["sites"]):
            row_frame = ctk.CTkFrame(
                master=self.scroll_frame,
                fg_color=CARD,
                corner_radius=12,
                height=56,
            )
            row_frame.grid(row=index, column=0, padx=4, pady=5, sticky="ew")
            row_frame.grid_propagate(False)
            row_frame.columnconfigure(1, weight=1)

            icon = get_favicon(site["url"])
            favicon_label = ctk.CTkLabel(
                master=row_frame,
                text="",
                image=icon,
                width=36,
            )
            favicon_label.grid(row=0, column=0, padx=(14, 8), pady=0)

            site_label = ctk.CTkLabel(
                master=row_frame,
                text=site["url"],
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color=TEXT,
                anchor="w",
            )
            site_label.grid(row=0, column=1, padx=(0, 8), sticky="w")

            enabled_var = ctk.BooleanVar(value=site["enabled"])
            toggle = ctk.CTkSwitch(
                master=row_frame,
                text="",
                width=44,
                height=22,
                variable=enabled_var,
                onvalue=True,
                offvalue=False,
                progress_color=ACCENT,
                button_color=ACCENT,
                button_hover_color=ACCENT_HOVER,
                command=lambda u=site["url"]: self.toggle_site(u),
            )
            toggle.grid(row=0, column=2, padx=(0, 6))

            delete_btn = ctk.CTkButton(
                master=row_frame,
                text="✕",
                width=32,
                height=32,
                corner_radius=8,
                font=ctk.CTkFont(size=14),
                fg_color="transparent",
                hover_color=DANGER,
                text_color=TEXT_MUTED,
                command=lambda u=site["url"]: self.delete_site(u),
            )
            delete_btn.grid(row=0, column=3, padx=(0, 12))

    def setup_tray(self):
        image = Image.open(resource_path("assets/icon.ico"))
        menu = pystray.Menu(
            pystray.MenuItem("Show", self.show_window),
            pystray.MenuItem("Exit", self.exit_app)
        )
        self.tray_icon = pystray.Icon("Focus Mode", image, "Focus Mode", menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()

    def show_window(self, icon=None, item=None):
        self.after(0, self._show_window)

    def _show_window(self):
        self.deiconify()
        self.lift()

    def exit_app(self, icon=None, item=None):
        self.after(0, self._exit_app)

    def _exit_app(self):
        if self.data["master_on"]:
            blocker.unblock_all()
        self.tray_icon.stop()
        self.destroy()

    def on_close(self):
        self.withdraw()

    def _set_status(self, text, color):
        self.status_label.configure(text=text, text_color=color)

    def _sync_master_switch(self):
        self._syncing = True
        if self.data["master_on"]:
            self.top_switch.select()
        else:
            self.top_switch.deselect()
        self._syncing = False

    def toggle_focus_mode(self):
        if self._syncing:
            return
        blocker.toggle_master(self.data)
        print(self.data)
        if self.data["master_on"]:
            self._set_status(
                "⚠️  Restart your browser for changes to take effect",
                WARNING,
            )
        else:
            self._set_status(
                "✅  Sites unblocked. Restart browser to restore access.",
                SUCCESS,
            )
        self.refresh()

    def add_site(self):
        url = self.site_entry.get().strip()
        if url:
            blocker.add_site(self.data, url)
            self.site_entry.delete(0, "end")
            self.refresh()

    def toggle_site(self, url):
        blocker.toggle_site(self.data, url)
        self.refresh()
        self._set_status(
            "⚠️  Restart your browser for changes to take effect",
            WARNING,
        )

    def delete_site(self, url):
        blocker.remove_site(self.data, url)
        self.refresh()

    def refresh(self):
        for widget in self.scroll_frame.winfo_children():
            widget.destroy()
        self.render_sites()


if __name__ == "__main__":
    app = App()
