import type { AppStore } from '../app/store';
import { isProjectFile } from './format';

interface LaunchParams { files: { getFile(): Promise<File> }[] }
type WindowWithLaunchQueue = Window & { launchQueue?: { setConsumer(consumer: (params: LaunchParams) => void): void } };

/** Opens a project the OS launched the installed app with (double-click or "Open with"). Browsers without file handling do nothing. */
export function openLaunchedProjects(app: AppStore) {
  (window as WindowWithLaunchQueue).launchQueue?.setConsumer(async ({ files }) => {
    const handle = files[0];
    if (!handle) return;
    const file = await handle.getFile();
    if (isProjectFile(file)) void app.project.open(file);
  });
}
