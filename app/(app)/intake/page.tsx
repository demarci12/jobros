import { QuickCustomerSearch } from "@/components/crm/QuickCustomerSearch";

export default function IntakePage() {
  return (
    <div className="flex flex-col items-center gap-6 py-10 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Telefon-intake</h1>
        <p className="text-muted-foreground mt-1 text-sm">Keress ügyfelet névvel vagy telefonszámmal</p>
      </div>
      <QuickCustomerSearch />
    </div>
  );
}
