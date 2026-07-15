import { PageHeader, Empty } from "@/components/shared";

export default function Page() {
  return (
    <>
      <PageHeader title="Rokovi" />
      <div className="flex flex-1 items-center justify-center">
        <Empty>Rokovi — u izradi (sljedeći korak)</Empty>
      </div>
    </>
  );
}
