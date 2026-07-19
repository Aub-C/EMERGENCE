const fields = ['generation', 'identity', 'commit', 'axiom'];

try {
  const response = await fetch('/api/state');
  if (!response.ok) throw new Error(`state request failed: ${response.status}`);
  const state = await response.json();

  for (const field of fields) {
    const node = document.getElementById(field);
    if (node && state[field] !== undefined) node.textContent = String(state[field]);
  }
} catch (error) {
  console.error(error);
  document.querySelector('.invitation').textContent = 'The organism is alive, but it cannot describe itself.';
}
