import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Training manual',
      collapsed: false,
      items: [
        'manual/introduction',
        'manual/five-step-overview',
        'manual/step1-contract',
        'manual/step2-obligations',
        'manual/step3-price',
        'manual/step4-allocate',
        'manual/step5-recognize',
        'manual/other-topics',
        'manual/disclosures',
        'manual/case-studies',
      ],
    },
    {
      type: 'category',
      label: 'Interactive tools',
      items: ['tools/worksheet', 'tools/close-tracker'],
    },
    {
      type: 'category',
      label: 'Compliance examples',
      items: ['examples/compliant-examples', 'examples/non-compliant-examples'],
    },
  ],
};

export default sidebars;
