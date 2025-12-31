// Copy raw markdown content to clipboard
var rawContent = window.originalMarkdown || document.body.innerText;

if (rawContent) {
    var s = $("<textarea/>").text(rawContent);
    $(document.body).append(s);
    s.select();
    document.execCommand("copy");
    s.remove();
    alert("Raw markdown copied to clipboard");
} else {
    alert("No content to copy");
}
