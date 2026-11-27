import { registerSW } from 'virtual:pwa-register';
import type { UpdateStore } from './updates';

export function watchForUpdates(updates: UpdateStore) {
  const reloadWithNewVersion = registerSW({ onNeedRefresh: () => updates.found(() => void reloadWithNewVersion(true)) });
}
