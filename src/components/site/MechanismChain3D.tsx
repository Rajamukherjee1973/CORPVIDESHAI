import { LAYERS, latencySecs } from "@/lib/mechanism";
import { ProcessTheatre3D, type Stage } from "@/components/site/ProcessTheatre3D";

const STAGES: Stage[] = LAYERS.map((l) => ({
  label: l.name,
  actor: l.owner,
  statute: l.tech,
  secs: latencySecs(l.id),
  detail: `${l.action} Enters: ${l.input} Leaves: ${l.output}`,
}));

/**
 * The seven mechanism layers driven as one linked 3D chain. The active node is
 * controlled by the page so the theatre and the expanded layer stay in step.
 */
export function MechanismChain3D({
  activeId,
  onActive,
}: {
  activeId: string;
  onActive: (id: string) => void;
}) {
  const index = Math.max(0, LAYERS.findIndex((l) => l.id === activeId));
  const total = LAYERS.reduce((a, l) => a + latencySecs(l.id), 0);
  const done = LAYERS.slice(0, index + 1).reduce((a, l) => a + latencySecs(l.id), 0);
  const cur = LAYERS[index]!;

  return (
    <ProcessTheatre3D
      title="Layer chain — live 3D rail"
      caption="Each node is one layer. The packet only moves once the layer before it has sealed its artefact — click a node, or open a layer below, and both stay in step."
      stages={STAGES}
      index={index}
      onIndex={(i) => onActive(LAYERS[i]!.id)}
      hud={[
        { k: "Active layer", v: `${cur.n} · ${cur.id}` },
        { k: "Sealed so far", v: `${done.toFixed(1)}s` },
        { k: "Full chain", v: `${total.toFixed(1)}s` },
        { k: "Same file, manually", v: cur.manual },
      ]}
    />
  );
}