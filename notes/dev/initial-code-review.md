# Initial high-level code review

Date: 2026-11-26

Scope: a basic review of general style and quality, to answer "is it safe to use, and can we build on it?" It is not a bug hunt. I read the structure, the build config, the project file format, the SVG import and the hand-tracking loader. I ran `npm ci`, `npm run build` and `npm audit`. I did not run the app.

## Verdict

Safe to use, and a reasonable base to build on. It is a well-built hobby-to-early-product codebase. The things holding it back are fixable and none are structural.

## What it is

A client-side watercolour painting app: about 10k lines of TypeScript, using Preact, `@preact/signals` and Vite, with a custom WebGL engine and no backend. Pigment mixing uses spectral data instead of RGB. It has text and shape tools, fill, reference images, a `.wcp` project format and webcam hand-tracking. MIT licensed, with a third-party notices file. It deploys to GitHub Pages.

## What's good

- **Clean, sensible layout.** Folders split by feature (`engine/`, `draw/`, `text/`, `shapes/`, `fill/`, `export/`, `hand/`, `project/`, `components/`, `ui/`). Stores are separate from components. The WebGL engine does not depend on the UI.
- **Strict TypeScript.** `strict`, `noUnusedLocals` and `noUnusedParameters` are on. No `any`, `@ts-ignore` or TODO/FIXME markers found. The build passes cleanly.
- **Small dependency list.** Seven direct dependencies. The 3 MB HEIC decoder and the hand-tracking code are split into lazily loaded chunks.
- **Careful file parsing.** The `.wcp` reader checks the magic bytes, the version, every length against the file size and the decompressed sizes, and gives readable error messages. Corrupt or hostile files should fail safely.
- **Defensive browser APIs.** `localStorage` access is wrapped in try/catch, and the code checks whether `CompressionStream` exists.
- **Good comments and docs.** Comments explain why, not just what. The README is unusually good. LICENSE and notices are in order.
- **Low attack surface.** No `eval`, `innerHTML` or `dangerouslySetInnerHTML`. Nothing is sent to a server.

## Concerns, roughly by priority

1. **No tests and no CI check.** The only workflow deploys on push to `main` and runs the build. There is no typecheck gate on pull requests and no test step. This is the biggest risk for a numerics-heavy engine. Candidates for first unit tests: `project/format`, `engine/spectral`, `engine/half`, `engine/history`, `fill/region`, `text/layout`.
2. **`src/engine/Engine.ts` is 1,877 lines.** The one real maintainability problem. It holds the simulation, history hooks, document serialisation and more in one class. Splitting out serialisation, fill and reference handling would help.
3. **Vite dev-server vulnerability.** `npm audit` reports 1 high-severity issue, through vite and `launch-editor`. Dev server only, not the deployed site. `npm audit fix` should resolve it. `server.host: true` exposes the dev server to the LAN.
4. **Hand-tracking depends on third-party CDNs.** `src/hand/tracker.ts` loads the WASM from jsDelivr and the model from Google Cloud Storage. The WASM version is pinned. The model URL uses `latest` and there is no integrity check. Only matters when hand mode is on. Self-hosting is described in a code comment.
5. **Unusual dependency versions.** `typescript ^7`, `vite ^8` and `preact ^11` are newer than expected. The build works with them. Confirm they are intended and consider pinning for stable CI.
6. **Minor.**
   - `public/fonts` holds about 60 SVG fonts from several sources with different licences. OFL files are included. Check `THIRD_PARTY_NOTICES.md` covers every family before redistributing.
   - No linter or formatter config.
   - A few vague commit messages in the history ("working", "history").

## Upstream status

The upstream repo (`msurguy/watercolor-playground`) has four PRs in total, all closed and all opened by the owner. There are no open PRs. This fork has none. Issues and unmerged upstream branches were not checked.

## Suggested groundwork before adding features

- Add a CI workflow that runs the typecheck and build on pull requests.
- Add tests for the pure modules.
- Run `npm audit fix`.
- Plan to split `Engine.ts` before adding more to it.
