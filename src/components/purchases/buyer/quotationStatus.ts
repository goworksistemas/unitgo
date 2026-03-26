import type { QuotationStatus } from "@/types/purchases";

export function quotationStatusLabel(s: QuotationStatus): string {
  const m: Record<QuotationStatus, string> = {
    draft: "Rascunho",
    sent: "Enviada",
    responded: "Respondida",
    approved: "Aprovada",
    rejected: "Rejeitada",
  };
  return m[s] ?? s;
}

export function quotationStatusBadgeClass(s: QuotationStatus): string {
  switch (s) {
    case "approved":
      return "bg-emerald-600 text-white border-transparent";
    case "rejected":
      return "bg-red-600 text-white border-transparent";
    case "sent":
    case "responded":
      return "bg-amber-100 text-amber-900 border-amber-300";
    default:
      return "bg-slate-200 text-slate-800";
  }
}
