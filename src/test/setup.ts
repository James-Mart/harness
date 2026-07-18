import "@testing-library/jest-dom/vitest";
import "../index.css";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

/** Minimal DataTransfer for jsdom drag/drop tests. */
class DataTransferMock {
  dropEffect = "none";
  effectAllowed = "all";
  files: FileList = [] as unknown as FileList;
  items: DataTransferItemList = [] as unknown as DataTransferItemList;
  types: string[] = [];
  private readonly store = new Map<string, string>();

  clearData(format?: string): void {
    if (format === undefined) {
      this.store.clear();
      this.types = [];
      return;
    }
    this.store.delete(format);
    this.types = [...this.store.keys()];
  }

  getData(format: string): string {
    return this.store.get(format) ?? "";
  }

  setData(format: string, data: string): void {
    this.store.set(format, data);
    this.types = [...this.store.keys()];
  }

  setDragImage(): void {}
}

globalThis.DataTransfer = DataTransferMock as unknown as typeof DataTransfer;
