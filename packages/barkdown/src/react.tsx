import { evaluate } from "@mdx-js/mdx";
import {
	Check,
	ChevronDown,
	Copy
} from "lucide-react";
import {
	Children,
	type ComponentProps,
	type ComponentType,
	type CSSProperties,
	cloneElement,
	isValidElement,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState
} from "react";
import ReactMarkdown, { type Components as MarkdownComponents } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import * as runtime from "react/jsx-runtime";

import { remarkGithubEmojiImages } from "./emoji.js";
import { COLLAPSIBLE_SECTION_TAG, rehypeCollapsibleHeadings } from "./rehype-collapsible-headings.js";
import { BarkdownMermaid } from "./react-mermaid.js";

function joinClassNames(...values: Array<string | undefined>): string | undefined {
	const className = values.filter(Boolean).join(" ");
	return className || undefined;
}

export type BarkdownMode = "markdown" | "mdx";

export type BarkdownCodeProps = ComponentProps<"code"> & {
	inline?: boolean;
};

export type BarkdownMarkdownProps = {
	value: string;
	className?: string;
	collapsibleHeadings?: boolean;
	components?: MarkdownComponents;
	copyCode?: boolean;
	style?: CSSProperties;
};

export type BarkdownMdxProps = {
	value: string;
	className?: string;
	components?: Record<string, ComponentType<any>>;
	copyCode?: boolean;
	fallback?: ReactNode;
	onError?: (error: Error) => void;
	style?: CSSProperties;
};

export type BarkdownContentProps =
	| (BarkdownMarkdownProps & { mode?: "markdown" })
	| (BarkdownMdxProps & { mode: "mdx" });

export function BarkdownContent(props: BarkdownContentProps) {
	if (props.mode === "mdx") {
		return <BarkdownMdx {...props} />;
	}

	return <BarkdownMarkdown {...props} />;
}

export function BarkdownMarkdown({
	className,
	collapsibleHeadings = false,
	components,
	copyCode = true,
	style,
	value
}: BarkdownMarkdownProps) {
	const mergedComponents = useMemo<MarkdownComponents>(() => {
		const merged = {
			code: (props: BarkdownCodeProps) => <CodeBlock copy={copyCode} {...props} />,
			pre: (props: ComponentProps<"pre">) => <PreBlock {...props} />,
			...components
		};
		// `barkdown-section` groups only exist when the rehype plugin ran.
		// Custom tags are not part of the MarkdownComponents type, so the
		// override is merged before user components and the result is cast.
		if (collapsibleHeadings) {
			return { [COLLAPSIBLE_SECTION_TAG]: CollapsibleSection, ...merged } as MarkdownComponents;
		}
		return merged;
	}, [collapsibleHeadings, components, copyCode]);

	const rehypePlugins = useMemo(
		() =>
			collapsibleHeadings
				? [rehypeHighlight, rehypeKatex, rehypeCollapsibleHeadings]
				: [rehypeHighlight, rehypeKatex],
		[collapsibleHeadings],
	);

	return (
		<div className={joinClassNames("barkdown-content", className)} data-barkdown="" style={style}>
			<ReactMarkdown
				components={mergedComponents}
				rehypePlugins={rehypePlugins}
				remarkPlugins={[remarkGfm, remarkMath, remarkGithubEmojiImages]}
			>
				{value}
			</ReactMarkdown>
		</div>
	);
}

type CollapsibleSectionProps = {
	children?: ReactNode;
};

/**
 * Interactive section rendered for each `barkdown-section` tree group.
 * Sections are open by default so an upgrade never hides content. The real
 * `button` carries `aria-expanded` and `aria-controls`, which gives keyboard
 * operation and screen-reader state for free.
 */
function CollapsibleSection({ children }: CollapsibleSectionProps) {
	const [open, setOpen] = useState(true);
	const contentRef = useRef<HTMLDivElement>(null);
	const childArray = Children.toArray(children);
	const headingIndex = childArray.findIndex((child) => isValidElement(child));
	const heading = headingIndex >= 0 ? childArray[headingIndex] : null;
	const content = childArray.filter((_, index) => index !== headingIndex);
	const headingId =
		isValidElement<{ id?: string }>(heading) && typeof heading.props.id === "string"
			? heading.props.id
			: undefined;
	const contentId = headingId ? `${headingId}-content` : undefined;

	// A fragment link must open every closed ancestor section before the
	// browser moves to the target. Headings have stable IDs, so deep links keep
	// working after a reader collapses a section.
	useEffect(() => {
		const openFragmentAncestors = () => {
			const hash = window.location.hash;
			if (hash.length < 2) return;
			const target = document.getElementById(decodeURIComponent(hash.slice(1)));
			if (target && contentRef.current?.contains(target)) {
				setOpen(true);
			}
		};

		openFragmentAncestors();
		window.addEventListener("hashchange", openFragmentAncestors);
		return () => window.removeEventListener("hashchange", openFragmentAncestors);
	}, []);

	const toggleHeading =
		isValidElement<{ children?: ReactNode }>(heading) && contentId
			? cloneElement(
					heading,
					{},
					<button
						type="button"
						className="barkdown-heading-toggle"
						aria-expanded={open}
						aria-controls={contentId}
						onClick={() => setOpen((current) => !current)}
					>
						<span className="barkdown-heading-toggle-label">{heading.props.children}</span>
						<ChevronDown aria-hidden="true" className="barkdown-heading-toggle-icon" size={18} />
					</button>
				)
			: heading;

	return (
		<section data-barkdown-section="">
			{toggleHeading}
			<div ref={contentRef} id={contentId} className="barkdown-section-content" hidden={!open}>
				{content}
			</div>
		</section>
	);
}

function PreBlock({ children, ...props }: ComponentProps<"pre">) {
	if (
		isValidElement<{ className?: string }>(children) &&
		children.props.className?.split(/\s+/).includes("language-mermaid")
	) {
		return children;
	}

	return <pre {...props}>{children}</pre>;
}

export function BarkdownMdx({
	className,
	components,
	copyCode = true,
	fallback = null,
	onError,
	style,
	value
}: BarkdownMdxProps) {
	const [Content, setContent] = useState<ComponentType<{ components?: Record<string, ComponentType<any>> }> | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const mergedComponents = useMemo(() => {
		return {
			code: (props: BarkdownCodeProps) => <CodeBlock copy={copyCode} {...props} />,
			...components
		};
	}, [components, copyCode]);

	useEffect(() => {
		let cancelled = false;

		async function renderMdx() {
			try {
				const evaluated = await evaluate(value, {
					...runtime,
					baseUrl: import.meta.url
				});
				if (cancelled) return;
				setContent(() => evaluated.default as ComponentType<{ components?: Record<string, ComponentType<any>> }>);
				setError(null);
			} catch (caught) {
				const nextError = caught instanceof Error ? caught : new Error(String(caught));
				if (cancelled) return;
				setContent(null);
				setError(nextError);
				onError?.(nextError);
			}
		}

		void renderMdx();

		return () => {
			cancelled = true;
		};
	}, [onError, value]);

	if (error) {
		return (
			<div className={joinClassNames("barkdown-content", className)} data-barkdown="" data-barkdown-error="" style={style}>
				{error.message}
			</div>
		);
	}

	if (!Content) {
		return (
			<div className={joinClassNames("barkdown-content", className)} data-barkdown="" data-barkdown-loading="" style={style}>
				{fallback}
			</div>
		);
	}

	return (
		<div className={joinClassNames("barkdown-content", className)} data-barkdown="" style={style}>
			<Content components={mergedComponents} />
		</div>
	);
}

export function CodeBlock({
	children,
	className,
	copy = true,
	inline,
	...props
}: BarkdownCodeProps & { copy?: boolean }) {
	const [copied, setCopied] = useState(false);
	const text = String(children ?? "").replace(/\n$/, "");
	const language = /(?:^|\s)language-([\w+-]+)/.exec(className ?? "")?.[1]?.toLowerCase();
	const block = inline === false || Boolean(className) || text.includes("\n");

	if (language === "mermaid") {
		return <BarkdownMermaid diagram={text} />;
	}

	if (!block) {
		return (
			<code className={className} {...props}>
				{children}
			</code>
		);
	}

	return (
		<span data-barkdown-code-block="">
			<code className={className} {...props}>
				{children}
			</code>
			{copy ? (
				<button
					aria-label="Copy code"
					data-barkdown-code-copy=""
					type="button"
					onClick={() => {
						void navigator.clipboard.writeText(text).then(() => {
							setCopied(true);
							window.setTimeout(() => setCopied(false), 1800);
						});
					}}
				>
					{copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}
				</button>
			) : null}
		</span>
	);
}
