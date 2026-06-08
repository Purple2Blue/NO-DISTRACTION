import os
import json

HOSTS_PATH = r"C:\Windows\System32\drivers\etc\hosts"
MARKER_START = "# BLOCKER_START"
MARKER_END = "# BLOCKER_END"

def load_json(file_path):
    if not os.path.exists(file_path):
        return {"sites": [], "master_on": False} 
    with open(file_path, 'r') as f:
        return json.load(f)

def save_json(data, file_path):
    with open(file_path, 'w') as f:
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
    save_json(data, "data.json")
    if data["master_on"]:
        block_all(data["sites"])
    else:
        unblock_all()

def toggle_site(data, url):
    for site in data["sites"]:
        if site["url"] == url:
            site["enabled"] = not site["enabled"]
            break
    save_json(data, "data.json")
    if data["master_on"]:
        block_all(data["sites"])

def add_site(data, url):
    if not any(site["url"] == url for site in data["sites"]):
        data["sites"].append({"url": url, "enabled": True})
        save_json(data, "data.json")
    if data["master_on"]:
        block_all(data["sites"])

def remove_site(data, url):
    data["sites"] = [site for site in data["sites"] if site["url"] != url]
    save_json(data, "data.json")
    if data["master_on"]:
        block_all(data["sites"])