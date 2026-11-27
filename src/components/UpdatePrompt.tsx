import { useApp } from '../app/context';

/** A new version is waiting. Updating reloads the page, so unsaved paint gets a chance to be saved first. */
export function UpdatePrompt() {
  const { updates } = useApp();
  const step = updates.step.value;
  return <>
    <div class="panel update-prompt" hidden={step !== 'available'} role="dialog" aria-label="App update">
      <p>A new version is available.</p>
      <div class="row">
        <button class="on" onClick={() => updates.update()}><span>Update</span></button>
        <button onClick={() => updates.later()}><span>Not now</span></button>
      </div>
    </div>
    <div class="panel update-prompt" hidden={step !== 'unsaved'} role="dialog" aria-label="Unsaved painting">
      <p>Updating reloads the app and discards your current painting. Save it first?</p>
      <div class="row">
        <button class="on" onClick={() => void updates.saveAndUpdate()}><span>Save, then update</span></button>
        <button class="danger" onClick={() => updates.updateWithoutSaving()}><span>Update without saving</span></button>
        <button onClick={() => updates.later()}><span>Not now</span></button>
      </div>
    </div>
  </>;
}
