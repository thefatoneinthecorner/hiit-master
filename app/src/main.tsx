import { render } from 'preact';
import { App } from './app/App';
import './styles.css';

const rootElement = document.getElementById('app');

if (rootElement === null) {
  throw new Error('App root element not found');
}

render(<App />, rootElement);
