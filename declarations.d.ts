
declare module 'pizzip';
declare module 'docxtemplater';
declare module 'file-saver';

// FIX: Add types for the Background Sync API to augment the global ServiceWorkerRegistration interface.
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  readonly sync: SyncManager;
}