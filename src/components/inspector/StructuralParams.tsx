import { DetailRow } from "@/components/inspector/inspectorChrome";
import type { Node } from "@/model/types";

export function StructuralParams({ node }: { node: Node }) {
  return (
    <section data-testid="inspector-structural">
      <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        Structural
      </h3>
      <dl className="space-y-1.5 text-sm">
        <DetailRow label="Kind">{node.kind}</DetailRow>
        <DetailRow label="Type" testId="inspector-catalog-type">
          {node.type}
        </DetailRow>
        {node.parentId !== undefined ? (
          <DetailRow label="Parent">{node.parentId}</DetailRow>
        ) : null}
        {node.kind === "container" ? (
          <>
            <DetailRow label="Iterable port">{node.iterablePortId}</DetailRow>
            <DetailRow label="Source" testId="inspector-source-kind">
              {node.source.kind}
            </DetailRow>
            <DetailRow label="Concurrency" testId="inspector-concurrency">
              {node.concurrency.kind === "sequential"
                ? "sequential"
                : `parallel${
                    node.concurrency.maxConcurrency !== undefined
                      ? ` ≤${node.concurrency.maxConcurrency}`
                      : ""
                  }`}
            </DetailRow>
            {node.end !== undefined ? (
              <DetailRow label="End" testId="inspector-end">
                {node.end.kind}
              </DetailRow>
            ) : null}
          </>
        ) : (
          <>
            {node.isGate ? (
              <DetailRow label="Gate" testId="inspector-is-gate">
                yes
              </DetailRow>
            ) : null}
            {node.appendsTo !== undefined ? (
              <DetailRow label="Appends to" testId="inspector-appends-to">
                {node.appendsTo}
              </DetailRow>
            ) : null}
          </>
        )}
      </dl>
    </section>
  );
}
