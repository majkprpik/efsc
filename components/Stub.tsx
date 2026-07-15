import { Topbar } from "@/components/ui";

export function Stub({ title }: { title: string }) {
  return (
    <>
      <Topbar title={title} />
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-t3">
        <i className="ti ti-tools text-4xl opacity-20" />
        <div className="text-[13px]">{title} — u izradi (sljedeći korak)</div>
      </div>
    </>
  );
}
