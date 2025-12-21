import customtkinter as ctk
import subprocess
import os
import sys
import webbrowser
import threading
import time

ctk.set_appearance_mode("System")
ctk.set_default_color_theme("blue")

class LauncherApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Books App Launcher")
        self.geometry("400x450")
        self.resizable(False, False)

        self.server_process = None
        self.server_running = False
        
        # Base directory for absolute paths
        self.base_dir = os.path.dirname(os.path.abspath(__file__))

        self.create_widgets()
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

    def create_widgets(self):
        # Title
        self.title_label = ctk.CTkLabel(self, text="Books App Control Center", font=ctk.CTkFont(size=24, weight="bold"))
        self.title_label.pack(pady=(30, 20))

        # Server Control
        self.server_frame = ctk.CTkFrame(self)
        self.server_frame.pack(fill="x", padx=20, pady=10)

        self.server_status_label = ctk.CTkLabel(self.server_frame, text="Backend Server: Stopped", text_color="red", font=ctk.CTkFont(weight="bold"))
        self.server_status_label.pack(side="left", padx=20, pady=15)

        self.server_btn = ctk.CTkButton(self.server_frame, text="Start Server", command=self.toggle_server, fg_color="green")
        self.server_btn.pack(side="right", padx=20, pady=15)

        # Admin Panel
        self.admin_btn = ctk.CTkButton(self, text="Launch Admin Panel", command=self.launch_admin, height=50, font=ctk.CTkFont(size=16))
        self.admin_btn.pack(fill="x", padx=20, pady=10)

        # Web App
        self.webapp_btn = ctk.CTkButton(self, text="Open Web App", command=self.open_webapp, height=50, font=ctk.CTkFont(size=16))
        self.webapp_btn.pack(fill="x", padx=20, pady=10)

        # Info
        self.info_label = ctk.CTkLabel(self, text="Status: Ready", text_color="gray")
        self.info_label.pack(side="bottom", pady=10)

    def toggle_server(self):
        if not self.server_running:
            self.start_server()
        else:
            self.stop_server()

    def start_server(self):
        self.info_label.configure(text="Status: Starting Server...")
        try:
            # Run server.py in a subprocess
            server_path = os.path.join(self.base_dir, "backend", "server.py")
            if not os.path.exists(server_path):
                 self.info_label.configure(text=f"Error: {server_path} not found!")
                 return

            # Use python executable to run the script
            # Set cwd to base_dir so relative imports in server.py work
            self.server_process = subprocess.Popen([sys.executable, server_path], cwd=self.base_dir, creationflags=subprocess.CREATE_NO_WINDOW)
            
            self.server_running = True
            self.server_status_label.configure(text="Backend Server: Running", text_color="green")
            self.server_btn.configure(text="Stop Server", fg_color="red")
            self.info_label.configure(text="Status: Server Started")
            
        except Exception as e:
            self.info_label.configure(text=f"Error: {str(e)}")

    def stop_server(self):
        if self.server_process:
            self.server_process.terminate()
            self.server_process = None
        
        self.server_running = False
        self.server_status_label.configure(text="Backend Server: Stopped", text_color="red")
        self.server_btn.configure(text="Start Server", fg_color="green")
        self.info_label.configure(text="Status: Server Stopped")

    def launch_admin(self):
        self.info_label.configure(text="Status: Launching Admin Panel...")
        try:
            admin_path = os.path.join(self.base_dir, "admin", "main.py")
            if not os.path.exists(admin_path):
                 self.info_label.configure(text=f"Error: {admin_path} not found!")
                 return
            
            subprocess.Popen([sys.executable, admin_path], cwd=self.base_dir)
            self.info_label.configure(text="Status: Admin Panel Launched")
        except Exception as e:
            self.info_label.configure(text=f"Error: {str(e)}")

    def open_webapp(self):
        self.info_label.configure(text="Status: Opening Web App...")
        try:
            webapp_path = os.path.join(self.base_dir, "webapp", "index.html")
            if not os.path.exists(webapp_path):
                 self.info_label.configure(text=f"Error: {webapp_path} not found!")
                 return

            webbrowser.open(f"file:///{webapp_path}")
            self.info_label.configure(text="Status: Web App Opened")
        except Exception as e:
            self.info_label.configure(text=f"Error: {str(e)}")

    def on_closing(self):
        if self.server_running:
            self.stop_server()
        self.destroy()

if __name__ == "__main__":
    app = LauncherApp()
    app.mainloop()
