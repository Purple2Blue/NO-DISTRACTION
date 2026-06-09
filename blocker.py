import os
import json
import subprocess

HOSTS_PATH = r"C:\Windows\System32\drivers\etc\hosts"
MARKER_START = "# BLOCKER_START"
MARKER_END = "# BLOCKER_END"

DATA_PATH = os.path.join(os.environ["APPDATA"], "FocusMode", "data.json")

DEFAULT_SITES = [
    {"url": "youtube.com", "enabled": False},
    {"url": "instagram.com", "enabled": False},
    {"url": "twitter.com", "enabled": False},
    {"url": "facebook.com", "enabled": False},
    {"url": "reddit.com", "enabled": False},
    {"url": "netflix.com", "enabled": False},
    {"url": "primevideo.com", "enabled": False},
    {"url": "hotstar.com", "enabled": False},
    {"url": "snapchat.com", "enabled": False},
]

def ensure_data_dir():
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)

def flush_dns():
    subprocess.run(["net", "stop", "dnscache"], capture_output=True, shell=True)
    subprocess.run(["net", "start", "dnscache"], capture_output=True, shell=True)

def load_json():
    ensure_data_dir()
    if not os.path.exists(DATA_PATH):
        default_data = {"sites": DEFAULT_SITES, "master_on": False}
        save_json(default_data)
        return default_data
    with open(DATA_PATH, 'r') as f:
        return json.load(f)

def save_json(data):
    ensure_data_dir()
    with open(DATA_PATH, 'w') as f:
        json.dump(data, f, indent=2)

def block_all(sites):
    with open(HOSTS_PATH, 'r') as f:
        lines = f.readlines()
    clean_lines = []
    inside_block = False
    for line in lines:
        if MARKER_START in line:
            inside_block = True
        elif MARKER_END in line:
            inside_block = False
        elif not inside_block:
            clean_lines.append(line)
    block_lines = [MARKER_START + "\n"]
    for site in sites:
        if site["enabled"]:
            block_lines.append(f"127.0.0.1 {site['url']}\n")
            block_lines.append(f"127.0.0.1 www.{site['url']}\n")
    block_lines.append(MARKER_END + "\n")
    with open(HOSTS_PATH, 'w') as f:
        f.writelines(clean_lines + block_lines)

def unblock_all():
    with open(HOSTS_PATH, 'r') as f:
        lines = f.readlines()
    clean_lines = []
    inside_block = False
    for line in lines:
        if MARKER_START in line:
            inside_block = True
        elif MARKER_END in line:
            inside_block = False
        elif not inside_block:
            clean_lines.append(line)
    with open(HOSTS_PATH, 'w') as f:
        f.writelines(clean_lines)

def toggle_master(data):
    data["master_on"] = not data["master_on"]
    if data["master_on"]:
        for site in data["sites"]:
            site["enabled"] = True
        save_json(data)
        block_all(data["sites"])
    else:
        for site in data["sites"]:
            site["enabled"] = False
        save_json(data)
        unblock_all()
    flush_dns()

def toggle_site(data, url):
    for site in data["sites"]:
        if site["url"] == url:
            site["enabled"] = not site["enabled"]
            break
    save_json(data)
    if data["master_on"]:
        block_all(data["sites"])
        flush_dns()

def add_site(data, url):
    if not any(site["url"] == url for site in data["sites"]):
        data["sites"].append({"url": url, "enabled": True})
        save_json(data)
    if data["master_on"]:
        block_all(data["sites"])
        flush_dns()

def remove_site(data, url):
    data["sites"] = [site for site in data["sites"] if site["url"] != url]
    save_json(data)
    if data["master_on"]:
        block_all(data["sites"])
        flush_dns()