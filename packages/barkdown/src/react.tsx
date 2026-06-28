import { evaluate } from "@mdx-js/mdx";
import {
	Check,
	Copy
} from "lucide-react";
import {
	type ComponentProps,
	type ComponentType,
	type CSSProperties,
	type ReactNode,
	useEffect,
	useMemo,
	useState
} from "react";
import ReactMarkdown, { type Components as MarkdownComponents } from "react-markdown";
import remarkGfm from "remark-gfm";
import * as runtime from "react/jsx-runtime";

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
	components,
	copyCode = true,
	style,
	value
}: BarkdownMarkdownProps) {
	const mergedComponents = useMemo<MarkdownComponents>(() => {
		return {
			code: (props) => <CodeBlock copy={copyCode} {...props} />,
			...components
		};
	}, [components, copyCode]);

	return (
		<div className={joinClassNames("barkdown-content", className)} data-barkdown="" style={style}>
			<ReactMarkdown components={mergedComponents} remarkPlugins={[remarkGfm]}>
				{value}
			</ReactMarkdown>
		</div>
	);
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

	if (inline) {
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
