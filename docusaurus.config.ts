import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'ASC 606 Revenue Recognition Hub',
  tagline: 'Self-paced training and interactive tools for accountants',
  favicon: 'img/favicon.ico',

  url: 'https://asc606-training.vercel.app',
  baseUrl: '/',

  organizationName: 'bashiraziz',
  projectName: 'asc606-training',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'ASC 606 Hub',
      logo: {
        alt: 'ASC 606 Hub',
        src: 'img/logo.svg',
      },
      items: [
        {to: '/docs/intro', label: 'Get started', position: 'left'},
        {to: '/docs/manual/introduction', label: 'Training manual', position: 'left'},
        {to: '/docs/tools/worksheet', label: 'Worksheet', position: 'left'},
        {to: '/docs/tools/close-tracker', label: 'Close tracker', position: 'left'},
        {to: '/docs/examples/compliant-examples', label: 'Examples', position: 'left'},
        {
          href: 'https://github.com/bashiraziz/asc606-training',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Training',
          items: [
            {label: 'Introduction', to: '/docs/intro'},
            {label: 'Five-step model', to: '/docs/manual/five-step-overview'},
            {label: 'Case studies', to: '/docs/manual/case-studies'},
          ],
        },
        {
          title: 'Tools',
          items: [
            {label: 'ASC 606 worksheet', to: '/docs/tools/worksheet'},
            {label: 'Month-end close tracker', to: '/docs/tools/close-tracker'},
          ],
        },
        {
          title: 'Examples',
          items: [
            {label: 'Compliant scenarios', to: '/docs/examples/compliant-examples'},
            {label: 'Non-compliant scenarios', to: '/docs/examples/non-compliant-examples'},
          ],
        },
      ],
      copyright: `Built with Docusaurus · ASC 606 / FASB · Not a substitute for professional accounting advice`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
