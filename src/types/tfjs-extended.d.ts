declare module '@tensorflow/tfjs' {
  // Extends the public typings with members that exist at runtime but are currently missing in the type declarations.
  // This allows our worker code to compile while still benefiting from type checking elsewhere.
  // These signatures purposefully use `any`/`unknown` to stay robust across tfjs versions.
  // You can refine them later if you upgrade tfjs or switch to a maintained community typings package.
  // NOTE: We keep this in a project-local augmentation file so that upstream library updates do not break our build.
  export function engine(): any;
  export function env(): any;
  export function ready(): Promise<void>;
  export function setBackend(backendName: string): Promise<boolean>;
  export function getBackend(): string;
} 