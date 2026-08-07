import {
	computed,
	defineComponent,
	h,
	nextTick,
	onMounted,
	ref,
	watch,
	type PropType,
	type VNode
} from "vue";

import { defaultMermaidConfig, mermaidId } from "./mermaid.js";

type MarkdownToken = {
	content: string;
	info: string;
};

type MarkdownRenderer = {
	rules: Record<string, ((tokens: MarkdownToken[], index: number, options: unknown, env: unknown, self: MarkdownRenderer) => string) | undefined>;
	renderToken(tokens: MarkdownToken[], index: number, options: unknown): string;
};

type MarkdownIt = {
	renderer: MarkdownRenderer;
};

export type BarkdownMermaidConfig = Record<string, unknown>;

export type BarkdownMermaidOptions = {
	componentName?: string;
};

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
			onClick: click
		},
		text
	);
}

export const BarkdownMermaid = defineComponent({
	name: "BarkdownMermaid",
	props: {
		config: {
			default: undefined,
			type: Object as PropType<BarkdownMermaidConfig | undefined>
		},
		diagram: {
			required: true,
			type: String
		},
		title: {
			default: "Mermaid diagram",
			type: String
		}
	},
	setup(props) {
		const html = ref("");
		const error = ref("");
		const loading = ref(false);
		const zoom = ref(1);
		const fullscreen = ref(false);
		const source = computed(() => props.diagram.trim());
		const id = computed(() => mermaidId(source.value));

		async function render() {
			if (!source.value) return;

			loading.value = true;
			error.value = "";
			html.value = "";

			await nextTick();

			const { default: mermaid } = await import("mermaid");
			mermaid.initialize({
				...defaultMermaidConfig,
				...(props.config ?? {})
			});

			const rendered = await mermaid.render(id.value, source.value);
			html.value = rendered.svg;
			loading.value = false;
		}

		function rerender() {
			render().catch((caught: unknown) => {
				loading.value = false;
				error.value = caught instanceof Error ? caught.message : "Unable to render diagram.";
			});
		}

		function download() {
			if (!html.value) return;

			const blob = new Blob([html.value], { type: "image/svg+xml" });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = `${id.value}.svg`;
			anchor.click();
			URL.revokeObjectURL(url);
		}

		function copy() {
			if (!source.value) return;

			void navigator.clipboard.writeText(source.value);
		}

		onMounted(rerender);
		watch(() => props.diagram, rerender);
		watch(() => props.config, rerender, { deep: true });

		return () =>
			h(
				"figure",
				{
					"aria-label": props.title,
					"class": ["barkdown-mermaid", fullscreen.value ? "is-fullscreen" : undefined],
					"data-barkdown-mermaid": ""
				},
				[
					h("figcaption", { "data-barkdown-mermaid-toolbar": "" }, [
						h("span", { "data-barkdown-mermaid-title": "" }, props.title),
						h("span", { "data-barkdown-mermaid-controls": "" }, [
							button("Zoom out", () => (zoom.value = clamp(zoom.value - 0.15)), "-"),
							button("Reset zoom", () => (zoom.value = 1), `${Math.round(zoom.value * 100)}%`),
							button("Zoom in", () => (zoom.value = clamp(zoom.value + 0.15)), "+"),
							button(fullscreen.value ? "Exit fullscreen" : "Open fullscreen", () => (fullscreen.value = !fullscreen.value), fullscreen.value ? "Close" : "Full"),
							button("Copy Mermaid source", copy, "Copy"),
							button("Download SVG", download, "SVG")
						])
					]),
					h("div", { "data-barkdown-mermaid-viewport": "" }, [
						loading.value ? h("div", { "data-barkdown-mermaid-status": "" }, "Rendering diagram...") : null,
						error.value ? h("div", { "data-barkdown-mermaid-error": "" }, error.value) : null,
						!loading.value && !error.value
							? h("div", {
									"data-barkdown-mermaid-surface": "",
									"style": { transform: `scale(${zoom.value})` },
									innerHTML: html.value
								})
							: null
					])
				]
			);
	}
});

export function renderMermaidDiagrams(md: MarkdownIt, options: BarkdownMermaidOptions = {}) {
	const component = options.componentName ?? "BarkdownMermaid";
	const fallback = md.renderer.rules.fence?.bind(md.renderer.rules);

	md.renderer.rules.fence = (tokens, index, rendererOptions, env, self) => {
		const token = tokens[index];
		const language = token?.info.trim().split(/\s+/)[0]?.toLowerCase();

		if (!token || language !== "mermaid") {
			return fallback ? fallback(tokens, index, rendererOptions, env, self) : self.renderToken(tokens, index, rendererOptions);
		}

		const encoded = encodeURIComponent(token.content);

		return `<ClientOnly><${component} :diagram="decodeURIComponent('${encoded}')" /></ClientOnly>`;
	};
}
