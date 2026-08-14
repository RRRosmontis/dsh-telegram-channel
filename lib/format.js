export function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function inlineToHtml(text) {
    let html = escapeHtml(text);
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
    return html;
}
export function markdownToHtml(text) {
    const parts = text.split(/```[\w-]*/);
    if (parts.length % 2 === 0)
        return inlineToHtml(text);
    let html = '';
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
            const code = parts[i].replace(/^\n/, '').replace(/\n$/, '');
            html += `<pre>${escapeHtml(code)}</pre>`;
        }
        else {
            html += inlineToHtml(parts[i]);
        }
    }
    return html;
}
export function splitMessage(text, maxLength) {
    if (maxLength < 1)
        throw new Error('maxLength must be >= 1');
    if (text.length <= maxLength)
        return [text];
    const chunks = [];
    let rest = text;
    while (rest.length > maxLength) {
        const window = rest.slice(0, maxLength);
        const newline = window.lastIndexOf('\n');
        const ideographic = window.lastIndexOf('。');
        const sentence = window.lastIndexOf('. ');
        const breakAt = Math.max(newline, ideographic, sentence);
        const cut = breakAt > 0 ? (breakAt === sentence ? breakAt + 2 : breakAt + 1) : maxLength;
        chunks.push(rest.slice(0, cut));
        rest = rest.slice(cut);
    }
    chunks.push(rest);
    return chunks;
}
