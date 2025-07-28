"""
Report Generator Module for VisualTestify Calypso
Generates comprehensive HTML reports with visual comparison results
"""

import os
import json
import base64
from datetime import datetime
from typing import Dict, List, Any, Optional
from jinja2 import Template
import shutil

class ReportGenerator:
    """Generate HTML reports for visual test results"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {
            'title': 'VisualTestify Calypso - UI Comparison Report',
            'theme': 'dark',  # 'dark' or 'light'
            'include_technical_details': True,
            'highlight_threshold': 0.1  # Highlight differences above this threshold
        }
        
        # HTML template
        self.template = Template('''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }}</title>
    <style>
        :root {
            --bg-primary: #0a0a0a;
            --bg-secondary: #1a1a1a;
            --bg-tertiary: #2a2a2a;
            --text-primary: #ffffff;
            --text-secondary: #b0b0b0;
            --accent: #4a9eff;
            --success: #00ff88;
            --warning: #ffaa00;
            --error: #ff4444;
            --border: #333333;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            border: 1px solid var(--border);
        }
        
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--accent) 0%, #00ff88 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 1rem;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }
        
        .summary-card {
            background: var(--bg-secondary);
            padding: 1.5rem;
            border-radius: 12px;
            border: 1px solid var(--border);
            position: relative;
            overflow: hidden;
        }
        
        .summary-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: var(--accent);
        }
        
        .summary-card.success::before {
            background: var(--success);
        }
        
        .summary-card.warning::before {
            background: var(--warning);
        }
        
        .summary-card.error::before {
            background: var(--error);
        }
        
        .summary-card h3 {
            font-size: 0.875rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }
        
        .summary-card .value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .section {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            border: 1px solid var(--border);
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border);
        }
        
        .section h2 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        
        .image-comparison {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .image-container {
            position: relative;
            background: var(--bg-tertiary);
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--border);
        }
        
        .image-container img {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .image-label {
            position: absolute;
            top: 1rem;
            left: 1rem;
            background: rgba(0, 0, 0, 0.8);
            color: var(--text-primary);
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        
        .diff-view {
            margin-top: 2rem;
        }
        
        .tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
            border-bottom: 1px solid var(--border);
        }
        
        .tab {
            padding: 0.75rem 1.5rem;
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .tab.active {
            color: var(--accent);
        }
        
        .tab.active::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 2px;
            background: var(--accent);
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        
        .metric {
            background: var(--bg-tertiary);
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid var(--border);
        }
        
        .metric-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-bottom: 0.25rem;
        }
        
        .metric-value {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .diff-list {
            list-style: none;
        }
        
        .diff-item {
            background: var(--bg-tertiary);
            padding: 1rem;
            margin-bottom: 0.5rem;
            border-radius: 8px;
            border: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .diff-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        
        .diff-icon.error {
            background: rgba(255, 68, 68, 0.2);
            color: var(--error);
        }
        
        .diff-icon.warning {
            background: rgba(255, 170, 0, 0.2);
            color: var(--warning);
        }
        
        .diff-icon.success {
            background: rgba(0, 255, 136, 0.2);
            color: var(--success);
        }
        
        .diff-details {
            flex: 1;
        }
        
        .diff-title {
            font-weight: 500;
            margin-bottom: 0.25rem;
        }
        
        .diff-description {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }
        
        .code-block {
            background: var(--bg-tertiary);
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.875rem;
            color: var(--text-secondary);
            border: 1px solid var(--border);
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 0.5rem;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--accent) 0%, var(--success) 100%);
            transition: width 0.3s ease;
        }
        
        .footer {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }
        
        @media (max-width: 768px) {
            .image-comparison {
                grid-template-columns: 1fr;
            }
            
            .summary {
                grid-template-columns: 1fr;
            }
        }
    </style>
    <script>
        function switchTab(tabId) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab content
            document.getElementById(tabId).classList.add('active');
            
            // Add active class to selected tab
            document.querySelector(`[onclick="switchTab('${tabId}')"]`).classList.add('active');
        }
    </script>
</head>
<body>
    <div class="container">
        <header>
            <h1>{{ title }}</h1>
            <p style="color: var(--text-secondary);">
                Generated on {{ timestamp }} | Comparison Mode: {{ comparison_mode }}
            </p>
        </header>
        
        <!-- Summary Cards -->
        <div class="summary">
            <div class="summary-card {{ 'success' if composite_score >= 90 else 'warning' if composite_score >= 70 else 'error' }}">
                <h3>Overall Similarity</h3>
                <div class="value">{{ "%.1f"|format(composite_score) }}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {{ composite_score }}%"></div>
                </div>
            </div>
            
            <div class="summary-card">
                <h3>SSIM Score</h3>
                <div class="value">{{ "%.3f"|format(ssim_score) }}</div>
            </div>
            
            <div class="summary-card">
                <h3>Pixel Differences</h3>
                <div class="value">{{ "%.1f"|format(pixel_diff_percentage) }}%</div>
            </div>
            
            <div class="summary-card {{ 'error' if css_differences > 10 else 'warning' if css_differences > 5 else 'success' }}">
                <h3>CSS Changes</h3>
                <div class="value">{{ css_differences }}</div>
            </div>
            
            <div class="summary-card {{ 'error' if text_mismatches > 5 else 'warning' if text_mismatches > 0 else 'success' }}">
                <h3>Text Mismatches</h3>
                <div class="value">{{ text_mismatches }}</div>
            </div>
            
            <div class="summary-card {{ 'error' if logo_issues > 0 else 'success' }}">
                <h3>Logo/Icon Issues</h3>
                <div class="value">{{ logo_issues }}</div>
            </div>
        </div>
        
        <!-- Visual Comparison Section -->
        <div class="section">
            <div class="section-header">
                <h2>Visual Comparison</h2>
            </div>
            
            <div class="image-comparison">
                <div class="image-container">
                    <div class="image-label">Baseline</div>
                    <img src="{{ baseline_image }}" alt="Baseline">
                </div>
                <div class="image-container">
                    <div class="image-label">Comparison</div>
                    <img src="{{ comparison_image }}" alt="Comparison">
                </div>
            </div>
            
            <div class="diff-view">
                <div class="tabs">
                    <button class="tab active" onclick="switchTab('annotated')">Annotated Diff</button>
                    <button class="tab" onclick="switchTab('heatmap')">Heatmap</button>
                    <button class="tab" onclick="switchTab('overlay')">Overlay</button>
                </div>
                
                <div id="annotated" class="tab-content active">
                    <div class="image-container">
                        <img src="{{ annotated_diff }}" alt="Annotated Differences">
                    </div>
                </div>
                
                <div id="heatmap" class="tab-content">
                    <div class="image-container">
                        <img src="{{ heatmap }}" alt="Difference Heatmap">
                    </div>
                </div>
                
                <div id="overlay" class="tab-content">
                    <div class="image-container">
                        <img src="{{ overlay }}" alt="Overlay Comparison">
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Detailed Metrics Section -->
        <div class="section">
            <div class="section-header">
                <h2>Detailed Metrics</h2>
            </div>
            
            <div class="metrics-grid">
                {% for metric_name, metric_value in detailed_metrics.items() %}
                <div class="metric">
                    <div class="metric-label">{{ metric_name }}</div>
                    <div class="metric-value">{{ metric_value }}</div>
                </div>
                {% endfor %}
            </div>
        </div>
        
        <!-- CSS/DOM Differences -->
        {% if css_diff_details %}
        <div class="section">
            <div class="section-header">
                <h2>CSS/DOM Differences</h2>
            </div>
            
            <ul class="diff-list">
                {% for diff in css_diff_details %}
                <li class="diff-item">
                    <div class="diff-icon {{ diff.severity }}">
                        <span>{{ diff.icon }}</span>
                    </div>
                    <div class="diff-details">
                        <div class="diff-title">{{ diff.selector }}</div>
                        <div class="diff-description">
                            {{ diff.property }}: {{ diff.old_value }} → {{ diff.new_value }}
                        </div>
                    </div>
                </li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}
        
        <!-- Text Analysis -->
        {% if text_analysis %}
        <div class="section">
            <div class="section-header">
                <h2>Text Analysis</h2>
            </div>
            
            <div class="metrics-grid">
                <div class="metric">
                    <div class="metric-label">Text Similarity</div>
                    <div class="metric-value">{{ "%.1f"|format(text_analysis.similarity * 100) }}%</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Word Count Change</div>
                    <div class="metric-value">{{ text_analysis.word_diff }}</div>
                </div>
            </div>
            
            {% if text_analysis.mismatches %}
            <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Text Mismatches</h3>
            <ul class="diff-list">
                {% for mismatch in text_analysis.mismatches %}
                <li class="diff-item">
                    <div class="diff-icon error">
                        <span>!</span>
                    </div>
                    <div class="diff-details">
                        <div class="diff-title">{{ mismatch.type }}</div>
                        <div class="diff-description">
                            Expected: "{{ mismatch.expected }}" | Found: "{{ mismatch.actual }}"
                        </div>
                    </div>
                </li>
                {% endfor %}
            </ul>
            {% endif %}
        </div>
        {% endif %}
        
        <!-- Logo/Icon Analysis -->
        {% if logo_analysis %}
        <div class="section">
            <div class="section-header">
                <h2>Logo/Icon Analysis</h2>
            </div>
            
            {% if logo_analysis.issues %}
            <ul class="diff-list">
                {% for issue in logo_analysis.issues %}
                <li class="diff-item">
                    <div class="diff-icon {{ issue.severity }}">
                        <span>{{ issue.icon }}</span>
                    </div>
                    <div class="diff-details">
                        <div class="diff-title">{{ issue.name }}</div>
                        <div class="diff-description">{{ issue.description }}</div>
                    </div>
                </li>
                {% endfor %}
            </ul>
            {% endif %}
        </div>
        {% endif %}
        
        <!-- Technical Details -->
        {% if include_technical_details %}
        <div class="section">
            <div class="section-header">
                <h2>Technical Details</h2>
            </div>
            
            <div class="code-block">
                <pre>{{ technical_details | tojson(indent=2) }}</pre>
            </div>
        </div>
        {% endif %}
        
        <footer class="footer">
            <p>Generated by VisualTestify Calypso | © 2025 NASDAQ-Calypso</p>
        </footer>
    </div>
</body>
</html>
        ''')
    
    def generate_report(self, results: Dict[str, Any], output_path: str):
        """
        Generate HTML report from comparison results
        
        Args:
            results: Combined results from all comparison modules
            output_path: Path to save the HTML report
        """
        # Prepare template data
        template_data = self._prepare_template_data(results)
        
        # Render HTML
        html_content = self.template.render(**template_data)
        
        # Save report
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Copy images to report directory if needed
        self._copy_images_to_report_dir(results, os.path.dirname(output_path))
        
        return output_path
    
    def _prepare_template_data(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare data for template rendering"""
        # Basic info
        data = {
            'title': self.config['title'],
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'comparison_mode': 'Full Visual Comparison',
            'include_technical_details': self.config['include_technical_details']
        }
        
        # Summary metrics
        image_results = results.get('image_comparison', {})
        data['composite_score'] = image_results.get('composite_score', 0)
        data['ssim_score'] = image_results.get('ssim_score', {}).get('score', 0)
        data['pixel_diff_percentage'] = image_results.get('pixel_diff', {}).get('percentage', 0)
        
        # CSS/DOM metrics
        css_results = results.get('css_comparison', {})
        data['css_differences'] = len(css_results.get('css_differences', []))
        
        # Text metrics
        text_results = results.get('text_comparison', {})
        data['text_mismatches'] = len(text_results.get('mismatches', []))
        
        # Logo metrics
        logo_results = results.get('logo_comparison', {})
        data['logo_issues'] = (
            len(logo_results.get('missing_logos', [])) +
            len(logo_results.get('quality_changes', []))
        )
        
        # Image paths (convert to base64 for embedding)
        data['baseline_image'] = self._image_to_base64(results.get('baseline_image_path'))
        data['comparison_image'] = self._image_to_base64(results.get('comparison_image_path'))
        data['annotated_diff'] = self._image_to_base64(image_results.get('annotated_image'))
        data['heatmap'] = self._image_to_base64(image_results.get('heatmap'))
        data['overlay'] = self._image_to_base64(image_results.get('overlay'))
        
        # Detailed metrics
        data['detailed_metrics'] = {
            'SSIM Mean Diff': f"{image_results.get('ssim_score', {}).get('mean_diff', 0):.3f}",
            'Cosine Similarity': f"{image_results.get('cosine_similarity', 0):.3f}",
            'Different Pixels': f"{image_results.get('pixel_diff', {}).get('different_pixels', 0):,}",
            'Difference Regions': len(image_results.get('difference_regions', [])),
            'DOM Similarity': f"{css_results.get('similarity_score', 100):.1f}%",
            'Text Similarity': f"{text_results.get('text_similarity', 1) * 100:.1f}%"
        }
        
        # CSS differences details
        data['css_diff_details'] = self._format_css_differences(css_results)
        
        # Text analysis
        data['text_analysis'] = self._format_text_analysis(text_results)
        
        # Logo analysis
        data['logo_analysis'] = self._format_logo_analysis(logo_results)
        
        # Technical details
        if self.config['include_technical_details']:
            data['technical_details'] = {
                'image_metrics': image_results,
                'css_analysis': css_results,
                'text_analysis': text_results,
                'logo_analysis': logo_results
            }
        
        return data
    
    def _image_to_base64(self, image_path: Optional[str]) -> str:
        """Convert image to base64 data URL"""
        if not image_path or not os.path.exists(image_path):
            return ''
        
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        # Determine MIME type
        ext = os.path.splitext(image_path)[1].lower()
        mime_type = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png'
        
        # Create data URL
        base64_data = base64.b64encode(image_data).decode('utf-8')
        return f'data:{mime_type};base64,{base64_data}'
    
    def _format_css_differences(self, css_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Format CSS differences for display"""
        formatted = []
        
        for diff in css_results.get('css_differences', [])[:20]:  # Limit to 20 items
            for change in diff.get('differences', []):
                formatted.append({
                    'selector': diff['selector'],
                    'property': change['property'],
                    'old_value': change['old_value'],
                    'new_value': change['new_value'],
                    'severity': 'error' if change['property'] in ['color', 'font-size'] else 'warning',
                    'icon': '!'
                })
        
        return formatted
    
    def _format_text_analysis(self, text_results: Dict[str, Any]) -> Dict[str, Any]:
        """Format text analysis results"""
        if not text_results:
            return None
        
        return {
            'similarity': text_results.get('text_similarity', 1),
            'word_diff': (
                text_results.get('comparison_word_count', 0) -
                text_results.get('baseline_word_count', 0)
            ),
            'mismatches': [
                {
                    'type': m.get('mismatch_type', 'unknown'),
                    'expected': m.get('expected', ''),
                    'actual': m.get('actual', '')
                }
                for m in text_results.get('mismatches', [])[:10]  # Limit to 10
            ]
        }
    
    def _format_logo_analysis(self, logo_results: Dict[str, Any]) -> Dict[str, Any]:
        """Format logo analysis results"""
        if not logo_results:
            return None
        
        issues = []
        
        # Missing logos
        for logo in logo_results.get('missing_logos', []):
            issues.append({
                'name': logo['name'],
                'description': 'Logo missing in comparison image',
                'severity': 'error',
                'icon': '✗'
            })
        
        # Quality degradation
        for change in logo_results.get('quality_changes', []):
            if change.get('quality_degraded'):
                issues.append({
                    'name': change['name'],
                    'description': f"Quality degraded: {change['old_quality']:.2f} → {change['new_quality']:.2f}",
                    'severity': 'warning',
                    'icon': '⚠'
                })
        
        return {'issues': issues} if issues else None
    
    def _copy_images_to_report_dir(self, results: Dict[str, Any], report_dir: str):
        """Copy referenced images to report directory"""
        # This is optional - images are embedded as base64 in the HTML
        pass

def generate_comparison_report(all_results: Dict[str, Any], output_path: str):
    """Utility function to generate a report from all comparison results"""
    generator = ReportGenerator()
    return generator.generate_report(all_results, output_path) 