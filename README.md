# Charm ID Camera App

Mobile-first app concept for identifying physical charms from smartphone camera images and showing their management numbers.

## Commands

```bash
npm install
npm run dev
npm run build
```

## Product Direction

The app should support two main workflows:

- Register a charm by entering a management number and capturing six fixed angles: front, back, right side, left side, top side, and bottom side.
- Identify a charm by taking one or more angle-specific camera photos and matching them against the registered charm dataset.

See [docs/product-requirements.md](docs/product-requirements.md) for the current requirements draft.

## Codex Cloud

Use this repository from Codex Cloud, then ask Codex to continue development from the GitHub repo instead of the local Mac workspace.

Suggested first prompt:

```text
Use this repository to build the Charm ID Camera App.

Read docs/product-requirements.md first. Then implement the first MVP UI:

1. Replace the current landing page with a mobile-first app shell.
2. Add Register, Identify, and Library views.
3. Implement management number input and six-direction capture UI.
4. Add a mock charm dataset and a placeholder multi-angle matching result flow.
5. Keep the matching layer isolated so it can later be replaced with real image similarity, model inference, or optional 3D reconstruction.

Run npm run build before finishing and summarize the changed files.
```
