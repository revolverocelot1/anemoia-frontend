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
        pointerLocked: false,
        isInitialized: false,
        mouseSensitivity: 0.4  // Reduced from 1.0 (default) to 0.4 for less sensitive mouse
    };
    
    // Get elements
    const canvas = document.getElementById('canvas');
    const loadingElement = document.getElementById('loading');
    const keyboardFocus = document.getElementById('keyboard-focus');
    const statusElement = document.getElementById('status');
    const progressElement = document.getElementById('progress-fill');
    
    // Initialize
    function init() {
        if (state.isInitialized) return;
        state.isInitialized = true;
        
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
        
        // Auto-start the game
        autoStartGame();
    }
    
    // Auto-start game function
    function autoStartGame() {
        // Check if Module is ready
        const checkAndStart = () => {
            if (window.Module && window.Module._main) {
                // Wait a bit for game to initialize
                setTimeout(() => {
                    // First, send Enter to get past title screen
                    simulateKeyPress('Enter');
                    
                    // Then send Escape to close any pause menu
                    setTimeout(() => {
                        simulateKeyPress('Escape');
                        
                        // Focus canvas again
                        canvas.focus();
                        
                        // Show a brief message
                        console.log('Game started automatically');
                    }, 500);
                }, 1000);
            } else {
                // Keep checking
                setTimeout(checkAndStart, 100);
            }
        };
        
        checkAndStart();
    }
    
    // Simulate a key press and release
    function simulateKeyPress(key) {
        simulateKey(key, true);
        setTimeout(() => simulateKey(key, false), 100);
    }
    
    // Keyboard Controls
    function setupKeyboardControls() {
        // Prevent default browser shortcuts
        const preventDefaultKeys = ['Tab', 'Alt', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 
                                  'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
        
        // Create a proper event handler for keyboard
        const handleKeyDown = (e) => {
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
            
            if (!state.keys[mappedKey]) {
                state.keys[mappedKey] = true;
                sendKeyToDoom(mappedKey, true);
            }
            
            // Show keyboard focus indicator
            showKeyboardFocus();
        };
        
        const handleKeyUp = (e) => {
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
            
            if (state.keys[mappedKey]) {
                state.keys[mappedKey] = false;
                sendKeyToDoom(mappedKey, false);
            }
        };
        
        // Add event listeners to both canvas and document
        canvas.addEventListener('keydown', handleKeyDown, true);
        canvas.addEventListener('keyup', handleKeyUp, true);
        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('keyup', handleKeyUp, true);
        
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
            e.preventDefault();
            canvas.focus();
            
            if (e.button === 0) { // Left click
                state.keys['Control'] = true;
                sendKeyToDoom('Control', true);
            } else if (e.button === 2) { // Right click
                state.keys['Alt'] = true;
                sendKeyToDoom('Alt', true);
            }
        });
        
        canvas.addEventListener('mouseup', (e) => {
            e.preventDefault();
            
            if (e.button === 0) {
                state.keys['Control'] = false;
                sendKeyToDoom('Control', false);
            } else if (e.button === 2) {
                state.keys['Alt'] = false;
                sendKeyToDoom('Alt', false);
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (state.pointerLocked || state.hasFocus) {
                const movementX = e.movementX || e.mozMovementX || 0;
                const movementY = e.movementY || e.mozMovementY || 0;
                
                if (movementX !== 0 || movementY !== 0) {
                    // Apply sensitivity multiplier to reduce mouse movement
                    handleMouseMove(movementX * state.mouseSensitivity, movementY * state.mouseSensitivity);
                }
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
                canvas.requestPointerLock = canvas.requestPointerLock ||
                                          canvas.mozRequestPointerLock ||
                                          canvas.webkitRequestPointerLock;
                                          
                if (canvas.requestPointerLock) {
                    canvas.requestPointerLock();
                }
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            state.pointerLocked = document.pointerLockElement === canvas;
        });
        
        document.addEventListener('mozpointerlockchange', () => {
            state.pointerLocked = document.mozPointerLockElement === canvas;
        });
        
        document.addEventListener('pointerlockerror', () => {
            console.warn('Pointer lock failed');
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
        if (!window.Module || !window.Module.canvas) {
            console.warn('Module not ready for key event');
            return;
        }
        
        // Create proper key event
        let keyCode;
        switch(key) {
            case 'ArrowUp': keyCode = 38; break;
            case 'ArrowDown': keyCode = 40; break;
            case 'ArrowLeft': keyCode = 37; break;
            case 'ArrowRight': keyCode = 39; break;
            case 'Control': keyCode = 17; break;
            case 'Shift': keyCode = 16; break;
            case 'Space': keyCode = 32; break;
            case 'Enter': keyCode = 13; break;
            case 'Escape': keyCode = 27; break;
            case 'Tab': keyCode = 9; break;
            case '1': keyCode = 49; break;
            case '2': keyCode = 50; break;
            case '3': keyCode = 51; break;
            case '4': keyCode = 52; break;
            case '5': keyCode = 53; break;
            case '6': keyCode = 54; break;
            case '7': keyCode = 55; break;
            default: keyCode = key.charCodeAt(0);
        }
        
        const event = new KeyboardEvent(isDown ? 'keydown' : 'keyup', {
            key: key,
            keyCode: keyCode,
            which: keyCode,
            code: key,
            bubbles: true,
            cancelable: true
        });
        
        // Dispatch to both canvas and document
        window.Module.canvas.dispatchEvent(event);
        document.dispatchEvent(event);
    }
    
    // Handle mouse movement
    function handleMouseMove(deltaX, deltaY) {
        if (!window.Module || !window.Module.canvas) return;
        
        // Create mouse event
        const event = new MouseEvent('mousemove', {
            movementX: deltaX,
            movementY: deltaY,
            bubbles: true,
            cancelable: true
        });
        
        window.Module.canvas.dispatchEvent(event);
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
            console.log('Doom engine loaded, initializing controls...');
            init();
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
        },
        
        // Ensure keyboard input works
        keyboardListeningElement: canvas
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