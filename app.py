import os

# --- Configuration ---
REPO_URL = "https://github.com/vladmandic/sdnext.git"
REPO_DIR = "sdnext"
APP_DIR = "/home/xlab-app-center"

# --- Main Script ---

# Change to the main app directory
os.chdir(APP_DIR)

# Clone the repository if it doesn't exist
if not os.path.exists(REPO_DIR):
    print(f"--- Cloning SD.Next from {REPO_URL} ---")
    
    # Attempt 1: Standard Git Clone
    clone_command = f"git clone --depth 1 {REPO_URL}"
    if os.system(clone_command) != 0:
        print("--- Standard clone failed, trying with SSL verification disabled ---")
        
        # Attempt 2: Git Clone with SSL verification disabled
        clone_command_no_ssl = f"git -c http.sslVerify=false clone --depth 1 {REPO_URL}"
        if os.system(clone_command_no_ssl) != 0:
            print("--- SSL disabled clone failed, trying ZIP download ---")
            
            # Attempt 3: Download as ZIP
            zip_url = REPO_URL.replace('.git', '/archive/refs/heads/master.zip')
            os.system(f"wget -O repo.zip {zip_url}")
            os.system(f"unzip -q repo.zip")
            os.system(f"mv {REPO_DIR}-master {REPO_DIR}")
            os.system(f"rm repo.zip")

# Change into the repository directory
os.chdir(os.path.join(APP_DIR, REPO_DIR))

# Copy configuration files
print("--- Copying configuration files ---")
os.system(f"cp {os.path.join(APP_DIR, 'config.json')} .")
os.system(f"cp {os.path.join(APP_DIR, 'ui-config.json')} .")
os.system(f"cp {os.path.join(APP_DIR, 'header.py')} .")

# Make the launch script executable
os.system("chmod +x webui.sh")

# Launch SD.Next with appropriate arguments
print("--- Launching SD.Next ---")
os.system(f"./webui.sh --share --enable-insecure-extension-access --theme dark --gradio-queue --no-hashing --disable-console-update-check")