// global.ts

// Mock `window` object
(global as any).window = (global as any).window || {};

// Mock `navigator` object
(global as any).navigator = (global as any).navigator || {
  userAgent: 'node',
};

// Polyfill addEventListener, removeEventListener, and other methods if needed
(global as any).window.addEventListener = (global as any).window.addEventListener || function () {
  // No-op implementation
};
(global as any).window.removeEventListener = (global as any).window.removeEventListener || function () {
  // No-op implementation
};
(global as any).window.dispatchEvent = (global as any).window.dispatchEvent || function () {
  // No-op implementation
};

// If the SDK also uses custom events or other browser-like behaviors, you can mock them similarly.
(global as any).window.CustomEvent = (global as any).window.CustomEvent || function () {
  // No-op implementation for custom events
};

// Export an empty object just to satisfy TypeScript
export {};
