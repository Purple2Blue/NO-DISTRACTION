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