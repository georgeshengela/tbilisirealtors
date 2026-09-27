import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import type { LocationCounts } from '../lib/locationCounts';
import type { Property } from '../types/listing';
import HomeSearch from './HomeSearch';

export type HomeHeroStats = { listings: number; projects: number; districts: number };

export default function HomeHero({
  stats = null,
  properties,
  loading,
  locationCounts,
}: {
  stats?: HomeHeroStats | null;
  properties: Property[];
  loading: boolean;
  locationCounts?: LocationCounts;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const heroTagParts = String(t('home.heroTagline'))
    .split('. ')
    .map(part => part.replace(/\.$/, '').trim())
    .filter(Boolean);

  return (
    <section className="home-hero page-under-header">
      <div className="container-xl">
        <div className="home-hero__stage">
          <div className="home-hero__media">
            <div className="home-hero__photo-clip">
              <img className="home-hero__photo" src="/5e6a55c3201bd.jpg" alt="" fetchPriority="high" decoding="async" />
              <div className="home-hero__veil" />
              <div className="home-hero__copy">
                <div className="home-hero__mast">
                  <h1 className="home-hero__title">
                    {t('home.heroTitle')}
                    <span className="home-hero__line">{t('home.heroTitleAccent')}</span>
                  </h1>
                  <p className="home-hero__tagline">
                    {heroTagParts.map((part, i) => (
                      <Fragment key={part}>
                        {i > 0 && <span className="home-hero__tag-sep" aria-hidden="true" />}
                        <span>{part}</span>
                      </Fragment>
                    ))}
                  </p>
                </div>
                {stats && stats.listings > 0 && (
                  <motion.dl
                    className="home-hero__stats"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {([
                      ['listings', stats.listings],
                      ['projects', stats.projects],
                      ['districts', stats.districts],
                    ] as const).filter(([, n]) => n > 0).map(([key, n]) => (
                      <div key={key} className="home-hero__stat">
                        <dt>{t(`home.heroStats.${key}`)}</dt>
                        <dd>{n.toLocaleString(locale === 'ka' ? 'ka-GE' : 'en-US')}</dd>
                      </div>
                    ))}
                  </motion.dl>
                )}
              </div>
            </div>

            <div className="home-hero__search-wrap">
              <HomeSearch
                properties={properties}
                loading={loading}
                locationCounts={locationCounts}
                projectsCount={stats?.projects ?? 0}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
