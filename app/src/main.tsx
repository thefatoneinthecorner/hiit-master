import { render } from 'preact';
import { App } from './app/App';
import './styles.css';

const container = document.getElementById('app');

if (!container) {
  throw new Error('App root container not found');
}

render(<App />, container);
