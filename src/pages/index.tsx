import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';

function Hero() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <h1 className={styles.heroTitle}>ASC 606 Revenue Recognition Hub</h1>
        <p className={styles.heroSubtitle}>
          Self-paced training, interactive tools, and compliance examples for accountants
        </p>
        <div className={styles.heroCtas}>
          <Link className={styles.ctaPrimary} to="/docs/intro">
            Start training →
          </Link>
          <Link className={styles.ctaSecondary} to="/docs/tools/worksheet">
            Open worksheet →
          </Link>
        </div>
      </div>
    </header>
  );
}

const FEATURES = [
  {
    title: 'Training manual',
    icon: '📚',
    description:
      '10-module course covering the five-step model, disclosures, and practical expedients — with worked examples and knowledge checks.',
    link: '/docs/manual/introduction',
    linkLabel: 'Start module 1',
  },
  {
    title: 'Interactive worksheet',
    icon: '📋',
    description:
      'Step-by-step contract analysis with auto-calculations. Five-step model guided form — complete one worksheet per contract at inception.',
    link: '/docs/tools/worksheet',
    linkLabel: 'Open worksheet',
  },
  {
    title: 'Month-end close tracker',
    icon: '📊',
    description:
      'Subledger, journal entries, accruals, reconciliation, and close checklist. All calculations run in the browser.',
    link: '/docs/tools/close-tracker',
    linkLabel: 'Open tracker',
  },
];

function FeatureCard({title, icon, description, link, linkLabel}: (typeof FEATURES)[0]) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDesc}>{description}</p>
      <Link className={styles.featureLink} to={link}>
        {linkLabel} →
      </Link>
    </div>
  );
}

function ComplianceCallout() {
  return (
    <div className={styles.callout}>
      <p>
        <strong>Built to ASC 606 / FASB — Revenue from Contracts with Customers.</strong>
        {' '}Effective for periods beginning after December 15, 2017.
      </p>
    </div>
  );
}

export default function Home(): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Hero />
      <main>
        <section className={styles.featuresSection}>
          <div className={styles.featuresGrid}>
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>
        <ComplianceCallout />
      </main>
    </Layout>
  );
}
