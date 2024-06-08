/* eslint-disable no-undef */
/* eslint-disable no-vars-requires */
const fs = require('fs');
const path = require('path');
const htmlParser = require('node-html-parser');

const rootDir = 'components';
const outputFile = 'src/snippets.json';

function traverseDirectories(currentDir, snippets) {
    const files = fs.readdirSync(currentDir);
    const documentation = currentDir.split(path.sep).slice(1).join(' ');

    files.forEach(file => {
        const filePath = path.join(currentDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            traverseDirectories(filePath, snippets);
        } else if (stats.isFile() && path.extname(file) === '.html') {
            const label = path.basename(file, '.html');
            const htmlContent = fs.readFileSync(filePath, 'utf-8');
            const root = htmlParser.parse(htmlContent);

            // Remove comments from the HTML
            root.querySelectorAll('*').forEach(el => {
                if (el.nodeType === htmlParser.NodeType.COMMENT_NODE) {
                    el.remove();
                }
            });

            const insertText = root.toString();

            snippets.push({
                label,
                documentation,
                insertText
            });
        }
    });
}

const snippets = [];
traverseDirectories(rootDir, snippets);

fs.writeFileSync(outputFile, JSON.stringify(snippets, null, 2));