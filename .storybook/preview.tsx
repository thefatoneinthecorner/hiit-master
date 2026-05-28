import type { Preview } from '@storybook/preact-vite';

const preview: Preview = {
  decorators: [
    (Story) => {
      const makePageScrollable = (element: HTMLElement | null) => {
        if (!element) {
          return;
        }

        element.style.setProperty('box-sizing', 'border-box', 'important');
        element.style.setProperty('min-height', '100%', 'important');
        element.style.setProperty('height', 'auto', 'important');
        element.style.setProperty('max-height', 'none', 'important');
        element.style.setProperty('overflow-x', 'hidden', 'important');
        element.style.setProperty('overflow-y', 'visible', 'important');
      };

      document.documentElement.style.setProperty('min-height', '100%', 'important');
      document.documentElement.style.setProperty('height', 'auto', 'important');
      document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
      document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
      document.body.style.setProperty('min-height', '100%', 'important');
      document.body.style.setProperty('height', 'auto', 'important');
      document.body.style.setProperty('overflow-x', 'hidden', 'important');
      document.body.style.setProperty('overflow-y', 'auto', 'important');
      makePageScrollable(document.getElementById('storybook-root'));
      makePageScrollable(document.getElementById('storybook-docs'));

      const docsRoot = document.getElementById('storybook-docs');
      if (docsRoot) {
        docsRoot.style.setProperty('min-height', '0', 'important');
        docsRoot.style.setProperty('height', '100vh', 'important');
        docsRoot.style.setProperty('overflow-y', 'auto', 'important');
        docsRoot.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
      }

      return <Story />;
    }
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;
