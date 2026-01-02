(function(document) {

    const specialThemePrefix = 'special_'
    let mpp = {
        markedLoaded: 0
    }

    var interval,
        defaultReloadFreq = 3,
        previousText,
        toc = [],
        storage = chrome.storage.local;

    // Dark mode toggle functionality
    function createDarkModeToggle() {
        var toggleBtn = document.createElement('button');
        toggleBtn.id = 'dark-mode-toggle';
        toggleBtn.innerHTML = getDarkModeIcon();
        toggleBtn.title = 'Toggle dark/light mode';
        
        // Apply styles
        toggleBtn.style.cssText = `
            position: fixed;
            top: 16px;
            right: 16px;
            width: 44px;
            height: 44px;
            border-radius: 10px;
            border: 2px solid #0969da;
            background-color: #ddf4ff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            z-index: 9999;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(9, 105, 218, 0.3);
        `;
        
        toggleBtn.addEventListener('mouseenter', function() {
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                this.style.backgroundColor = '#388bfd';
                this.style.transform = 'scale(1.05)';
            } else {
                this.style.backgroundColor = '#0969da';
                this.style.color = '#ffffff';
                this.style.transform = 'scale(1.05)';
            }
        });
        
        toggleBtn.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            updateToggleButtonStyle(toggleBtn);
        });
        
        toggleBtn.addEventListener('click', function() {
            toggleDarkMode(toggleBtn);
        });
        
        document.body.appendChild(toggleBtn);
        
        // Initialize based on saved preference or system preference
        initDarkMode(toggleBtn);
    }
    
    function getDarkModeIcon() {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'; // Sun or Moon emoji
    }
    
    function initDarkMode(toggleBtn) {
        storage.get('darkMode', function(items) {
            var darkMode = items.darkMode;
            if (darkMode === undefined) {
                // Use system preference if no saved preference
                darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            applyDarkMode(darkMode, toggleBtn);
        });
    }
    
    function toggleDarkMode(toggleBtn) {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        var newMode = !isDark;
        storage.set({ darkMode: newMode });
        applyDarkMode(newMode, toggleBtn);
    }
    
    function applyDarkMode(isDark, toggleBtn) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        toggleBtn.innerHTML = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';
        updateToggleButtonStyle(toggleBtn);
    }
    
    function updateToggleButtonStyle(toggleBtn) {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            toggleBtn.style.backgroundColor = '#1f6feb';
            toggleBtn.style.borderColor = '#58a6ff';
            toggleBtn.style.color = '#ffffff';
            toggleBtn.style.boxShadow = '0 2px 8px rgba(56, 139, 253, 0.4)';
        } else {
            toggleBtn.style.backgroundColor = '#ddf4ff';
            toggleBtn.style.borderColor = '#0969da';
            toggleBtn.style.color = '#0969da';
            toggleBtn.style.boxShadow = '0 2px 8px rgba(9, 105, 218, 0.3)';
        }
    }

    mpp.isText = () => {
        var value = document.contentType;
        return value && /text\/(?:x-)?(markdown|plain)/i.test(value);
    };

    mpp.ajax = options => {
        chrome.runtime.sendMessage({message: "autoreload", url: options.url}, response => {
            options.complete(response);
        });
    };

    function getExtension(url) {
        url = url.substr(1 + url.lastIndexOf("/"))
            .split('?')[0]
            .split('#')[0];
        var ext = url.substr(1 + url.lastIndexOf("."));
        return ext.toLowerCase();
    }

    function hasValue(obj, key) {
        return obj && 
           obj.hasOwnProperty(key) && 
           $.trim(obj[key]).length > 0;
    }

    function resolveImg(img) {
        var src = $(img).attr("src");
        if (src[0] == "/") {
            $(img).attr("src", src.substring(1));
        }
    }

    function postRender() {
        if (location.hash) {
            window.setTimeout(function() {
                var target = $(location.hash);
                if (target.length == 0) {
                    target = $('a[name="' + location.hash.substring(1) + '"]');
                }
                if (target.length == 0) {
                    target = $('html');
                }
                $('html, body').animate({
                    scrollTop: target.offset().top
                }, 200);
            }, 300);

        }
    }

    var buildCtx = (coll, k, level, ctx) => {
        if (k >= coll.length || coll[k].level <= level) { return k; }
        var node = coll[k];
        ctx.push("<li><a href='#" + node.anchor + "'>" + node.text + "</a>");
        k++;
        var childCtx = [];
        k = buildCtx(coll, k, node.level, childCtx);
        if (childCtx.length > 0) {
            ctx.push("<ul>");
            childCtx.forEach(function (idm) {
                ctx.push(idm);
            });
            ctx.push("</ul>");
        }
        ctx.push("</li>");
        k = buildCtx(coll, k, level, ctx);
        return k;
    };

    function initMarked() {
        if (mpp.markedLoaded) {
            return
        }

        marked.setOptions(config.markedOptions);
        marked.use(markedHighlight({
          langPrefix: 'hljs language-',
          highlight(code, lang) {
            return hljs.highlightAuto(code).value;
          }
        }));

        mpp.markedLoaded = true
    }

    // Onload, take the DOM of the page, get the markdown formatted text out and
    // apply the converter.
    async function makeHtml(data) {
        const items = await new Promise(resolve => {
            storage.get(['supportMath', 'katex', 'toc'], resolve);
        });

        // Load required libraries based on content
        if (items.katex && typeof lazyLoader !== 'undefined') {
            await lazyLoader.loadRequired(data);
        }

        // Convert MarkDown to HTML
        var preHtml = data;
        if (items.katex && lazyLoader.isKatexLoaded()) {
            config.markedOptions.katex = true;
            preHtml = diagramFlowSeq.prepareDiagram(preHtml);
        }

        if (items.toc) {
            toc = [];
            const renderer = new marked.Renderer()
            const slugger = new marked.Slugger()
            const r = {
              heading: renderer.heading.bind(renderer),
            };

            renderer.heading = (text, level, raw, slugger) => {
                var anchor = config.markedOptions.headerPrefix + slugger.serialize(raw)

                toc.push({
                    anchor: anchor,
                    level: level,
                    text: text
                });

                return r.heading(text, level, raw, slugger);
            };
            config.markedOptions.renderer = renderer;
        }

        initMarked()
        var html = marked.parse(preHtml);
        html = DOMPurify.sanitize(html, {
            ADD_ATTR: ['flow']
        });

        if (items.toc) {
            var ctx = [];
            ctx.push('<div class="toc-list"><h1 id="table-of-contents">Table of Contents</h1>\n<ul>');
            buildCtx(toc, 0, 0, ctx);
            ctx.push("</ul></div>");
            html = ctx.join('') + html
        }
        $(document.body).html(html);
        $('img').on("error", () => resolveImg(this));

        // Add dark mode toggle button
        createDarkModeToggle();

        // Draw mermaid diagrams if loaded
        if (lazyLoader.isMermaidLoaded()) {
            diagramFlowSeq.drawAllMermaid();
        }
        
        // Initialize enhanced features
        if (typeof markdownFeatures !== 'undefined') {
            markdownFeatures.init();
        }
        
        postRender();
    }

    function getThemeCss(theme) {
        return chrome.runtime.getURL('theme/' + theme + '.css');
    }

    function insertCssPaths(paths) {
        let cssClass = 'CUSTOM_CSS_PATH'
        $('.' + cssClass).remove()
        paths.forEach(css => {
            let cssLink = $('<link/>').addClass(cssClass)
            cssLink
                .attr('rel', 'stylesheet')
                .attr('href', css)
            $(document.head).append(cssLink)
        })
    }

    function insertThemeCss(theme) {
        if (hasValue(config.themes, theme)) {
            var link = $('#theme')
            $('#custom-theme').remove();
            if(!link.length) {
                var ss = document.createElement('link');
                ss.rel = 'stylesheet';
                ss.id = 'theme';
                ss.href = getThemeCss(theme);
                document.head.appendChild(ss);
            } else {
                link.attr('href', getThemeCss(theme));
            }
        } else {
            var themePrefix = 'theme_',
                key = themePrefix + theme;
            storage.get(key, function(items) {
                if(items[key]) {
                    $('#theme').remove();
                    var theme = $('#custom-theme');
                    if(!theme.length) {
                        var style = $('<style/>').attr('id', 'custom-theme')
                                        .html(items[key]);
                        $(document.head).append(style);
                    } else {
                        theme.html(items[key]);
                    }
                }
            });
        }
    }

    function setTheme() {
        let pageKey = specialThemePrefix + location.href
        storage.get([pageKey, 'theme', 'custom_themes', 'custom_css_paths'], function(items) {
            if (hasValue(items, pageKey)) {
                insertThemeCss(items[pageKey])
            } else if (hasValue(items, 'custom_css_paths')) {
                let cssPaths = JSON.parse(items.custom_css_paths)
                insertCssPaths(cssPaths)
            } else if (hasValue(items, 'theme')) {
                insertThemeCss(items.theme)
            } else {
                // load default theme
                insertThemeCss('Github')
            }
        })
    }

    function stopAutoReload() {
        clearInterval(interval);
    }

    function startAutoReload() {
        stopAutoReload();

        var freq = defaultReloadFreq;
        storage.get('reload_freq', function(items) {
            if(items.reload_freq) {
                freq = items.reload_freq;
            }
        });

        interval = setInterval(function() {
            mpp.ajax({
                url: location,
                complete: (response) => {
                    var data = response.data
                    if (previousText == data) {
                        return;
                    }
                    makeHtml(data);
                    previousText = data;
                }
            });
        }, freq * 1000);
    }

    function render() {
        if (!mpp.isText()) {
            return;
        }

        mpp.ajax({
            url: location,
            cache: false,
            complete: function(response) {
                previousText = document.body.innerText;
                // Store original markdown globally for copy feature
                window.originalMarkdown = document.body.innerText;
                makeHtml(document.body.innerText);
                setTheme()

                storage.get('auto_reload', function(items) {
                    if(items.auto_reload) {
                        startAutoReload();
                    }
                });
            }
        });
    }

    storage.get(['exclude_exts', 'disable_markdown', 'katex', 'html', 'never_render_exts'], function(items) {
        if (items.disable_markdown) {
            return;
        }

        if (items.katex) {
            var mjc = document.createElement('link');
            mjc.rel = 'stylesheet';
            mjc.href = chrome.runtime.getURL('css/katex.min.css');
            $(document.head).append(mjc);
        }

        // Check if file extension is in the never-render list
        var fileExt = getExtension(location.href);
        var defaultNeverRender = ["json", "xml", "yaml", "yml", "csv", "tsv", "log", "conf", "ini", "cfg"];
        var neverRender = items.never_render_exts || {};
        
        // If extension is in default list and not explicitly disabled by user, skip rendering
        if ($.inArray(fileExt, defaultNeverRender) != -1 && typeof neverRender[fileExt] == "undefined") {
            return;
        }

        // Check if Content-Type indicates plain text or markdown
        // This handles sites that return markdown without .md extension
        if (mpp.isText()) {
            render();
            return;
        }

        var allExtentions = ["md", "text", "markdown", "mdown", "txt", "mkd", "rst", "rmd"];
        var exts = items.exclude_exts;
        if(!exts) {
            render();
            return;
        }

        if (($.inArray(fileExt, allExtentions) != -1) &&
            (typeof exts[fileExt] == "undefined")) {
            render();
        }
    });

    chrome.storage.onChanged.addListener(function(changes, namespace) {
        var pageKey = specialThemePrefix + location.href;

        console.log("changes:", changes)
        for (key in changes) {
            var value = changes[key];
            if(key == pageKey || key == 'theme' || key == 'custom_css_paths') {
                setTheme();
            } else if(key == 'toc') {
                location.reload();
            } else if(key == 'reload_freq') {
                storage.get('auto_reload', function(items) {
                    startAutoReload();
                });
            } else if(key == 'auto_reload') {
                if(value.newValue) {
                    startAutoReload();
                } else {
                    stopAutoReload();
                }
            } else if(key == 'disable_markdown') {
                location.reload();
            } else if(key == 'supportMath') {
                location.reload();
            } else if(key == 'katex') {
                location.reload();
            }
        }
    });

}(document));
