/**
 * BarkDown - Enhanced Features
 * Your markdown's best friend.
 * 
 * Features included:
 * - Copy code button
 * - Line numbers in code blocks
 * - Anchor links on headings
 * - Emoji support
 * - Task list progress
 * - Word/reading time display
 * - Image zoom/lightbox
 * - Keyboard shortcuts
 * - Search in document
 * - Footnotes enhancement
 */

var markdownFeatures = (function() {
    'use strict';

    // Common emoji mappings
    const emojiMap = {
        // Smileys
        ':smile:': '😄', ':grinning:': '😀', ':laughing:': '😆', ':blush:': '😊',
        ':smiley:': '😃', ':relaxed:': '☺️', ':smirk:': '😏', ':heart_eyes:': '😍',
        ':kissing_heart:': '😘', ':kissing:': '😗', ':wink:': '😉', ':stuck_out_tongue_winking_eye:': '😜',
        ':stuck_out_tongue:': '😛', ':sunglasses:': '😎', ':grin:': '😁',
        ':cry:': '😢', ':sob:': '😭', ':angry:': '😠', ':rage:': '😡',
        ':tired_face:': '😫', ':sleepy:': '😪', ':sleeping:': '😴', ':mask:': '😷',
        ':thinking:': '🤔', ':neutral_face:': '😐', ':expressionless:': '😑',
        ':hushed:': '😯', ':frowning:': '😦', ':anguished:': '😧', ':open_mouth:': '😮',
        ':astonished:': '😲', ':zipper_mouth:': '🤐', ':nerd:': '🤓', ':monocle:': '🧐',
        ':joy:': '😂', ':rofl:': '🤣', ':upside_down:': '🙃', ':money_mouth:': '🤑',
        ':exploding_head:': '🤯', ':partying:': '🥳', ':cool:': '😎', ':face_with_thermometer:': '🤒',
        ':pleading:': '🥺', ':shushing:': '🤫', ':zany:': '🤪', ':vomiting:': '🤮',
        ':hot_face:': '🥵', ':cold_face:': '🥶', ':skull:': '💀', ':poop:': '💩',
        ':clown:': '🤡', ':ghost:': '👻', ':alien:': '👽', ':robot:': '🤖',
        
        // Gestures
        ':thumbsup:': '👍', ':thumbsdown:': '👎', ':+1:': '👍', ':-1:': '👎',
        ':ok_hand:': '👌', ':punch:': '👊', ':fist:': '✊', ':v:': '✌️',
        ':wave:': '👋', ':hand:': '✋', ':open_hands:': '👐', ':point_up:': '☝️',
        ':point_down:': '👇', ':point_left:': '👈', ':point_right:': '👉',
        ':raised_hands:': '🙌', ':pray:': '🙏', ':clap:': '👏', ':muscle:': '💪',
        ':metal:': '🤘', ':fu:': '🖕', ':call_me:': '🤙', ':fingers_crossed:': '🤞',
        ':writing_hand:': '✍️', ':selfie:': '🤳', ':handshake:': '🤝',

        // Hearts & Love
        ':heart:': '❤️', ':orange_heart:': '🧡', ':yellow_heart:': '💛',
        ':green_heart:': '💚', ':blue_heart:': '💙', ':purple_heart:': '💜',
        ':black_heart:': '🖤', ':white_heart:': '🤍', ':brown_heart:': '🤎',
        ':broken_heart:': '💔', ':two_hearts:': '💕', ':sparkling_heart:': '💖',
        ':heartbeat:': '💓', ':heartpulse:': '💗', ':cupid:': '💘', ':gift_heart:': '💝',
        ':revolving_hearts:': '💞', ':love_letter:': '💌', ':kiss:': '💋',

        // Nature & Animals
        ':sunny:': '☀️', ':cloud:': '☁️', ':umbrella:': '☂️', ':rainbow:': '🌈',
        ':snowflake:': '❄️', ':zap:': '⚡', ':fire:': '🔥', ':star:': '⭐',
        ':star2:': '🌟', ':sparkles:': '✨', ':moon:': '🌙', ':sun_with_face:': '🌞',
        ':droplet:': '💧', ':ocean:': '🌊', ':earth_africa:': '🌍', ':earth_americas:': '🌎',
        ':earth_asia:': '🌏', ':volcano:': '🌋', ':milky_way:': '🌌',
        ':dog:': '🐶', ':cat:': '🐱', ':mouse:': '🐭', ':hamster:': '🐹',
        ':rabbit:': '🐰', ':fox:': '🦊', ':bear:': '🐻', ':panda:': '🐼',
        ':koala:': '🐨', ':tiger:': '🐯', ':lion:': '🦁', ':cow:': '🐮',
        ':pig:': '🐷', ':frog:': '🐸', ':monkey:': '🐵', ':chicken:': '🐔',
        ':penguin:': '🐧', ':bird:': '🐦', ':eagle:': '🦅', ':duck:': '🦆',
        ':owl:': '🦉', ':bat:': '🦇', ':wolf:': '🐺', ':horse:': '🐴',
        ':unicorn:': '🦄', ':bee:': '🐝', ':bug:': '🐛', ':butterfly:': '🦋',
        ':snail:': '🐌', ':turtle:': '🐢', ':snake:': '🐍', ':lizard:': '🦎',
        ':octopus:': '🐙', ':fish:': '🐟', ':dolphin:': '🐬', ':whale:': '🐳',
        ':shark:': '🦈', ':crab:': '🦀', ':shrimp:': '🦐', ':squid:': '🦑',
        ':snail:': '🐌', ':ant:': '🐜', ':spider:': '🕷️', ':scorpion:': '🦂',

        // Food & Drink
        ':apple:': '🍎', ':green_apple:': '🍏', ':banana:': '🍌', ':orange:': '🍊',
        ':lemon:': '🍋', ':grapes:': '🍇', ':watermelon:': '🍉', ':strawberry:': '🍓',
        ':peach:': '🍑', ':cherry:': '🍒', ':pineapple:': '🍍', ':coconut:': '🥥',
        ':avocado:': '🥑', ':eggplant:': '🍆', ':potato:': '🥔', ':carrot:': '🥕',
        ':corn:': '🌽', ':hot_pepper:': '🌶️', ':cucumber:': '🥒', ':broccoli:': '🥦',
        ':pizza:': '🍕', ':hamburger:': '🍔', ':fries:': '🍟', ':hotdog:': '🌭',
        ':taco:': '🌮', ':burrito:': '🌯', ':egg:': '🥚', ':cooking:': '🍳',
        ':pancakes:': '🥞', ':cheese:': '🧀', ':meat_on_bone:': '🍖', ':poultry_leg:': '🍗',
        ':bacon:': '🥓', ':steak:': '🥩', ':spaghetti:': '🍝', ':sushi:': '🍣',
        ':ramen:': '🍜', ':rice:': '🍚', ':curry:': '🍛', ':bento:': '🍱',
        ':cake:': '🍰', ':birthday:': '🎂', ':cookie:': '🍪', ':chocolate_bar:': '🍫',
        ':candy:': '🍬', ':lollipop:': '🍭', ':doughnut:': '🍩', ':ice_cream:': '🍨',
        ':coffee:': '☕', ':tea:': '🍵', ':beer:': '🍺', ':beers:': '🍻',
        ':wine_glass:': '🍷', ':cocktail:': '🍸', ':tropical_drink:': '🍹', ':champagne:': '🍾',

        // Activities & Sports
        ':soccer:': '⚽', ':basketball:': '🏀', ':football:': '🏈', ':baseball:': '⚾',
        ':tennis:': '🎾', ':volleyball:': '🏐', ':rugby:': '🏉', ':golf:': '⛳',
        ':trophy:': '🏆', ':medal:': '🏅', ':first_place:': '🥇', ':second_place:': '🥈',
        ':third_place:': '🥉', ':running:': '🏃', ':swimming:': '🏊', ':biking:': '🚴',
        ':video_game:': '🎮', ':joystick:': '🕹️', ':dart:': '🎯', ':bowling:': '🎳',
        ':chess:': '♟️', ':dice:': '🎲', ':jigsaw:': '🧩',

        // Objects & Symbols
        ':bulb:': '💡', ':flashlight:': '🔦', ':wrench:': '🔧', ':hammer:': '🔨',
        ':gear:': '⚙️', ':link:': '🔗', ':lock:': '🔒', ':unlock:': '🔓',
        ':key:': '🔑', ':bell:': '🔔', ':bookmark:': '🔖', ':paperclip:': '📎',
        ':scissors:': '✂️', ':file_folder:': '📁', ':clipboard:': '📋', ':memo:': '📝',
        ':pencil:': '✏️', ':pen:': '🖊️', ':book:': '📖', ':books:': '📚',
        ':calendar:': '📅', ':chart:': '📊', ':bar_chart:': '📊', ':chart_with_upwards_trend:': '📈',
        ':chart_with_downwards_trend:': '📉', ':email:': '📧', ':inbox_tray:': '📥',
        ':outbox_tray:': '📤', ':package:': '📦', ':mailbox:': '📫', ':phone:': '📱',
        ':computer:': '💻', ':desktop:': '🖥️', ':keyboard:': '⌨️', ':mouse_computer:': '🖱️',
        ':printer:': '🖨️', ':camera:': '📷', ':video_camera:': '📹', ':tv:': '📺',
        ':loudspeaker:': '📢', ':mute:': '🔇', ':speaker:': '🔈', ':sound:': '🔉',
        ':loud_sound:': '🔊', ':microphone:': '🎤', ':headphones:': '🎧',
        ':rocket:': '🚀', ':airplane:': '✈️', ':car:': '🚗', ':taxi:': '🚕',
        ':bus:': '🚌', ':ambulance:': '🚑', ':fire_engine:': '🚒', ':police_car:': '🚓',
        ':bike:': '🚲', ':scooter:': '🛴', ':skateboard:': '🛹', ':ship:': '🚢',
        ':hourglass:': '⌛', ':watch:': '⌚', ':clock:': '🕐', ':alarm_clock:': '⏰',
        ':stopwatch:': '⏱️', ':timer:': '⏲️', ':money:': '💰', ':dollar:': '💵',
        ':credit_card:': '💳', ':gem:': '💎', ':ring:': '💍', ':crown:': '👑',
        ':gift:': '🎁', ':balloon:': '🎈', ':tada:': '🎉', ':confetti:': '🎊',
        ':party:': '🥳', ':sparkler:': '🎇', ':fireworks:': '🎆',
        
        // Status & Info
        ':check:': '✅', ':white_check_mark:': '✅', ':heavy_check_mark:': '✔️',
        ':x:': '❌', ':cross_mark:': '❌', ':negative_squared_cross_mark:': '❎',
        ':warning:': '⚠️', ':no_entry:': '⛔', ':prohibited:': '🚫', ':stop_sign:': '🛑',
        ':question:': '❓', ':grey_question:': '❔', ':exclamation:': '❗', ':grey_exclamation:': '❕',
        ':bangbang:': '‼️', ':interrobang:': '⁉️', ':100:': '💯', ':info:': 'ℹ️',
        ':new:': '🆕', ':free:': '🆓', ':up:': '🆙', ':cool:': '🆒', ':ok:': '🆗',
        ':sos:': '🆘', ':no_entry_sign:': '🚫', ':underage:': '🔞',
        
        // Arrows & Shapes
        ':arrow_up:': '⬆️', ':arrow_down:': '⬇️', ':arrow_left:': '⬅️', ':arrow_right:': '➡️',
        ':arrow_upper_right:': '↗️', ':arrow_lower_right:': '↘️', ':arrow_lower_left:': '↙️',
        ':arrow_upper_left:': '↖️', ':arrows_counterclockwise:': '🔄', ':rewind:': '⏪',
        ':fast_forward:': '⏩', ':arrow_forward:': '▶️', ':arrow_backward:': '◀️',
        ':play_pause:': '⏯️', ':stop_button:': '⏹️', ':record_button:': '⏺️',
        ':eject:': '⏏️', ':repeat:': '🔁', ':repeat_one:': '🔂', ':shuffle:': '🔀',
        ':red_circle:': '🔴', ':orange_circle:': '🟠', ':yellow_circle:': '🟡',
        ':green_circle:': '🟢', ':blue_circle:': '🔵', ':purple_circle:': '🟣',
        ':brown_circle:': '🟤', ':black_circle:': '⚫', ':white_circle:': '⚪',
        ':red_square:': '🟥', ':orange_square:': '🟧', ':yellow_square:': '🟨',
        ':green_square:': '🟩', ':blue_square:': '🟦', ':purple_square:': '🟪',
        ':brown_square:': '🟫', ':black_large_square:': '⬛', ':white_large_square:': '⬜',
        ':small_red_triangle:': '🔺', ':small_red_triangle_down:': '🔻',
        ':diamond_shape_with_a_dot_inside:': '💠', ':radio_button:': '🔘',

        // Programming & Tech related
        ':bug:': '🐛', ':beetle:': '🪲', ':construction:': '🚧', ':hammer_and_wrench:': '🛠️',
        ':test_tube:': '🧪', ':petri_dish:': '🧫', ':dna:': '🧬', ':microscope:': '🔬',
        ':telescope:': '🔭', ':satellite:': '📡', ':syringe:': '💉', ':pill:': '💊',
        ':adhesive_bandage:': '🩹', ':stethoscope:': '🩺', ':door:': '🚪', ':bed:': '🛏️',
        ':shopping_cart:': '🛒', ':smoking:': '🚬', ':coffin:': '⚰️', ':funeral_urn:': '⚱️',
        ':moyai:': '🗿', ':placard:': '🪧', ':identification_card:': '🪪',
    };

    /**
     * Convert emoji shortcodes to actual emojis
     */
    function convertEmojis(text) {
        return text.replace(/:[\w+-]+:/g, function(match) {
            return emojiMap[match] || match;
        });
    }

    /**
     * Process emojis in the document
     */
    function processEmojis() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip script, style, code, and pre elements
                    const parent = node.parentNode;
                    if (parent && (
                        parent.tagName === 'SCRIPT' ||
                        parent.tagName === 'STYLE' ||
                        parent.tagName === 'CODE' ||
                        parent.tagName === 'PRE' ||
                        parent.classList.contains('hljs')
                    )) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        textNodes.forEach(function(node) {
            if (/:[\w+-]+:/.test(node.nodeValue)) {
                node.nodeValue = convertEmojis(node.nodeValue);
            }
        });
    }

    /**
     * Add copy buttons to code blocks
     */
    function addCopyButtons() {
        const codeBlocks = document.querySelectorAll('pre');
        
        codeBlocks.forEach(function(pre) {
            // Skip if already has copy button
            if (pre.querySelector('.copy-code-btn')) return;
            
            // Create wrapper if needed
            pre.style.position = 'relative';
            
            const button = document.createElement('button');
            button.className = 'copy-code-btn';
            button.innerHTML = 'Copy';
            button.title = 'Copy code to clipboard';
            
            button.addEventListener('click', function() {
                const code = pre.querySelector('code');
                const text = code ? code.textContent : pre.textContent;
                
                navigator.clipboard.writeText(text).then(function() {
                    button.innerHTML = 'Copied!';
                    button.classList.add('copied');
                    setTimeout(function() {
                        button.innerHTML = 'Copy';
                        button.classList.remove('copied');
                    }, 2000);
                }).catch(function(err) {
                    console.error('Failed to copy:', err);
                    button.innerHTML = 'Failed';
                    setTimeout(function() {
                        button.innerHTML = 'Copy';
                    }, 2000);
                });
            });
            
            pre.appendChild(button);
        });
    }

    /**
     * Add line numbers to code blocks
     */
    function addLineNumbers() {
        const codeBlocks = document.querySelectorAll('pre code');
        
        codeBlocks.forEach(function(code) {
            // Skip if already has line numbers or is mermaid
            if (code.classList.contains('line-numbers-added')) return;
            if (code.parentNode.querySelector('.line-numbers')) return;
            
            const lines = code.textContent.split('\n');
            // Remove last empty line if exists
            if (lines[lines.length - 1] === '') lines.pop();
            
            if (lines.length > 1) {
                const lineNumbers = document.createElement('span');
                lineNumbers.className = 'line-numbers';
                lineNumbers.setAttribute('aria-hidden', 'true');
                
                for (let i = 1; i <= lines.length; i++) {
                    lineNumbers.innerHTML += i + '\n';
                }
                
                code.parentNode.insertBefore(lineNumbers, code);
                code.classList.add('line-numbers-added');
                code.parentNode.classList.add('has-line-numbers');
            }
        });
    }

    /**
     * Add anchor links to headings
     */
    function addHeadingAnchors() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headings.forEach(function(heading) {
            // Skip if already has anchor
            if (heading.querySelector('.heading-anchor')) return;
            
            let id = heading.id;
            if (!id) {
                // Generate ID from text content
                id = heading.textContent
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .trim();
                heading.id = id;
            }
            
            const anchor = document.createElement('a');
            anchor.className = 'heading-anchor';
            anchor.href = '#' + id;
            anchor.innerHTML = '#';
            anchor.title = 'Link to this section';
            
            heading.insertBefore(anchor, heading.firstChild);
        });
    }

    /**
     * Show task list progress
     */
    function showTaskListProgress() {
        // Find all task lists (ul containing li with checkboxes)
        const lists = document.querySelectorAll('ul, ol');
        
        lists.forEach(function(list) {
            const checkboxes = list.querySelectorAll(':scope > li > input[type="checkbox"]');
            
            if (checkboxes.length > 0) {
                // Skip if already has progress indicator
                if (list.previousElementSibling && 
                    list.previousElementSibling.classList.contains('task-progress')) {
                    return;
                }
                
                const checked = list.querySelectorAll(':scope > li > input[type="checkbox"]:checked').length;
                const total = checkboxes.length;
                const percent = Math.round((checked / total) * 100);
                
                const progress = document.createElement('div');
                progress.className = 'task-progress';
                progress.innerHTML = `
                    <div class="task-progress-bar">
                        <div class="task-progress-fill" style="width: ${percent}%"></div>
                    </div>
                    <span class="task-progress-text">${checked}/${total} tasks (${percent}%)</span>
                `;
                
                list.parentNode.insertBefore(progress, list);
            }
        });
    }

    /**
     * Show word count and reading time
     */
    function showReadingTime() {
        // Skip if already exists
        if (document.querySelector('.reading-time')) return;
        
        const text = document.body.textContent || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const readingTime = Math.ceil(words / 200); // 200 words per minute
        
        const info = document.createElement('div');
        info.className = 'reading-time';
        info.innerHTML = `${words.toLocaleString()} words · ${readingTime} min read`;
        
        // Insert after first heading or at top
        const firstHeading = document.querySelector('h1, h2');
        if (firstHeading) {
            firstHeading.parentNode.insertBefore(info, firstHeading.nextSibling);
        } else {
            document.body.insertBefore(info, document.body.firstChild);
        }
    }

    /**
     * Add image lightbox/zoom functionality
     */
    function addImageLightbox() {
        // Create lightbox overlay if not exists
        let lightbox = document.getElementById('md-lightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'md-lightbox';
            lightbox.className = 'md-lightbox';
            lightbox.innerHTML = `
                <div class="md-lightbox-content">
                    <img src="" alt="">
                    <button class="md-lightbox-close" title="Close (Esc)">&times;</button>
                </div>
            `;
            document.body.appendChild(lightbox);
            
            // Close on click outside or close button
            lightbox.addEventListener('click', function(e) {
                if (e.target === lightbox || e.target.classList.contains('md-lightbox-close')) {
                    lightbox.classList.remove('active');
                }
            });
            
            // Close on escape
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                    lightbox.classList.remove('active');
                }
            });
        }
        
        // Add click handlers to images
        const images = document.querySelectorAll('img:not(.md-lightbox img):not([data-no-lightbox])');
        images.forEach(function(img) {
            if (img.classList.contains('lightbox-enabled')) return;
            
            img.classList.add('lightbox-enabled');
            img.style.cursor = 'zoom-in';
            
            img.addEventListener('click', function() {
                const lightboxImg = lightbox.querySelector('img');
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt;
                lightbox.classList.add('active');
            });
        });
    }

    /**
     * Initialize keyboard shortcuts
     */
    function initKeyboardShortcuts() {
        // Skip if already initialized
        if (window.mdKeyboardShortcutsInit) return;
        window.mdKeyboardShortcutsInit = true;
        
        document.addEventListener('keydown', function(e) {
            // Don't trigger in inputs/textareas
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            const searchOverlay = document.getElementById('md-search-overlay');
            
            switch(e.key) {
                case '/':
                    // Open search
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        openSearch();
                    }
                    break;
                    
                case 't':
                    // Scroll to top
                    if (!e.ctrlKey && !e.metaKey) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                    break;
                    
                case 'b':
                    // Scroll to bottom
                    if (!e.ctrlKey && !e.metaKey) {
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }
                    break;
                    
                case 'p':
                    // Print
                    if (e.ctrlKey || e.metaKey) {
                        // Let browser handle it
                    }
                    break;
            }
        });
    }

    /**
     * Create and handle search overlay
     */
    function createSearchOverlay() {
        if (document.getElementById('md-search-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'md-search-overlay';
        overlay.className = 'md-search-overlay';
        overlay.innerHTML = `
            <div class="md-search-container">
                <input type="text" class="md-search-input" placeholder="Search in document... (Esc to close)">
                <div class="md-search-results"></div>
                <div class="md-search-status"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        const input = overlay.querySelector('.md-search-input');
        const results = overlay.querySelector('.md-search-results');
        const status = overlay.querySelector('.md-search-status');
        
        let currentHighlights = [];
        let currentIndex = -1;
        
        // Close on click outside
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeSearch();
            }
        });
        
        // Handle input
        input.addEventListener('input', function() {
            clearHighlights();
            const query = input.value.trim();
            
            if (query.length < 2) {
                status.textContent = '';
                return;
            }
            
            highlightMatches(query);
        });
        
        // Handle keyboard
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeSearch();
            } else if (e.key === 'Enter') {
                if (currentHighlights.length > 0) {
                    currentIndex = (currentIndex + 1) % currentHighlights.length;
                    scrollToMatch(currentIndex);
                }
            }
        });
        
        function highlightMatches(query) {
            const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        const parent = node.parentNode;
                        if (parent && (
                            parent.tagName === 'SCRIPT' ||
                            parent.tagName === 'STYLE' ||
                            parent.closest('.md-search-overlay') ||
                            parent.closest('.md-lightbox')
                        )) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            const matches = [];
            let node;
            while (node = walker.nextNode()) {
                if (regex.test(node.nodeValue)) {
                    matches.push(node);
                }
                regex.lastIndex = 0;
            }
            
            matches.forEach(function(textNode) {
                const text = textNode.nodeValue;
                const parts = text.split(regex);
                const matchedParts = text.match(regex);
                
                if (matchedParts && parts.length > 1) {
                    const fragment = document.createDocumentFragment();
                    parts.forEach(function(part, i) {
                        fragment.appendChild(document.createTextNode(part));
                        if (matchedParts[i]) {
                            const mark = document.createElement('mark');
                            mark.className = 'md-search-highlight';
                            mark.textContent = matchedParts[i];
                            fragment.appendChild(mark);
                            currentHighlights.push(mark);
                        }
                    });
                    textNode.parentNode.replaceChild(fragment, textNode);
                }
            });
            
            status.textContent = `${currentHighlights.length} matches found`;
            currentIndex = -1;
            
            if (currentHighlights.length > 0) {
                currentIndex = 0;
                scrollToMatch(0);
            }
        }
        
        function scrollToMatch(index) {
            currentHighlights.forEach((m, i) => {
                m.classList.toggle('current', i === index);
            });
            
            if (currentHighlights[index]) {
                currentHighlights[index].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                status.textContent = `${index + 1} of ${currentHighlights.length} matches`;
            }
        }
        
        function clearHighlights() {
            document.querySelectorAll('.md-search-highlight').forEach(function(mark) {
                const parent = mark.parentNode;
                parent.replaceChild(document.createTextNode(mark.textContent), mark);
                parent.normalize();
            });
            currentHighlights = [];
            currentIndex = -1;
        }
        
        window.openSearch = function() {
            overlay.classList.add('active');
            input.focus();
            input.select();
        };
        
        window.closeSearch = function() {
            overlay.classList.remove('active');
            clearHighlights();
            input.value = '';
            status.textContent = '';
        };
    }

    function openSearch() {
        if (window.openSearch) window.openSearch();
    }

    /**
     * Add Copy to Clipboard button
     */
    function addCopyToClipboardButton() {
        if (document.getElementById('md-copy-clipboard')) return;
        
        const btn = document.createElement('button');
        btn.id = 'md-copy-clipboard';
        btn.className = 'md-copy-clipboard';
        btn.innerHTML = '📋';
        btn.title = 'Copy to clipboard';
        
        btn.addEventListener('click', function() {
            const rawContent = window.originalMarkdown || document.body.innerText;
            
            if (rawContent) {
                navigator.clipboard.writeText(rawContent).then(function() {
                    btn.innerHTML = '✅';
                    showToast('Copied to clipboard!');
                    setTimeout(function() {
                        btn.innerHTML = '📋';
                    }, 1500);
                }).catch(function() {
                    // Fallback for older browsers
                    const s = document.createElement('textarea');
                    s.value = rawContent;
                    document.body.appendChild(s);
                    s.select();
                    document.execCommand('copy');
                    s.remove();
                    
                    btn.innerHTML = '✅';
                    showToast('Copied to clipboard!');
                    setTimeout(function() {
                        btn.innerHTML = '📋';
                    }, 1500);
                });
            }
        });
        
        document.body.appendChild(btn);
    }

    /**
     * Add Export dropdown menu
     */
    function addExportButton() {
        if (document.getElementById('md-export-dropdown')) return;
        
        const container = document.createElement('div');
        container.id = 'md-export-dropdown';
        container.className = 'md-export-dropdown';
        
        const btn = document.createElement('button');
        btn.className = 'md-export-btn';
        btn.innerHTML = '⋮';
        btn.title = 'Export options';
        
        const menu = document.createElement('div');
        menu.className = 'md-export-menu';
        
        // Menu items
        const items = [
            { icon: '📄', label: 'Export PDF', action: () => window.print() },
            { icon: '📋', label: 'Copy HTML', action: copyHtml },
            { icon: '📝', label: 'Copy Markdown', action: copyMarkdown },
            { icon: '🔗', label: 'Copy URL', action: copyUrl }
        ];
        
        items.forEach(item => {
            const menuItem = document.createElement('button');
            menuItem.className = 'md-export-menu-item';
            menuItem.innerHTML = `<span class="md-export-icon">${item.icon}</span>${item.label}`;
            menuItem.addEventListener('click', function(e) {
                e.stopPropagation();
                item.action();
                menu.classList.remove('visible');
            });
            menu.appendChild(menuItem);
        });
        
        container.appendChild(btn);
        container.appendChild(menu);
        document.body.appendChild(container);
        
        // Toggle menu
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            menu.classList.toggle('visible');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function() {
            menu.classList.remove('visible');
        });
    }
    
    /**
     * Copy rendered HTML to clipboard
     */
    function copyHtml() {
        const html = document.body.innerHTML;
        // Remove UI elements from copied HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Remove all our UI elements
        const removeSelectors = [
            '.md-export-dropdown', '.md-back-to-top', '.md-progress-bar',
            '.md-font-controls', '.md-focus-toggle', '.md-lightbox',
            '.md-search-overlay', '#dark-mode-toggle', '.copy-code-btn',
            '.heading-anchor', '.reading-time', '.task-progress', '.line-numbers'
        ];
        removeSelectors.forEach(sel => {
            tempDiv.querySelectorAll(sel).forEach(el => el.remove());
        });
        
        navigator.clipboard.writeText(tempDiv.innerHTML).then(() => {
            showToast('HTML copied to clipboard!');
        }).catch(err => {
            showToast('Failed to copy HTML', true);
        });
    }
    
    /**
     * Copy original markdown source
     */
    function copyMarkdown() {
        // Use the stored original markdown from markdownify.js
        if (window.originalMarkdown) {
            navigator.clipboard.writeText(window.originalMarkdown).then(() => {
                showToast('Markdown copied to clipboard!');
            }).catch(err => {
                showToast('Failed to copy to clipboard', true);
            });
        } else {
            showToast('Markdown source not available', true);
        }
    }
    
    /**
     * Copy current URL to clipboard
     */
    function copyUrl() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('URL copied to clipboard!');
        }).catch(err => {
            showToast('Failed to copy URL', true);
        });
    }
    
    /**
     * Show toast notification
     */
    function showToast(message, isError = false) {
        // Remove existing toast
        const existing = document.querySelector('.md-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = 'md-toast' + (isError ? ' error' : '');
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('visible'), 10);
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    /**
     * Add back to top button
     */
    function addBackToTopButton() {
        if (document.getElementById('md-back-to-top')) return;
        
        const btn = document.createElement('button');
        btn.id = 'md-back-to-top';
        btn.className = 'md-back-to-top';
        btn.innerHTML = '↑';
        btn.title = 'Back to top (T)';
        
        btn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        document.body.appendChild(btn);
        
        // Show/hide based on scroll position
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        });
    }

    /**
     * Add reading progress bar
     */
    function addProgressBar() {
        if (document.getElementById('md-progress-bar')) return;
        
        const progressContainer = document.createElement('div');
        progressContainer.id = 'md-progress-bar';
        progressContainer.className = 'md-progress-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'md-progress-fill';
        progressContainer.appendChild(progressFill);
        
        document.body.appendChild(progressContainer);
        
        window.addEventListener('scroll', function() {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            progressFill.style.width = progress + '%';
        });
    }

    /**
     * Scroll sync with TOC - highlight current section
     */
    function initScrollSyncTOC() {
        const tocLinks = document.querySelectorAll('.toc-list a');
        if (tocLinks.length === 0) return;
        
        const headings = [];
        tocLinks.forEach(function(link) {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                const heading = document.getElementById(href.slice(1));
                if (heading) {
                    headings.push({ element: heading, link: link });
                }
            }
        });
        
        if (headings.length === 0) return;
        
        function updateActiveHeading() {
            const scrollPos = window.scrollY + 100; // Offset for better UX
            
            let activeIndex = 0;
            for (let i = 0; i < headings.length; i++) {
                if (headings[i].element.offsetTop <= scrollPos) {
                    activeIndex = i;
                }
            }
            
            tocLinks.forEach(function(link) {
                link.classList.remove('toc-active');
            });
            
            headings[activeIndex].link.classList.add('toc-active');
        }
        
        window.addEventListener('scroll', updateActiveHeading);
        updateActiveHeading(); // Initial call
    }

    /**
     * Add font size controls
     */
    function addFontSizeControls() {
        if (document.getElementById('md-font-controls')) return;
        
        const container = document.createElement('div');
        container.id = 'md-font-controls';
        container.className = 'md-font-controls';
        
        const decreaseBtn = document.createElement('button');
        decreaseBtn.className = 'md-font-btn';
        decreaseBtn.innerHTML = 'A-';
        decreaseBtn.title = 'Decrease font size';
        
        const resetBtn = document.createElement('button');
        resetBtn.className = 'md-font-btn';
        resetBtn.innerHTML = 'A';
        resetBtn.title = 'Reset font size';
        
        const increaseBtn = document.createElement('button');
        increaseBtn.className = 'md-font-btn';
        increaseBtn.innerHTML = 'A+';
        increaseBtn.title = 'Increase font size';
        
        container.appendChild(decreaseBtn);
        container.appendChild(resetBtn);
        container.appendChild(increaseBtn);
        document.body.appendChild(container);
        
        // Get current font size or default
        let currentSize = parseFloat(localStorage.getItem('md-font-size')) || 16;
        document.body.style.fontSize = currentSize + 'px';
        
        decreaseBtn.addEventListener('click', function() {
            if (currentSize > 10) {
                currentSize -= 2;
                document.body.style.fontSize = currentSize + 'px';
                localStorage.setItem('md-font-size', currentSize);
            }
        });
        
        increaseBtn.addEventListener('click', function() {
            if (currentSize < 32) {
                currentSize += 2;
                document.body.style.fontSize = currentSize + 'px';
                localStorage.setItem('md-font-size', currentSize);
            }
        });
        
        resetBtn.addEventListener('click', function() {
            currentSize = 16;
            document.body.style.fontSize = currentSize + 'px';
            localStorage.setItem('md-font-size', currentSize);
        });
    }

    /**
     * Focus mode - dim everything except current paragraph
     */
    function initFocusMode() {
        if (document.getElementById('md-focus-toggle')) return;
        
        const btn = document.createElement('button');
        btn.id = 'md-focus-toggle';
        btn.className = 'md-focus-toggle';
        btn.innerHTML = '◎';
        btn.title = 'Toggle focus mode (F)';
        
        let focusModeEnabled = false;
        
        btn.addEventListener('click', function() {
            focusModeEnabled = !focusModeEnabled;
            document.body.classList.toggle('md-focus-mode', focusModeEnabled);
            btn.classList.toggle('active', focusModeEnabled);
        });
        
        document.body.appendChild(btn);
        
        // Track mouse position for focus effect
        document.addEventListener('mousemove', function(e) {
            if (!focusModeEnabled) return;
            
            const elements = document.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, table');
            elements.forEach(function(el) {
                const rect = el.getBoundingClientRect();
                const isHovered = e.clientY >= rect.top && e.clientY <= rect.bottom;
                el.classList.toggle('md-focused', isHovered);
            });
        });
        
        // Keyboard shortcut
        document.addEventListener('keydown', function(e) {
            if (e.key === 'f' && !e.ctrlKey && !e.metaKey && 
                e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                btn.click();
            }
        });
    }

    /**
     * Remember reading position
     */
    function initReadingPositionMemory() {
        const pageKey = 'md-scroll-' + window.location.pathname;
        
        // Restore position
        const savedPosition = localStorage.getItem(pageKey);
        if (savedPosition) {
            setTimeout(function() {
                window.scrollTo(0, parseInt(savedPosition, 10));
            }, 100);
        }
        
        // Save position on scroll (debounced)
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function() {
                localStorage.setItem(pageKey, window.scrollY);
            }, 200);
        });
        
        // Clear on reaching top
        window.addEventListener('scroll', function() {
            if (window.scrollY === 0) {
                localStorage.removeItem(pageKey);
            }
        });
    }

    /**
     * Inject feature styles
     */
    function injectStyles() {
        if (document.getElementById('md-features-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'md-features-styles';
        styles.textContent = `
            /* Copy button */
            .copy-code-btn {
                position: absolute;
                top: 8px;
                right: 8px;
                padding: 4px 12px;
                font-size: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f6f8fa;
                border: 1px solid #d0d7de;
                border-radius: 6px;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s, background 0.2s;
                z-index: 10;
            }
            pre:hover .copy-code-btn {
                opacity: 1;
            }
            .copy-code-btn:hover {
                background: #e6e8eb;
            }
            .copy-code-btn.copied {
                background: #2da44e;
                color: white;
                border-color: #2da44e;
            }
            [data-theme="dark"] .copy-code-btn {
                background: #30363d;
                border-color: #484f58;
                color: #c9d1d9;
            }
            [data-theme="dark"] .copy-code-btn:hover {
                background: #484f58;
            }
            
            /* Line numbers */
            pre.has-line-numbers {
                padding-left: 3.5em !important;
                position: relative;
            }
            .line-numbers {
                position: absolute;
                left: 0;
                top: 0;
                padding: 16px 8px;
                text-align: right;
                color: #6e7681;
                background: rgba(0,0,0,0.05);
                border-right: 1px solid #d0d7de;
                user-select: none;
                font-size: inherit;
                line-height: inherit;
                white-space: pre;
            }
            [data-theme="dark"] .line-numbers {
                background: rgba(255,255,255,0.05);
                border-right-color: #484f58;
                color: #8b949e;
            }
            
            /* Heading anchors */
            .heading-anchor {
                opacity: 0;
                margin-right: 8px;
                color: #0969da;
                text-decoration: none;
                font-weight: normal;
                transition: opacity 0.2s;
            }
            h1:hover .heading-anchor,
            h2:hover .heading-anchor,
            h3:hover .heading-anchor,
            h4:hover .heading-anchor,
            h5:hover .heading-anchor,
            h6:hover .heading-anchor {
                opacity: 1;
            }
            .heading-anchor:hover {
                text-decoration: underline;
            }
            [data-theme="dark"] .heading-anchor {
                color: #58a6ff;
            }
            
            /* Task progress */
            .task-progress {
                display: flex;
                align-items: center;
                gap: 12px;
                margin: 8px 0;
                padding: 8px 12px;
                background: #f6f8fa;
                border-radius: 6px;
                font-size: 13px;
            }
            .task-progress-bar {
                flex: 1;
                height: 8px;
                background: #d0d7de;
                border-radius: 4px;
                overflow: hidden;
            }
            .task-progress-fill {
                height: 100%;
                background: #2da44e;
                transition: width 0.3s;
            }
            .task-progress-text {
                color: #57606a;
                white-space: nowrap;
            }
            [data-theme="dark"] .task-progress {
                background: #21262d;
            }
            [data-theme="dark"] .task-progress-bar {
                background: #484f58;
            }
            [data-theme="dark"] .task-progress-text {
                color: #8b949e;
            }
            
            /* Reading time */
            .reading-time {
                color: #57606a;
                font-size: 14px;
                margin: 8px 0 16px;
                padding: 8px 0;
                border-bottom: 1px solid #d0d7de;
            }
            [data-theme="dark"] .reading-time {
                color: #8b949e;
                border-bottom-color: #30363d;
            }
            
            /* Lightbox */
            .md-lightbox {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.9);
                z-index: 10000;
                align-items: center;
                justify-content: center;
            }
            .md-lightbox.active {
                display: flex;
            }
            .md-lightbox-content {
                position: relative;
                max-width: 90vw;
                max-height: 90vh;
            }
            .md-lightbox img {
                max-width: 90vw;
                max-height: 90vh;
                object-fit: contain;
                border-radius: 4px;
            }
            .md-lightbox-close {
                position: absolute;
                top: -40px;
                right: 0;
                background: none;
                border: none;
                color: white;
                font-size: 32px;
                cursor: pointer;
                padding: 8px;
                line-height: 1;
            }
            .md-lightbox-close:hover {
                color: #ccc;
            }
            
            /* Search overlay */
            .md-search-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 10001;
                align-items: flex-start;
                justify-content: center;
                padding-top: 100px;
            }
            .md-search-overlay.active {
                display: flex;
            }
            .md-search-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                width: 90%;
                max-width: 600px;
                padding: 16px;
            }
            .md-search-input {
                width: 100%;
                padding: 12px 16px;
                font-size: 16px;
                border: 2px solid #d0d7de;
                border-radius: 8px;
                outline: none;
                box-sizing: border-box;
            }
            .md-search-input:focus {
                border-color: #0969da;
            }
            .md-search-status {
                margin-top: 8px;
                font-size: 13px;
                color: #57606a;
            }
            .md-search-highlight {
                background: #fff8c5;
                padding: 1px 2px;
                border-radius: 2px;
            }
            .md-search-highlight.current {
                background: #ff9632;
                color: white;
            }
            [data-theme="dark"] .md-search-container {
                background: #21262d;
            }
            [data-theme="dark"] .md-search-input {
                background: #0d1117;
                border-color: #30363d;
                color: #c9d1d9;
            }
            [data-theme="dark"] .md-search-input:focus {
                border-color: #58a6ff;
            }
            [data-theme="dark"] .md-search-status {
                color: #8b949e;
            }
            [data-theme="dark"] .md-search-highlight {
                background: #634c1e;
            }
            [data-theme="dark"] .md-search-highlight.current {
                background: #9e6a03;
            }
            
            /* Print styles */
            @media print {
                .copy-code-btn,
                .heading-anchor,
                .reading-time,
                .task-progress,
                .dark-mode-toggle,
                #dark-mode-toggle,
                .md-lightbox,
                .md-search-overlay,
                .md-back-to-top,
                .md-progress-bar,
                .md-font-controls,
                .md-focus-toggle,
                .md-export-btn {
                    display: none !important;
                }
                
                body {
                    font-size: 12pt;
                    line-height: 1.5;
                    color: black !important;
                    background: white !important;
                }
                
                pre, code {
                    border: 1px solid #ddd;
                    background: #f5f5f5 !important;
                    page-break-inside: avoid;
                }
                
                h1, h2, h3, h4, h5, h6 {
                    page-break-after: avoid;
                    color: black !important;
                }
                
                img {
                    max-width: 100% !important;
                    page-break-inside: avoid;
                }
                
                a {
                    color: black !important;
                    text-decoration: underline;
                }
                
                a[href^="http"]:after {
                    content: " (" attr(href) ")";
                    font-size: 0.8em;
                    color: #666;
                }
                
                table {
                    border-collapse: collapse;
                }
                
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                }
            }
            
            /* Keyboard shortcut hint */
            .keyboard-hints {
                position: fixed;
                bottom: 16px;
                right: 16px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 12px;
                z-index: 9998;
                display: none;
            }
            .keyboard-hints.show {
                display: block;
            }
            .keyboard-hints kbd {
                background: rgba(255,255,255,0.2);
                padding: 2px 6px;
                border-radius: 4px;
                margin-right: 4px;
            }
            
            /* Copy to clipboard button */
            .md-copy-clipboard {
                position: fixed;
                top: 70px;
                right: 16px;
                width: 44px;
                height: 44px;
                border-radius: 10px;
                border: 2px solid #2da44e;
                background-color: #dafbe1;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                z-index: 9999;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(45, 164, 78, 0.3);
            }
            .md-copy-clipboard:hover {
                background-color: #2da44e;
                color: #ffffff;
                transform: scale(1.05);
            }
            [data-theme="dark"] .md-copy-clipboard {
                background-color: #238636;
                border-color: #3fb950;
                color: #ffffff;
                box-shadow: 0 2px 8px rgba(63, 185, 80, 0.4);
            }
            [data-theme="dark"] .md-copy-clipboard:hover {
                background-color: #3fb950;
            }
            @media print {
                .md-copy-clipboard {
                    display: none !important;
                }
            }
            
            /* Export dropdown */
            .md-export-dropdown {
                position: fixed;
                top: 124px;
                right: 16px;
                z-index: 9999;
            }
            .md-export-btn {
                width: 44px;
                height: 44px;
                border-radius: 10px;
                border: 2px solid #8250df;
                background-color: #f3e8ff;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                font-weight: 600;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #8250df;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(130, 80, 223, 0.3);
            }
            .md-export-btn:hover {
                background-color: #8250df;
                color: #ffffff;
                transform: scale(1.05);
            }
            .md-export-menu {
                position: absolute;
                top: 50px;
                right: 0;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                padding: 8px 0;
                min-width: 180px;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s ease;
            }
            .md-export-menu.visible {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            .md-export-menu-item {
                display: flex;
                align-items: center;
                width: 100%;
                padding: 10px 16px;
                border: none;
                background: none;
                font-size: 14px;
                color: #24292f;
                cursor: pointer;
                text-align: left;
                transition: background 0.15s;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .md-export-menu-item:hover {
                background: #f6f8fa;
            }
            .md-export-icon {
                margin-right: 10px;
                font-size: 16px;
            }
            [data-theme="dark"] .md-export-btn {
                background-color: #6e40c9;
                border-color: #a371f7;
                color: #ffffff;
                box-shadow: 0 2px 8px rgba(163, 113, 247, 0.4);
            }
            [data-theme="dark"] .md-export-btn:hover {
                background-color: #8957e5;
            }
            [data-theme="dark"] .md-export-menu {
                background: #21262d;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            }
            [data-theme="dark"] .md-export-menu-item {
                color: #c9d1d9;
            }
            [data-theme="dark"] .md-export-menu-item:hover {
                background: #30363d;
            }
            @media print {
                .md-export-dropdown {
                    display: none !important;
                }
            }
            
            /* Toast notification */
            .md-toast {
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background: #24292f;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                opacity: 0;
                transition: all 0.3s ease;
                z-index: 10003;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            .md-toast.visible {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            .md-toast.error {
                background: #cf222e;
            }
            [data-theme="dark"] .md-toast {
                background: #f0f6fc;
                color: #24292f;
            }
            [data-theme="dark"] .md-toast.error {
                background: #f85149;
                color: white;
            }
            
            /* Back to top button */
            .md-back-to-top {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                border: none;
                background: #0969da;
                color: white;
                font-size: 24px;
                cursor: pointer;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                z-index: 9998;
                box-shadow: 0 4px 12px rgba(9, 105, 218, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .md-back-to-top.visible {
                opacity: 1;
                visibility: visible;
            }
            .md-back-to-top:hover {
                transform: translateY(-4px);
                box-shadow: 0 6px 16px rgba(9, 105, 218, 0.5);
            }
            [data-theme="dark"] .md-back-to-top {
                background: #58a6ff;
                box-shadow: 0 4px 12px rgba(88, 166, 255, 0.4);
            }
            @media print {
                .md-back-to-top {
                    display: none !important;
                }
            }
            
            /* Reading progress bar */
            .md-progress-bar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: rgba(0,0,0,0.1);
                z-index: 10002;
            }
            .md-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #0969da, #8250df);
                width: 0%;
                transition: width 0.1s ease-out;
            }
            [data-theme="dark"] .md-progress-bar {
                background: rgba(255,255,255,0.1);
            }
            [data-theme="dark"] .md-progress-fill {
                background: linear-gradient(90deg, #58a6ff, #a371f7);
            }
            @media print {
                .md-progress-bar {
                    display: none !important;
                }
            }
            
            /* TOC scroll sync */
            .toc-list a.toc-active {
                color: #0969da;
                font-weight: 600;
                background: rgba(9, 105, 218, 0.1);
                border-radius: 4px;
                padding: 2px 6px;
                margin: -2px -6px;
            }
            [data-theme="dark"] .toc-list a.toc-active {
                color: #58a6ff;
                background: rgba(88, 166, 255, 0.15);
            }
            
            /* Font size controls */
            .md-font-controls {
                position: fixed;
                top: 178px;
                right: 16px;
                display: flex;
                flex-direction: column;
                gap: 4px;
                z-index: 9999;
            }
            .md-font-btn {
                width: 36px;
                height: 28px;
                border-radius: 6px;
                border: 1px solid #d0d7de;
                background: #f6f8fa;
                color: #24292f;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .md-font-btn:hover {
                background: #0969da;
                color: white;
                border-color: #0969da;
            }
            [data-theme="dark"] .md-font-btn {
                background: #21262d;
                border-color: #30363d;
                color: #c9d1d9;
            }
            [data-theme="dark"] .md-font-btn:hover {
                background: #58a6ff;
                color: #0d1117;
                border-color: #58a6ff;
            }
            @media print {
                .md-font-controls {
                    display: none !important;
                }
            }
            
            /* Focus mode toggle */
            .md-focus-toggle {
                position: fixed;
                top: 274px;
                right: 16px;
                width: 44px;
                height: 44px;
                border-radius: 10px;
                border: 2px solid #bf8700;
                background: #fff8c5;
                color: #bf8700;
                font-size: 18px;
                cursor: pointer;
                z-index: 9999;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .md-focus-toggle:hover {
                background: #bf8700;
                color: white;
            }
            .md-focus-toggle.active {
                background: #bf8700;
                color: white;
                box-shadow: 0 0 0 3px rgba(191, 135, 0, 0.3);
            }
            [data-theme="dark"] .md-focus-toggle {
                background: #3d2e00;
                border-color: #d4a72c;
                color: #d4a72c;
            }
            [data-theme="dark"] .md-focus-toggle:hover,
            [data-theme="dark"] .md-focus-toggle.active {
                background: #d4a72c;
                color: #0d1117;
            }
            @media print {
                .md-focus-toggle {
                    display: none !important;
                }
            }
            
            /* Focus mode effect */
            .md-focus-mode p,
            .md-focus-mode li,
            .md-focus-mode h1,
            .md-focus-mode h2,
            .md-focus-mode h3,
            .md-focus-mode h4,
            .md-focus-mode h5,
            .md-focus-mode h6,
            .md-focus-mode pre,
            .md-focus-mode blockquote,
            .md-focus-mode table {
                opacity: 0.3;
                transition: opacity 0.2s ease;
            }
            .md-focus-mode .md-focused {
                opacity: 1;
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Initialize all features
     */
    function init() {
        injectStyles();
        processEmojis();
        addCopyButtons();
        addLineNumbers();
        addHeadingAnchors();
        showTaskListProgress();
        showReadingTime();
        addImageLightbox();
        addCopyToClipboardButton();
        addExportButton();
        addBackToTopButton();
        addProgressBar();
        initScrollSyncTOC();
        addFontSizeControls();
        initFocusMode();
        initReadingPositionMemory();
        createSearchOverlay();
        initKeyboardShortcuts();
    }

    // Public API
    return {
        init: init,
        processEmojis: processEmojis,
        addCopyButtons: addCopyButtons,
        addLineNumbers: addLineNumbers,
        addHeadingAnchors: addHeadingAnchors,
        showTaskListProgress: showTaskListProgress,
        showReadingTime: showReadingTime,
        addImageLightbox: addImageLightbox,
        convertEmojis: convertEmojis,
        addBackToTopButton: addBackToTopButton,
        addProgressBar: addProgressBar,
        initFocusMode: initFocusMode
    };

})();
