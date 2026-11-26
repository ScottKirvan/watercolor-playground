import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppStore } from '../app/store';
import { openLaunchedProjects } from './launchFiles';

type Consumer = (params: { files: { getFile(): Promise<File> }[] }) => Promise<void>;

function installLaunchQueue() {
  let consumer: Consumer | undefined;
  vi.stubGlobal('window', { launchQueue: { setConsumer: (fn: Consumer) => { consumer = fn; } } });
  return { launch: (...files: File[]) => consumer!({ files: files.map(f => ({ getFile: async () => f })) }) };
}

function fakeApp() {
  const open = vi.fn();
  return { app: { project: { open } } as unknown as AppStore, open };
}

afterEach(() => vi.unstubAllGlobals());

describe('openLaunchedProjects', () => {
  it('given an installed app, when a .wcp file is launched, then the project is opened', async () => {
    const queue = installLaunchQueue(), { app, open } = fakeApp();
    openLaunchedProjects(app);
    const file = new File(['x'], 'sunset.wcp');
    await queue.launch(file);
    expect(open).toHaveBeenCalledExactlyOnceWith(file);
  });

  it('given an upper-case extension, when the file is launched, then the project is opened', async () => {
    const queue = installLaunchQueue(), { app, open } = fakeApp();
    openLaunchedProjects(app);
    await queue.launch(new File(['x'], 'SUNSET.WCP'));
    expect(open).toHaveBeenCalledOnce();
  });

  it('given a file that is not a project, when it is launched, then nothing is opened', async () => {
    const queue = installLaunchQueue(), { app, open } = fakeApp();
    openLaunchedProjects(app);
    await queue.launch(new File(['x'], 'notes.txt'));
    expect(open).not.toHaveBeenCalled();
  });

  it('given a launch with no files, when it is delivered, then nothing is opened', async () => {
    const queue = installLaunchQueue(), { app, open } = fakeApp();
    openLaunchedProjects(app);
    await queue.launch();
    expect(open).not.toHaveBeenCalled();
  });

  it('given several files in one launch, when it is delivered, then only the first is opened', async () => {
    const queue = installLaunchQueue(), { app, open } = fakeApp();
    openLaunchedProjects(app);
    const first = new File(['x'], 'a.wcp');
    await queue.launch(first, new File(['y'], 'b.wcp'));
    expect(open).toHaveBeenCalledExactlyOnceWith(first);
  });

  it('given a browser without file handling, when the app starts, then nothing throws', () => {
    vi.stubGlobal('window', {});
    expect(() => openLaunchedProjects(fakeApp().app)).not.toThrow();
  });
});
