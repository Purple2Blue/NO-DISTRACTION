from backend.core import storage, blocker

class FocusApi:
    def __init__(self):
        # Load state into memory when the API initializes
        self.data = storage.load_data()

    def _save_and_return(self):
        storage.save_data(self.data)
        return {"success": True, "state": self.data}

    def _apply_if_active(self, sites):
        if not self.data["master_on"]:
            return True
        return blocker.apply_blocks(sites, True)

    def get_initial_state(self):
        """Called by React on startup to populate the UI."""
        return self.data

    def toggle_master(self):
        """Toggles the master switch. On enables every site, off disables every site."""
        next_master_state = not self.data["master_on"]
        updated_sites = [site.copy() for site in self.data["sites"]]

        for site in updated_sites:
            site["enabled"] = next_master_state

        success = blocker.apply_blocks(updated_sites, next_master_state)
        if not success:
            return {"success": False, "state": self.data}

        self.data["sites"] = updated_sites
        self.data["master_on"] = next_master_state
        return self._save_and_return()

    def turn_off_focus_mode(self):
        """Turns Focus Mode off and clears all enabled site toggles."""
        updated_sites = [site.copy() for site in self.data["sites"]]
        for site in updated_sites:
            site["enabled"] = False

        success = blocker.apply_blocks(updated_sites, False)
        if not success:
            return {"success": False, "state": self.data}

        self.data["sites"] = updated_sites
        self.data["master_on"] = False
        return self._save_and_return()

    def toggle_site(self, url):
        """Toggles a specific site."""
        updated_sites = [site.copy() for site in self.data["sites"]]
        for site in updated_sites:
            if site["url"] == url:
                site["enabled"] = not site["enabled"]
                break
        else:
            return {"success": False, "error": "Site not found", "state": self.data}

        success = self._apply_if_active(updated_sites)
        if not success:
            return {"success": False, "state": self.data}

        self.data["sites"] = updated_sites
        return self._save_and_return()

    def add_site(self, url):
        if not any(site["url"] == url for site in self.data["sites"]):
            updated_sites = [site.copy() for site in self.data["sites"]]
            updated_sites.append({"url": url, "enabled": True})
            success = self._apply_if_active(updated_sites)
            if not success:
                return {"success": False, "state": self.data}

            self.data["sites"] = updated_sites
            return self._save_and_return()
        return {"success": False, "error": "Site already exists", "state": self.data}

    def remove_site(self, url):
        updated_sites = [site.copy() for site in self.data["sites"] if site["url"] != url]
        if len(updated_sites) == len(self.data["sites"]):
            return {"success": False, "error": "Site not found", "state": self.data}

        success = self._apply_if_active(updated_sites)
        if not success:
            return {"success": False, "state": self.data}

        self.data["sites"] = updated_sites
        return self._save_and_return()
