#!/usr/bin/env python3
"""
OpenXLab Stable Diffusion WebUI Forge Deployment
Updated to work with the latest Forge version and fix all compatibility issues
"""

import os
import sys
import subprocess
import json
import time
from pathlib import Path

def run_command(cmd, check=True, shell=True):
    """Run command with better error handling"""
    print(f"Running: {cmd}")
    try:
        result = subprocess.run(cmd, shell=shell, check=check, capture_output=True, text=True)
        if result.stdout:
            print(f"Output: {result.stdout}")
        return result
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {cmd}")
        print(f"Error: {e.stderr}")
        if check:
            raise
        return e

def setup_directories():
    """Setup required directories"""
    os.makedirs("/home/xlab-app-center", exist_ok=True)
    os.chdir("/home/xlab-app-center")

def clone_forge():
    """Clone the latest Forge repository"""
    if os.path.exists("/home/xlab-app-center/stable-diffusion-webui-forge"):
        print("Forge already exists, updating...")
        os.chdir("/home/xlab-app-center/stable-diffusion-webui-forge")
        run_command("git pull")
    else:
        print("Cloning Stable Diffusion WebUI Forge...")
        run_command("git clone https://github.com/lllyasviel/stable-diffusion-webui-forge.git /home/xlab-app-center/stable-diffusion-webui-forge")
        os.chdir("/home/xlab-app-center/stable-diffusion-webui-forge")
    
    # Install git lfs
    run_command("git lfs install")

def setup_config_files():
    """Setup configuration files without breaking the code"""
    print("Setting up configuration files...")
    
    # Copy config files from parent directory
    config_files = [
        ("/home/xlab-app-center/config.json", "config.json"),
        ("/home/xlab-app-center/ui-config.json", "ui-config.json"),
        ("/home/xlab-app-center/header.py", "header.py")
    ]
    
    for src, dst in config_files:
        if os.path.exists(src):
            run_command(f"cp {src} {dst}")
            print(f"Copied {src} to {dst}")

def create_user_css():
    """Create custom CSS for better iframe embedding"""
    css_content = """
/* Custom CSS for better iframe embedding */
.gradio-container {
    max-width: 100% !important;
    margin: 0 !important;
    padding: 10px !important;
}

#component-0 {
    height: 100vh !important;
}

.contain {
    max-width: 100% !important;
}

/* Remove margins for iframe embedding */
body {
    margin: 0 !important;
    padding: 0 !important;
}

/* Dark theme improvements */
.dark {
    background-color: #0f0f0f !important;
}

/* Header customization */
.gradio-header {
    background: linear-gradient(90deg, #1a1a1a, #2a2a2a) !important;
    border-radius: 0 !important;
}
"""
    
    os.makedirs("user.css", exist_ok=True)
    with open("user.css", "w") as f:
        f.write(css_content)

def setup_extensions():
    """Setup essential extensions compatible with Forge"""
    print("Setting up extensions...")
    
    extensions = [
        ("https://github.com/Mikubill/sd-webui-controlnet", "sd-webui-controlnet"),
        ("https://github.com/zanllp/sd-webui-infinite-image-browsing", "sd-webui-infinite-image-browsing"),
        ("https://github.com/Vetchems/sd-civitai-browser", "sd-civitai-browser"),
        ("https://github.com/LonicaMewinsky/gif2gif", "gif2gif"),
    ]
    
    extensions_dir = "extensions"
    os.makedirs(extensions_dir, exist_ok=True)
    
    for repo_url, dir_name in extensions:
        ext_path = os.path.join(extensions_dir, dir_name)
        if not os.path.exists(ext_path):
            print(f"Cloning {dir_name}...")
            run_command(f"git clone {repo_url} {ext_path}")
        else:
            print(f"{dir_name} already exists, skipping...")

def download_models():
    """Download essential models using faster mirrors"""
    print("Downloading models...")
    
    # Create model directories
    model_dirs = [
        "models/Stable-diffusion",
        "models/VAE",
        "extensions/sd-webui-controlnet/models"
    ]
    
    for dir_path in model_dirs:
        os.makedirs(dir_path, exist_ok=True)
    
    # Essential models with faster downloads
    models = [
        # Main SD models (using OpenXLab mirrors when available)
        {
            "url": "https://download.openxlab.org.cn/models/ninjawick/realistic-vision-5.1/weight/realisticVisionV51_v51VAE.safetensors",
            "path": "models/Stable-diffusion/realisticVisionV51_v51VAE.safetensors"
        },
        {
            "url": "https://huggingface.co/SG161222/Realistic_Vision_V5.1_noVAE/resolve/main/Realistic_Vision_V5.1_fp16-no-ema.safetensors",
            "path": "models/Stable-diffusion/Realistic_Vision_V5.1_fp16-no-ema.safetensors"
        },
        # Essential ControlNet models
        {
            "url": "https://huggingface.co/ckpt/ControlNet-v1-1/resolve/main/control_v11f1p_sd15_depth_fp16.safetensors",
            "path": "extensions/sd-webui-controlnet/models/control_v11f1p_sd15_depth_fp16.safetensors"
        },
        {
            "url": "https://huggingface.co/ckpt/ControlNet-v1-1/resolve/main/control_v11p_sd15_openpose_fp16.safetensors", 
            "path": "extensions/sd-webui-controlnet/models/control_v11p_sd15_openpose_fp16.safetensors"
        },
        {
            "url": "https://huggingface.co/ckpt/ControlNet-v1-1/resolve/main/control_v11f1e_sd15_tile_fp16.safetensors",
            "path": "extensions/sd-webui-controlnet/models/control_v11f1e_sd15_tile_fp16.safetensors"
        }
    ]
    
    # Download models if they don't exist
    for model in models:
        if not os.path.exists(model["path"]):
            print(f"Downloading {os.path.basename(model['path'])}...")
            cmd = f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false '{model['url']}' -d '{os.path.dirname(model['path'])}' -o '{os.path.basename(model['path'])}'"
            run_command(cmd, check=False)
        else:
            print(f"{os.path.basename(model['path'])} already exists, skipping...")

def create_launch_config():
    """Create optimized launch configuration"""
    config = {
        "samples_save": True,
        "samples_format": "png",
        "grid_save": True,
        "enable_pnginfo": True,
        "outdir_txt2img_samples": "outputs/txt2img-images",
        "outdir_img2img_samples": "outputs/img2img-images",
        "show_warnings": False,
        "sd_model_checkpoint": "realisticVisionV51_v51VAE.safetensors",
        "sd_vae": "Automatic",
        "gradio_theme": "dark",
        "hidden_tabs": ["Checkpoint Merger", "Train"],
        "live_previews_enable": True,
        "show_progress_every_n_steps": 5,
        "disabled_extensions": [],
        "quicksettings_list": [
            "sd_model_checkpoint",
            "sd_vae",
            "CLIP_stop_at_last_layers"
        ]
    }
    
    with open("config.json", "w") as f:
        json.dump(config, f, indent=2)

def inject_custom_header():
    """Inject custom header without breaking the code"""
    header_content = '''
def create_custom_header():
    import gradio as gr
    with gr.Group():
        gr.Markdown("""
        ## 🎨 Stable Diffusion WebUI Forge - OpenXLab Edition
        
        **Features:**
        - Latest Forge backend for better performance
        - Optimized for iframe embedding
        - ControlNet integration
        - Real-time generation preview
        
        **Contact:** [GitHub](https://github.com/revolverocelot1) | [Email](srushtiraj.patil20@vit.edu)
        
        ---
        """)
    return gr.HTML("")
'''
    
    # Create a custom extension for the header
    os.makedirs("extensions/custom-header", exist_ok=True)
    with open("extensions/custom-header/scripts/custom_header.py", "w") as f:
        f.write(f"""
import gradio as gr
import modules.scripts as scripts

{header_content}

class CustomHeaderScript(scripts.Script):
    def title(self):
        return "Custom Header"
    
    def show(self, is_img2img):
        return scripts.AlwaysVisible
    
    def ui(self, is_img2img):
        return create_custom_header()
""")

def main():
    """Main setup function"""
    try:
        print("🚀 Starting Stable Diffusion WebUI Forge setup for OpenXLab...")
        
        # Setup
        setup_directories()
        clone_forge()
        setup_config_files()
        create_user_css()
        setup_extensions()
        download_models()
        create_launch_config()
        inject_custom_header()
        
        print("✅ Setup complete! Starting WebUI...")
        
        # Launch with optimized settings for OpenXLab and iframe embedding
        launch_args = [
            "python", "launch.py",
            "--listen",
            "--port", "7860",
            "--cors-allow-origins", "*",
            "--xformers",
            "--enable-insecure-extension-access",
            "--theme", "dark",
            "--gradio-queue",
            "--disable-safe-unpickle",
            "--api",
            "--no-gradio-debug",
            "--opt-split-attention",
            "--disable-console-progressbars",
            "--enable-console-prompts",
            f"--ui-settings-file", "/home/xlab-app-center/stable-diffusion-webui-forge/config.json",
            f"--ui-config-file", "/home/xlab-app-center/ui-config.json"
        ]
        
        # Set environment variables for better performance
        env = os.environ.copy()
        env.update({
            "PYTORCH_CUDA_ALLOC_CONF": "max_split_size_mb:512",
            "CUDA_VISIBLE_DEVICES": "0",
            "GRADIO_SERVER_NAME": "0.0.0.0",
            "GRADIO_SERVER_PORT": "7860"
        })
        
        print(f"Launching with args: {' '.join(launch_args)}")
        subprocess.run(launch_args, env=env)
        
    except Exception as e:
        print(f"❌ Error during setup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
