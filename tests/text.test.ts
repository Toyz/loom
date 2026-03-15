/**
 * Tests: text() — HTML entity decoder
 */
import { describe, it, expect } from "vitest";
import { text } from "../src/text";

describe("text()", () => {
  it("decodes &lt; to <", () => {
    expect(text("tea time &lt;3")).toBe("tea time <3");
  });

  it("decodes &gt; to >", () => {
    expect(text("1 &gt; 0")).toBe("1 > 0");
  });

  it("decodes &amp; to &", () => {
    expect(text("rock &amp; roll")).toBe("rock & roll");
  });

  it("decodes &quot; to \"", () => {
    expect(text("she said &quot;hello&quot;")).toBe('she said "hello"');
  });

  it("decodes &#39; to '", () => {
    expect(text("it&#39;s fine")).toBe("it's fine");
  });

  it("decodes &#x27; to '", () => {
    expect(text("it&#x27;s fine")).toBe("it's fine");
  });

  it("decodes &#x2F; to /", () => {
    expect(text("a&#x2F;b")).toBe("a/b");
  });

  it("decodes &#x60; to `", () => {
    expect(text("use &#x60;code&#x60;")).toBe("use `code`");
  });

  it("handles multiple entities in one string", () => {
    expect(text("&lt;div class=&quot;hi&quot;&gt;")).toBe('<div class="hi">');
  });

  it("returns unmodified string with no entities", () => {
    expect(text("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(text("")).toBe("");
  });

  it("does not double-decode", () => {
    expect(text("&amp;lt;")).toBe("&lt;");
  });

  it("leaves unknown entities untouched", () => {
    expect(text("&nbsp; &copy;")).toBe("&nbsp; &copy;");
  });
});
