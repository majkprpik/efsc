import { PageHeader, Empty } from "@/components/shared";

export default function Page() {
  return (
    <>
      <PageHeader title="Financije" />
      <div className="flex flex-1 items-center justify-center">
        <Empty>Financije — u izradi (sljedeći korak)</Empty>
      </div>
    </>
  );
}
