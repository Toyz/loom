/**
 * Debug test: verify addInitializer works for method/accessor decorators
 */
import { describe, it, expect, vi } from "vitest";
import { LoomElement } from "../src/element";
import { CONNECT_HOOKS } from "../src/decorators/symbols";

let tagCounter = 0;
function nextTag() { return `test-debug-${++tagCounter}`; }

describe("addInitializer sanity checks", () => {
  it("method decorator addInitializer runs during construction", () => {
    const initFn = vi.fn();

    function myDec(method: Function, context: ClassMethodDecoratorContext) {
      context.addInitializer(function (this: any) {
        initFn(this);
      });
    }

    const tag = nextTag();
    class El extends LoomElement {
      @myDec
      hello() { return 42; }
    }
    customElements.define(tag, El);

    expect(initFn).not.toHaveBeenCalled(); // not called until instantiation
    const el = document.createElement(tag);
    expect(initFn).toHaveBeenCalledOnce(); // called during construction
    expect(initFn).toHaveBeenCalledWith(el);
  });

  it("method addInitializer can register CONNECT_HOOKS", () => {
    const connectFn = vi.fn();

    function myDec(method: Function, context: ClassMethodDecoratorContext) {
      context.addInitializer(function (this: any) {
        if (!this[CONNECT_HOOKS]) this[CONNECT_HOOKS] = [];
        this[CONNECT_HOOKS].push((el: any) => connectFn());
      });
    }

    const tag = nextTag();
    class El extends LoomElement {
      @myDec
      hello() {}
    }
    customElements.define(tag, El);

    const el = document.createElement(tag);
    expect(connectFn).not.toHaveBeenCalled();

    document.body.appendChild(el);
    expect(connectFn).toHaveBeenCalledOnce(); // CONNECT_HOOKS fire on connect
  });

  it("accessor decorator addInitializer runs during construction", () => {
    const initFn = vi.fn();

    function myDec<This extends object, V>(
      target: ClassAccessorDecoratorTarget<This, V>,
      context: ClassAccessorDecoratorContext<This, V>,
    ): ClassAccessorDecoratorResult<This, V> {
      context.addInitializer(function (this: any) {
        initFn(this);
      });
      return {};
    }

    const tag = nextTag();
    class El extends LoomElement {
      @myDec accessor foo = 42;
    }
    customElements.define(tag, El);

    const el = document.createElement(tag);
    expect(initFn).toHaveBeenCalledOnce();
  });

  it("method addInitializer runs AFTER accessor field init", () => {
    const order: string[] = [];

    function trackAccessor<This extends object, V>(
      target: ClassAccessorDecoratorTarget<This, V>,
      context: ClassAccessorDecoratorContext<This, V>,
    ): ClassAccessorDecoratorResult<This, V> {
      const key = String(context.name);
      return {
        set(this: any, val: V) {
          order.push(`accessor-set:${key}:${val}`);
          target.set.call(this, val);
        },
        init(val: V): V {
          order.push(`accessor-init:${key}:${val}`);
          return val;
        },
      };
    }

    function trackMethod(method: Function, context: ClassMethodDecoratorContext) {
      context.addInitializer(function (this: any) {
        order.push(`method-initializer:${String(context.name)}`);
      });
    }

    const tag = nextTag();
    class El extends LoomElement {
      @trackAccessor accessor count = 0;
      @trackMethod
      handler() {}
    }
    customElements.define(tag, El);

    document.createElement(tag);
    console.log("Initialization order:", order);
    // This tells us the ACTUAL order of initializer callbacks
    expect(order.length).toBeGreaterThan(0);
  });
});
