"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label = "Печать" }) {
  return <button className="btn-outline !py-2.5 print:hidden" onClick={() => window.print()}><Printer size={16} /> {label}</button>;
}
