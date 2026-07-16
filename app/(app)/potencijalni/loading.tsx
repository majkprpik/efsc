import { PageHeader, Loading } from "@/components/shared";
import { getT } from "@/lib/i18n/server";

export default async function LoadingPage() {
  const t = await getT();
  return (
    <>
      <PageHeader section="potencijalni" title={t.nav.potencijalni} />
      <Loading label={t.common.ucitavanje} />
    </>
  );
}
