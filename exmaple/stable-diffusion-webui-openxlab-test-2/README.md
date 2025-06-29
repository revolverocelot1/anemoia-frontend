# Stable Diffusion WebUI Forge - OpenXLab Edition

## 🚀 What's New in This Version

This is a completely rewritten and improved version of the Stable Diffusion WebUI deployment for OpenXLab, now using the modern [Forge backend](https://github.com/lllyasviel/stable-diffusion-webui-forge).

### ✅ Fixed Issues from Original Repo
- **IndentationError**: Completely eliminated by removing hacky sed modifications
- **Compatibility Issues**: Updated to work with latest Forge version
- **Slow Downloads**: Optimized with faster mirrors and better download logic
- **iframe Embedding**: Enhanced CSS and configuration for seamless website integration

### 🎨 Key Features
- **Latest Forge Backend**: Much better performance and stability
- **ControlNet Integration**: Advanced image control and manipulation
- **Optimized Downloads**: Faster model downloads using OpenXLab mirrors
- **iframe Ready**: Perfect for embedding in websites as tabs
- **Better Error Handling**: Robust setup with proper error messages
- **Mobile Responsive**: Works great on all devices

### 🔧 Technical Improvements
- Uses `stable-diffusion-webui-forge` instead of outdated camenduru fork
- Proper Python-based setup instead of shell command hacks
- Better dependency management with updated requirements
- Custom CSS for iframe embedding optimization
- Environment variable optimization for performance

### 📦 Deployment

1. Upload these files to your OpenXLab project
2. Set `app.py` as your main application file
3. Deploy and enjoy the improved performance!

### 🌐 Website Integration

To embed this in your website as a tab:

```html
<iframe 
  src="https://your-openxlab-url.com" 
  width="100%" 
  height="800px" 
  frameborder="0"
  allow="camera; microphone; clipboard-read; clipboard-write">
</iframe>
```

### 📞 Support

- **GitHub**: [revolverocelot1](https://github.com/revolverocelot1)
- **Email**: srushtiraj.patil20@vit.edu

### 📄 License

This project is based on Stable Diffusion WebUI Forge and maintains the same AGPL-3.0 license.

## Main Repo
https://github.com/AUTOMATIC1111/stable-diffusion-webui (Thanks to @AUTOMATIC1111 ❤)

