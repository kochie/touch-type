import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";

interface PageHeaderProps {
  icon: IconDefinition;
  title: string;
  subtitle: string;
  iconBg: string;
  iconColor: string;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
}

export default function PageHeader({
  icon,
  title,
  subtitle,
  iconBg,
  iconColor,
  headerRight,
  children,
}: PageHeaderProps) {
  return (
    <div className="px-6 pt-6 pb-4">
      <div className="flex items-start gap-4 mb-4">
        <div
          className={clsx(
            "w-13 h-13 rounded-2xl flex items-center justify-center flex-shrink-0",
            iconBg
          )}
        >
          <FontAwesomeIcon icon={icon} className={clsx("w-6 h-6", iconColor)} />
        </div>
        <div className="flex-1 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          </div>
          {headerRight && (
            <div className="flex items-center">{headerRight}</div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
