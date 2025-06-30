import os

# Change to working directory
os.chdir(f"/home/xlab-app-center")

# Configure git for better SSL/TLS handling
os.system(f"git config --global http.version HTTP/1.1")
os.system(f"git config --global http.postBuffer 1048576000")
os.system(f"git config --global http.maxRequestBuffer 100M")
os.system(f"git config --global http.sslBackend openssl")
os.system(f"git config --global http.sslVerify true")
os.system(f"git config --global http.timeout 600")
os.system(f"git config --global url.https://github.com/.insteadOf git://github.com/")

# Clone Stable Diffusion WebUI Forge with fallback methods
if os.system(f"git clone --depth 1 --single-branch https://github.com/lllyasviel/stable-diffusion-webui-forge.git") != 0:
    print("Standard clone failed, trying with SSL disabled...")
    os.environ['GIT_SSL_NO_VERIFY'] = 'true'
    if os.system(f"git clone --depth 1 --single-branch https://github.com/lllyasviel/stable-diffusion-webui-forge.git") != 0:
        print("SSL disabled clone failed, trying ZIP download...")
        os.system(f"wget -O forge.zip https://github.com/lllyasviel/stable-diffusion-webui-forge/archive/refs/heads/main.zip")
        os.system(f"unzip -q forge.zip")
        os.system(f"mv stable-diffusion-webui-forge-main stable-diffusion-webui-forge")
        os.system(f"rm forge.zip")

os.chdir(f"/home/xlab-app-center/stable-diffusion-webui-forge")
os.system(f"git lfs install")
os.system(f"git reset --hard")

# UI modifications
os.system(f"sed -i -e '/demo:/r /home/xlab-app-center/header.py' /home/xlab-app-center/stable-diffusion-webui-forge/modules/ui.py")
os.system(f"sed -i -e '253,258d' /home/xlab-app-center/stable-diffusion-webui-forge/modules/ui_settings.py")
os.system(f"sed -i -e '186,228d' /home/xlab-app-center/stable-diffusion-webui-forge/modules/ui_settings.py")
os.system(f"sed -i -e '171,178d' /home/xlab-app-center/stable-diffusion-webui-forge/modules/ui_settings.py")
os.system(f"sed -i -e '108,113d' /home/xlab-app-center/stable-diffusion-webui-forge/modules/ui_settings.py")
os.system(f"sed -i -e '225,227d' /home/xlab-app-center/stable-diffusion-webui-forge/modules/ui_loadsave.py")
os.system(f"sed -i -e '214,217d' /home/xlab-app-center/stable-diffusion-webui-forge/modules/ui_loadsave.py")

# Clone extensions
os.system(f"git clone https://github.com/mcmonkeyprojects/sd-dynamic-thresholding /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-dynamic-thresholding")
os.system(f"git clone https://github.com/Mikubill/sd-webui-controlnet /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet")
os.system(f"git clone https://github.com/camenduru/sd-civitai-browser /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-civitai-browser")
os.system(f"git clone https://github.com/LonicaMewinsky/gif2gif /home/xlab-app-center/stable-diffusion-webui-forge/extensions/gif2gif")
os.system(f"git clone https://github.com/zanllp/sd-webui-infinite-image-browsing /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-infinite-image-browsing")
os.system(f"git clone https://github.com/P2Enjoy/sd-webui-roop-uncensored /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-roop-uncensored")
os.system(f"git clone https://github.com/Gourieff/sd-webui-reactor /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-reactor")

# Download ControlNet models
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/resolve/main/control_v11f1p_sd15_depth_fp16.safetensors -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11f1p_sd15_depth_fp16.safetensors")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/resolve/main/control_v11p_sd15_openpose_fp16.safetensors -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11p_sd15_openpose_fp16.safetensors")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/resolve/main/control_v11p_sd15s2_lineart_anime_fp16.safetensors -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11p_sd15s2_lineart_anime_fp16.safetensors")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/resolve/main/control_v11f1e_sd15_tile_fp16.safetensors -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11f1e_sd15_tile_fp16.safetensors")

# Download ControlNet YAML configs
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11e_sd15_ip2p_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11e_sd15_ip2p_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11e_sd15_shuffle_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11e_sd15_shuffle_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11p_sd15_canny_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11p_sd15_canny_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11f1p_sd15_depth_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11f1p_sd15_depth_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11p_sd15_inpaint_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11p_sd15_inpaint_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11p_sd15_lineart_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11p_sd15_lineart_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11p_sd15_mlsd_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11p_sd15_mlsd_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11p_sd15_normalbae_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11p_sd15_normalbae_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11p_sd15_openpose_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11p_sd15_openpose_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11p_sd15_scribble_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11p_sd15_scribble_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11p_sd15_seg_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11p_sd15_seg_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11p_sd15_softedge_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11p_sd15_softedge_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11p_sd15s2_lineart_anime_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11p_sd15s2_lineart_anime_fp16.yaml")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M --async-dns=false https://huggingface.co/ckpt/ControlNet-v1-1/raw/main/control_v11f1e_sd15_tile_fp16.yaml -d /home/xlab-app-center/stable-diffusion-webui-forge/extensions/sd-webui-controlnet/models -o control_v11f1e_sd15_tile_fp16.yaml")

# Download main models
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://download.openxlab.org.cn/models/ninjawick/realistic-vision-5.1/weight//Realistic_Vision_V6.0_NV_B1_inpainting.safetensors -d /home/xlab-app-center/stable-diffusion-webui-forge/models/Stable-diffusion -o Realistic_Vision_V6.0_NV_B1_inpainting.safetensors")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://download.openxlab.org.cn/models/ninjawick/realistic-vision-5.1/weight//realisticVisionV51_v51VAE -d /home/xlab-app-center/stable-diffusion-webui-forge/models/Stable-diffusion -o realisticVisionV51_v51VAE.safetensors")
os.system(f"aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/SG161222/Realistic_Vision_V5.1_noVAE/resolve/main/Realistic_Vision_V5.1_fp16-no-ema.safetensors -d /home/xlab-app-center/stable-diffusion-webui-forge/models/Stable-diffusion -o Realistic_Vision_V5.1_fp16-no-ema.safetensors")

# Launch WebUI Forge
os.system(f"python launch.py --cors-allow-origins=* --xformers --enable-insecure-extension-access --theme dark --gradio-queue --disable-safe-unpickle --ui-settings-file /home/xlab-app-center/config.json --ui-config-file /home/xlab-app-center/ui-config.json") 