#!/bin/bash

# Quick Fix for Git Clone SSL/TLS Issues
# Run this script to fix the Stable Diffusion WebUI Forge clone error

echo "🔧 Fixing Git configuration for SSL/TLS issues..."

# Update system packages
apt-get update -qq
apt-get install -y ca-certificates curl git openssl

# Configure Git for better SSL/TLS handling
git config --global http.version HTTP/1.1
git config --global http.postBuffer 1048576000
git config --global http.maxRequestBuffer 100M
git config --global http.sslBackend openssl
git config --global http.sslVerify true
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999
git config --global http.timeout 600
git config --global url.https://github.com/.insteadOf git://github.com/

echo "✅ Git configuration updated"

# Remove existing directory if it exists
if [ -d "/home/xlab-app-center/stable-diffusion-webui-forge" ]; then
    echo "🗑️ Removing existing directory..."
    rm -rf /home/xlab-app-center/stable-diffusion-webui-forge
fi

echo "📥 Attempting to clone Stable Diffusion WebUI Forge..."

# Try multiple clone strategies
if git clone --depth 1 --single-branch https://github.com/lllyasviel/stable-diffusion-webui-forge.git /home/xlab-app-center/stable-diffusion-webui-forge; then
    echo "✅ Successfully cloned with normal method"
elif GIT_SSL_NO_VERIFY=true git clone --depth 1 --single-branch https://github.com/lllyasviel/stable-diffusion-webui-forge.git /home/xlab-app-center/stable-diffusion-webui-forge; then
    echo "✅ Successfully cloned with SSL verification disabled"
elif git clone --depth 1 http://github.com/lllyasviel/stable-diffusion-webui-forge.git /home/xlab-app-center/stable-diffusion-webui-forge; then
    echo "✅ Successfully cloned with HTTP"
else
    echo "❌ Git clone failed, trying ZIP download..."
    
    # Download as ZIP file
    cd /home/xlab-app-center
    wget -O forge.zip https://github.com/lllyasviel/stable-diffusion-webui-forge/archive/refs/heads/main.zip
    
    if [ $? -eq 0 ]; then
        echo "📦 Extracting ZIP file..."
        unzip -q forge.zip
        mv stable-diffusion-webui-forge-main stable-diffusion-webui-forge
        rm forge.zip
        echo "✅ Successfully downloaded and extracted ZIP"
    else
        echo "❌ All methods failed. Manual intervention required."
        exit 1
    fi
fi

echo "🎉 Stable Diffusion WebUI Forge setup completed successfully!" 