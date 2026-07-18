import {
  DetailRow,
  FieldRow,
  InspectorCheckbox,
  InspectorSelect,
  OptionalPositiveIntField,
} from "@/components/inspector/inspectorChrome";
import { Input } from "@/components/ui/input";
import type { NodeUpdate } from "@/model";
import type { ContainerNode, LeafNode, Node } from "@/model/types";

export type AppendTarget = { id: string; title: string };

type StructuralParamsProps = {
  node: Node;
  onUpdateNode: (nodeId: string, update: NodeUpdate) => void;
  /** Live containers this leaf may append into (excludes the node itself). */
  appendTargets?: AppendTarget[];
};

type UpdateProps = {
  onUpdateNode: (nodeId: string, update: NodeUpdate) => void;
};

function ContainerStructuralFields({
  node,
  onUpdateNode,
}: UpdateProps & { node: ContainerNode }) {
  return (
    <>
      <FieldRow label="Source" htmlFor="inspector-field-source">
        <InspectorSelect
          id="inspector-field-source"
          data-testid="inspector-field-source"
          value={node.source.kind}
          onChange={(event) =>
            onUpdateNode(node.id, {
              field: "source",
              value: { kind: event.target.value as "snapshot" | "live" },
            })
          }
        >
          <option value="snapshot">snapshot</option>
          <option value="live">live</option>
        </InspectorSelect>
      </FieldRow>

      <FieldRow label="Concurrency" htmlFor="inspector-field-concurrency">
        <InspectorSelect
          id="inspector-field-concurrency"
          data-testid="inspector-field-concurrency"
          value={node.concurrency.kind}
          onChange={(event) =>
            onUpdateNode(node.id, {
              field: "concurrencyKind",
              value: event.target.value as "sequential" | "parallel",
            })
          }
        >
          <option value="sequential">sequential</option>
          <option value="parallel">parallel</option>
        </InspectorSelect>
      </FieldRow>

      {node.concurrency.kind === "parallel" ? (
        <OptionalPositiveIntField
          label="Max concurrency"
          id="inspector-field-max-concurrency"
          testId="inspector-field-max-concurrency"
          placeholder="∞"
          value={node.concurrency.maxConcurrency}
          onChange={(value) =>
            onUpdateNode(node.id, { field: "maxConcurrency", value })
          }
        />
      ) : null}

      <InspectorCheckbox
        data-testid="inspector-field-end"
        label="Fixpoint end"
        checked={node.end?.kind === "fixpoint"}
        disabled={node.source.kind !== "live"}
        onChange={(event) =>
          onUpdateNode(node.id, {
            field: "end",
            value: event.target.checked ? { kind: "fixpoint" } : undefined,
          })
        }
      />
    </>
  );
}

function LeafStructuralFields({
  node,
  onUpdateNode,
  appendTargets,
}: UpdateProps & {
  node: LeafNode;
  appendTargets: AppendTarget[];
}) {
  return (
    <>
      {node.isGate ? (
        <dl className="space-y-1.5 text-sm">
          <DetailRow label="Gate" testId="inspector-is-gate">
            yes
          </DetailRow>
        </dl>
      ) : null}

      <FieldRow label="Appends to" htmlFor="inspector-field-appends-to">
        <InspectorSelect
          id="inspector-field-appends-to"
          data-testid="inspector-field-appends-to"
          value={node.appendsTo ?? ""}
          onChange={(event) =>
            onUpdateNode(node.id, {
              field: "appendsTo",
              value: event.target.value === "" ? undefined : event.target.value,
            })
          }
        >
          <option value="">none</option>
          {appendTargets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.title} ({target.id})
            </option>
          ))}
        </InspectorSelect>
      </FieldRow>
    </>
  );
}

export function StructuralParams({
  node,
  onUpdateNode,
  appendTargets = [],
}: StructuralParamsProps) {
  return (
    <section data-testid="inspector-structural" className="space-y-2.5">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Structural
      </h3>

      <FieldRow label="Title" htmlFor="inspector-field-title">
        <Input
          id="inspector-field-title"
          data-testid="inspector-field-title"
          value={node.title}
          onChange={(event) =>
            onUpdateNode(node.id, {
              field: "title",
              value: event.target.value,
            })
          }
        />
      </FieldRow>

      <dl className="space-y-1.5 text-sm">
        <DetailRow label="Kind">{node.kind}</DetailRow>
        <DetailRow label="Type" testId="inspector-catalog-type">
          {node.type}
        </DetailRow>
        {node.parentId !== undefined ? (
          <DetailRow label="Parent">{node.parentId}</DetailRow>
        ) : null}
        {node.kind === "container" ? (
          <DetailRow label="Iterable port">{node.iterablePortId}</DetailRow>
        ) : null}
      </dl>

      {node.kind === "container" ? (
        <ContainerStructuralFields node={node} onUpdateNode={onUpdateNode} />
      ) : (
        <LeafStructuralFields
          node={node}
          onUpdateNode={onUpdateNode}
          appendTargets={appendTargets}
        />
      )}
    </section>
  );
}
