import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    return {
      ...config,
      plugins: filterPlugins(config.plugins ?? []) as typeof config.plugins,
    };
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;

function pluginName(plugin: unknown): string {
  if (
    (typeof plugin !== 'object' || plugin === null) &&
    typeof plugin !== 'function'
  ) {
    return '';
  }
  const name: unknown = Reflect.get(plugin, 'name');
  return typeof name === 'string' ? name.toLowerCase() : '';
}

function filterPlugins(plugins: unknown[]): unknown[] {
  return plugins.flatMap((plugin) => {
    if (Array.isArray(plugin)) return filterPlugins(plugin);
    return pluginName(plugin).includes('vite-plugin-pwa') ? [] : [plugin];
  });
}
