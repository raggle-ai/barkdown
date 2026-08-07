import { useEffect, useId, useState } from "react";

import { defaultMermaidConfig, mermaidId } from "./mermaid.js";

let renderQueue = Promise.resolve();

async function renderMermaid(id: string, diagram: string) {
	const pending = renderQueue.then(async () => {
		const { default: mermaid } = await import("mermaid");
		mermaid.initialize(defaultMermaidConfig);
		return mermaid.render(id, diagram);
	});

	renderQueue = pending.then(
		() => undefined,
		() => undefined
	);

	return pending;
}

export type BarkdownMermaidProps = {
	diagram: string;
	title?: string;
};

export function BarkdownMermaid({
	diagram,
	title = "Mermaid diagram"
}: BarkdownMermaidProps) {
	const reactId = useId().replaceAll(":", "");
	const [svg, setSvg] = useState("");
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;

		async function renderDiagram() {
			setSvg("");
			setError("");

			try {
				const result = await renderMermaid(
					mermaidId(diagram, `-${reactId}`),
					diagram.trim()
				);

				if (!cancelled) setSvg(result.svg);
			} catch (caught) {
				if (cancelled) return;
				setError(
					caught instanceof Error
						? caught.message
						: "Unable to render diagram."
				);
			}
		}

		void renderDiagram();

		return () => {
			cancelled = true;
		};
	}, [diagram, reactId]);

	return (
		<figure aria-label={title} data-barkdown-mermaid="">
			<figcaption data-barkdown-mermaid-toolbar="">
				<span data-barkdown-mermaid-title="">{title}</span>
			</figcaption>
			<div data-barkdown-mermaid-viewport="">
				{error ? (
					<div data-barkdown-mermaid-error="">{error}</div>
				) : svg ? (
					<div
						data-barkdown-mermaid-surface=""
						dangerouslySetInnerHTML={{ __html: svg }}
					/>
				) : (
					<div data-barkdown-mermaid-status="">Rendering diagram…</div>
				)}
			</div>
		</figure>
	);
}
