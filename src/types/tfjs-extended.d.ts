declare module '@tensorflow/tfjs' {
  // Extends the public typings with members that exist at runtime but are currently missing in the type declarations.
  // This allows our worker code to compile while still benefiting from type checking elsewhere.
  // These signatures purposefully use `any`/`unknown` to stay robust across tfjs versions.
  // You can refine them later if you upgrade tfjs or switch to a maintained community typings package.
  // NOTE: We keep this in a project-local augmentation file so that upstream library updates do not break our build.
  // tf.engine behaves like a callable function that also has properties such as `registryFactory`.
  export const engine: {
    (): any;                    // callable signature (returns the internal engine)
    registryFactory?: Record<string, any>; // map of backend factories
    [key: string]: any;         // allow access to any other dynamic properties exposed at runtime
  };

  // tf.env behaves like a callable function that also has properties such as `registryFactory`.
  export const env: {
    (): any;
    [key: string]: any;
  };

  /** Wait until the backend is initialised. */
  export function ready(): Promise<void>;
  export function setBackend(backendName: string): Promise<boolean>;
  export function getBackend(): string;

  /** Load a SavedModel / GraphModel from a URL or IndexedDB. */
  export function loadGraphModel(path: string, options?: any): Promise<any>;
} 