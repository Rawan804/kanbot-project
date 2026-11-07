import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { PlusIcon } from './icons';

const meta = {
  title: 'Shared/Button',
  component: Button,
  args: { children: 'Create todo' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger', 'danger-ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'icon'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const WithIcon: Story = {
  args: { children: <><PlusIcon className="h-4 w-4" /> Create todo</> },
};
export const Loading: Story = { args: { loading: true, loadingText: 'Creating...' } };
