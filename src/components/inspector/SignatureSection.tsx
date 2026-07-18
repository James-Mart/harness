import { schemaCompatKey } from "@/model/schema";
import type { Port } from "@/model/types";

function PortRow({ port }: { port: Port }) {
  const flags = [
    port.required ? "required" : null,
    port.iterable ? "iterable" : null,
  ].filter(Boolean);

  return (
    <li
      className="flex items-baseline justify-between gap-2 text-sm"
      data-testid={`inspector-port-${port.id}`}
    >
      <span className="min-w-0 truncate">
        <span className="text-muted-foreground mr-1.5 text-xs uppercase">
          {port.direction}
        </span>
        {port.name}
      </span>
      <span className="text-muted-foreground shrink-0 text-xs">
        {schemaCompatKey(port.schema)}
        {flags.length > 0 ? ` · ${flags.join(", ")}` : ""}
      </span>
    </li>
  );
}

export function SignatureSection({ ports }: { ports: readonly Port[] }) {
  const inputs = ports.filter((port) => port.direction === "in");
  const outputs = ports.filter((port) => port.direction === "out");

  return (
    <section data-testid="inspector-signature">
      <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        Signature
      </h3>
      {ports.length === 0 ? (
        <p className="text-muted-foreground text-sm">No ports.</p>
      ) : (
        <div className="space-y-3">
          {inputs.length > 0 ? (
            <div>
              <p className="text-muted-foreground mb-1 text-xs">Inputs</p>
              <ul className="space-y-1">
                {inputs.map((port) => (
                  <PortRow key={port.id} port={port} />
                ))}
              </ul>
            </div>
          ) : null}
          {outputs.length > 0 ? (
            <div>
              <p className="text-muted-foreground mb-1 text-xs">Outputs</p>
              <ul className="space-y-1">
                {outputs.map((port) => (
                  <PortRow key={port.id} port={port} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
