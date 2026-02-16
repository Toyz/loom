/**
 * Loom — JSX type declarations
 *
 * Declares JSX.IntrinsicElements for all HTML elements with
 * proper event handler types and standard HTML attributes.
 */

type EventHandler<E extends Event = Event> = (event: E) => void;

interface LoomHTMLAttributes {
  // Core
  id?: string;
  className?: string;
  class?: string;
  style?: string | Partial<CSSStyleDeclaration>;
  slot?: string;
  title?: string;
  tabIndex?: number;
  hidden?: boolean;
  draggable?: boolean;
  innerHTML?: string;
  rawHTML?: string;

  // Data
  [key: `data-${string}`]: string | number | boolean | undefined;

  // Ref
  ref?: (el: HTMLElement) => void;

  // Mouse events
  onClick?: EventHandler<MouseEvent>;
  onDblClick?: EventHandler<MouseEvent>;
  onMouseDown?: EventHandler<MouseEvent>;
  onMouseUp?: EventHandler<MouseEvent>;
  onMouseMove?: EventHandler<MouseEvent>;
  onMouseEnter?: EventHandler<MouseEvent>;
  onMouseLeave?: EventHandler<MouseEvent>;
  onMouseOver?: EventHandler<MouseEvent>;
  onMouseOut?: EventHandler<MouseEvent>;
  onContextMenu?: EventHandler<MouseEvent>;
  onWheel?: EventHandler<WheelEvent>;

  // Keyboard events
  onKeyDown?: EventHandler<KeyboardEvent>;
  onKeyUp?: EventHandler<KeyboardEvent>;
  onKeyPress?: EventHandler<KeyboardEvent>;

  // Focus events
  onFocus?: EventHandler<FocusEvent>;
  onBlur?: EventHandler<FocusEvent>;

  // Form events
  onInput?: EventHandler<Event>;
  onChange?: EventHandler<Event>;
  onSubmit?: EventHandler<Event>;
  onReset?: EventHandler<Event>;

  // Pointer events
  onPointerDown?: EventHandler<PointerEvent>;
  onPointerUp?: EventHandler<PointerEvent>;
  onPointerMove?: EventHandler<PointerEvent>;
  onPointerEnter?: EventHandler<PointerEvent>;
  onPointerLeave?: EventHandler<PointerEvent>;
  onPointerCancel?: EventHandler<PointerEvent>;

  // Touch events
  onTouchStart?: EventHandler<TouchEvent>;
  onTouchMove?: EventHandler<TouchEvent>;
  onTouchEnd?: EventHandler<TouchEvent>;
  onTouchCancel?: EventHandler<TouchEvent>;

  // Drag events
  onDrag?: EventHandler<DragEvent>;
  onDragStart?: EventHandler<DragEvent>;
  onDragEnd?: EventHandler<DragEvent>;
  onDragOver?: EventHandler<DragEvent>;
  onDragEnter?: EventHandler<DragEvent>;
  onDragLeave?: EventHandler<DragEvent>;
  onDrop?: EventHandler<DragEvent>;

  // Misc events
  onScroll?: EventHandler<Event>;
  onResize?: EventHandler<Event>;
  onLoad?: EventHandler<Event>;
  onError?: EventHandler<Event>;
  onTransitionEnd?: EventHandler<TransitionEvent>;
  onAnimationEnd?: EventHandler<AnimationEvent>;

  // Children
  children?: any;
}

interface LoomInputAttributes extends LoomHTMLAttributes {
  type?: string;
  value?: string | number;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  checked?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  name?: string;
  pattern?: string;
  autocomplete?: string;
  autofocus?: boolean;
  maxLength?: number;
  minLength?: number;
}

interface LoomTextAreaAttributes extends LoomHTMLAttributes {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  rows?: number;
  cols?: number;
  name?: string;
  maxLength?: number;
  minLength?: number;
}

interface LoomSelectAttributes extends LoomHTMLAttributes {
  value?: string;
  disabled?: boolean;
  required?: boolean;
  multiple?: boolean;
  name?: string;
}

interface LoomOptionAttributes extends LoomHTMLAttributes {
  value?: string;
  disabled?: boolean;
  selected?: boolean;
  label?: string;
}

interface LoomAnchorAttributes extends LoomHTMLAttributes {
  href?: string;
  target?: string;
  rel?: string;
  download?: string | boolean;
}

interface LoomImageAttributes extends LoomHTMLAttributes {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  loading?: "lazy" | "eager";
  crossOrigin?: string;
}

interface LoomLabelAttributes extends LoomHTMLAttributes {
  htmlFor?: string;
}

interface LoomCanvasAttributes extends LoomHTMLAttributes {
  width?: string | number;
  height?: string | number;
}

interface LoomButtonAttributes extends LoomHTMLAttributes {
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  name?: string;
  value?: string;
}

interface LoomFormAttributes extends LoomHTMLAttributes {
  action?: string;
  method?: string;
  encType?: string;
  noValidate?: boolean;
}

interface LoomVideoAttributes extends LoomHTMLAttributes {
  src?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
  width?: string | number;
  height?: string | number;
}

interface LoomAudioAttributes extends LoomHTMLAttributes {
  src?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

interface LoomSourceAttributes extends LoomHTMLAttributes {
  src?: string;
  type?: string;
  media?: string;
}

interface LoomSVGAttributes extends LoomHTMLAttributes {
  viewBox?: string;
  xmlns?: string;
  fill?: string;
  stroke?: string;
  width?: string | number;
  height?: string | number;
}

declare module "@toyz/loom/jsx-runtime" {
  export function jsx(tag: any, props: any, key?: any): any;
  export function jsxs(tag: any, props: any, key?: any): any;
  export function Fragment(props: { children?: any }): DocumentFragment;
  export namespace JSX {
    type Element = HTMLElement | DocumentFragment;

    interface IntrinsicElements {
    // Structural
    div: LoomHTMLAttributes;
    span: LoomHTMLAttributes;
    p: LoomHTMLAttributes;
    main: LoomHTMLAttributes;
    section: LoomHTMLAttributes;
    article: LoomHTMLAttributes;
    aside: LoomHTMLAttributes;
    header: LoomHTMLAttributes;
    footer: LoomHTMLAttributes;
    nav: LoomHTMLAttributes;

    // Headings
    h1: LoomHTMLAttributes;
    h2: LoomHTMLAttributes;
    h3: LoomHTMLAttributes;
    h4: LoomHTMLAttributes;
    h5: LoomHTMLAttributes;
    h6: LoomHTMLAttributes;

    // Text
    strong: LoomHTMLAttributes;
    em: LoomHTMLAttributes;
    b: LoomHTMLAttributes;
    i: LoomHTMLAttributes;
    u: LoomHTMLAttributes;
    s: LoomHTMLAttributes;
    small: LoomHTMLAttributes;
    sub: LoomHTMLAttributes;
    sup: LoomHTMLAttributes;
    mark: LoomHTMLAttributes;
    code: LoomHTMLAttributes;
    pre: LoomHTMLAttributes;
    blockquote: LoomHTMLAttributes;
    abbr: LoomHTMLAttributes;
    cite: LoomHTMLAttributes;
    q: LoomHTMLAttributes;
    time: LoomHTMLAttributes;
    kbd: LoomHTMLAttributes;
    samp: LoomHTMLAttributes;
    var: LoomHTMLAttributes;

    // Lists
    ul: LoomHTMLAttributes;
    ol: LoomHTMLAttributes;
    li: LoomHTMLAttributes;
    dl: LoomHTMLAttributes;
    dt: LoomHTMLAttributes;
    dd: LoomHTMLAttributes;

    // Links & Media
    a: LoomAnchorAttributes;
    img: LoomImageAttributes;
    video: LoomVideoAttributes;
    audio: LoomAudioAttributes;
    source: LoomSourceAttributes;
    canvas: LoomCanvasAttributes;
    picture: LoomHTMLAttributes;
    figure: LoomHTMLAttributes;
    figcaption: LoomHTMLAttributes;

    // Forms
    form: LoomFormAttributes;
    input: LoomInputAttributes;
    textarea: LoomTextAreaAttributes;
    select: LoomSelectAttributes;
    option: LoomOptionAttributes;
    button: LoomButtonAttributes;
    label: LoomLabelAttributes;
    fieldset: LoomHTMLAttributes;
    legend: LoomHTMLAttributes;
    output: LoomHTMLAttributes;
    progress: LoomHTMLAttributes & { value?: number; max?: number };
    meter: LoomHTMLAttributes & {
      value?: number;
      min?: number;
      max?: number;
    };

    // Table
    table: LoomHTMLAttributes;
    thead: LoomHTMLAttributes;
    tbody: LoomHTMLAttributes;
    tfoot: LoomHTMLAttributes;
    tr: LoomHTMLAttributes;
    th: LoomHTMLAttributes & { colSpan?: number; rowSpan?: number };
    td: LoomHTMLAttributes & { colSpan?: number; rowSpan?: number };
    caption: LoomHTMLAttributes;
    colgroup: LoomHTMLAttributes;
    col: LoomHTMLAttributes & { span?: number };

    // Misc
    br: LoomHTMLAttributes;
    hr: LoomHTMLAttributes;
    details: LoomHTMLAttributes & { open?: boolean };
    summary: LoomHTMLAttributes;
    dialog: LoomHTMLAttributes & { open?: boolean };
    template: LoomHTMLAttributes;
    slot: LoomHTMLAttributes & { name?: string };

    // SVG (basic)
    svg: LoomSVGAttributes;
    path: LoomSVGAttributes & { d?: string };
    circle: LoomSVGAttributes & { cx?: number; cy?: number; r?: number };
    rect: LoomSVGAttributes & {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rx?: number;
      ry?: number;
    };
    line: LoomSVGAttributes & {
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
    };
    polyline: LoomSVGAttributes & { points?: string };
    polygon: LoomSVGAttributes & { points?: string };
    text: LoomSVGAttributes & { x?: number; y?: number };
    g: LoomSVGAttributes;
    defs: LoomSVGAttributes;
    use: LoomSVGAttributes & { href?: string };

    // Catch-all for custom elements
    [tag: string]: LoomHTMLAttributes;
    }
  }
}
