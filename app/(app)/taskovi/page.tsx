import { PageHeader, Empty } from "@/components/shared";

export default function Page() {
  return (
    <>
      <PageHeader title="Taskovi" />
      <div className="flex flex-1 items-center justify-center">
        <Empty>Taskovi — u izradi (sljedeći korak)</Empty>
      </div>
    </>
  );
}
