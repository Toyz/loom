/**
 * @hotkey carries its own printed label.
 *
 * The parser already resolves `mod` per platform to decide what to match; the
 * label has to come from that same resolution, or the hint shown in the UI is
 * a second copy that can silently disagree with the binding.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { hotkey, hotkeyLabel, hotkeyLabels } from "../src/element/hotkey";

/**
 * Platform is read once at module load, so each platform needs its own fresh
 * import of the module rather than a mutation partway through.
 */
async function loadFor(platform: string) {
  vi.resetModules();
  vi.stubGlobal("navigator", { ...globalThis.navigator, platform });
  return await import("../src/element/hotkey");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("hotkey labels", () => {
  it("attaches the printed combo to the decorated method", () => {
    class Demo {
      @hotkey("ctrl+k")
      open() {}
    }
    const m = Demo.prototype.open;
    expect(hotkeyLabel(m)).toBe("Ctrl+K");
  });

  it("exposes every declared combo, in order", () => {
    class Demo {
      @hotkey("ctrl+s", "ctrl+shift+s")
      save() {}
    }
    expect(hotkeyLabels(Demo.prototype.save)).toEqual(["Ctrl+S", "Ctrl+Shift+S"]);
    // hotkey is the first one
    expect(hotkeyLabel(Demo.prototype.save)).toBe("Ctrl+S");
  });

  it("names keys that are not single characters", () => {
    class Demo {
      @hotkey("escape")
      close() {}
      @hotkey("shift+arrowup")
      up() {}
    }
    expect(hotkeyLabel(Demo.prototype.close)).toBe("Esc");
    expect(hotkeyLabel(Demo.prototype.up)).toBe("Shift+↑");
  });

  it("accepts the object form", () => {
    class Demo {
      @hotkey({ key: "p", ctrl: true, shift: true })
      palette() {}
    }
    expect(hotkeyLabel(Demo.prototype.palette)).toBe("Ctrl+Shift+P");
  });

  it("ignores a trailing options object", () => {
    class Demo {
      @hotkey("ctrl+k", { global: true, preventDefault: false })
      open() {}
    }
    expect(hotkeyLabel(Demo.prototype.open)).toBe("Ctrl+K");
  });

  it("returns empty for a method with no hotkey", () => {
    class Demo {
      plain() {}
    }
    expect(hotkeyLabel(Demo.prototype.plain)).toBe("");
    expect(hotkeyLabels(Demo.prototype.plain)).toEqual([]);
  });

  it("does not make the label enumerable on the method", () => {
    class Demo {
      @hotkey("ctrl+k")
      open() {}
    }
    expect(Object.keys(Demo.prototype.open)).not.toContain("hotkey");
  });

  it("resolves mod to Ctrl off Mac", async () => {
    const mod = await loadFor("Win32");
    class Demo {
      @mod.hotkey("mod+k")
      open() {}
    }
    expect(mod.hotkeyLabel(Demo.prototype.open)).toBe("Ctrl+K");
  });

  it("resolves mod to the command glyph on Mac", async () => {
    const mod = await loadFor("MacIntel");
    class Demo {
      @mod.hotkey("mod+k")
      open() {}
    }
    expect(mod.hotkeyLabel(Demo.prototype.open)).toBe("⌘K");
  });

  it("uses Apple's modifier order and no separators on Mac", async () => {
    const mod = await loadFor("MacIntel");
    class Demo {
      @mod.hotkey("cmd+shift+alt+ctrl+k")
      everything() {}
    }
    expect(mod.hotkeyLabel(Demo.prototype.everything)).toBe("⌃⌥⇧⌘K");
  });
});
