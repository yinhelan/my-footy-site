import { createRoot, type Root } from "react-dom/client";
import type { ComponentProps } from "react";
import ResultsExport from "../../components/ResultsExport.tsx";

const rootStore = new WeakMap<HTMLElement, Root>();

type Props = ComponentProps<typeof ResultsExport>;

export function renderResultsExport(host: HTMLElement, props: Props) {
  let root = rootStore.get(host);
  if (!root) {
    root = createRoot(host);
    rootStore.set(host, root);
  }
  root.render(<ResultsExport {...props} />);
}
