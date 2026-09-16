"use client";

import { usePathname } from "next/navigation";
import ContractQuickCreatePanel from "@/components/contracts/ContractQuickCreatePanel";

export default function ContractsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const match = pathname.match(/^\/contracts\/(\d+)$/);
  const contractId = match?.[1];

  return (
    <>
      {children}
      {contractId && (
        <div className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
          <ContractQuickCreatePanel contractId={contractId} />
        </div>
      )}
    </>
  );
}
