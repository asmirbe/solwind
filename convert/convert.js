/* eslint-disable */
const fs = require("fs");
const path = require("path");
const htmlParser = require("node-html-parser");
const fetch = require("node-fetch");

const rootDir = "components";
const outputFile = "./snippets.json";
const apiUrl = "http://localhost:11434/api/generate";

async function addPrefix(label) {
	const prefix = "tw-";
	const words = label.split("-");
	const response = await fetch(apiUrl, {
					method: "POST",
					headers: {
									"Content-Type": "application/json",
					},
					body: JSON.stringify({
									model: "llama3",
									stream: false,
									format: "json",
									prompt: `Provide a short and concise label for the following component name: "${words.join(" ").replace(/_/g, " ")}". The label should be easy to read and not too long, using only lowercase letters. Respond using this JSON key name "label".`,
					}),
	});

	if (!response.ok) {
					throw new Error(`API request failed with status ${response.status}`);
	}

	const data = await response.json();
	if (!data || !data.response) {
					throw new Error("Invalid API response format");
	}

	const responseJson = JSON.parse(data.response);
	console.log(responseJson);
	const generatedLabel = responseJson.label;
	return prefix + generatedLabel.toLowerCase().replace(/\s+/g, "-");
}

async function traverseDirectories(currentDir, snippets) {
	const files = fs.readdirSync(currentDir);

	for (const file of files) {
		const filePath = path.join(currentDir, file);
		const stats = fs.statSync(filePath);

		if (stats.isDirectory()) {
			await traverseDirectories(filePath, snippets);
		} else if (stats.isFile() && path.extname(file) === ".html") {
			const startTime = Date.now();
			const label = (await addPrefix(file.replace(".html", "")))
			const labelTime = Date.now();
			console.log(`Generated label for ${file}: ${label} (${labelTime - startTime}ms)`);

			const htmlContent = fs.readFileSync(filePath, "utf-8");
			const root = htmlParser.parse(htmlContent);

			// Remove comments from the HTML
			root.querySelectorAll("*").forEach((el) => {
				if (el.nodeType === htmlParser.NodeType.COMMENT_NODE) {
					el.remove();
				}
			});

			const insertText = root.toString();

			// Generate visual description using the API
			const response = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: "llama3",
					stream: false,
					format: "json",
					prompt: `Please provide a visual description of the following HTML component:\n\n${insertText}\n\nDescribe only the visual aspects of the component without mentioning any technical details like Tailwind or HTML elements. Respond using this JSON key name "desc".`,
				}),
			});

			if (!response.ok) {
				throw new Error(`API request failed with status ${response.status}`);
			}

			const data = await response.json();
			const responseJson = JSON.parse(data.response);
			const documentation = responseJson.desc
			const documentationTime = Date.now();
			console.log(`Generated description for ${file}: ${documentation} (${documentationTime - labelTime}ms)`);

			snippets.push({
				label,
				documentation,
				insertText,
			});
		}
	}
}

async function generateSnippets() {
	const snippets = [];
	await traverseDirectories(rootDir, snippets);
	fs.writeFileSync(outputFile, JSON.stringify(snippets, null, 2));
}

generateSnippets().catch((error) => {
	console.error("An error occurred:", error);
});
