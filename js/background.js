;(() => {

    // Set default settings on install or upgrade
    chrome.runtime.onInstalled.addListener((details) => {
        if (details.reason === 'install') {
            // Enable katex (and mermaid diagrams) by default for new installs
            chrome.storage.local.set({
                'katex': 1,
                'html': 1
            });
        } else if (details.reason === 'update') {
            // For upgrades, enable katex if not explicitly set
            chrome.storage.local.get(['katex'], (items) => {
                if (items.katex === undefined) {
                    chrome.storage.local.set({
                        'katex': 1,
                        'html': 1
                    });
                }
            });
        }
    });

    // Track tabs where we've already injected scripts
    const injectedTabs = new Set();

    // CSS files to inject
    const cssFiles = [
        "css/MarkdownTOC.css",
        "css/highlight.css"
    ];

    // JS files to inject (in order)
    const jsFiles = [
        "js/katex.min.js",
        "js/config.js",
        "js/jquery.js",
        "js/marked.min.js",
        "js/marked-highlight/index.js",
        "js/purify.js",
        "js/highlight.min.js",
        "js/features.js",
        "js/markdownify.js",
        "js/underscore-min.js",
        "js/diagramflowseq.js",
        "js/mermaid.min.js",
        "js/platumlencode.js",
        "js/rawdeflate.js"
    ];

    // Check if Content-Type indicates markdown or plain text
    function isMarkdownContentType(contentType) {
        if (!contentType) return false;
        return /text\/(plain|markdown|x-markdown)/i.test(contentType);
    }

    // Inject content scripts into a tab
    async function injectContentScripts(tabId) {
        if (injectedTabs.has(tabId)) return;
        
        try {
            // Inject CSS
            await chrome.scripting.insertCSS({
                target: { tabId: tabId },
                files: cssFiles
            });

            // Inject JS
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: jsFiles
            });

            injectedTabs.add(tabId);
        } catch (e) {
            // Tab might be closed or not injectable
            console.log('Could not inject scripts:', e.message);
        }
    }

    // Listen for completed web requests to check Content-Type
    chrome.webRequest.onHeadersReceived.addListener(
        (details) => {
            // Only handle main frame requests
            if (details.type !== 'main_frame') return;

            // Find Content-Type header
            const contentTypeHeader = details.responseHeaders?.find(
                h => h.name.toLowerCase() === 'content-type'
            );

            if (contentTypeHeader && isMarkdownContentType(contentTypeHeader.value)) {
                // Wait a bit for the page to load, then inject
                setTimeout(() => {
                    injectContentScripts(details.tabId);
                }, 100);
            }
        },
        { urls: ["<all_urls>"] },
        ["responseHeaders"]
    );

    // Clean up when tab is closed
    chrome.tabs.onRemoved.addListener((tabId) => {
        injectedTabs.delete(tabId);
    });

    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
        if (req.message === 'autoreload') {
            (async () => {
                try {
                    const res = await fetch(req.url.href, {
                        cache: "no-cache",
                        credentials: "omit"
                    });
                    const text = await res.text();
                    sendResponse({
                        data: text
                    });
                } catch(e) {
                    sendResponse({ data: null, error: e.message });
                }
            })();
        }

        return true;
    });

})();
