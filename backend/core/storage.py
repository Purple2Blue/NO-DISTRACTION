import os
import json

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

def load_data():
    ensure_data_dir()
    if not os.path.exists(DATA_PATH):
        default_data = {"sites": DEFAULT_SITES, "master_on": False}
        save_data(default_data)
        return default_data
    with open(DATA_PATH, 'r') as f:
        return json.load(f)

def save_data(data):
    ensure_data_dir()
    with open(DATA_PATH, 'w') as f:
        json.dump(data, f, indent=2)