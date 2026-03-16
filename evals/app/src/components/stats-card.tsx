interface StatsCardProps {
  label: string;
  value: string | number;
}

export const StatsCard = ({ label, value }: StatsCardProps) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <p className="text-sm font-medium text-gray-500">{label}</p>
    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
  </div>
);
