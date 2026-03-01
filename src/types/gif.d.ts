declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
  }

  class GIF {
    constructor(options?: GIFOptions);
    addFrame(canvas: HTMLCanvasElement, options?: { delay?: number }): void;
    on(event: string, callback: (blob: Blob) => void): void;
    render(): void;
  }

  export = GIF;
} 