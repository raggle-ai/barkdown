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

    // Helper functions to track injected tabs using session storage
    // (survives service worker restarts but not browser restarts)
    async function isTabInjected(tabId) {
        const result = await chrome.storage.session.get(`injected_${tabId}`);
        return !!result[`injected_${tabId}`];
    }

    async function markTabInjected(tabId) {
        await chrome.storage.session.set({ [`injected_${tabId}`]: true });
    }

    async function clearTabInjected(tabId) {
        await chrome.storage.session.remove(`injected_${tabId}`);
    }

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

    // Get file extension from URL
    function getExtension(url) {
        try {
            const pathname = new URL(url).pathname;
            const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
            const ext = filename.substring(filename.lastIndexOf('.') + 1);
            return ext.toLowerCase();
        } catch (e) {
            return '';
        }
    }

    // Default extensions that should never be rendered as markdown
    const defaultNeverRender = ["json", "xml", "yaml", "yml", "csv", "tsv", "log", "conf", "ini", "cfg"];

    // Check if URL should be excluded from markdown rendering
    async function shouldExcludeUrl(url) {
        const ext = getExtension(url);
        if (!ext) return false;
        
        const items = await chrome.storage.local.get('never_render_exts');
        const neverRender = items.never_render_exts || {};
        
        // If extension is in default list and not explicitly disabled by user, exclude it
        return defaultNeverRender.includes(ext) && typeof neverRender[ext] === "undefined";
    }

    // Inject content scripts into a tab
    async function injectContentScripts(tabId) {
        if (await isTabInjected(tabId)) return;
        
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

            await markTabInjected(tabId);
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
                // Check if URL should be excluded before injecting
                shouldExcludeUrl(details.url).then(shouldExclude => {
                    if (shouldExclude) return;
                    
                    // Wait a bit for the page to load, then inject
                    setTimeout(() => {
                        injectContentScripts(details.tabId);
                    }, 100);
                });
            }
        },
        { urls: ["<all_urls>"] },
        ["responseHeaders"]
    );

    // Clean up when tab is closed
    chrome.tabs.onRemoved.addListener((tabId) => {
        clearTabInjected(tabId);
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
