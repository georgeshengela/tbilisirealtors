import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import PropertyCard from '../../components/PropertyCard';
import { EmptyState, PageTitle, Spinner, btnBlue } from '../../components/account/ui';
import { useProperties } from '../../hooks/usePublicData';
import { useFavorites } from '../../lib/favorites';
import { useTranslation } from '../../i18n/LocaleContext';
import { listingsHref } from '../../lib/seoListingsUrl';

export default function AccountFavoritesPage() {
  const { t } = useTranslation();
  const tx = (key: string, vars?: Record<string, string | number>) => t(`account.favorites.${key}`, vars);
  const { ids } = useFavorites();
  const { data, loading } = useProperties();

  const saved = useMemo(() => {
    const byId = new Map(data.map(p => [p.id, p]));
    return [...ids].reverse().map(id => byId.get(id)).filter(Boolean) as typeof data;
  }, [data, ids]);

  // Saved listings that were sold, archived or unpublished since.
  const hidden = loading ? 0 : ids.length - saved.length;

  return (
    <div>
      <PageTitle title={tx('title')} subtitle={tx('subtitle')} />

      {loading ? <Spinner /> : saved.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={tx('emptyTitle')}
          text={tx('emptyText')}
          action={<Link to={listingsHref()} className={btnBlue}>{t('account.overview.browse')}</Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-5">
            {saved.map(property => <PropertyCard key={property.id} property={property} />)}
          </div>
          {hidden > 0 && <p className="mt-6 text-center text-xs text-slate-400">{tx('unavailable', { count: hidden })}</p>}
        </>
      )}
    </div>
  );
}
