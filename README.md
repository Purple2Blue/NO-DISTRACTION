<div align="center">

<img src="assets/icon.ico" width="80" height="80" alt="Focus Mode Icon"/>

# Focus Mode

**A no-bullshit distraction blocker for Windows.**  
Block websites at the OS level. Stay locked in.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=flat-square&logo=windows&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

</div>

## What it does

Focus Mode blocks distracting websites directly through your system's hosts file — no browser extension needed, works across Chrome, Edge, Brave, and every other browser on your PC.

Turn it on. Get to work.

---

## Features

- **Master toggle** — one switch blocks everything instantly
- **Per-site control** — unblock individual sites while keeping others blocked
- **9 preloaded sites** — YouTube, Instagram, Twitter, Netflix, Reddit, Facebook, Prime Video, Hotstar, Snapchat
- **Custom sites** — add any domain to your blocklist
- **Favicon support** — clean UI with real site icons
- **System tray** — runs quietly in the background, minimize instead of close
- **Auto DNS flush** — changes take effect immediately
- **Safe exit** — unblocks everything cleanly when you close the app

---

## How it works

When focus mode is ON, Focus Mode writes blocked domains to your Windows hosts file:

```
127.0.0.1 youtube.com
127.0.0.1 www.youtube.com
```

When turned OFF, it removes those entries and flushes the DNS cache. Your data is stored in `AppData/Roaming/FocusMode/data.json` — your blocklist persists across sessions.

---

## Installation

### Option A — Run from source

**1. Clone the repo**
```bash
git clone https://github.com/Satyam-madeit/NO-DISTRACTIONS.git
cd NO-DISTRACTIONS
```

**2. Install dependencies**
```bash
pip install customtkinter pillow requests pystray
```

**3. Run as administrator**
```powershell
Start-Process python -ArgumentList "main.py" -Verb RunAs
```

> ⚠️ Admin privileges are required to edit the hosts file.

---

### Option B — Download the .exe

Download `main.exe` from [Releases](https://github.com/Satyam-madeit/NO-DISTRACTIONS/releases) and double click. UAC will prompt for admin access automatically.

---

## Usage

| Action | What happens |
|---|---|
| Toggle **Enable Focus Mode** ON | All sites blocked, DNS flushed |
| Toggle individual site OFF | That site unblocked while others stay blocked |
| Add custom site | Type domain (e.g. `twitch.tv`) and hit Add |
| Remove site | Hit the red X next to any site |
| Minimize window | App goes to system tray |
| Exit from tray | Unblocks all sites and closes cleanly |

> After toggling, restart your browser for changes to take effect.

---

## Project Structure

```
NO-DISTRACTIONS/
├── main.py          # Entry point + admin check
├── ui.py            # CustomTkinter GUI
├── blocker.py       # Hosts file + DNS logic
├── assets/
│   └── icon.ico     # App icon
└── data.json        # Auto-generated blocklist (AppData)
```

---

## Stack

- [CustomTkinter](https://github.com/TomSchimansky/CustomTkinter) — modern UI
- [pystray](https://github.com/moses-palmer/pystray) — system tray
- [Pillow](https://python-pillow.org/) — image handling
- [Requests](https://requests.readthedocs.io/) — favicon fetching

---

## Limitations

- Windows only
- Requires administrator privileges
- Chrome's built-in DNS cache may delay blocking by a few seconds — restart your browser after toggling
- Does not block apps (only browser-based access)

---

<div align="center">

Built by [Satyam](https://github.com/Satyam-madeit) — because YouTube wasn't going to block itself.

</div>