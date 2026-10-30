import './style.css';
import { Game } from './game/game.js';

window.addEventListener('DOMContentLoaded', () => {
  try {
    window.pocketSurvival = new Game();
  } catch (error) {
    console.error(error);
    const message = document.createElement('div');
    message.style.cssText = 'position:fixed;inset:0;z-index:99;display:grid;place-items:center;background:#090b0c;color:#eee7d7;font:16px sans-serif;text-align:center;padding:24px;';
    message.innerHTML = '<div><strong>Could not start the dead zone.</strong><br><br>This game needs WebGL 2. Try Chrome or Safari on a device with graphics support.</div>';
    document.body.appendChild(message);
  }
});
