/** A country's code marker and name, e.g. "[IN] India" (table cells). */
export function CountryLabel({ code, name }: { code: string; name: string }) {
  return (
    <>
      <span className="mr-1.75 inline-grid h-5.75 w-6.25 place-items-center rounded-[4px] border border-line bg-surface-muted text-[10px] text-muted">
        {code}
      </span>
      {name}
    </>
  );
}
