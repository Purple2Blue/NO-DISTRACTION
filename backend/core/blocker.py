import subprocess

HOSTS_PATH = r"C:\Windows\System32\drivers\etc\hosts"
MARKER_START = "# BLOCKER_START\n"
MARKER_END = "# BLOCKER_END\n"

def flush_dns():
    # Safer and works without interacting with protected Windows services
    subprocess.run(["ipconfig", "/flushdns"], capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)

def apply_blocks(sites, master_on):
    try:
        with open(HOSTS_PATH, 'r') as f:
            lines = f.readlines()
            
        clean_lines = []
        inside_block = False
        found_block = False
        
        for line in lines:
            if MARKER_START.strip() in line:
                inside_block = True
                found_block = True
            elif MARKER_END.strip() in line:
                inside_block = False
            elif not inside_block:
                clean_lines.append(line)
                
        # If master is off, we just write the clean lines and exit
        if not master_on:
            if not found_block:
                return True

            with open(HOSTS_PATH, 'w') as f:
                f.writelines(clean_lines)
            flush_dns()
            return True

        # If master is on, append the enabled sites
        block_lines = [MARKER_START]
        for site in sites:
            if site["enabled"]:
                block_lines.append(f"127.0.0.1 {site['url']}\n")
                block_lines.append(f"127.0.0.1 www.{site['url']}\n")
        block_lines.append(MARKER_END)
        
        with open(HOSTS_PATH, 'w') as f:
            f.writelines(clean_lines + block_lines)
            
        flush_dns()
        return True
        
    except PermissionError:
        print("Permission denied: Please ensure the app is run as Administrator.")
        return False
