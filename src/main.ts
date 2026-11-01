import './style.css';
import { App } from './ui/app';

const root = document.getElementById('app')!;
const app = new App(root);
// Exposed for debugging and automated browser tests.
(window as unknown as { wealthPath: App }).wealthPath = app;
