import type { Mounted, MountOptions, RenderOptions } from "pele";
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type PropType,
  type VNode,
} from "vue";

type MarkdownToken = {
  content: string;
  info: string;
};

type MarkdownRenderer = {
  rules: Record<
    string,
    | ((
        tokens: MarkdownToken[],
        index: number,
        options: unknown,
        env: unknown,
        self: MarkdownRenderer,
      ) => string)
    | undefined
  >;
  renderToken(tokens: MarkdownToken[], index: number, options: unknown): string;
};

type MarkdownIt = {
  renderer: MarkdownRenderer;
};

export type BarkdownMermaidConfig = Record<string, unknown>;

export type BarkdownMermaidOptions = {
  componentName?: string;
};

function fileName(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return `barkdown-mermaid-${Math.abs(hash)}.svg`;
}

function clamp(value: number): number {
  return Math.min(2.4, Math.max(0.6, value));
}

function button(label: string, click: () => void, text: string): VNode {
  return h(
    "button",
    {
      "aria-label": label,
      "data-barkdown-mermaid-action": "",
      type: "button",
      onClick: click,
    },
    text,
  );
}

export const BarkdownMermaid = defineComponent({
  name: "BarkdownMermaid",
  props: {
    config: {
      default: undefined,
      type: Object as PropType<BarkdownMermaidConfig | undefined>,
    },
    diagram: {
      required: true,
      type: String,
    },
    title: {
      default: "Mermaid diagram",
      type: String,
    },
  },
  setup(props) {
    const surface = ref<HTMLElement>();
    const error = ref("");
    const loading = ref(true);
    const zoom = ref(1);
    const fullscreen = ref(false);
    const source = computed(() => props.diagram.trim());
    let mounted: Mounted | undefined;
    let active = true;

    function options(): MountOptions {
      return { config: props.config as RenderOptions["config"], zoom: false };
    }

    function download() {
      if (!mounted?.result || mounted.error !== undefined) return;

      const blob = new Blob([mounted.result.svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName(source.value);
      anchor.click();
      URL.revokeObjectURL(url);
    }

    function copy() {
      if (!source.value) return;

      void navigator.clipboard.writeText(source.value);
    }

    onMounted(() => {
      import("pele").then(
        ({ mount }) => {
          if (!active || !surface.value) return;
          mounted = mount(surface.value, source.value, options());
          loading.value = false;
        },
        (caught: unknown) => {
          loading.value = false;
          error.value =
            caught instanceof Error
              ? caught.message
              : "Unable to render diagram.";
        },
      );
    });
    onBeforeUnmount(() => {
      active = false;
      mounted?.destroy();
    });
    watch(
      [source, () => props.config],
      () => mounted?.update(source.value, options()),
      { deep: true },
    );

    return () =>
      h(
        "figure",
        {
          "aria-label": props.title,
          class: [
            "barkdown-mermaid",
            fullscreen.value ? "is-fullscreen" : undefined,
          ],
          "data-barkdown-mermaid": "",
        },
        [
          h("figcaption", { "data-barkdown-mermaid-toolbar": "" }, [
            h("span", { "data-barkdown-mermaid-title": "" }, props.title),
            h("span", { "data-barkdown-mermaid-controls": "" }, [
              button(
                "Zoom out",
                () => (zoom.value = clamp(zoom.value - 0.15)),
                "-",
              ),
              button(
                "Reset zoom",
                () => (zoom.value = 1),
                `${Math.round(zoom.value * 100)}%`,
              ),
              button(
                "Zoom in",
                () => (zoom.value = clamp(zoom.value + 0.15)),
                "+",
              ),
              button(
                fullscreen.value ? "Exit fullscreen" : "Open fullscreen",
                () => (fullscreen.value = !fullscreen.value),
                fullscreen.value ? "Close" : "Full",
              ),
              button("Copy Mermaid source", copy, "Copy"),
              button("Download SVG", download, "SVG"),
            ]),
          ]),
          h("div", { "data-barkdown-mermaid-viewport": "" }, [
            loading.value
              ? h(
                  "div",
                  { "data-barkdown-mermaid-status": "" },
                  "Rendering diagram...",
                )
              : null,
            error.value
              ? h("div", { "data-barkdown-mermaid-error": "" }, error.value)
              : null,
            h("div", {
              ref: surface,
              "data-barkdown-mermaid-surface": "",
              style: { transform: `scale(${zoom.value})` },
            }),
          ]),
        ],
      );
  },
});

export function renderMermaidDiagrams(
  md: MarkdownIt,
  options: BarkdownMermaidOptions = {},
) {
  const component = options.componentName ?? "BarkdownMermaid";
  const fallback = md.renderer.rules.fence?.bind(md.renderer.rules);

  md.renderer.rules.fence = (tokens, index, rendererOptions, env, self) => {
    const token = tokens[index];
    const language = token?.info.trim().split(/\s+/)[0]?.toLowerCase();

    if (!token || language !== "mermaid") {
      return fallback
        ? fallback(tokens, index, rendererOptions, env, self)
        : self.renderToken(tokens, index, rendererOptions);
    }

    const encoded = encodeURIComponent(token.content);

    return `<ClientOnly><${component} :diagram="decodeURIComponent('${encoded}')" /></ClientOnly>`;
  };
}
