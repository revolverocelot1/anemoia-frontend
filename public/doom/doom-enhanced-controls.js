// Enhanced DOOM Controls with Mobile Support
(function() {
    'use strict';
    
    // State management
    const state = {
        keys: {},
        touches: {},
        mouseX: 0,
        mouseY: 0,
        touchStartX: 0,
        touchStartY: 0,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        hasFocus: false,
        pointerLocked: false
    };
    
    // Get elements
    const canvas = document.getElementById('canvas');
    const loadingElement = document.getElementById('loading');
    const keyboardFocus = document.getElementById('keyboard-focus');
    const statusElement = document.getElementById('status');
    const progressElement = document.getElementById('progress-fill');
    
    // Initialize
    function init() {
        setupKeyboardControls();
        setupMouseControls();
        setupMobileControls();
        setupPointerLock();
        
        // Focus canvas for keyboard input
        canvas.focus();
        
        // Show mobile controls if on mobile
        if (state.isMobile) {
            document.getElementById('mobile-controls').style.display = 'block';
        }
    }
    
    // Keyboard Controls
    function setupKeyboardControls() {
        // Prevent default browser shortcuts
        const preventDefaultKeys = ['Tab', 'Alt', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 
                                  'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
        
        canvas.addEventListener('keydown', (e) => {
            if (preventDefaultKeys.includes(e.key)) {
                e.preventDefault();
            }
            
            // Map modern keys to Doom keys
            const keyMap = {
                'w': 'ArrowUp',
                'W': 'ArrowUp',
                's': 'ArrowDown',
                'S': 'ArrowDown',
                'a': 'ArrowLeft',
                'A': 'ArrowLeft',
                'd': 'ArrowRight',
                'D': 'ArrowRight',
                'Control': 'Control',
                'Shift': 'Shift',
                'e': 'Space',
                'E': 'Space',
                ' ': 'Space',
                'Enter': 'Enter',
                'Escape': 'Escape',
                'Tab': 'Tab',
                '1': '1', '2': '2', '3': '3', '4': '4', 
                '5': '5', '6': '6', '7': '7'
            };
            
            const mappedKey = keyMap[e.key] || e.key;
            state.keys[mappedKey] = true;
            
            // Send key event to Doom
            sendKeyToDoom(mappedKey, true);
            
            // Show keyboard focus indicator
            showKeyboardFocus();
        });
        
        canvas.addEventListener('keyup', (e) => {
            const keyMap = {
                'w': 'ArrowUp',
                'W': 'ArrowUp',
                's': 'ArrowDown',
                'S': 'ArrowDown',
                'a': 'ArrowLeft',
                'A': 'ArrowLeft',
                'd': 'ArrowRight',
                'D': 'ArrowRight',
                'Control': 'Control',
                'Shift': 'Shift',
                'e': 'Space',
                'E': 'Space',
                ' ': 'Space'
            };
            
            const mappedKey = keyMap[e.key] || e.key;
            state.keys[mappedKey] = false;
            
            // Send key event to Doom
            sendKeyToDoom(mappedKey, false);
        });
        
        // Handle focus
        canvas.addEventListener('focus', () => {
            state.hasFocus = true;
            showKeyboardFocus();
        });
        
        canvas.addEventListener('blur', () => {
            state.hasFocus = false;
            hideKeyboardFocus();
            // Release all keys
            Object.keys(state.keys).forEach(key => {
                if (state.keys[key]) {
                    state.keys[key] = false;
                    sendKeyToDoom(key, false);
                }
            });
        });
        
        // Click to focus
        document.addEventListener('click', (e) => {
            if (e.target === canvas || e.target.closest('#canvas')) {
                canvas.focus();
            }
        });
    }
    
    // Mouse Controls
    function setupMouseControls() {
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                state.keys['Control'] = true;
                sendKeyToDoom('Control', true);
            } else if (e.button === 2) { // Right click
                e.preventDefault();
                state.keys['Alt'] = true;
                sendKeyToDoom('Alt', true);
            }
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                state.keys['Control'] = false;
                sendKeyToDoom('Control', false);
            } else if (e.button === 2) {
                state.keys['Alt'] = false;
                sendKeyToDoom('Alt', false);
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (state.pointerLocked) {
                handleMouseMove(e.movementX, e.movementY);
            }
        });
        
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    // Pointer Lock for better mouse control
    function setupPointerLock() {
        canvas.addEventListener('click', () => {
            if (!state.pointerLocked && !state.isMobile) {
                canvas.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            state.pointerLocked = document.pointerLockElement === canvas;
        });
        
        document.addEventListener('pointerlockerror', () => {
            console.error('Pointer lock failed');
        });
    }
    
    // Mobile Controls
    function setupMobileControls() {
        if (!state.isMobile) return;
        
        // D-Pad controls
        const dpadButtons = document.querySelectorAll('.dpad-button');
        dpadButtons.forEach(button => {
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const key = button.dataset.key;
                simulateKey(key, true);
                button.classList.add('active');
            });
            
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                const key = button.dataset.key;
                simulateKey(key, false);
                button.classList.remove('active');
            });
        });
        
        // Action buttons
        const actionButtons = document.querySelectorAll('.action-button');
        actionButtons.forEach(button => {
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const key = button.dataset.key;
                simulateKey(key, true);
                button.classList.add('active');
            });
            
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                const key = button.dataset.key;
                simulateKey(key, false);
                button.classList.remove('active');
            });
        });
        
        // Touch look controls
        const touchLook = document.getElementById('touch-look');
        let touchId = null;
        
        touchLook.addEventListener('touchstart', (e) => {
            if (touchId === null && e.touches.length > 0) {
                const touch = e.touches[0];
                touchId = touch.identifier;
                state.touchStartX = touch.clientX;
                state.touchStartY = touch.clientY;
            }
        });
        
        touchLook.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.identifier === touchId) {
                    const deltaX = touch.clientX - state.touchStartX;
                    const deltaY = touch.clientY - state.touchStartY;
                    
                    // Convert touch movement to mouse look
                    handleMouseMove(deltaX * 0.5, deltaY * 0.5);
                    
                    state.touchStartX = touch.clientX;
                    state.touchStartY = touch.clientY;
                    break;
                }
            }
        });
        
        touchLook.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    touchId = null;
                    break;
                }
            }
        });
        
        // Menu button
        document.getElementById('menu-button').addEventListener('click', () => {
            simulateKey('Escape', true);
            setTimeout(() => simulateKey('Escape', false), 100);
        });
    }
    
    // Simulate keyboard input
    function simulateKey(key, isDown) {
        const keyMap = {
            'w': 'ArrowUp',
            's': 'ArrowDown',
            'a': 'ArrowLeft',
            'd': 'ArrowRight',
            'e': 'Space',
            'Control': 'Control',
            'Shift': 'Shift',
            'Escape': 'Escape'
        };
        
        const mappedKey = keyMap[key] || key;
        state.keys[mappedKey] = isDown;
        sendKeyToDoom(mappedKey, isDown);
    }
    
    // Send key events to Doom
    function sendKeyToDoom(key, isDown) {
        if (window.Module && window.Module.canvas) {
            const event = new KeyboardEvent(isDown ? 'keydown' : 'keyup', {
                key: key,
                code: key,
                bubbles: true,
                cancelable: true
            });
            window.Module.canvas.dispatchEvent(event);
        }
    }
    
    // Handle mouse movement
    function handleMouseMove(deltaX, deltaY) {
        if (window.Module && window.Module._mouseMove) {
            // Call Doom's mouse move function if available
            window.Module._mouseMove(deltaX, deltaY);
        } else {
            // Fallback: simulate mouse events
            if (window.Module && window.Module.canvas) {
                const event = new MouseEvent('mousemove', {
                    movementX: deltaX,
                    movementY: deltaY,
                    bubbles: true
                });
                window.Module.canvas.dispatchEvent(event);
            }
        }
    }
    
    // UI Helpers
    function showKeyboardFocus() {
        keyboardFocus.classList.add('active');
        clearTimeout(keyboardFocus.hideTimeout);
        keyboardFocus.hideTimeout = setTimeout(() => {
            keyboardFocus.classList.remove('active');
        }, 2000);
    }
    
    function hideKeyboardFocus() {
        keyboardFocus.classList.remove('active');
    }
    
    function updateProgress(percent) {
        progressElement.style.width = percent + '%';
    }
    
    // Module configuration for Emscripten
    window.Module = {
        preRun: [],
        postRun: [function() {
            init();
            
            // Auto-start the game after initialization
            setTimeout(() => {
                // Send an Enter key press to start the game
                simulateKey('Enter', true);
                setTimeout(() => simulateKey('Enter', false), 100);
                
                // Send Escape key to close any pause menu if it appears
                setTimeout(() => {
                    simulateKey('Escape', true);
                    setTimeout(() => simulateKey('Escape', false), 100);
                }, 200);
                
                // Focus the canvas to ensure input works
                canvas.focus();
            }, 1000);
        }],
        
        canvas: canvas,
        
        print: function(text) {
            console.log(text);
        },
        
        printErr: function(text) {
            console.error(text);
        },
        
        setStatus: function(text) {
            if (!Module.setStatus.last) Module.setStatus.last = { time: Date.now(), text: '' };
            if (text === Module.setStatus.last.text) return;
            
            var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
            var now = Date.now();
            
            if (m && now - Module.setStatus.last.time < 30) return;
            Module.setStatus.last.time = now;
            Module.setStatus.last.text = text;
            
            if (m) {
                text = m[1];
                updateProgress((parseInt(m[2]) / parseInt(m[4])) * 100);
            } else {
                updateProgress(100);
            }
            
            statusElement.innerHTML = text;
        },
        
        totalDependencies: 0,
        
        monitorRunDependencies: function(left) {
            this.totalDependencies = Math.max(this.totalDependencies, left);
            Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
            
            if (left === 0) {
                setTimeout(() => {
                    loadingElement.style.display = 'none';
                    canvas.focus();
                }, 500);
            }
        }
    };
    
    Module.setStatus('Downloading...');
    
    // Load the DOOM script
    var script = document.createElement('script');
    script.src = 'doom1.js';
    script.onerror = function() {
        Module.setStatus('Failed to load DOOM engine');
    };
    document.body.appendChild(script);
    
    // Exit game helper
    window.exitGame = function() {
        if (window.parent !== window) {
            window.parent.postMessage({ action: 'exitDoom' }, '*');
        }
    };
})(); 