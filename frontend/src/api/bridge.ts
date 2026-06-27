declare global {
  interface Window {
    pywebview?: {
      api: {
        [key: string]: (...args: any[]) => Promise<any>;
      };
    };
  }
}

export const backendAPI = window.pywebview?.api || new Proxy({}, {
  get: () => () => {
    console.warn("pywebview API is not initialized. Are you running inside the desktop window?");
    return Promise.resolve();
  }
}) as any; 

// Strictly mapping to your exact code properties
export interface AppState {
  sites: Array<{
    url: string;
    enabled: boolean;
  }>;
  master_on?: boolean;
  [key: string]: any;
}