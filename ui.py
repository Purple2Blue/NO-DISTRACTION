import requests
import customtkinter as ctk
from PIL import Image, ImageTk
from io import BytesIO
import blocker

favicon_cache = {} 

def get_favicon(url):
    if url in favicon_cache:
        return favicon_cache[url]  
    try:
        favicon_url = f"https://www.google.com/s2/favicons?domain={url}&sz=32"
        response = requests.get(favicon_url, timeout=5)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        photo = ctk.CTkImage(image, size=(32, 32))
        favicon_cache[url] = photo  # store it
        return photo
    except Exception as e:
        print(f"Error fetching favicon: {e}")
        return None
    
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.data = blocker.load_json("data.json")
        self.title("Focus Mode")
        self.geometry("500x700")
        self.top_frame = ctk.CTkFrame(self)
        self.top_frame.pack(fill="x", padx=20, pady=20)
        self.title_label = ctk.CTkLabel(self.top_frame, text="🎯 Focus Mode")
        self.title_label.pack(side="left", padx=10, pady=10)
        self.top_switch = ctk.CTkSwitch(self.top_frame, text="Enable Focus Mode", command=self.toggle_focus_mode)
        self.top_switch.pack(side="right", padx=10, pady=10)
        self.scroll_frame = ctk.CTkScrollableFrame(self, label_text="Blocked Sites")
        self.scroll_frame.pack(fill="both", expand=True, padx=20, pady=10)
        self.bottom_frame = ctk.CTkFrame(self)
        self.bottom_frame.pack(fill="x", padx=20, pady=10)
        self.site_entry = ctk.CTkEntry(self.bottom_frame, placeholder_text="Enter site url...")
        self.site_entry.pack(side="left", fill="x", expand=True, padx=10, pady=10)
        self.add_button = ctk.CTkButton(self.bottom_frame, text="Add", width=60, command=self.add_site)
        self.add_button.pack(side="right", padx=10, pady=10)
        self.render_sites()
        self.mainloop()

    def render_sites(self):
        for index, site in enumerate(self.data["sites"]):
            
            row_frame = ctk.CTkFrame(master=self.scroll_frame, fg_color="transparent")
            row_frame.grid(row=index, column=0, padx=10, pady=5, sticky="ew")
            
            row_frame.columnconfigure(1, weight=1) 

            icon = get_favicon(site["url"])
            favicon_label = ctk.CTkLabel(master=row_frame, text="", image=icon)
            favicon_label.grid(row=0, column=0, padx=5, pady=5)

            site_label = ctk.CTkLabel(master=row_frame, text=site["url"])
            site_label.grid(row=0, column=1, padx=5, pady=5, sticky="w")

            toggle = ctk.CTkSwitch(master=row_frame, text="",  
                                   command=lambda u=site["url"]: self.toggle_site(u))
            if site["enabled"]:
                toggle.select()
            toggle.grid(row=0, column=2, padx=5, pady=5)

            delete_btn = ctk.CTkButton(master=row_frame, text="X", width=30, fg_color="red", 
                                       command=lambda u=site["url"]: self.delete_site(u))
            delete_btn.grid(row=0, column=3, padx=5, pady=5)
    def toggle_focus_mode(self):
        blocker.toggle_master(self.data)
        if self.data["master_on"]:
            self.top_switch.select()
        else:
            self.top_switch.deselect()

    def add_site(self):
        url = self.site_entry.get().strip()
        if url:
            blocker.add_site(self.data, url)
            self.site_entry.delete(0, "end") 
            self.refresh()
    
    def toggle_site(self, url):
        blocker.toggle_site(self.data, url)
        self.refresh()

    def delete_site(self, url):
        blocker.remove_site(self.data, url)
        self.refresh()

    def refresh(self):
        for widget in self.scroll_frame.winfo_children():
            widget.destroy()
        self.render_sites()

if __name__ == "__main__":
    app = App()