import type { Preview } from '@storybook/preact-vite';

const preview: Preview = {
  decorators: [
    (Story) => {
      document.documentElement.style.height = 'auto';
      document.documentElement.style.minHeight = '100%';
      document.documentElement.style.overflowY = 'auto';
      document.body.style.height = 'auto';
      document.body.style.minHeight = '100%';
      document.body.style.overflowY = 'auto';
      document.body.style.overflowX = 'hidden';

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
