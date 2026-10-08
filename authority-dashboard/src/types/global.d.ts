declare global {
  interface Window {
    createAuthoritySocketForCurrentUser?: () => Promise<any> | any;
    disconnectAuthoritySocketForCurrentUser?: () => void;
  }
}

export {};
