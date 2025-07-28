let currentMode = 'image';
let baselineFile = null;
let comparisonFile = null;
let batchFiles = [];
let currentResults = null;
let allResults = [];
let settings = {
    ssimThreshold: 85,
    perceptualThreshold: 10,
    textThreshold: 90,
    exportFormat: 'json'
};
let activeFilters = {
    dateFrom: null,
    dateTo: null,
    scoreMin: null,
    scoreMax: null,
    testName: ''
};

// Mode Selection
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-indigo-500');
    });
    document.getElementById(`mode-${mode}`).classList.add('ring-2', 'ring-indigo-500');
    
    // Show/hide sections
    document.getElementById('image-section').classList.toggle('hidden', mode !== 'image');
    document.getElementById('url-section').classList.toggle('hidden', mode !== 'url');
    document.getElementById('batch-section').classList.toggle('hidden', mode !== 'batch');
    
    // Reset results
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('export-btn').classList.add('hidden');
}

// File Handling
function handleFileSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (type === 'baseline') {
        baselineFile = file;
        showPreview(file, 'baseline');
    } else {
        comparisonFile = file;
        showPreview(file, 'comparison');
    }
}

function showPreview(file, type) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById(`${type}-preview`);
        preview.querySelector('img').src = e.target.result;
        preview.querySelector('p').textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// Batch File Handling
function handleBatchFiles(event) {
    batchFiles = Array.from(event.target.files);
    const preview = document.getElementById('batch-preview');
    
    if (batchFiles.length === 0) {
        preview.innerHTML = '';
        return;
    }

    // Group files into pairs
    const pairs = [];
    for (let i = 0; i < batchFiles.length; i += 2) {
        if (i + 1 < batchFiles.length) {
            pairs.push({
                baseline: batchFiles[i],
                comparison: batchFiles[i + 1]
            });
        }
    }

    preview.innerHTML = `
        <h4 class="font-semibold mb-2">Selected Pairs (${pairs.length})</h4>
        <div class="space-y-2 max-h-48 overflow-y-auto">
            ${pairs.map((pair, idx) => `
                <div class="flex items-center justify-between p-2 bg-gray-800 rounded">
                    <span class="text-sm">
                        Pair ${idx + 1}: ${pair.baseline.name} ↔ ${pair.comparison.name}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

// Drag and Drop
function setupDragAndDrop() {
    ['baseline-drop', 'comparison-drop', 'batch-drop'].forEach(id => {
        const dropZone = document.getElementById(id);
        if (!dropZone) return;
        
        const input = dropZone.querySelector('input[type="file"]');
        
        dropZone.addEventListener('click', () => input.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                input.files = files;
                input.dispatchEvent(new Event('change'));
            }
        });
    });
}

// Start Comparison
async function startComparison() {
    if (currentMode === 'image' && (!baselineFile || !comparisonFile)) {
        alert('Please upload both baseline and comparison images');
        return;
    }
    
    if (currentMode === 'url') {
        const baselineUrl = document.getElementById('baseline-url').value;
        const comparisonUrl = document.getElementById('comparison-url').value;
        if (!baselineUrl || !comparisonUrl) {
            alert('Please enter both URLs');
            return;
        }
    }

    if (currentMode === 'batch' && batchFiles.length < 2) {
        alert('Please select at least one pair of images');
        return;
    }
    
    // Show loading state
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('compare-btn').disabled = true;
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        document.getElementById('progress-bar').style.width = `${progress}%`;
    }, 500);
    
    try {
        let response;
        
        if (currentMode === 'image') {
            const formData = new FormData();
            formData.append('baseline', baselineFile);
            formData.append('comparison', comparisonFile);
            formData.append('test_name', document.getElementById('test-name').value || 'test');
            
            response = await fetch('/api/compare/screenshots', {
                method: 'POST',
                body: formData
            });
        } else if (currentMode === 'url') {
            response = await fetch('/api/compare/urls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    baseline_url: document.getElementById('baseline-url').value,
                    comparison_url: document.getElementById('comparison-url').value,
                    test_name: document.getElementById('url-test-name').value || 'url_test'
                })
            });
        } else if (currentMode === 'batch') {
            // For batch processing, we'll send multiple requests
            const results = [];
            for (let i = 0; i < batchFiles.length; i += 2) {
                if (i + 1 < batchFiles.length) {
                    const formData = new FormData();
                    formData.append('baseline', batchFiles[i]);
                    formData.append('comparison', batchFiles[i + 1]);
                    formData.append('test_name', `batch_test_${i/2 + 1}`);
                    
                    const batchResponse = await fetch('/api/compare/screenshots', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (batchResponse.ok) {
                        const data = await batchResponse.json();
                        results.push(data);
                    }
                }
            }
            
            // Store batch results
            const batchResult = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                pairs: results.length,
                results: results
            };
            
            // Save to localStorage
            const batchHistory = JSON.parse(localStorage.getItem('batchHistory') || '[]');
            batchHistory.unshift(batchResult);
            localStorage.setItem('batchHistory', JSON.stringify(batchHistory.slice(0, 50)));
            
            // Process first result for display
            if (results.length > 0) {
                response = { ok: true };
                const firstJobId = results[0].job_id;
                await pollJobStatus(firstJobId);
            }
            
            clearInterval(progressInterval);
            document.getElementById('loading-state').classList.add('hidden');
            document.getElementById('compare-btn').disabled = false;
            return;
        }
        
        const data = await response.json();
        
        if (response.ok) {
            // Poll for job status
            await pollJobStatus(data.job_id);
        } else {
            throw new Error(data.error || 'Comparison failed');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        clearInterval(progressInterval);
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('compare-btn').disabled = false;
    }
}

// Poll Job Status
async function pollJobStatus(jobId) {
    const maxAttempts = 60;
    let attempts = 0;
    
    const poll = async () => {
        const response = await fetch(`/api/jobs/${jobId}/status`);
        const data = await response.json();
        
        if (data.status === 'completed') {
            document.getElementById('progress-bar').style.width = '100%';
            setTimeout(() => {
                displayResults(data);
                loadRecentResults();
            }, 500);
        } else if (data.status === 'failed') {
            throw new Error(data.error || 'Comparison failed');
        } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(poll, 1000);
        } else {
            throw new Error('Comparison timeout');
        }
    };
    
    await poll();
}

// Display Results
function displayResults(data) {
    currentResults = data;
    const results = data.results_summary;
    
    // Animate scores
    animateScore('composite-score', results.composite_score, '%');
    animateScore('ssim-score', results.ssim_score, '', 2);
    animateScore('text-similarity', results.text_similarity, '%');
    animateScore('diff-percentage', 100 - results.composite_score, '%');
    
    // Score bar
    document.getElementById('score-bar').style.width = `${results.composite_score}%`;
    
    // Report link
    document.getElementById('view-report').href = data.report_url;
    
    // Show results and export button
    document.getElementById('results-section').classList.remove('hidden');
    document.getElementById('export-btn').classList.remove('hidden');
}

// Animate Score
function animateScore(elementId, targetValue, suffix = '', decimals = 0) {
    const element = document.getElementById(elementId);
    const duration = 1000;
    const start = 0;
    const increment = targetValue / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= targetValue) {
            current = targetValue;
            clearInterval(timer);
        }
        element.textContent = current.toFixed(decimals) + suffix;
    }, 16);
}

// Load Recent Results
async function loadRecentResults() {
    try {
        const response = await fetch('/api/results');
        const results = await response.json();
        allResults = results;
        
        displayFilteredResults();
    } catch (error) {
        console.error('Failed to load recent results:', error);
    }
}

// Display Filtered Results
function displayFilteredResults() {
    let filtered = [...allResults];

    // Apply filters
    if (activeFilters.dateFrom) {
        filtered = filtered.filter(r => new Date(r.timestamp) >= new Date(activeFilters.dateFrom));
    }
    if (activeFilters.dateTo) {
        filtered = filtered.filter(r => new Date(r.timestamp) <= new Date(activeFilters.dateTo));
    }
    if (activeFilters.scoreMin !== null) {
        filtered = filtered.filter(r => r.composite_score >= activeFilters.scoreMin);
    }
    if (activeFilters.scoreMax !== null) {
        filtered = filtered.filter(r => r.composite_score <= activeFilters.scoreMax);
    }
    if (activeFilters.testName) {
        filtered = filtered.filter(r => 
            r.test_name.toLowerCase().includes(activeFilters.testName.toLowerCase())
        );
    }

    const container = document.getElementById('recent-results');
    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">No comparisons match the filters</p>';
        return;
    }
    
    container.innerHTML = filtered.slice(0, 10).map(result => `
        <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
            <div>
                <p class="font-medium">${result.test_name}</p>
                <p class="text-sm text-gray-400">${new Date(result.timestamp).toLocaleString()}</p>
            </div>
            <div class="flex items-center space-x-4">
                <span class="text-sm font-bold ${result.composite_score > 90 ? 'text-green-400' : result.composite_score > 70 ? 'text-yellow-400' : 'text-red-400'}">
                    ${result.composite_score.toFixed(1)}%
                </span>
                <a href="${result.report_url}" target="_blank" class="text-indigo-400 hover:text-indigo-300">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
        </div>
    `).join('');
}

// Export Results
async function exportResults() {
    if (!currentResults) return;

    const format = settings.exportFormat;
    const results = currentResults.results_summary;
    
    let content, filename, mimeType;

    switch (format) {
        case 'json':
            content = JSON.stringify(currentResults, null, 2);
            filename = `comparison_${Date.now()}.json`;
            mimeType = 'application/json';
            break;
            
        case 'csv':
            content = 'Metric,Value\n';
            content += `Composite Score,${results.composite_score}\n`;
            content += `SSIM Score,${results.ssim_score}\n`;
            content += `Text Similarity,${results.text_similarity}\n`;
            content += `Visual Difference,${100 - results.composite_score}\n`;
            filename = `comparison_${Date.now()}.csv`;
            mimeType = 'text/csv';
            break;
            
        case 'html':
        case 'pdf':
            // For HTML/PDF, we'll use the existing report URL
            window.open(currentResults.report_url, '_blank');
            return;
    }

    // Create download link
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Settings Management
function showSettings() {
    document.getElementById('settings-modal').classList.add('active');
    // Load current settings
    document.getElementById('ssim-threshold').value = settings.ssimThreshold;
    document.getElementById('perceptual-threshold').value = settings.perceptualThreshold;
    document.getElementById('text-threshold').value = settings.textThreshold;
    document.getElementById('export-format').value = settings.exportFormat;
    
    updateThresholdValue('ssim', settings.ssimThreshold);
    updateThresholdValue('perceptual', settings.perceptualThreshold);
    updateThresholdValue('text', settings.textThreshold);
}

function closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
}

function updateThresholdValue(type, value) {
    document.getElementById(`${type}-value`).textContent = `${value}%`;
}

function saveSettings() {
    settings.ssimThreshold = parseInt(document.getElementById('ssim-threshold').value);
    settings.perceptualThreshold = parseInt(document.getElementById('perceptual-threshold').value);
    settings.textThreshold = parseInt(document.getElementById('text-threshold').value);
    settings.exportFormat = document.getElementById('export-format').value;
    
    // Save to localStorage
    localStorage.setItem('visualTestifySettings', JSON.stringify(settings));
    
    // Update backend config
    fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image_comparison: {
                ssim_threshold: settings.ssimThreshold / 100,
                perceptual_threshold: settings.perceptualThreshold
            },
            text_comparison: {
                similarity_threshold: settings.textThreshold / 100
            }
        })
    });
    
    closeSettings();
}

function resetSettings() {
    settings = {
        ssimThreshold: 85,
        perceptualThreshold: 10,
        textThreshold: 90,
        exportFormat: 'json'
    };
    showSettings();
}

// Batch History
function showBatchHistory() {
    const modal = document.getElementById('batch-history-modal');
    const content = document.getElementById('batch-history-content');
    
    const history = JSON.parse(localStorage.getItem('batchHistory') || '[]');
    
    if (history.length === 0) {
        content.innerHTML = '<p class="text-gray-400 text-center py-8">No batch comparisons yet</p>';
    } else {
        content.innerHTML = history.map(batch => `
            <div class="glass-effect rounded-lg p-4">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-semibold">Batch ${new Date(batch.timestamp).toLocaleString()}</h4>
                    <span class="text-sm text-gray-400">${batch.pairs} pairs</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    ${batch.results.map((result, idx) => `
                        <div class="bg-gray-800 rounded p-2 text-sm">
                            Pair ${idx + 1}: Pending...
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
    
    modal.classList.add('active');
}

function closeBatchHistory() {
    document.getElementById('batch-history-modal').classList.remove('active');
}

// Filters
function showFilters() {
    document.getElementById('filters-modal').classList.add('active');
    
    // Load current filter values
    document.getElementById('filter-date-from').value = activeFilters.dateFrom || '';
    document.getElementById('filter-date-to').value = activeFilters.dateTo || '';
    document.getElementById('filter-score-min').value = activeFilters.scoreMin || '';
    document.getElementById('filter-score-max').value = activeFilters.scoreMax || '';
    document.getElementById('filter-test-name').value = activeFilters.testName || '';
}

function closeFilters() {
    document.getElementById('filters-modal').classList.remove('active');
}

function applyFilters() {
    activeFilters = {
        dateFrom: document.getElementById('filter-date-from').value || null,
        dateTo: document.getElementById('filter-date-to').value || null,
        scoreMin: document.getElementById('filter-score-min').value ? 
            parseInt(document.getElementById('filter-score-min').value) : null,
        scoreMax: document.getElementById('filter-score-max').value ? 
            parseInt(document.getElementById('filter-score-max').value) : null,
        testName: document.getElementById('filter-test-name').value || ''
    };
    
    displayFilteredResults();
    closeFilters();
}

function clearFilters() {
    activeFilters = {
        dateFrom: null,
        dateTo: null,
        scoreMin: null,
        scoreMax: null,
        testName: ''
    };
    
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    document.getElementById('filter-score-min').value = '';
    document.getElementById('filter-score-max').value = '';
    document.getElementById('filter-test-name').value = '';
}

// Load saved settings
const savedSettings = localStorage.getItem('visualTestifySettings');
if (savedSettings) {
    settings = JSON.parse(savedSettings);
}

// Initialize
setMode('image');
setupDragAndDrop();
loadRecentResults(); 