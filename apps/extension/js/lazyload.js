/**
 * BarkDown - Lazy Loading for heavy dependencies
 * Loads KaTeX and Mermaid only when needed
 */

var lazyLoader = (function() {
    'use strict';

    const state = {
        katexLoaded: false,
        katexLoading: false,
        mermaidLoaded: false,
        mermaidLoading: false,
        katexCallbacks: [],
        mermaidCallbacks: []
    };

    /**
     * Load a script dynamically
     */
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Check if content needs KaTeX (math expressions)
     */
    function needsKatex(content) {
        // Check for inline math: $...$ or \(...\)
        // Check for display math: $$...$$ or \[...\]
        // Check for code blocks with ```math
        const patterns = [
            /\$[^$\n]+\$/,           // $inline$
            /\$\$[\s\S]+?\$\$/,      // $$display$$
            /\\\([^)]+\\\)/,         // \(inline\)
            /\\\[[\s\S]+?\\\]/,      // \[display\]
            /```math/i               // ```math code block
        ];
        return patterns.some(p => p.test(content));
    }

    /**
     * Check if content needs Mermaid (diagrams)
     */
    function needsMermaid(content) {
        return /```mermaid/i.test(content);
    }

    /**
     * Load KaTeX if not already loaded
     */
    function loadKatex() {
        return new Promise((resolve, reject) => {
            if (state.katexLoaded) {
                resolve();
                return;
            }

            if (state.katexLoading) {
                state.katexCallbacks.push({ resolve, reject });
                return;
            }

            state.katexLoading = true;
            const katexUrl = chrome.runtime.getURL('js/katex.min.js');
            
            loadScript(katexUrl)
                .then(() => {
                    state.katexLoaded = true;
                    state.katexLoading = false;
                    resolve();
                    state.katexCallbacks.forEach(cb => cb.resolve());
                    state.katexCallbacks = [];
                })
                .catch((err) => {
                    state.katexLoading = false;
                    reject(err);
                    state.katexCallbacks.forEach(cb => cb.reject(err));
                    state.katexCallbacks = [];
                });
        });
    }

    /**
     * Load Mermaid if not already loaded
     */
    function loadMermaid() {
        return new Promise((resolve, reject) => {
            if (state.mermaidLoaded) {
                resolve();
                return;
            }

            if (state.mermaidLoading) {
                state.mermaidCallbacks.push({ resolve, reject });
                return;
            }

            state.mermaidLoading = true;
            const mermaidUrl = chrome.runtime.getURL('js/mermaid.min.js');
            
            loadScript(mermaidUrl)
                .then(() => {
                    // Initialize mermaid with default config
                    if (typeof mermaid !== 'undefined') {
                        mermaid.initialize({
                            startOnLoad: false,
                            theme: 'default',
                            securityLevel: 'loose'
                        });
                    }
                    state.mermaidLoaded = true;
                    state.mermaidLoading = false;
                    resolve();
                    state.mermaidCallbacks.forEach(cb => cb.resolve());
                    state.mermaidCallbacks = [];
                })
                .catch((err) => {
                    state.mermaidLoading = false;
                    reject(err);
                    state.mermaidCallbacks.forEach(cb => cb.reject(err));
                    state.mermaidCallbacks = [];
                });
        });
    }

    /**
     * Load required libraries based on content
     */
    async function loadRequired(content) {
        const promises = [];

        if (needsKatex(content)) {
            promises.push(loadKatex());
        }

        if (needsMermaid(content)) {
            promises.push(loadMermaid());
        }

        await Promise.all(promises);
    }

    /**
     * Check if KaTeX is available
     */
    function isKatexLoaded() {
        return state.katexLoaded && typeof katex !== 'undefined';
    }

    /**
     * Check if Mermaid is available
     */
    function isMermaidLoaded() {
        return state.mermaidLoaded && typeof mermaid !== 'undefined';
    }

    // Public API
    return {
        needsKatex: needsKatex,
        needsMermaid: needsMermaid,
        loadKatex: loadKatex,
        loadMermaid: loadMermaid,
        loadRequired: loadRequired,
        isKatexLoaded: isKatexLoaded,
        isMermaidLoaded: isMermaidLoaded
    };

})();
