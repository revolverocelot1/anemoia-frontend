import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a test video using ffmpeg (if available on system)
async function createTestVideo() {
  const outputPath = path.join(__dirname, '..', 'test-video.mp4');
  
  try {
    // Check if ffmpeg is available
    execSync('ffmpeg -version', { stdio: 'ignore' });
    
    // Create a 5 second test video with color bars
    const command = `ffmpeg -y -f lavfi -i testsrc=duration=5:size=1280x720:rate=30 -f lavfi -i sine=frequency=1000:duration=5 -c:v libx264 -c:a aac -pix_fmt yuv420p "${outputPath}"`;
    
    console.log('Creating test video...');
    execSync(command, { stdio: 'inherit' });
    console.log(`Test video created: ${outputPath}`);
  } catch (error) {
    console.error('FFmpeg not available. Creating a simple HTML file to generate video instead...');
    
    // Create an HTML file that can generate a test video
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Test Video Generator</title>
</head>
<body>
    <h1>Test Video Generator</h1>
    <canvas id="canvas" width="640" height="480"></canvas>
    <br>
    <button id="generate">Generate Test Video</button>
    <br>
    <video id="preview" controls style="display:none;"></video>
    <br>
    <a id="download" style="display:none;">Download Test Video</a>
    
    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const generateBtn = document.getElementById('generate');
        const preview = document.getElementById('preview');
        const downloadLink = document.getElementById('download');
        
        generateBtn.addEventListener('click', async () => {
            const stream = canvas.captureStream(30);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            
            const chunks = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                preview.src = url;
                preview.style.display = 'block';
                downloadLink.href = url;
                downloadLink.download = 'test-video.webm';
                downloadLink.textContent = 'Download Test Video';
                downloadLink.style.display = 'block';
            };
            
            // Animate canvas for 5 seconds
            mediaRecorder.start();
            const startTime = Date.now();
            
            function animate() {
                const elapsed = Date.now() - startTime;
                if (elapsed < 5000) {
                    // Draw animated content
                    const hue = (elapsed / 20) % 360;
                    ctx.fillStyle = \`hsl(\${hue}, 100%, 50%)\`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.fillStyle = 'white';
                    ctx.font = '48px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('Test Video', canvas.width / 2, canvas.height / 2);
                    ctx.font = '24px Arial';
                    ctx.fillText(\`Time: \${(elapsed / 1000).toFixed(1)}s\`, canvas.width / 2, canvas.height / 2 + 50);
                    
                    requestAnimationFrame(animate);
                } else {
                    mediaRecorder.stop();
                }
            }
            
            animate();
        });
        
        // Draw initial frame
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Click Generate', canvas.width / 2, canvas.height / 2);
    </script>
</body>
</html>`;
    
    const htmlPath = path.join(__dirname, '..', 'generate-test-video.html');
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`Created HTML video generator: ${htmlPath}`);
    console.log('Open this file in a browser to generate a test video.');
  }
}

createTestVideo(); 