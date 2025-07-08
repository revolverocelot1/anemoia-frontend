// Working UI Screenshot Comparison Worker - No External Dependencies
import * as Comlink from 'comlink';

interface ComparisonResult {
  textChanges: any[];
  visualChanges: any[];
  annotatedImageData: ImageData;
  metrics: {
    totalPixelDifference: number;
    percentageChanged: number;
    textMismatches: number;
    elementsAdded: number;
    elementsRemoved: number;
    elementsModified: number;
  };
  compositeScore: number;
  summary: {
    visualSummary: string;
    textSummary: string;
    elementSummary: string;
  };
  report: {
    json: any;
    html: string;
  };
}

class UIComparisonWorkerWorking {
  // private isInitialized: boolean = false;

  async initialize() {
    console.log('UIComparisonWorkerWorking initialized - no external dependencies');
    // this.isInitialized = true;
  }

  async compareScreenshots(
    image1Data: ImageData,
    image2Data: ImageData,
    options: {
      enableOCR: boolean;
      enableVisualAnalysis: boolean;
      threshold: number;
    } = { enableOCR: true, enableVisualAnalysis: true, threshold: 0.1 }
  ): Promise<ComparisonResult> {
    console.log('Starting UI comparison (working version)...');
    
    const startTime = Date.now();
    
    // Perform visual analysis
    const visualAnalysis = this.analyzeVisualDifferences(image1Data, image2Data, options.threshold);
    
    // Detect UI regions and text areas
    const regions1 = this.detectUIRegions(image1Data);
    const regions2 = this.detectUIRegions(image2Data);
    
    // Compare regions for text-like areas
    const textChanges = this.compareTextRegions(regions1, regions2, image1Data, image2Data);
    
    // Identify UI element changes
    const elementChanges = this.compareUIElements(regions1, regions2);
    
    // Generate annotated image
    const annotatedImageData = this.createAnnotatedImage(
      image2Data,
      visualAnalysis.diffMap,
      [...textChanges, ...elementChanges.map(e => e.change)]
    );
    
    // Calculate metrics
    const metrics = {
      totalPixelDifference: visualAnalysis.diffPixels,
      percentageChanged: visualAnalysis.percentageChanged,
      textMismatches: textChanges.length,
      elementsAdded: elementChanges.filter(e => e.type === 'added').length,
      elementsRemoved: elementChanges.filter(e => e.type === 'removed').length,
      elementsModified: elementChanges.filter(e => e.type === 'modified').length
    };
    
    const compositeScore = Math.min(100, Math.round(
      visualAnalysis.percentageChanged * 0.5 +
      textChanges.length * 2 +
      elementChanges.length * 1.5
    ));
    
    const processingTime = Date.now() - startTime;
    console.log(`Comparison completed in ${processingTime}ms`);
    
    return {
      textChanges,
      visualChanges: elementChanges.map(e => ({
        type: e.type,
        bbox: e.change.bbox,
        details: e.change.details,
        pixelDifference: e.change.pixelDifference || 0
      })),
      annotatedImageData,
      metrics,
      compositeScore,
      summary: {
        visualSummary: `📉 ${visualAnalysis.percentageChanged.toFixed(1)}% of screen changed visually`,
        textSummary: `📝 ${textChanges.length} text regions detected changes`,
        elementSummary: `🔺 ${metrics.elementsAdded} added, ${metrics.elementsRemoved} removed, ${metrics.elementsModified} modified`
      },
      report: {
        json: { 
          metrics, 
          compositeScore, 
          processingTime,
          timestamp: new Date().toISOString() 
        },
        html: this.generateHTMLReport(metrics, compositeScore, textChanges, elementChanges)
      }
    };
  }
  
  private analyzeVisualDifferences(image1: ImageData, image2: ImageData, threshold: number) {
    const { width, height } = image1;
    const data1 = image1.data;
    const data2 = image2.data;
    
    let diffPixels = 0;
    const diffMap = new Uint8Array(width * height);
    
    // Analyze pixel differences
    for (let i = 0; i < data1.length; i += 4) {
      const r1 = data1[i];
      const g1 = data1[i + 1];
      const b1 = data1[i + 2];
      
      const r2 = data2[i];
      const g2 = data2[i + 1];
      const b2 = data2[i + 2];
      
      // Calculate color difference
      const diff = Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2)
      ) / Math.sqrt(3 * 255 * 255);
      
      if (diff > threshold) {
        diffPixels++;
        diffMap[i / 4] = Math.floor(diff * 255);
      }
    }
    
    const percentageChanged = (diffPixels / (width * height)) * 100;
    
    return {
      diffPixels,
      percentageChanged,
      diffMap
    };
  }
  
  private detectUIRegions(imageData: ImageData) {
    const { width, height, data } = imageData;
    const regions: any[] = [];
    
    // Convert to grayscale for analysis
    const grayscale = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      grayscale[i / 4] = gray;
    }
    
    // Detect high contrast regions (likely text or UI elements)
    const contrastMap = this.detectContrastRegions(grayscale, width, height);
    
    // Find connected components
    const components = this.findConnectedComponents(contrastMap, width, height);
    
    // Classify regions
    components.forEach(component => {
      const region = {
        bbox: component.bbox,
        type: this.classifyRegion(component, grayscale, width),
        averageColor: this.getAverageColor(data, component.bbox, width),
        pixelCount: component.pixelCount
      };
      regions.push(region);
    });
    
    return regions;
  }
  
  private detectContrastRegions(grayscale: Uint8Array, width: number, height: number) {
    const contrastMap = new Uint8Array(width * height);
    
    // Detect edges using simple gradient
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        // Calculate gradients
        const gx = Math.abs(grayscale[idx + 1] - grayscale[idx - 1]);
        const gy = Math.abs(grayscale[idx + width] - grayscale[idx - width]);
        
        const gradient = Math.sqrt(gx * gx + gy * gy);
        contrastMap[idx] = gradient > 30 ? 255 : 0;
      }
    }
    
    return contrastMap;
  }
  
  private findConnectedComponents(map: Uint8Array, width: number, height: number) {
    const visited = new Uint8Array(width * height);
    const components: any[] = [];
    
    for (let y = 0; y < height; y += 5) { // Sample for performance
      for (let x = 0; x < width; x += 5) {
        const idx = y * width + x;
        if (map[idx] && !visited[idx]) {
          const component = this.floodFill(map, visited, x, y, width, height);
          if (component.pixelCount > 50) { // Minimum size
            components.push(component);
          }
        }
      }
    }
    
    return components;
  }
  
  private floodFill(map: Uint8Array, visited: Uint8Array, startX: number, startY: number, width: number, height: number) {
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let pixelCount = 0;
    
    const stack = [[startX, startY]];
    
    while (stack.length > 0 && pixelCount < 50000) { // Limit for performance
      const [x, y] = stack.pop()!;
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[idx] || !map[idx]) {
        continue;
      }
      
      visited[idx] = 1;
      pixelCount++;
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      // 4-connectivity
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    return {
      bbox: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      },
      pixelCount
    };
  }
  
  private classifyRegion(component: any, _grayscale: Uint8Array, _width: number) {
    const { bbox } = component;
    const aspectRatio = bbox.width / bbox.height;
    
    // Simple heuristics
    if (aspectRatio > 5 && bbox.height < 50) {
      return 'text-line';
    } else if (aspectRatio > 2 && bbox.height < 80) {
      return 'button';
    } else if (bbox.width < 100 && bbox.height < 100) {
      return 'icon';
    } else if (bbox.width > 200 || bbox.height > 200) {
      return 'container';
    }
    return 'element';
  }
  
  private getAverageColor(data: Uint8ClampedArray, bbox: any, width: number) {
    let r = 0, g = 0, b = 0, count = 0;
    
    for (let y = bbox.y; y < bbox.y + bbox.height && y < data.length / (width * 4); y++) {
      for (let x = bbox.x; x < bbox.x + bbox.width && x < width; x++) {
        const idx = (y * width + x) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
    }
    
    if (count === 0) return { r: 0, g: 0, b: 0 };
    
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    };
  }
  
  private compareTextRegions(regions1: any[], regions2: any[], image1: ImageData, image2: ImageData) {
    const textChanges: any[] = [];
    const textRegions1 = regions1.filter(r => r.type === 'text-line' || r.type === 'button');
    const textRegions2 = regions2.filter(r => r.type === 'text-line' || r.type === 'button');
    
    // Find modified text regions
    textRegions1.forEach(region1 => {
      const match = textRegions2.find(region2 => 
        this.regionsOverlap(region1.bbox, region2.bbox) > 0.5
      );
      
      if (match) {
        // Check if content changed
        const contentChanged = this.compareRegionContent(
          region1.bbox, 
          match.bbox, 
          image1, 
          image2
        );
        
        if (contentChanged > 0.1) {
          textChanges.push({
            type: 'modified',
            oldText: `Text at (${region1.bbox.x}, ${region1.bbox.y})`,
            newText: `Text at (${match.bbox.x}, ${match.bbox.y})`,
            oldBbox: region1.bbox,
            newBbox: match.bbox,
            confidence: 1 - contentChanged
          });
        }
      } else {
        textChanges.push({
          type: 'removed',
          oldText: `Text at (${region1.bbox.x}, ${region1.bbox.y})`,
          oldBbox: region1.bbox
        });
      }
    });
    
    // Find added text regions
    textRegions2.forEach(region2 => {
      const hasMatch = textRegions1.some(region1 => 
        this.regionsOverlap(region1.bbox, region2.bbox) > 0.5
      );
      
      if (!hasMatch) {
        textChanges.push({
          type: 'added',
          newText: `Text at (${region2.bbox.x}, ${region2.bbox.y})`,
          newBbox: region2.bbox
        });
      }
    });
    
    return textChanges;
  }
  
  private compareUIElements(regions1: any[], regions2: any[]) {
    const elementChanges: any[] = [];
    
    // Compare non-text elements
    const elements1 = regions1.filter(r => r.type !== 'text-line');
    const elements2 = regions2.filter(r => r.type !== 'text-line');
    
    elements1.forEach(el1 => {
      const match = elements2.find(el2 => 
        this.regionsOverlap(el1.bbox, el2.bbox) > 0.7
      );
      
      if (!match) {
        elementChanges.push({
          type: 'removed',
          change: {
            type: 'element-removed',
            bbox: el1.bbox,
            details: { elementType: el1.type }
          }
        });
      } else if (this.colorsAreDifferent(el1.averageColor, match.averageColor)) {
        elementChanges.push({
          type: 'modified',
          change: {
            type: 'color-changed',
            bbox: match.bbox,
            details: { 
              elementType: match.type,
              oldColor: el1.averageColor,
              newColor: match.averageColor
            }
          }
        });
      }
    });
    
    elements2.forEach(el2 => {
      const hasMatch = elements1.some(el1 => 
        this.regionsOverlap(el1.bbox, el2.bbox) > 0.7
      );
      
      if (!hasMatch) {
        elementChanges.push({
          type: 'added',
          change: {
            type: 'element-added',
            bbox: el2.bbox,
            details: { elementType: el2.type }
          }
        });
      }
    });
    
    return elementChanges;
  }
  
  private regionsOverlap(bbox1: any, bbox2: any): number {
    const x1 = Math.max(bbox1.x, bbox2.x);
    const y1 = Math.max(bbox1.y, bbox2.y);
    const x2 = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
    const y2 = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);
    
    if (x2 < x1 || y2 < y1) return 0;
    
    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = bbox1.width * bbox1.height;
    const area2 = bbox2.width * bbox2.height;
    
    return intersection / Math.min(area1, area2);
  }
  
  private compareRegionContent(bbox1: any, bbox2: any, image1: ImageData, image2: ImageData): number {
    let diff = 0;
    let count = 0;
    
    const minWidth = Math.min(bbox1.width, bbox2.width);
    const minHeight = Math.min(bbox1.height, bbox2.height);
    
    for (let y = 0; y < minHeight; y++) {
      for (let x = 0; x < minWidth; x++) {
        const idx1 = ((bbox1.y + y) * image1.width + (bbox1.x + x)) * 4;
        const idx2 = ((bbox2.y + y) * image2.width + (bbox2.x + x)) * 4;
        
        if (idx1 < image1.data.length && idx2 < image2.data.length) {
          const pixelDiff = Math.abs(image1.data[idx1] - image2.data[idx2]) +
                           Math.abs(image1.data[idx1 + 1] - image2.data[idx2 + 1]) +
                           Math.abs(image1.data[idx1 + 2] - image2.data[idx2 + 2]);
          diff += pixelDiff / (255 * 3);
          count++;
        }
      }
    }
    
    return count > 0 ? diff / count : 0;
  }
  
  private colorsAreDifferent(color1: any, color2: any): boolean {
    const threshold = 30;
    return Math.abs(color1.r - color2.r) > threshold ||
           Math.abs(color1.g - color2.g) > threshold ||
           Math.abs(color1.b - color2.b) > threshold;
  }
  
  private createAnnotatedImage(
    baseImage: ImageData,
    diffMap: Uint8Array,
    changes: any[]
  ): ImageData {
    const annotated = new ImageData(
      new Uint8ClampedArray(baseImage.data),
      baseImage.width,
      baseImage.height
    );
    
    // Apply diff overlay
    for (let i = 0; i < diffMap.length; i++) {
      if (diffMap[i] > 0) {
        const idx = i * 4;
        // Red tint for differences
        annotated.data[idx] = Math.min(255, annotated.data[idx] + diffMap[i] * 0.5);
        annotated.data[idx + 1] *= 0.7;
        annotated.data[idx + 2] *= 0.7;
      }
    }
    
    // Draw bounding boxes for changes
    changes.forEach(change => {
      const bbox = change.oldBbox || change.newBbox || change.bbox;
      if (bbox) {
        const color = change.type === 'added' ? [0, 255, 0] :
                     change.type === 'removed' ? [255, 0, 0] :
                     [255, 255, 0];
        this.drawBoundingBox(annotated, bbox, color);
      }
    });
    
    return annotated;
  }
  
  private drawBoundingBox(imageData: ImageData, bbox: any, color: number[]) {
    const { width } = imageData;
    const thickness = 2;
    
    // Draw rectangle
    for (let t = 0; t < thickness; t++) {
      // Top and bottom
      for (let x = bbox.x; x < bbox.x + bbox.width; x++) {
        const topIdx = ((bbox.y + t) * width + x) * 4;
        const bottomIdx = ((bbox.y + bbox.height - 1 - t) * width + x) * 4;
        
        if (topIdx < imageData.data.length) {
          imageData.data[topIdx] = color[0];
          imageData.data[topIdx + 1] = color[1];
          imageData.data[topIdx + 2] = color[2];
        }
        
        if (bottomIdx < imageData.data.length) {
          imageData.data[bottomIdx] = color[0];
          imageData.data[bottomIdx + 1] = color[1];
          imageData.data[bottomIdx + 2] = color[2];
        }
      }
      
      // Left and right
      for (let y = bbox.y; y < bbox.y + bbox.height; y++) {
        const leftIdx = (y * width + bbox.x + t) * 4;
        const rightIdx = (y * width + bbox.x + bbox.width - 1 - t) * 4;
        
        if (leftIdx < imageData.data.length) {
          imageData.data[leftIdx] = color[0];
          imageData.data[leftIdx + 1] = color[1];
          imageData.data[leftIdx + 2] = color[2];
        }
        
        if (rightIdx < imageData.data.length) {
          imageData.data[rightIdx] = color[0];
          imageData.data[rightIdx + 1] = color[1];
          imageData.data[rightIdx + 2] = color[2];
        }
      }
    }
  }
  
  private generateHTMLReport(metrics: any, compositeScore: number, textChanges: any[], elementChanges: any[]): string {
    const scoreColor = compositeScore < 30 ? '#4caf50' : compositeScore < 60 ? '#ff9800' : '#f44336';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>UI Comparison Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 {
            color: #333;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
          }
          .score {
            font-size: 72px;
            font-weight: bold;
            color: ${scoreColor};
            text-align: center;
            margin: 30px 0;
          }
          .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          .metric {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          }
          .metric-value {
            font-size: 36px;
            font-weight: bold;
            color: #007bff;
          }
          .changes {
            margin: 30px 0;
          }
          .change-item {
            background: #f8f9fa;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 4px solid #007bff;
          }
          .added { border-left-color: #4caf50; }
          .removed { border-left-color: #f44336; }
          .modified { border-left-color: #ff9800; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>UI Screenshot Comparison Report</h1>
          
          <div class="score">${compositeScore}%</div>
          <p style="text-align: center; font-size: 24px; color: #666;">Composite Difference Score</p>
          
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">${metrics.percentageChanged.toFixed(1)}%</div>
              <div>Visual Change</div>
            </div>
            <div class="metric">
              <div class="metric-value">${metrics.textMismatches}</div>
              <div>Text Changes</div>
            </div>
            <div class="metric">
              <div class="metric-value">${metrics.elementsAdded}</div>
              <div>Elements Added</div>
            </div>
            <div class="metric">
              <div class="metric-value">${metrics.elementsRemoved}</div>
              <div>Elements Removed</div>
            </div>
          </div>
          
          <div class="changes">
            <h2>Detected Changes</h2>
            ${textChanges.map(change => `
              <div class="change-item ${change.type}">
                <strong>${change.type.toUpperCase()}</strong>
                ${change.oldText ? `<br>Location: ${change.oldText}` : ''}
                ${change.type === 'modified' ? '<br>→ Content changed' : ''}
              </div>
            `).join('')}
            
            ${elementChanges.map(change => `
              <div class="change-item ${change.type}">
                <strong>${change.change.type.replace(/-/g, ' ').toUpperCase()}</strong>
                <br>Element Type: ${change.change.details.elementType}
              </div>
            `).join('')}
          </div>
          
          <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; text-align: center;">
            Generated on ${new Date().toLocaleString()}
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  async cleanup() {
    console.log('UIComparisonWorkerWorking cleanup');
    // this.isInitialized = false;
  }
}

// Export the worker
const worker = new UIComparisonWorkerWorking();
Comlink.expose(worker); 