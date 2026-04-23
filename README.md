"# AI-Sim

A browser-based 2D world simulation demonstrating **client-side AI inference and training** using TensorFlow.js. Published as a GitHub Page.

## What it does

Two species of creatures live in a tile-based world rendered on Canvas 2D:
- 🌿 **Herbivores** — seek food, flock with each other, flee predators
- 🦊 **Predators** — hunt herbivores, hold territory

Each species shares a **CNN brain** (TensorFlow.js) trained in-browser via **Deep Q-Network (DQN)**. Creatures perceive a 7×7 tile grid around them and learn which actions (move up/down/left/right/stay) maximise their rewards.

## Player controls

Use the sidebar toolbar to:
- 🌱 Paint food sources
- 🟩🟦🟥 Paint terrain (grass / water / danger zones)
- Spawn or clear creature populations
- Tune the **replay buffer size** (1 = online learning, 2000 = stable mini-batch RL)
- Adjust simulation speed and exploration rate (epsilon)

## Tech stack

- [TensorFlow.js](https://www.tensorflow.org/js) — in-browser ML
- Canvas 2D — rendering
- [Vite](https://vitejs.dev/) — build & dev server
- GitHub Actions — CI/CD to GitHub Pages

## Development

```bash
npm install
npm run dev       # local dev server
npm run build     # production build → dist/
```

Push to `main` to deploy automatically to GitHub Pages." 
