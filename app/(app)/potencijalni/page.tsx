import { PageHeader, Empty } from "@/components/shared";

export default function Page() {
  return (
    <>
      <PageHeader title="Potencijalni klijenti" />
      <div className="flex flex-1 items-center justify-center">
        <Empty>Potencijalni klijenti — u izradi (sljedeći korak)</Empty>
      </div>
    </>
  );
}
