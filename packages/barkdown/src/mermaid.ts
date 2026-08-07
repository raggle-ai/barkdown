export const defaultMermaidConfig = {
	startOnLoad: false,
	securityLevel: "strict",
	theme: "base",
	htmlLabels: false,
	flowchart: {
		curve: "basis",
		nodeSpacing: 56,
		rankSpacing: 72,
		wrappingWidth: 220
	},
	themeVariables: {
		fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
		primaryColor: "#ffffff",
		primaryTextColor: "#20232a",
		primaryBorderColor: "#ded8cf",
		lineColor: "#6d737c",
		secondaryColor: "#f4f1ea",
		tertiaryColor: "#f8f6f2"
	}
} as const;

export function mermaidId(value: string, suffix = ""): string {
	let hash = 0;

	for (let index = 0; index < value.length; index += 1) {
		hash = (hash << 5) - hash + value.charCodeAt(index);
		hash |= 0;
	}

	return `barkdown-mermaid-${Math.abs(hash)}${suffix}`;
}
