/* eslint-disable no-undef */
/* eslint-disable no-vars-requires */
const fs = require('fs');
const path = require('path');
const htmlParser = require('node-html-parser');
const api = "96d8bcf4399e5d12ded39d2db3ed42e0fd3f29d597b8d1c4b7549fca19c16e38ddcbeeb3b7f4ed1dea97dcb283855d122dbfa43376c704042dab14f013e86e2633d60ee64e32f2eaeb231fd78a7db53c4bf08b2a5483d6353c7a78abb29f1e3441077d86c6140195de19f94ed31709e97746987c8ae78ed0a1fa3305e291002c";
const { Client, Databases } = require('appwrite');
const rootDir = 'components';

const client = new Client();
const db = new Databases(client);
client.setEndpoint("https://setups.gallery/v1").setProject("666496b50037dcfde788").setKey(api);

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