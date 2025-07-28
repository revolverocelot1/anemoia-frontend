"""
CSS/DOM Extraction Module for VisualTestify Calypso
Extracts DOM structure and CSS properties for detailed UI comparison
"""

import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import json
from typing import Dict, List, Any, Optional
import difflib
from dataclasses import dataclass, asdict
import os

@dataclass
class ElementInfo:
    """Information about a DOM element"""
    tag: str
    selector: str
    text: str
    attributes: Dict[str, str]
    css_properties: Dict[str, str]
    position: Dict[str, float]
    visibility: bool
    children_count: int

class DOMCSSExtractor:
    """Extract and compare DOM/CSS properties from web pages"""
    
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.critical_css_properties = [
            'font-family', 'font-size', 'font-weight', 'color',
            'background-color', 'padding', 'margin', 'border',
            'width', 'height', 'display', 'position',
            'top', 'left', 'right', 'bottom', 'opacity',
            'z-index', 'line-height', 'text-align'
        ]
    
    async def initialize(self, headless: bool = True):
        """Initialize Playwright browser"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=headless)
    
    async def close(self):
        """Close browser and cleanup"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def extract_from_url(self, url: str) -> Dict[str, Any]:
        """Extract DOM and CSS from a URL"""
        page = await self.browser.new_page()
        try:
            await page.goto(url, wait_until='networkidle')
            await page.wait_for_timeout(2000)  # Wait for dynamic content
            
            # Take screenshot
            screenshot = await page.screenshot(full_page=True)
            
            # Extract DOM and CSS
            dom_data = await self._extract_dom_css(page)
            
            return {
                'url': url,
                'screenshot': screenshot,
                'dom_data': dom_data,
                'timestamp': asyncio.get_event_loop().time()
            }
        finally:
            await page.close()
    
    async def extract_from_html(self, html_content: str, base_url: str = None) -> Dict[str, Any]:
        """Extract DOM and CSS from HTML content"""
        page = await self.browser.new_page()
        try:
            if base_url:
                await page.goto(base_url)
            await page.set_content(html_content)
            await page.wait_for_timeout(1000)
            
            # Extract DOM and CSS
            dom_data = await self._extract_dom_css(page)
            
            return {
                'html_content': html_content[:100] + '...',  # Truncated for logging
                'dom_data': dom_data,
                'timestamp': asyncio.get_event_loop().time()
            }
        finally:
            await page.close()
    
    async def _extract_dom_css(self, page) -> List[ElementInfo]:
        """Extract DOM elements and their CSS properties"""
        # Inject extraction script
        elements_data = await page.evaluate('''
            () => {
                const elements = [];
                const allElements = document.querySelectorAll('*');
                
                allElements.forEach((el, index) => {
                    // Skip script and style elements
                    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
                    
                    // Get computed styles
                    const computedStyle = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    
                    // Extract CSS properties
                    const cssProps = {};
                    const criticalProps = %s;
                    criticalProps.forEach(prop => {
                        cssProps[prop] = computedStyle.getPropertyValue(prop);
                    });
                    
                    // Get selector
                    let selector = el.tagName.toLowerCase();
                    if (el.id) selector += `#${el.id}`;
                    if (el.className) selector += `.${el.className.split(' ').join('.')}`;
                    
                    // Extract attributes
                    const attributes = {};
                    for (const attr of el.attributes) {
                        attributes[attr.name] = attr.value;
                    }
                    
                    elements.push({
                        tag: el.tagName.toLowerCase(),
                        selector: selector,
                        text: el.textContent.trim().substring(0, 100),
                        attributes: attributes,
                        css_properties: cssProps,
                        position: {
                            x: rect.x,
                            y: rect.y,
                            width: rect.width,
                            height: rect.height
                        },
                        visibility: rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none',
                        children_count: el.children.length
                    });
                });
                
                return elements;
            }
        ''' % json.dumps(self.critical_css_properties))
        
        # Convert to ElementInfo objects
        return [ElementInfo(**data) for data in elements_data]
    
    def compare_dom_css(self, dom1: List[ElementInfo], dom2: List[ElementInfo]) -> Dict[str, Any]:
        """Compare two DOM structures and their CSS properties"""
        differences = {
            'element_count_diff': len(dom2) - len(dom1),
            'css_differences': [],
            'position_differences': [],
            'visibility_changes': [],
            'text_differences': [],
            'attribute_differences': []
        }
        
        # Create lookup maps
        dom1_map = {f"{el.selector}": el for el in dom1}
        dom2_map = {f"{el.selector}": el for el in dom2}
        
        # Find matching elements and compare
        for selector, el1 in dom1_map.items():
            if selector in dom2_map:
                el2 = dom2_map[selector]
                
                # Compare CSS properties
                css_diffs = self._compare_css_properties(el1, el2)
                if css_diffs:
                    differences['css_differences'].append({
                        'selector': selector,
                        'differences': css_diffs
                    })
                
                # Compare positions
                if self._significant_position_change(el1.position, el2.position):
                    differences['position_differences'].append({
                        'selector': selector,
                        'old_position': el1.position,
                        'new_position': el2.position
                    })
                
                # Compare visibility
                if el1.visibility != el2.visibility:
                    differences['visibility_changes'].append({
                        'selector': selector,
                        'was_visible': el1.visibility,
                        'is_visible': el2.visibility
                    })
                
                # Compare text content
                if el1.text != el2.text:
                    differences['text_differences'].append({
                        'selector': selector,
                        'old_text': el1.text,
                        'new_text': el2.text
                    })
                
                # Compare attributes
                attr_diffs = self._compare_attributes(el1.attributes, el2.attributes)
                if attr_diffs:
                    differences['attribute_differences'].append({
                        'selector': selector,
                        'differences': attr_diffs
                    })
        
        # Find added/removed elements
        added_selectors = set(dom2_map.keys()) - set(dom1_map.keys())
        removed_selectors = set(dom1_map.keys()) - set(dom2_map.keys())
        
        differences['added_elements'] = list(added_selectors)
        differences['removed_elements'] = list(removed_selectors)
        
        # Calculate similarity score
        differences['similarity_score'] = self._calculate_dom_similarity(dom1, dom2, differences)
        
        return differences
    
    def _compare_css_properties(self, el1: ElementInfo, el2: ElementInfo) -> List[Dict[str, Any]]:
        """Compare CSS properties between two elements"""
        differences = []
        
        for prop in self.critical_css_properties:
            val1 = el1.css_properties.get(prop, '')
            val2 = el2.css_properties.get(prop, '')
            
            if val1 != val2:
                # Special handling for certain properties
                if prop in ['padding', 'margin'] and self._normalize_spacing(val1) == self._normalize_spacing(val2):
                    continue
                
                differences.append({
                    'property': prop,
                    'old_value': val1,
                    'new_value': val2
                })
        
        return differences
    
    def _normalize_spacing(self, value: str) -> str:
        """Normalize spacing values (e.g., '10px 10px' -> '10px')"""
        parts = value.split()
        if len(parts) == 4 and all(parts[0] == p for p in parts):
            return parts[0]
        if len(parts) == 2 and parts[0] == parts[1]:
            return parts[0]
        return value
    
    def _significant_position_change(self, pos1: Dict[str, float], pos2: Dict[str, float], threshold: float = 5.0) -> bool:
        """Check if position change is significant"""
        return (
            abs(pos1['x'] - pos2['x']) > threshold or
            abs(pos1['y'] - pos2['y']) > threshold or
            abs(pos1['width'] - pos2['width']) > threshold or
            abs(pos1['height'] - pos2['height']) > threshold
        )
    
    def _compare_attributes(self, attrs1: Dict[str, str], attrs2: Dict[str, str]) -> List[Dict[str, Any]]:
        """Compare element attributes"""
        differences = []
        
        all_keys = set(attrs1.keys()) | set(attrs2.keys())
        
        for key in all_keys:
            val1 = attrs1.get(key, None)
            val2 = attrs2.get(key, None)
            
            if val1 != val2:
                differences.append({
                    'attribute': key,
                    'old_value': val1,
                    'new_value': val2
                })
        
        return differences
    
    def _calculate_dom_similarity(self, dom1: List[ElementInfo], dom2: List[ElementInfo], differences: Dict[str, Any]) -> float:
        """Calculate overall DOM similarity score"""
        # Start with 100% similarity
        score = 100.0
        
        # Deduct for element count differences
        element_diff_penalty = abs(differences['element_count_diff']) * 0.5
        score -= min(element_diff_penalty, 20)  # Cap at 20%
        
        # Deduct for CSS differences
        css_diff_penalty = len(differences['css_differences']) * 1.0
        score -= min(css_diff_penalty, 30)  # Cap at 30%
        
        # Deduct for position changes
        position_penalty = len(differences['position_differences']) * 0.5
        score -= min(position_penalty, 20)  # Cap at 20%
        
        # Deduct for visibility changes
        visibility_penalty = len(differences['visibility_changes']) * 2.0
        score -= min(visibility_penalty, 20)  # Cap at 20%
        
        # Deduct for text differences
        text_penalty = len(differences['text_differences']) * 0.3
        score -= min(text_penalty, 10)  # Cap at 10%
        
        return max(0, score)
    
    def generate_css_diff_report(self, differences: Dict[str, Any], output_file: str):
        """Generate a detailed CSS difference report"""
        report = {
            'summary': {
                'similarity_score': differences['similarity_score'],
                'total_css_differences': len(differences['css_differences']),
                'total_position_changes': len(differences['position_differences']),
                'total_visibility_changes': len(differences['visibility_changes']),
                'elements_added': len(differences.get('added_elements', [])),
                'elements_removed': len(differences.get('removed_elements', []))
            },
            'details': differences
        }
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        return report

async def capture_and_extract(url: str, output_dir: str = 'results'):
    """Utility function to capture screenshot and extract DOM/CSS"""
    extractor = DOMCSSExtractor()
    await extractor.initialize()
    
    try:
        data = await extractor.extract_from_url(url)
        
        # Save screenshot
        os.makedirs(output_dir, exist_ok=True)
        screenshot_path = os.path.join(output_dir, 'screenshot.png')
        with open(screenshot_path, 'wb') as f:
            f.write(data['screenshot'])
        
        # Save DOM data
        dom_path = os.path.join(output_dir, 'dom_data.json')
        with open(dom_path, 'w') as f:
            json.dump([asdict(el) for el in data['dom_data']], f, indent=2)
        
        return data
    finally:
        await extractor.close() 