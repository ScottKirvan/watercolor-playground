import { signal } from '@preact/signals';

export type UpdateStep = 'idle' | 'available' | 'unsaved';

interface UpdateDeps {
  hasUnsavedWork(): boolean;
  /** Resolves true once the project file has been produced. */
  save(): Promise<boolean>;
}

/** A new version waiting to take over: tells the person, and saves their painting first if they want, because the update reloads the page. */
export class UpdateStore {
  readonly step = signal<UpdateStep>('idle');
  private apply: (() => void) | null = null;

  constructor(private deps: UpdateDeps) {}

  found(apply: () => void) {
    this.apply = apply;
    this.step.value = 'available';
  }

  update() {
    if (!this.apply) return;
    if (this.deps.hasUnsavedWork()) this.step.value = 'unsaved';
    else this.run();
  }

  async saveAndUpdate() {
    if (await this.deps.save()) this.run();
  }

  updateWithoutSaving() { this.run(); }

  later() { this.step.value = 'idle'; }

  private run() {
    this.step.value = 'idle';
    this.apply?.();
  }
}
