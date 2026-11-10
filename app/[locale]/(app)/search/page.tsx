import { V2SearchResults } from '@/components/v2/settings/search-results';
import { V2Topbar } from '@/components/v2/shell/topbar';

export default function V2SearchResultsPage() {
  return (
    <>
      <V2Topbar breadcrumb="Arama" title="Arama sonuçları" subtitle="Tüm modüllerde ara" />
      <div className="content">
        <V2SearchResults />
      </div>
    </>
  );
}
