import './pane.css';
import markup from './dashboard.html?raw';

document.getElementById('app').innerHTML = markup;
await import('./dashboard.js');
