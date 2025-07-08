declare module 'tesseract.js' {
  export interface RecognizeResult {
    data: {
      text: string;
      hocr: string;
      tsv: string;
      box: any;
      confidence: number;
      words: Array<{
        text: string;
        bbox: {
          x0: number;
          y0: number;
          x1: number;
          y1: number;
        };
        confidence: number;
        baseline: {
          has_baseline: boolean;
          y0?: number;
          y1?: number;
        };
        paragraph: any;
        line: any;
        block: any;
        page: any;
      }>;
      lines: Array<{
        text: string;
        bbox: {
          x0: number;
          y0: number;
          x1: number;
          y1: number;
        };
        confidence: number;
        baseline: any;
        words: any[];
      }>;
      paragraphs: any[];
      blocks: any[];
      symbols: any[];
    };
  }

  export interface Worker {
    load(): Promise<void>;
    loadLanguage(lang: string): Promise<void>;
    initialize(lang: string): Promise<void>;
    setParameters(params: any): Promise<void>;
    recognize(image: any): Promise<RecognizeResult>;
    terminate(): Promise<void>;
  }

  export function createWorker(options?: any): Promise<Worker>;
  
  const Tesseract: {
    createWorker: typeof createWorker;
  };
  
  export default Tesseract;
} 