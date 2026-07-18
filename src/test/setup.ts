import "@testing-library/jest-dom/vitest";
import "../index.css";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;
