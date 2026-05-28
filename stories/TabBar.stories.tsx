import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import { appStore } from '../app/src/application/store';
import type { SessionRecord } from '../app/src/domain/shared/types';
import { TabBarView } from '../app/src/ui/components/TabBar';
import tabBarSpec from '../specs/ui/components/TabBar.spec.md?raw';

const meta = {
  title: 'Components/TabBar',
  component: TabBarView,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: tabBarSpec,
      },
    },
  },
  render: () => {
    appStore.activeRoute.value = '/';
    appStore.sessions.value = [{} as SessionRecord];
    const route = fn();

    return (
      <div class="bg-[color:var(--canvas)] p-4">
        <TabBarView route={route} />
      </div>
    );
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const PrimaryNavigation: Story = {
  play: async ({ canvas, canvasElement }) => {
    const buttonLabels = Array.from(canvasElement.querySelectorAll('button')).map((button) => button.textContent?.trim());

    await expect(buttonLabels.filter((label) => label === 'Home')).toHaveLength(2);
    await expect(buttonLabels.filter((label) => label === 'Trends')).toHaveLength(2);
    await expect(buttonLabels.filter((label) => label === 'Settings')).toHaveLength(2);
    await expect(buttonLabels).not.toContain('History');
    await expect(canvas.queryByRole('button', { name: 'History' })).not.toBeInTheDocument();

    const mobileNav = canvasElement.querySelectorAll('nav')[1];
    await expect(mobileNav).toHaveClass(/grid-cols-3/);

    await userEvent.click(canvas.getAllByRole('button', { name: 'Settings' })[0]);
    await expect(appStore.activeRoute.value).toBe('/settings');
  },
};
