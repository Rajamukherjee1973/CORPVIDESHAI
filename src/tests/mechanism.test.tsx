import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ControlMatrix, LayerStack } from "@/components/site/MechanismLayers";
import { AXES, GRID, LAYERS, gridFor, scaleLabel, type Level } from "@/lib/mechanism";

afterEach(cleanup);

describe("mechanism data contract", () => {
  it("declares seven fully specified layers", () => {
    expect(LAYERS).toHaveLength(7);
    for (const l of LAYERS) {
      for (const key of [
        "id", "n", "name", "role", "input", "action", "output",
        "tech", "why", "owner", "latency", "manual", "plain", "failsafe",
      ] as const) {
        expect(typeof l[key]).toBe("string");
        expect(l[key].length).toBeGreaterThan(0);
      }
    }
    expect(new Set(LAYERS.map((l) => l.id)).size).toBe(LAYERS.length);
  });

  it("gives every layer a control row of exactly one value per axis", () => {
    for (const l of LAYERS) {
      const row = gridFor(l.id);
      expect(row).toHaveLength(AXES.length);
      for (const v of row) expect([0, 1, 2]).toContain(v);
    }
    expect(Object.keys(GRID).sort()).toEqual(LAYERS.map((l) => l.id).sort());
  });

  it("falls back to a well-formed row for an unknown layer", () => {
    const row = gridFor("does-not-exist");
    expect(row).toEqual([0, 0, 0, 0]);
    expect(scaleLabel(row[0] as Level)).toBe("None");
  });

  it("labels every control level", () => {
    expect(scaleLabel(0)).toBe("None");
    expect(scaleLabel(1)).toBe("Partial");
    expect(scaleLabel(2)).toBe("Full");
  });
});

describe("expandable layer stack", () => {
  it("renders every layer header collapsed except the initial one", () => {
    render(<LayerStack initialOpen="L2" />);
    const buttons = screen.getAllByRole("button").filter((b) => b.hasAttribute("aria-expanded"));
    expect(buttons).toHaveLength(LAYERS.length);
    const expanded = buttons.filter((b) => b.getAttribute("aria-expanded") === "true");
    expect(expanded).toHaveLength(1);
    const l2 = LAYERS.find((l) => l.id === "L2")!;
    expect(expanded[0]!.textContent).toContain(l2.name);
    expect(screen.getByText(l2.plain)).toBeTruthy();
  });

  it("shows the full contract of an opened layer", async () => {
    const user = userEvent.setup();
    render(<LayerStack initialOpen="" />);
    const l = LAYERS[4]!;
    await user.click(screen.getByRole("button", { name: new RegExp(l.name, "i") }));
    for (const text of [l.input, l.action, l.output, l.tech, l.why, l.owner, l.failsafe, l.plain]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    for (const heading of ["Enters the layer", "What the layer does", "Leaves the layer", "Technology chosen", "Ownership", "Failure position", "In plain words"]) {
      expect(screen.getAllByText(heading).length).toBeGreaterThan(0);
    }
  });

  it("keeps exactly one layer open and closes it on a second click", async () => {
    const user = userEvent.setup();
    render(<LayerStack initialOpen="L1" />);
    const target = LAYERS[3]!;
    await user.click(screen.getByRole("button", { name: new RegExp(target.name, "i") }));
    let expanded = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-expanded") === "true");
    expect(expanded).toHaveLength(1);
    expect(expanded[0]!.textContent).toContain(target.name);
    expect(screen.queryByText(LAYERS[0]!.plain)).toBeNull();

    await user.click(expanded[0]!);
    expanded = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-expanded") === "true");
    expect(expanded).toHaveLength(0);
    expect(screen.queryByText(target.plain)).toBeNull();
  });
});

describe("control matrix", () => {
  it("renders a labelled cell for every layer and axis", () => {
    const { container } = render(<ControlMatrix />);
    for (const a of AXES) expect(screen.getAllByText(a).length).toBeGreaterThan(0);
    const cells = container.querySelectorAll("[aria-label]");
    expect(cells).toHaveLength(LAYERS.length * AXES.length);
    for (const c of Array.from(cells)) {
      expect(["None", "Partial", "Full"]).toContain(c.getAttribute("aria-label"));
    }
    const first = screen.getByText(`${LAYERS[0]!.n} · ${LAYERS[0]!.name}`);
    expect(within(first.parentElement!).getByText(/·/)).toBeTruthy();
  });
});
