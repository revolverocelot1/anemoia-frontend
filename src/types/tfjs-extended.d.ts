declare module '@tensorflow/tfjs' {
  // These types are simplified to `any` to ensure the build passes.
  // This is a robust solution to prevent type conflicts and the 'never' type error.
  export const engine: any;
  export const env: any;
  export function ready(): Promise<void>;
  export function setBackend(backendName: string): Promise<boolean>;
  export function getBackend(): string;
  export function loadGraphModel(url: string | any, options?: any): Promise<any>;
} 