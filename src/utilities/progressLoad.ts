import { window, ProgressLocation } from "vscode";

export function progressLoad() {
	window.withProgress({
		location: ProgressLocation.Window,
		cancellable: false,
		title: 'Loading customers'
	}, async (progress) => {

		progress.report({ increment: 0 });

		await Promise.resolve();

		progress.report({ increment: 100 });
	});
}