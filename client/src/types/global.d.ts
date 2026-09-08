export {};

declare global {
  interface Window {
    aiFinance?: {
      platform: string;
      isDesktop: boolean;
      minimize?: () => Promise<void>;
      maximize?: () => Promise<void>;
      close?: () => Promise<void>;
      isMaximized?: () => Promise<boolean>;
      onMaximizedChange?: (callback: (maximized: boolean) => void) => () => void;
    };
  }
}
