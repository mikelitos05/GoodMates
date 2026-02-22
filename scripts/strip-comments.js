/**
 * strip-comments.js
 * Removes all comments from .js, .css files in the project src folders.
 * Run with: node strip-comments.js
 */

const fs = require('fs');
const path = require('path');

const TARGETS = [
    path.join(__dirname, '..', 'frontend', 'src'),
    path.join(__dirname, '..', 'frontend-mobile', 'src'),
    path.join(__dirname, '..', 'backend', 'src'),
];

function stripJSComments(code) {
    let result = '';
    let i = 0;
    while (i < code.length) {
        // String: single quote
        if (code[i] === "'" && (i === 0 || code[i - 1] !== '\\')) {
            let j = i + 1;
            while (j < code.length && !(code[j] === "'" && code[j - 1] !== '\\')) j++;
            result += code.slice(i, j + 1);
            i = j + 1;
        }
        // String: double quote
        else if (code[i] === '"' && (i === 0 || code[i - 1] !== '\\')) {
            let j = i + 1;
            while (j < code.length && !(code[j] === '"' && code[j - 1] !== '\\')) j++;
            result += code.slice(i, j + 1);
            i = j + 1;
        }
        // String: backtick
        else if (code[i] === '`') {
            let j = i + 1;
            while (j < code.length && !(code[j] === '`' && code[j - 1] !== '\\')) j++;
            result += code.slice(i, j + 1);
            i = j + 1;
        }
        // JSX comment: {/* ... */}
        else if (code[i] === '{' && code[i + 1] === '/' && code[i + 2] === '*') {
            let j = i + 3;
            while (j < code.length && !(code[j] === '*' && code[j + 1] === '/')) j++;
            j += 2; // skip */
            if (code[j] === '}') j++; // skip closing }
            i = j;
        }
        // Block comment: /* ... */
        else if (code[i] === '/' && code[i + 1] === '*') {
            let j = i + 2;
            while (j < code.length && !(code[j] === '*' && code[j + 1] === '/')) j++;
            i = j + 2;
        }
        // Line comment: // ...
        else if (code[i] === '/' && code[i + 1] === '/') {
            let j = i + 2;
            while (j < code.length && code[j] !== '\n') j++;
            i = j;
        }
        else {
            result += code[i++];
        }
    }
    return result;
}

function stripCSSComments(code) {
    // Keep @import url(...) safe by not touching strings
    return code.replace(/\/\*[\s\S]*?\*\//g, '');
}

function cleanBlankLines(code) {
    // Collapse 3+ consecutive blank lines into 1
    return code.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function processFile(filePath) {
    const ext = path.extname(filePath);
    let code = fs.readFileSync(filePath, 'utf8');

    if (ext === '.js' || ext === '.jsx') {
        code = stripJSComments(code);
    } else if (ext === '.css') {
        code = stripCSSComments(code);
    } else {
        return;
    }

    code = cleanBlankLines(code);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('Cleaned:', filePath.replace(path.join(__dirname, '..') + path.sep, ''));
}

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full);
        } else if (['.js', '.jsx', '.css'].includes(path.extname(entry.name))) {
            try {
                processFile(full);
            } catch (e) {
                console.error('Error processing:', full, e.message);
            }
        }
    }
}

console.log('Stripping comments from project...\n');
for (const target of TARGETS) {
    walk(target);
}
console.log('\nDone!');
