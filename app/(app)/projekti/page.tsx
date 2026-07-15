import { PageHeader, Empty } from "@/components/shared";

export default function Page() {
  return (
    <>
      <PageHeader title="Projekti" />
      <div className="flex flex-1 items-center justify-center">
        <Empty>Projekti — u izradi (sljedeći korak)</Empty>
      </div>
    </>
  );
}
