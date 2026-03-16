import { useState } from "react";
import { Plan, Invoice, PLANS } from "../data.ts";
import { DataTable, type Column } from "../components/data-table.tsx";
import { useToast } from "../components/toast.tsx";
import { Modal } from "../components/modal.tsx";

interface BillingPageProps {
  currentPlan: Plan;
  currentPlanId: string;
  setCurrentPlanId: (planId: string) => void;
  invoices: Invoice[];
}

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

const getStatusBadgeClasses = (status: Invoice["status"]): string => {
  const base = "inline-flex px-2 py-1 text-xs font-medium rounded-full";
  if (status === "paid") return `${base} bg-green-100 text-green-800`;
  if (status === "pending") return `${base} bg-yellow-100 text-yellow-800`;
  return `${base} bg-red-100 text-red-800`;
};

export const BillingPage = ({
  currentPlan,
  currentPlanId,
  setCurrentPlanId,
  invoices,
}: BillingPageProps) => {
  const [planChangeTarget, setPlanChangeTarget] = useState<string | null>(null);
  const { showToast } = useToast();

  const sortedInvoices = [...invoices].sort(
    (invoiceA, invoiceB) => new Date(invoiceB.date).getTime() - new Date(invoiceA.date).getTime(),
  );

  const planToSwitch = planChangeTarget ? PLANS.find((plan) => plan.id === planChangeTarget) : null;

  const handleConfirmPlanChange = () => {
    if (!planToSwitch) return;
    setCurrentPlanId(planToSwitch.id);
    showToast(`Plan changed to ${planToSwitch.name}`);
    setPlanChangeTarget(null);
  };

  const handleUpdatePaymentMethod = () => {
    showToast("Payment method update coming soon");
  };

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: "date",
      header: "Date",
      render: (row) => formatDate(row.date),
      sortValue: (row) => new Date(row.date).getTime(),
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => `$${row.amount.toFixed(2)}`,
      sortValue: (row) => row.amount,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <span className={getStatusBadgeClasses(row.status)}>{row.status}</span>,
      sortValue: (row) => row.status,
    },
  ];

  return (
    <div className="space-y-8 p-8">
      <h1 className="text-3xl font-semibold text-gray-900">Billing</h1>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Current Plan</h2>
        <p className="text-2xl font-bold text-gray-900">{currentPlan.name}</p>
        <p className="mt-1 text-gray-600">
          {currentPlan.price === 0 ? "Free" : `$${currentPlan.price}/mo`}
        </p>
        <ul className="mt-4 space-y-2">
          {currentPlan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-600" aria-hidden>
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Plan Comparison</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isUpgrade = plan.price > currentPlan.price;
            const isDowngrade = plan.price < currentPlan.price;

            return (
              <div key={plan.id} className="rounded-xl border border-gray-200 bg-white p-6">
                <p className="text-xl font-bold text-gray-900">{plan.name}</p>
                <p className="mt-1 text-gray-600">
                  {plan.price === 0 ? "Free" : `$${plan.price}/mo`}
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-green-600" aria-hidden>
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => !isCurrent && setPlanChangeTarget(plan.id)}
                  className={`mt-6 w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isCurrent
                      ? "cursor-not-allowed bg-gray-200 text-gray-500"
                      : isUpgrade
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {isCurrent ? "Current Plan" : isUpgrade ? "Upgrade" : "Downgrade"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment Method</h2>
        <div className="flex items-center justify-between">
          <p className="text-gray-700">Visa ending in 4242</p>
          <button
            type="button"
            onClick={handleUpdatePaymentMethod}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Update
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Invoice History</h2>
        <DataTable columns={invoiceColumns} data={sortedInvoices} rowKey={(row) => row.id} />
      </section>

      <Modal
        isOpen={planChangeTarget !== null}
        onClose={() => setPlanChangeTarget(null)}
        onConfirm={handleConfirmPlanChange}
        title={planToSwitch ? `Switch to ${planToSwitch.name}?` : ""}
        confirmLabel="Switch Plan"
      >
        <p className="text-gray-600">Your billing will be updated immediately.</p>
      </Modal>
    </div>
  );
};
