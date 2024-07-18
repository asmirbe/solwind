import { window, commands, extensions, ProgressLocation, MessageItem } from "vscode";

/**
 * Shows a message that auto closes after a certain timeout. Since there's no API for this functionality the
 * progress output is used instead, which auto closes at 100%.
 * This means the function cannot (and should not) be used for warnings or errors. These types of message require
 * the user to really take note.
 *
 * @param message The message to show.
 * @param timeout The time in milliseconds after which the message should close (default 3secs).
 */
export const showMessageWithTimeout = (message: string, timeout = 3000): void => {
	void window.withProgress(
		{
			location: ProgressLocation.Notification,
			title: message,
			cancellable: false,
		},

		async (progress): Promise<void> => {
			await waitFor(timeout, () => { return false; });
			progress.report({ increment: 100 });
		},
	);
};

export async function showErrorMessageWithTimeout(message: string, timeout: number = 3000): Promise<void> {
	const promise = window.showErrorMessage(message);

	const timeoutPromise = new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve();
		}, timeout);
	});

	await Promise.race([promise, timeoutPromise]);
}

/**
 * Waits for a condition to become true.
 *
 * @param timeout The number of milliseconds to wait for the condition.
 * @param condition A function that checks if a condition has become true.
 *
 * @returns A promise that resolves to true, if the condition became true within the timeout range, otherwise false.
 */
export const waitFor = async (timeout: number, condition: () => boolean): Promise<boolean> => {
	while (!condition() && timeout > 0) {
		timeout -= 100;
		await sleep(100);
	}

	return timeout > 0 ? true : false;
};

/**
 * A helper function to asynchronously wait for a specific time. The call allows to run other JS code
 * while waiting for the timeout.
 *
 * @param ms The duration in milliseconds to wait.
 *
 * @returns A promise to wait for.
 */
export const sleep = (ms: number): Promise<unknown> => {
	return new Promise((resolve) => {
		return setTimeout(resolve, ms);
	});
};