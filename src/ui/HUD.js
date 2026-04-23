export class HUD {
  constructor(container) {
    this.container = container;
  }

  update(world, herbAgent, predAgent) {
    const herbs = world.creatures.filter(c => c.type === 'herbivore' && c.alive).length;
    const preds = world.creatures.filter(c => c.type === 'predator' && c.alive).length;

    this.container.innerHTML = `
      <div class="stat">🌿 Herbivores: <strong>${herbs}</strong></div>
      <div class="stat">🦊 Predators: <strong>${preds}</strong></div>
      <div class="stat">Herb ε: <strong>${herbAgent ? herbAgent.epsilon.toFixed(3) : '—'}</strong></div>
      <div class="stat">Pred ε: <strong>${predAgent ? predAgent.epsilon.toFixed(3) : '—'}</strong></div>
      <div class="stat">Herb Loss: <strong>${herbAgent ? (herbAgent.lastLoss || 0).toFixed(4) : '—'}</strong></div>
      <div class="stat">Pred Loss: <strong>${predAgent ? (predAgent.lastLoss || 0).toFixed(4) : '—'}</strong></div>
      <div class="stat">Herb Buffer: <strong>${herbAgent ? herbAgent.buffer.size : '—'}</strong></div>
      <div class="stat">Pred Buffer: <strong>${predAgent ? predAgent.buffer.size : '—'}</strong></div>
    `;
  }
}
