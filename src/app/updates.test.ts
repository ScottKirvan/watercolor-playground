import { describe, expect, it, vi } from 'vitest';
import { UpdateStore } from './updates';

function setup({ unsaved = false, saved = true } = {}) {
  const state = { unsaved, saved };
  const save = vi.fn(async () => state.saved);
  const apply = vi.fn();
  const updates = new UpdateStore({ hasUnsavedWork: () => state.unsaved, save });
  return { state, save, apply, updates };
}

describe('UpdateStore', () => {
  it('given no waiting update, when the user chooses Update, then nothing happens', () => {
    const { updates, apply } = setup();
    updates.update();
    expect(updates.step.value).toBe('idle');
    expect(apply).not.toHaveBeenCalled();
  });

  it('given a waiting update, when it is found, then the notice is shown', () => {
    const { updates, apply } = setup();
    updates.found(apply);
    expect(updates.step.value).toBe('available');
    expect(apply).not.toHaveBeenCalled();
  });

  it('given a notice and nothing painted, when the user chooses Update, then the update is applied without asking to save', () => {
    const { updates, apply, save } = setup({ unsaved: false });
    updates.found(apply);
    updates.update();
    expect(apply).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
  });

  it('given a notice and unsaved work, when the user chooses Update, then it asks about saving and does not apply yet', () => {
    const { updates, apply } = setup({ unsaved: true });
    updates.found(apply);
    updates.update();
    expect(updates.step.value).toBe('unsaved');
    expect(apply).not.toHaveBeenCalled();
  });

  it('given work painted after the notice appeared, when the user chooses Update, then it still asks about saving', () => {
    const { updates, apply, state } = setup({ unsaved: false });
    updates.found(apply);
    state.unsaved = true;
    updates.update();
    expect(updates.step.value).toBe('unsaved');
  });

  it('given the save question, when the save succeeds, then the update is applied', async () => {
    const { updates, apply, save } = setup({ unsaved: true, saved: true });
    updates.found(apply);
    updates.update();
    await updates.saveAndUpdate();
    expect(save).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledOnce();
  });

  it('given the save question, when the save fails, then the update is not applied and the question stays', async () => {
    const { updates, apply } = setup({ unsaved: true, saved: false });
    updates.found(apply);
    updates.update();
    await updates.saveAndUpdate();
    expect(apply).not.toHaveBeenCalled();
    expect(updates.step.value).toBe('unsaved');
  });

  it('given the save question, when the user chooses to update without saving, then the update is applied and nothing is saved', () => {
    const { updates, apply, save } = setup({ unsaved: true });
    updates.found(apply);
    updates.update();
    updates.updateWithoutSaving();
    expect(apply).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
  });

  it.each(['available', 'unsaved'] as const)('given the %s dialog, when the user chooses Not now, then it closes and nothing is applied', step => {
    const { updates, apply } = setup({ unsaved: step === 'unsaved' });
    updates.found(apply);
    if (step === 'unsaved') updates.update();
    updates.later();
    expect(updates.step.value).toBe('idle');
    expect(apply).not.toHaveBeenCalled();
  });
});
