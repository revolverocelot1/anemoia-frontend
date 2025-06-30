#!/usr/bin/env python3
"""
Fixed Stable Diffusion WebUI Setup with Robust Git Cloning
"""

import subprocess
import os
import sys
import time
import urllib.request
import zipfile
import shutil
from pathlib import Path

def run_command(cmd, shell=True, check=False, capture_output=False, text=True, timeout=600):
    """Run command with timeout and better error handling"""
    try:
        print(f"Running: {cmd}")
        result = subprocess.run(
            cmd, 
            shell=shell, 
            check=check, 
            capture_output=capture_output, 
            text=text,
            timeout=timeout
        )
        return result
    except subprocess.TimeoutExpired:
        print(f"❌ Command timed out after {timeout}s: {cmd}")
        return None
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {cmd}")
        print(f"Error: {e}")
        return None

def fix_git_config():
    """Fix Git configuration for better SSL/TLS handling"""
    print("🔧 Fixing Git configuration...")
    
    configs = [
        # Fix SSL/TLS issues
        "git config --global http.version HTTP/1.1",
        "git config --global http.postBuffer 1048576000",
        "git config --global http.maxRequestBuffer 100M",
        "git config --global core.preloadindex true",
        "git config --global core.fscache true",
        "git config --global gc.auto 256",
        
        # SSL Certificate handling
        "git config --global http.sslBackend openssl",
        "git config --global http.sslVerify true",
        
        # Network timeout settings
        "git config --global http.lowSpeedLimit 0",
        "git config --global http.lowSpeedTime 999999",
        "git config --global http.timeout 600",
        
        # Use different protocol if needed
        "git config --global url.https://github.com/.insteadOf git://github.com/",
    ]
    
    for config in configs:
        run_command(config, capture_output=True)
    
    print("✅ Git configuration updated")

def download_as_zip(repo_url, target_dir):
    """Download repository as ZIP file and extract"""
    try:
        # Convert git URL to ZIP download URL
        if repo_url.endswith('.git'):
            repo_url = repo_url[:-4]
        
        zip_urls = [
            f"{repo_url}/archive/refs/heads/main.zip",
            f"{repo_url}/archive/refs/heads/master.zip",
            f"{repo_url}/archive/main.zip",
            f"{repo_url}/archive/master.zip"
        ]
        
        for zip_url in zip_urls:
            try:
                print(f"📦 Downloading ZIP from: {zip_url}")
                
                # Download with custom headers
                req = urllib.request.Request(
                    zip_url,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Linux; Ubuntu) Git/2.34.1'
                    }
                )
                
                with urllib.request.urlopen(req, timeout=300) as response:
                    zip_path = f"{target_dir}.zip"
                    with open(zip_path, 'wb') as f:
                        shutil.copyfileobj(response, f)
                
                print(f"📦 Extracting ZIP to: {target_dir}")
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall("temp_extract")
                
                # Move extracted content to target directory
                extracted_dirs = os.listdir("temp_extract")
                if extracted_dirs:
                    shutil.move(f"temp_extract/{extracted_dirs[0]}", target_dir)
                    shutil.rmtree("temp_extract")
                    os.remove(zip_path)
                    
                    print("✅ Successfully downloaded and extracted ZIP")
                    return True
                
            except Exception as e:
                print(f"❌ ZIP download failed for {zip_url}: {e}")
                continue
        
        return False
        
    except Exception as e:
        print(f"❌ ZIP download method failed: {e}")
        return False

def clone_with_retry(repo_url, target_dir, max_retries=3):
    """Clone repository with multiple retry strategies"""
    
    # Clean up existing directory if it exists
    if os.path.exists(target_dir):
        print(f"🗑️ Removing existing directory: {target_dir}")
        shutil.rmtree(target_dir)
    
    # Strategy 1: Normal clone with shallow depth
    for attempt in range(max_retries):
        print(f"📥 Attempt {attempt + 1}: Normal clone with --depth 1")
        result = run_command(f"git clone --depth 1 --single-branch {repo_url} {target_dir}", timeout=900)
        if result and result.returncode == 0:
            print("✅ Successfully cloned with normal method")
            return True
        
        print(f"⏳ Waiting 10 seconds before retry...")
        time.sleep(10)
    
    # Strategy 2: Clone with SSL verification disabled
    print("🔄 Trying with SSL verification disabled...")
    env = os.environ.copy()
    env['GIT_SSL_NO_VERIFY'] = 'true'
    
    for attempt in range(max_retries):
        print(f"📥 Attempt {attempt + 1}: Clone with SSL verification disabled")
        try:
            result = subprocess.run(
                f"git clone --depth 1 --single-branch {repo_url} {target_dir}",
                shell=True,
                env=env,
                timeout=900,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print("✅ Successfully cloned with SSL verification disabled")
                return True
        except Exception as e:
            print(f"❌ SSL bypass attempt failed: {e}")
        
        time.sleep(10)
    
    # Strategy 3: Use HTTP instead of HTTPS (if available)
    if repo_url.startswith('https://'):
        http_url = repo_url.replace('https://', 'http://')
        print(f"🔄 Trying HTTP instead of HTTPS: {http_url}")
        
        for attempt in range(max_retries):
            print(f"📥 Attempt {attempt + 1}: HTTP clone")
            result = run_command(f"git clone --depth 1 {http_url} {target_dir}", timeout=900)
            if result and result.returncode == 0:
                print("✅ Successfully cloned with HTTP")
                return True
            
            time.sleep(10)
    
    # Strategy 4: Download as ZIP and extract
    if 'github.com' in repo_url:
        print("🔄 Trying ZIP download method as final fallback...")
        return download_as_zip(repo_url, target_dir)
    
    return False

def clone_forge():
    """Clone Stable Diffusion WebUI Forge with comprehensive error handling"""
    repo_url = "https://github.com/lllyasviel/stable-diffusion-webui-forge.git"
    target_dir = "/home/xlab-app-center/stable-diffusion-webui-forge"
    
    print("🚀 Starting Stable Diffusion WebUI Forge clone process...")
    
    # Step 1: Update system and install dependencies
    print("🔄 Updating system packages...")
    run_command("apt-get update -qq", capture_output=True)
    run_command("apt-get install -y ca-certificates curl git openssl", capture_output=True)
    
    # Step 2: Fix Git configuration
    fix_git_config()
    
    # Step 3: Attempt clone with multiple strategies
    if clone_with_retry(repo_url, target_dir):
        print("🎉 Successfully cloned Stable Diffusion WebUI Forge!")
        
        # Verify the clone was successful
        if os.path.exists(f"{target_dir}/webui.py") or os.path.exists(f"{target_dir}/launch.py"):
            print("✅ Repository appears to be complete")
            return True
        else:
            print("⚠️ Repository cloned but main files not found")
            return False
    else:
        print("❌ All clone methods failed.")
        print("\n🔧 Manual troubleshooting options:")
        print("1. Check internet connection and DNS")
        print("2. Try manual download: wget https://github.com/lllyasviel/stable-diffusion-webui-forge/archive/main.zip")
        print("3. Contact system administrator about firewall/proxy settings")
        print("4. Try using a different network or VPN")
        return False

def main():
    """Main setup function"""
    try:
        print("🚀 Starting Stable Diffusion WebUI Forge Setup")
        print("=" * 50)
        
        # Clone the repository
        if clone_forge():
            print("\n🎉 Setup completed successfully!")
            print("You can now proceed with installing dependencies and running the WebUI.")
        else:
            print("\n❌ Setup failed. Please check the error messages above.")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Unexpected error during setup: {e}")
        print("Please report this issue with the full error log.")
        sys.exit(1)

if __name__ == "__main__":
    main() 