/**
 * Rehype plugin that groups heading-led content into nested section groups.
 *
 * Each group:
 * - Wraps a heading and all content until the next same-or-higher-level heading
 * - Nests sub-heading groups inside their parent group
 * - Gives the heading a stable, unique ID derived from its text
 *
 * Groups use the `barkdown-section` element name. `BarkdownMarkdown` maps that
 * element to an interactive React component that renders the real toggle
 * button (`aria-expanded` / `aria-controls`) and the content wrapper. The
 * grouping is done here, in the tree, because a `components.h1`-style override
 * cannot collect the Markdown nodes that follow a heading.
 */

interface HastText {
	type: "text";
	value: string;
}

interface HastElement {
	type: "element";
	tagName: string;
	properties: Record<string, unknown>;
	children: HastNode[];
}

type HastNode = HastElement | HastText;

interface HastRoot {
	type: "root";
	children: HastNode[];
}

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

export const COLLAPSIBLE_SECTION_TAG = "barkdown-section";

function headingLevel(tagName: string): number | null {
	const match = /^h([1-6])$/.exec(tagName);
	return match ? Number.parseInt(match[1]!, 10) : null;
}

function isElement(node: HastNode): node is HastElement {
	return node.type === "element";
}

function isHeadingElement(node: HastNode): node is HastElement {
	return isElement(node) && HEADING_TAGS.has(node.tagName);
}

function extractHeadingText(node: HastNode): string {
	if (node.type === "text") return node.value;
	return node.children.map((child) => extractHeadingText(child)).join("");
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

/**
 * Assign unique, stable IDs to headings. Uses a counter when heading text
 * produces duplicate slugs within the same document.
 */
class HeadingIdRegistry {
	private seen = new Map<string, number>();

	id(headingText: string): string {
		const base = slugify(headingText) || "section";
		const count = this.seen.get(base) ?? 0;
		this.seen.set(base, count + 1);
		return count === 0 ? base : `${base}-${count}`;
	}
}

function createHeadingElement(originalHeading: HastElement, headingId: string): HastElement {
	const existingClass: unknown = originalHeading.properties?.className;
	const classList: string[] = ["barkdown-heading-wrapper"];
	if (Array.isArray(existingClass)) {
		classList.push(...(existingClass as string[]));
	} else if (typeof existingClass === "string" && existingClass.length > 0) {
		classList.push(existingClass);
	}

	return {
		...originalHeading,
		properties: {
			...originalHeading.properties,
			id: headingId,
			className: classList,
		},
	};
}

function processChildren(
	children: HastNode[],
	parentLevel: number,
	idRegistry: HeadingIdRegistry,
): HastNode[] {
	const result: HastNode[] = [];
	let i = 0;

	while (i < children.length) {
		const child = children[i];
		i++;

		if (!child || !isHeadingElement(child)) {
			if (child) result.push(child);
			continue;
		}

		const level = headingLevel(child.tagName);
		if (level === null || level <= parentLevel) {
			result.push(child);
			continue;
		}

		// A heading starts a new section group.
		const headingId = idRegistry.id(extractHeadingText(child));
		const heading = createHeadingElement(child, headingId);

		// Collect all siblings until the next heading of equal or higher level.
		const sectionChildren: HastNode[] = [];
		while (i < children.length) {
			const next = children[i];
			if (next && isHeadingElement(next)) {
				const nextLevel = headingLevel(next.tagName);
				if (nextLevel !== null && nextLevel <= level) break;
			}
			if (next) sectionChildren.push(next);
			i++;
		}

		result.push({
			type: "element",
			tagName: COLLAPSIBLE_SECTION_TAG,
			properties: {},
			// Child headings nest inside this group recursively.
			children: [heading, ...processChildren(sectionChildren, level, idRegistry)],
		});
	}

	return result;
}

export function rehypeCollapsibleHeadings() {
	return (tree: HastRoot) => {
		const registry = new HeadingIdRegistry();
		tree.children = processChildren(tree.children, 0, registry);
	};
}
