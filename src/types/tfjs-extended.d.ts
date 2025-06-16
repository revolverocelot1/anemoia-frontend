declare module '@tensorflow/tfjs' {
  // Extends the public typings with members that exist at runtime but are currently missing in the type declarations.
  // This allows our worker code to compile while still benefiting from type checking elsewhere.
  // These signatures purposefully use `any`/`unknown` to stay robust across tfjs versions.
  // You can refine them later if you upgrade tfjs or switch to a maintained community typings package.
  // NOTE: We keep this in a project-local augmentation file so that upstream library updates do not break our build.
  // The tf.engine() is a singleton that needs to be callable but also has properties.
  export const engine: {
    (): any;
    registryFactory: Record<string, any>;
    [key: string]: any;
  };

  // The tf.env() is a singleton that holds flags.
  export const env: {
    (): any;
    [key: string]: any;
  };

  /** Waits for the backend to be ready. */
  export function ready(): Promise<void>;

  /** Sets the active backend. */
  export function setBackend(backendName: string): Promise<boolean>;

  /** Returns the name of the current backend. */
  export function getBackend(): string;

  /** Loads a graph model from a URL or IndexedDB. */
  export function loadGraphModel(url: string | any, options?: any): Promise<any>;
} 