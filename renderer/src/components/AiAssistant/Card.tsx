export function Card({ header, children }: { header?: React.ReactNode; children: React.ReactNode }) {
    return (
      <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
        {header && <div className="px-4 py-5 sm:px-6">{header}</div>}
        <div className="px-4 py-5 sm:p-6">{children}</div>
      </div>
    );
  }