<div align="center">

<img src="assets/icon.ico" width="80" height="80" alt="Focus Mode Icon"/>

# Focus Mode 2.0

**A clean, system-level distraction blocker for Windows.**  
Block websites at the OS level. Stay locked in.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=flat-square&logo=windows&logoColor=white)
![UI](https://img.shields.io/badge/UI-pywebview-111827?style=flat-square)
![Version](https://img.shields.io/badge/Version-2.0-aec6ff?style=flat-square)

---

</div>

## What It Does

Focus Mode 2.0 blocks distracting websites through your Windows `hosts` file. No browser extension, no account, no cloud sync. It works across Chrome, Edge, Brave, Firefox, and any browser that respects normal system DNS resolution.

Turn it on. Get back to work.

---

## Features

- **Master toggle** - one switch enables blocking for the full website list
- **Per-site control** - turn off individual sites while Focus Mode stays active
- **Preloaded distractions** - YouTube, Instagram, Twitter, Facebook, Reddit, Netflix, Prime Video, Hotstar, and Snapchat
- **Custom sites** - add any domain to your blocklist
- **Persistent JSON state** - saves your list in `%APPDATA%\FocusMode\data.json`
- **Real favicons** - each site gets a clean visual identity in the UI
- **Resizable desktop window** - no fixed-size app block
- **System tray support** - close hides the window to tray
- **Safe close behavior** - Focus Mode turns off before the app hides or quits
- **Automatic DNS flush** - applies hosts-file changes immediately
- **UAC-ready exe config** - PyInstaller manifest requests Administrator access

---

## How It Works

When Focus Mode is ON, the app writes enabled domains to your Windows hosts file:

```text
127.0.0.1 youtube.com
127.0.0.1 www.youtube.com
```

When Focus Mode is OFF, it removes its own block section from the hosts file and flushes DNS.

The app only edits the section between its own markers:

```text
# BLOCKER_START
...
# BLOCKER_END
```

Your saved state lives here:

```text
%APPDATA%\FocusMode\data.json
```

---

## Installation

### Option A - Run From Source

**1. Clone the repo**

```bash
git clone https://github.com/Satyam-madeit/focusmode.git
cd focusmode
```

**2. Install dependencies**

```bash
pip install pywebview pystray pillow pyinstaller
```

**3. Run as Administrator**

```powershell
python -m backend.app
```

For real blocking, start your terminal as Administrator before running the command.

> Admin privileges are required because Windows protects the hosts file.

---

### Option B - Build The EXE

The executable is not included yet. Build it locally with:

```powershell
pyinstaller main.spec
```

The generated app will be placed in:

```text
dist/
```

`main.manifest` is included in the build config, so the packaged app should request Administrator access automatically through UAC.

---

## Usage

| Action | What Happens |
|---|---|
| Turn master ON | Every website in the list turns on and gets blocked |
| Turn master OFF | Every website turns off and the hosts file is cleaned |
| Toggle one site OFF | That site is unblocked while the rest stay blocked |
| Add a site | The domain is saved and added to the UI |
| Remove a site | The domain is removed from JSON and hosts rules |
| Close the window | Focus Mode turns off, then the app hides to tray |
| Open from tray | The window returns and refreshes from saved state |
| Quit from tray | Focus Mode turns off and the app exits cleanly |

> Some browsers keep their own DNS cache. Restart your browser if a change does not appear immediately.

---

## Project Structure

```text
focusmode/
├── assets/
│   └── icon.ico
├── backend/
│   ├── app.py          # pywebview shell, tray behavior, window lifecycle
│   ├── api.py          # frontend/backend bridge
│   └── core/
│       ├── blocker.py  # hosts-file editing and DNS flush
│       └── storage.py  # JSON persistence
├── frontend/
│   ├── index.html      # desktop UI
│   ├── app.js          # UI behavior and pywebview calls
│   └── favicon.ico
├── main.manifest       # UAC/admin request for packaged exe
└── main.spec           # PyInstaller build config
```

---

## Stack

- **Python** - backend logic and app orchestration
- **pywebview** - native desktop window with HTML/CSS/JS UI
- **pystray** - Windows system tray integration
- **Pillow** - tray icon loading
- **PyInstaller** - Windows executable build
- **Tailwind CDN** - frontend styling during development

---

## Limitations

- Windows only
- Requires Administrator privileges for real blocking
- Blocks browser/domain access, not native apps directly
- Browser DNS caches may delay changes until restart
- Tailwind is currently loaded from CDN, so the source UI expects internet access during development

---

## Roadmap Ideas

- Local Tailwind build instead of CDN
- Schedule-based focus sessions
- Import/export blocklists
- Search and categories for large site lists
- Signed installer/release build

---

<div align="center">

Built by [Satyam](https://github.com/Satyam-madeit) - because YouTube was not going to block itself.

</div>
