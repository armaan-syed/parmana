import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Polyfill getComputedStyle animationName in jsdom so Radix UI's Presence
// state machine evaluates animationName as "none" and unmounts immediately
// instead of hanging while waiting for animationend events.
const sampleStyle = window.getComputedStyle(document.createElement("div"));
const proto = Object.getPrototypeOf(sampleStyle);
if (proto && "animationName" in proto) {
  Object.defineProperty(proto, "animationName", {
    get: () => "none",
    configurable: true,
  });
}

// jsdom-only noise suppression. These console.error emissions are inherent to
// how the app renders under a simulated browser, not real defects:
// - "empty string href": the TanStack Start root document shell renders
//   <HeadContent/> links into jsdom, where Vite's `?url` asset import (the
//   stylesheet) resolves to an empty string.
// - "<html> cannot be a child of <div>": the app's root shell renders a full
//   SSR document (html/head/body) inside the test container.
// - "not wrapped in act(...)": TanStack Router performs asynchronous route
//   loads and session restore after mount; RTL's auto-act wrappers cannot
//   capture those updates. Tests still wait on user-visible outcomes.
const originalConsoleError = console.error.bind(console);
const suppressedPatterns: RegExp[] = [
  /An empty string \(""\) was passed to the href attribute/,
  /In HTML, <html> cannot be a child of <div>/,
  /was not wrapped in act\(\.\.\.\)/,
];
console.error = (...args: unknown[]) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (first && suppressedPatterns.some((pattern) => pattern.test(first))) {
    return;
  }
  originalConsoleError(...args);
};
