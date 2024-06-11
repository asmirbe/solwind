/* eslint-disable */
const API_KEY = process.env.API_KEY;
const fs = require("fs");
const path = require("path");
const htmlParser = require("node-html-parser");
const { Client, Databases } = require("appwrite");
const rootDir = "components";

const client = new Client();
const db = new Databases(client);
client.setEndpoint("https://setups.gallery/v1").setProject(process.env.PROJECT_ID).setKey(API_KEY);

function traverseDirectories(currentDir, snippets) {
	const files = fs.readdirSync(currentDir);
	const documentation = currentDir.split(path.sep).slice(1).join(" ");

	files.forEach((file) => {
		const filePath = path.join(currentDir, file);
		const stats = fs.statSync(filePath);

		if (stats.isDirectory()) {
			traverseDirectories(filePath, snippets);
		} else if (stats.isFile() && path.extname(file) === ".html") {
			const label = path.basename(file, ".html");
			const htmlContent = fs.readFileSync(filePath, "utf-8");
			const root = htmlParser.parse(htmlContent);

			const insertText = root.toString();

			snippets.push({
				label,
				documentation,
				insertText,
			});
		}
	});
}

const snippets = [];
traverseDirectories(rootDir, snippets);

(async () => {
	const promises = snippets.map((snippet) => {
		return db.createDocument("snippets", {
			label: snippet.label,
			documentation: snippet.documentation,
			insertText: snippet.insertText,
		});
	});

	await Promise.all(promises);
	console.log("Snippets seeded successfully");
	process.exit(0);
})();
