"""
Flask Web Dashboard for VisualTestify Calypso
Provides a web interface for visual UI comparison
"""

import os
import sys
import json
import asyncio
from flask import Flask, render_template, request, jsonify, send_file, url_for
from flask_cors import CORS
from werkzeug.utils import secure_filename
import threading
from datetime import datetime

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from compare import VisualTestifyCalypso

app = Flask(__name__, static_folder='static')
CORS(app)

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['RESULTS_FOLDER'] = 'results'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULTS_FOLDER'], exist_ok=True)

# Initialize comparison tool
comparison_tool = VisualTestifyCalypso()

# Store running jobs
jobs = {}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def index():
    """Render the main dashboard"""
    return render_template('index.html')

@app.route('/api/compare/screenshots', methods=['POST'])
def compare_screenshots():
    """API endpoint for screenshot comparison"""
    try:
        # Check if files are present
        if 'baseline' not in request.files or 'comparison' not in request.files:
            return jsonify({'error': 'Both baseline and comparison images are required'}), 400
        
        baseline_file = request.files['baseline']
        comparison_file = request.files['comparison']
        
        # Validate files
        if baseline_file.filename == '' or comparison_file.filename == '':
            return jsonify({'error': 'No files selected'}), 400
        
        if not allowed_file(baseline_file.filename) or not allowed_file(comparison_file.filename):
            return jsonify({'error': 'Invalid file format'}), 400
        
        # Save uploaded files
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        baseline_filename = f"baseline_{timestamp}_{secure_filename(baseline_file.filename)}"
        comparison_filename = f"comparison_{timestamp}_{secure_filename(comparison_file.filename)}"
        
        baseline_path = os.path.join(app.config['UPLOAD_FOLDER'], baseline_filename)
        comparison_path = os.path.join(app.config['UPLOAD_FOLDER'], comparison_filename)
        
        baseline_file.save(baseline_path)
        comparison_file.save(comparison_path)
        
        # Get test name from request
        test_name = request.form.get('test_name', 'web_test')
        
        # Create job ID
        job_id = f"job_{timestamp}"
        jobs[job_id] = {'status': 'running', 'progress': 0}
        
        # Run comparison in background
        def run_comparison():
            try:
                results = comparison_tool.compare_screenshots(
                    baseline_path,
                    comparison_path,
                    app.config['RESULTS_FOLDER'],
                    test_name
                )
                jobs[job_id]['status'] = 'completed'
                jobs[job_id]['results'] = results
                jobs[job_id]['report_url'] = url_for('get_report', 
                                                   filename=os.path.basename(results.get('report_path', '')))
            except Exception as e:
                jobs[job_id]['status'] = 'failed'
                jobs[job_id]['error'] = str(e)
        
        thread = threading.Thread(target=run_comparison)
        thread.start()
        
        return jsonify({
            'job_id': job_id,
            'message': 'Comparison started',
            'status_url': url_for('get_job_status', job_id=job_id)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/compare/urls', methods=['POST'])
def compare_urls():
    """API endpoint for URL comparison"""
    try:
        data = request.get_json()
        
        if not data or 'baseline_url' not in data or 'comparison_url' not in data:
            return jsonify({'error': 'Both baseline_url and comparison_url are required'}), 400
        
        baseline_url = data['baseline_url']
        comparison_url = data['comparison_url']
        test_name = data.get('test_name', 'url_test')
        
        # Create job ID
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        job_id = f"job_{timestamp}"
        jobs[job_id] = {'status': 'running', 'progress': 0}
        
        # Run comparison in background
        def run_comparison():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                results = loop.run_until_complete(
                    comparison_tool.compare_urls(
                        baseline_url,
                        comparison_url,
                        app.config['RESULTS_FOLDER'],
                        test_name
                    )
                )
                
                jobs[job_id]['status'] = 'completed'
                jobs[job_id]['results'] = results
                jobs[job_id]['report_url'] = url_for('get_report', 
                                                   filename=os.path.basename(results.get('report_path', '')))
            except Exception as e:
                jobs[job_id]['status'] = 'failed'
                jobs[job_id]['error'] = str(e)
        
        thread = threading.Thread(target=run_comparison)
        thread.start()
        
        return jsonify({
            'job_id': job_id,
            'message': 'URL comparison started',
            'status_url': url_for('get_job_status', job_id=job_id)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/jobs/<job_id>/status')
def get_job_status(job_id):
    """Get status of a comparison job"""
    if job_id not in jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = jobs[job_id]
    response = {
        'job_id': job_id,
        'status': job['status']
    }
    
    if job['status'] == 'completed':
        response['report_url'] = job.get('report_url')
        response['results_summary'] = {
            'composite_score': job['results'].get('image_comparison', {}).get('composite_score', 0),
            'ssim_score': job['results'].get('image_comparison', {}).get('ssim_score', {}).get('score', 0),
            'text_similarity': job['results'].get('text_comparison', {}).get('text_similarity', 1) * 100
        }
    elif job['status'] == 'failed':
        response['error'] = job.get('error', 'Unknown error')
    
    return jsonify(response)

@app.route('/api/results')
def list_results():
    """List all available results"""
    results_list = []
    
    for dirname in os.listdir(app.config['RESULTS_FOLDER']):
        dirpath = os.path.join(app.config['RESULTS_FOLDER'], dirname)
        if os.path.isdir(dirpath):
            # Try to load results.json
            results_file = os.path.join(dirpath, 'results.json')
            if os.path.exists(results_file):
                try:
                    with open(results_file, 'r') as f:
                        results_data = json.load(f)
                    
                    results_list.append({
                        'name': dirname,
                        'test_name': results_data.get('test_name', 'Unknown'),
                        'timestamp': results_data.get('timestamp', ''),
                        'composite_score': results_data.get('image_comparison', {}).get('composite_score', 0),
                        'report_url': url_for('get_report', filename=dirname + '/report.html')
                    })
                except:
                    pass
    
    # Sort by timestamp (newest first)
    results_list.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return jsonify(results_list)

@app.route('/reports/<path:filename>')
def get_report(filename):
    """Serve report files"""
    return send_file(os.path.join(app.config['RESULTS_FOLDER'], filename))

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    """Get or update configuration"""
    if request.method == 'GET':
        return jsonify(comparison_tool.config)
    
    elif request.method == 'POST':
        new_config = request.get_json()
        # Update configuration
        for key in new_config:
            if key in comparison_tool.config:
                comparison_tool.config[key].update(new_config[key])
        
        # Reinitialize engines with new config
        comparison_tool.__init__()
        
        return jsonify({'message': 'Configuration updated', 'config': comparison_tool.config})

# Create templates directory and basic HTML template
os.makedirs('templates', exist_ok=True)

# Basic HTML template (commented out - using custom template)
'''html_template = 
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VisualTestify Calypso - Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #ffffff;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            border: 1px solid #333;
        }
        
        h1 {
            font-size: 2.5rem;
            background: linear-gradient(135deg, #4a9eff 0%, #00ff88 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }
        
        .subtitle {
            color: #b0b0b0;
        }
        
        .card {
            background: #1a1a1a;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            border: 1px solid #333;
        }
        
        .tabs {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            border-bottom: 1px solid #333;
            padding-bottom: 1rem;
        }
        
        .tab {
            padding: 0.75rem 1.5rem;
            background: none;
            border: 1px solid #333;
            color: #b0b0b0;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.3s;
        }
        
        .tab.active {
            background: #2a2a2a;
            color: #4a9eff;
            border-color: #4a9eff;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        label {
            display: block;
            margin-bottom: 0.5rem;
            color: #b0b0b0;
        }
        
        input[type="file"],
        input[type="text"],
        input[type="url"] {
            width: 100%;
            padding: 0.75rem;
            background: #0a0a0a;
            border: 1px solid #333;
            border-radius: 8px;
            color: #fff;
            font-size: 1rem;
        }
        
        button {
            background: linear-gradient(135deg, #4a9eff 0%, #0066ff 100%);
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        button:hover {
            transform: translateY(-2px);
        }
        
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .results-list {
            list-style: none;
        }
        
        .result-item {
            background: #2a2a2a;
            padding: 1rem;
            margin-bottom: 0.5rem;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .result-score {
            font-size: 1.25rem;
            font-weight: 600;
        }
        
        .success { color: #00ff88; }
        .warning { color: #ffaa00; }
        .error { color: #ff4444; }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #333;
            border-top-color: #4a9eff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        
        .alert-error {
            background: rgba(255, 68, 68, 0.1);
            border: 1px solid #ff4444;
            color: #ff4444;
        }
        
        .alert-success {
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid #00ff88;
            color: #00ff88;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>VisualTestify Calypso</h1>
            <p class="subtitle">Visual UI Comparison Tool for NASDAQ-Calypso</p>
        </header>
        
        <div class="card">
            <div class="tabs">
                <button class="tab active" onclick="switchTab('screenshots')">Screenshot Comparison</button>
                <button class="tab" onclick="switchTab('urls')">URL Comparison</button>
                <button class="tab" onclick="switchTab('results')">Results History</button>
            </div>
            
            <div id="screenshots" class="tab-content active">
                <form id="screenshotForm">
                    <div class="form-group">
                        <label for="baseline">Baseline Screenshot</label>
                        <input type="file" id="baseline" name="baseline" accept="image/*" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="comparison">Comparison Screenshot</label>
                        <input type="file" id="comparison" name="comparison" accept="image/*" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="test_name">Test Name</label>
                        <input type="text" id="test_name" name="test_name" placeholder="Enter test name" value="calypso_test">
                    </div>
                    
                    <button type="submit">Compare Screenshots</button>
                </form>
                
                <div id="screenshotResult" style="margin-top: 2rem;"></div>
            </div>
            
            <div id="urls" class="tab-content">
                <form id="urlForm">
                    <div class="form-group">
                        <label for="baseline_url">Baseline URL</label>
                        <input type="url" id="baseline_url" name="baseline_url" placeholder="https://example.com/v1" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="comparison_url">Comparison URL</label>
                        <input type="url" id="comparison_url" name="comparison_url" placeholder="https://example.com/v2" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="url_test_name">Test Name</label>
                        <input type="text" id="url_test_name" name="test_name" placeholder="Enter test name" value="calypso_url_test">
                    </div>
                    
                    <button type="submit">Compare URLs</button>
                </form>
                
                <div id="urlResult" style="margin-top: 2rem;"></div>
            </div>
            
            <div id="results" class="tab-content">
                <button onclick="loadResults()">Refresh Results</button>
                <ul id="resultsList" class="results-list" style="margin-top: 1rem;"></ul>
            </div>
        </div>
    </div>
    
    <script>
        function switchTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to clicked tab
            event.target.classList.add('active');
            
            // Load results if switching to results tab
            if (tabName === 'results') {
                loadResults();
            }
        }
        
        // Screenshot form submission
        document.getElementById('screenshotForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const resultDiv = document.getElementById('screenshotResult');
            
            resultDiv.innerHTML = '<div class="loading"></div> Comparing screenshots...';
            
            try {
                const response = await fetch('/api/compare/screenshots', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Poll for job status
                    pollJobStatus(data.job_id, resultDiv);
                } else {
                    resultDiv.innerHTML = `<div class="alert alert-error">Error: ${data.error}</div>`;
                }
            } catch (error) {
                resultDiv.innerHTML = `<div class="alert alert-error">Error: ${error.message}</div>`;
            }
        });
        
        // URL form submission
        document.getElementById('urlForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                baseline_url: document.getElementById('baseline_url').value,
                comparison_url: document.getElementById('comparison_url').value,
                test_name: document.getElementById('url_test_name').value
            };
            
            const resultDiv = document.getElementById('urlResult');
            resultDiv.innerHTML = '<div class="loading"></div> Comparing URLs...';
            
            try {
                const response = await fetch('/api/compare/urls', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Poll for job status
                    pollJobStatus(data.job_id, resultDiv);
                } else {
                    resultDiv.innerHTML = `<div class="alert alert-error">Error: ${data.error}</div>`;
                }
            } catch (error) {
                resultDiv.innerHTML = `<div class="alert alert-error">Error: ${error.message}</div>`;
            }
        });
        
        // Poll job status
        async function pollJobStatus(jobId, resultDiv) {
            const checkStatus = async () => {
                try {
                    const response = await fetch(`/api/jobs/${jobId}/status`);
                    const data = await response.json();
                    
                    if (data.status === 'completed') {
                        const score = data.results_summary.composite_score;
                        const scoreClass = score >= 90 ? 'success' : score >= 70 ? 'warning' : 'error';
                        
                        resultDiv.innerHTML = `
                            <div class="alert alert-success">
                                <h3>Comparison Complete!</h3>
                                <p>Overall Similarity: <span class="result-score ${scoreClass}">${score.toFixed(1)}%</span></p>
                                <p>SSIM Score: ${data.results_summary.ssim_score.toFixed(3)}</p>
                                <p>Text Similarity: ${data.results_summary.text_similarity.toFixed(1)}%</p>
                                <p style="margin-top: 1rem;">
                                    <a href="${data.report_url}" target="_blank">
                                        <button>View Full Report</button>
                                    </a>
                                </p>
                            </div>
                        `;
                    } else if (data.status === 'failed') {
                        resultDiv.innerHTML = `<div class="alert alert-error">Comparison failed: ${data.error}</div>`;
                    } else {
                        // Still running, check again
                        setTimeout(checkStatus, 2000);
                    }
                } catch (error) {
                    resultDiv.innerHTML = `<div class="alert alert-error">Error checking status: ${error.message}</div>`;
                }
            };
            
            checkStatus();
        }
        
        // Load results history
        async function loadResults() {
            const resultsList = document.getElementById('resultsList');
            resultsList.innerHTML = '<div class="loading"></div> Loading results...';
            
            try {
                const response = await fetch('/api/results');
                const results = await response.json();
                
                if (results.length === 0) {
                    resultsList.innerHTML = '<li>No results found</li>';
                    return;
                }
                
                resultsList.innerHTML = results.map(result => {
                    const scoreClass = result.composite_score >= 90 ? 'success' : 
                                     result.composite_score >= 70 ? 'warning' : 'error';
                    
                    return `
                        <li class="result-item">
                            <div>
                                <strong>${result.test_name}</strong><br>
                                <small>${new Date(result.timestamp).toLocaleString()}</small>
                            </div>
                            <div>
                                <span class="result-score ${scoreClass}">${result.composite_score.toFixed(1)}%</span>
                                <a href="${result.report_url}" target="_blank" style="margin-left: 1rem;">
                                    <button>View Report</button>
                                </a>
                            </div>
                        </li>
                    `;
                }).join('');
            } catch (error) {
                resultsList.innerHTML = `<li class="alert alert-error">Error loading results: ${error.message}</li>`;
            }
        }
    </script>
</body>
</html>
'''

# Save the template (commented out - using custom template)
# with open('templates/index.html', 'w') as f:
#     f.write(html_template)

if __name__ == '__main__':
    print("\n🚀 VisualTestify Calypso Dashboard")
    print("   Running on: http://localhost:5000")
    print("   Press Ctrl+C to stop\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000) 