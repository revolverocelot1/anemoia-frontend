// DOOM Loader Script
// This script attempts to load DOOM from multiple sources

(function() {
    const DOOM_SOURCES = [
        {
            name: 'Local Files',
            js: '/doom/doom.js',
            wasm: '/doom/doom.wasm',
            wad: '/doom/doom1.wad'
        },
        {
            name: 'midzer CDN',
            js: 'https://midzer.de/wasm/doom/doom.js',
            wasm: 'https://midzer.de/wasm/doom/doom.wasm',
            wad: 'https://midzer.de/wasm/doom/doom1.wad',
            cors: true
        }
    ];

    let currentSourceIndex = 0;
    let loadAttempts = 0;

    function updateStatus(message, isError = false) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
            if (isError) {
                statusEl.style.color = '#ff6666';
            }
        }
        console.log(`[DOOM Loader] ${message}`);
    }

    function showError(message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error-details').textContent = message;
    }

    async function checkFileExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async function loadDoomFromSource(source) {
        updateStatus(`Attempting to load from ${source.name}...`);

        // Check if files exist
        const jsExists = await checkFileExists(source.js);
        if (!jsExists) {
            throw new Error(`${source.name}: doom.js not found`);
        }

        // For CORS sources, we need to handle differently
        if (source.cors) {
            updateStatus(`Loading from external source: ${source.name}`);
            
            // Create a proxy iframe approach for CORS sources
            window.Module = window.Module || {};
            window.Module.locateFile = function(file) {
                if (file.endsWith('.wasm')) {
                    return source.wasm;
                } else if (file.endsWith('.wad')) {
                    return source.wad;
                }
                return file;
            };
        }

        // Load the DOOM JavaScript
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = source.js;
            script.onload = () => {
                updateStatus(`Successfully loaded from ${source.name}`);
                resolve();
            };
            script.onerror = () => {
                reject(new Error(`Failed to load doom.js from ${source.name}`));
            };
            document.body.appendChild(script);
        });
    }

    async function tryLoadDoom() {
        if (currentSourceIndex >= DOOM_SOURCES.length) {
            showError('Failed to load DOOM from all available sources. Please check the README.md for setup instructions.');
            return;
        }

        const source = DOOM_SOURCES[currentSourceIndex];
        
        try {
            await loadDoomFromSource(source);
            // Success!
            return;
        } catch (error) {
            console.error(`[DOOM Loader] ${error.message}`);
            updateStatus(`${source.name} failed, trying next source...`);
            
            // Try next source
            currentSourceIndex++;
            loadAttempts++;
            
            // Add a small delay before trying the next source
            setTimeout(() => tryLoadDoom(), 500);
        }
    }

    // Start loading process
    updateStatus('Initializing DOOM loader...');
    
    // Ensure Module is defined before any scripts load
    window.Module = window.Module || {
        canvas: document.getElementById('doom-canvas'),
        preRun: [],
        postRun: [],
        print: function(text) {
            console.log(text);
        },
        printErr: function(text) {
            console.error(text);
        },
        onRuntimeInitialized: function() {
            console.log('DOOM Runtime initialized');
            document.getElementById('loading').style.display = 'none';
            document.getElementById('controls').style.display = 'block';
        },
        setStatus: function(text) {
            if (!text) return;
            
            // Parse progress from status messages
            const m = text.match(/\((\d+(\.\d+)?)\/(\d+)\)/);
            if (m) {
                const current = parseFloat(m[1]);
                const total = parseFloat(m[3]);
                const percent = (current / total) * 100;
                document.getElementById('progress-fill').style.width = percent + '%';
            }
            
            updateStatus(text);
        }
    };

    // Start loading
    tryLoadDoom();
})(); 