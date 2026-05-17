"use client";

import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTag,
  faBug,
  faGlobe,
  faScroll,
  faKeyboard,
  faShield,
  faChevronDown,
  faChevronUp,
  faArrowUpRightFromSquare,
  faComment,
} from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import * as Sentry from "@sentry/nextjs";
import clsx from "clsx";

const GITHUB_REPO = "https://github.com/kochie/touch-type";
const WEBSITE = "https://touch-typer.kochie.io";
const ISSUES_URL = `${GITHUB_REPO}/issues`;
const LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.html";
const PRIVACY_URL = `${WEBSITE}/privacy`;

interface LicensePackage {
  name: string;
  version: string;
  homepage: string;
  author: string;
}

type LicenseMap = Record<string, LicensePackage[]>;

function openLink(url: string) {
  if (typeof window !== "undefined" && window.electronAPI?.openExternal) {
    window.electronAPI.openExternal(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function LinkRow({
  icon,
  label,
  description,
  href,
}: {
  icon: typeof faGithub;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openLink(href)}
      className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.07] transition-colors duration-150 text-left group"
    >
      <span className="flex items-center gap-3">
        <FontAwesomeIcon
          icon={icon}
          className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0"
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
            {label}
          </span>
          <span className="text-xs text-slate-500">{description}</span>
        </span>
      </span>
      <FontAwesomeIcon
        icon={faArrowUpRightFromSquare}
        className="w-3 h-3 text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors flex-shrink-0"
      />
    </button>
  );
}

/**
 * Row that opens the Sentry user-feedback dialog. We don't use the auto-
 * injected floating widget (autoInject:false in instrumentation.ts) — wiring
 * a single button keeps the surface contained and consistent with the other
 * About rows. attachTo registers a click handler and returns a cleanup
 * function; running cleanup on unmount stops the form from leaking listeners
 * across HMR / re-renders.
 */
function FeedbackRow() {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const feedback = Sentry.getFeedback();
    if (!feedback || !buttonRef.current) return;
    const cleanup = feedback.attachTo(buttonRef.current);
    return cleanup;
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.07] transition-colors duration-150 text-left group"
    >
      <span className="flex items-center gap-3">
        <FontAwesomeIcon
          icon={faComment}
          className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0"
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
            Send Feedback
          </span>
          <span className="text-xs text-slate-500">
            Tell us what's working — or not — with an optional screenshot
          </span>
        </span>
      </span>
    </button>
  );
}

function ThirdPartyLicenses() {
  const [licenses, setLicenses] = useState<LicenseMap | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!expanded && !licenses) {
      setLoading(true);
      try {
        const res = await fetch("/licenses.json");
        const data: LicenseMap = await res.json();
        setLicenses(data);
      } catch {
        // licenses file unavailable (e.g. dev:next without public/)
      } finally {
        setLoading(false);
      }
    }
    setExpanded((v) => !v);
  };

  const totalPackages = licenses
    ? Object.values(licenses).reduce((s, pkgs) => s + pkgs.length, 0)
    : null;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-white/[0.08] overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors duration-150"
      >
        <span className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faScroll}
            className="w-4 h-4 text-slate-400 dark:text-slate-500"
          />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
            Third-party Notices
          </span>
          {totalPackages !== null && (
            <span className="text-xs text-slate-500 bg-slate-200 dark:bg-white/[0.08] px-1.5 py-0.5 rounded-full">
              {totalPackages}
            </span>
          )}
        </span>
        <FontAwesomeIcon
          icon={expanded ? faChevronUp : faChevronDown}
          className="w-3 h-3 text-slate-400 dark:text-slate-500"
        />
      </button>

      {expanded && (
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-white/[0.05]">
          {loading && (
            <p className="px-4 py-3 text-sm text-slate-500">Loading…</p>
          )}
          {licenses &&
            Object.entries(licenses)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([lic, pkgs]) => (
                <div key={lic}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroup((g) => (g === lic ? null : lic))
                    }
                    className="flex items-center justify-between w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors duration-150"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {lic}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {pkgs.length} package{pkgs.length !== 1 ? "s" : ""}
                      </span>
                    </span>
                    <FontAwesomeIcon
                      icon={
                        expandedGroup === lic ? faChevronUp : faChevronDown
                      }
                      className="w-2.5 h-2.5 text-slate-400"
                    />
                  </button>
                  {expandedGroup === lic && (
                    <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {pkgs
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((pkg) => (
                          <li
                            key={`${pkg.name}@${pkg.version}`}
                            className="flex items-center justify-between px-4 py-1.5"
                          >
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                              {pkg.name}
                              <span className="text-slate-400 ml-1">
                                {pkg.version}
                              </span>
                            </span>
                            {pkg.homepage && (
                              <button
                                type="button"
                                onClick={() => openLink(pkg.homepage)}
                                className="text-sky-600 dark:text-sky-400 hover:underline text-xs ml-2 flex-shrink-0"
                              >
                                <FontAwesomeIcon
                                  icon={faArrowUpRightFromSquare}
                                  className="w-2.5 h-2.5"
                                />
                              </button>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ))}
        </div>
      )}
    </div>
  );
}

export function AboutSettings() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      window.electronAPI
        .getDebugInfo()
        .then((info) => setVersion(info.appVersion))
        .catch(() => {});
    }
  }, []);

  const year = Temporal.Now.plainDateISO().year;

  return (
    <div className="flex flex-col gap-6">
      {/* App identity */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
          <FontAwesomeIcon icon={faKeyboard} className="w-7 h-7 text-sky-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Touch Typer
          </h2>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
            <FontAwesomeIcon icon={faTag} className="w-3 h-3" />
            {version ? `Version ${version}` : "—"}
          </p>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <span className="text-slate-500">Copyright</span>
        <span className="text-slate-900 dark:text-slate-200">
          © {year} Robert Koch
        </span>
        <span className="text-slate-500">License</span>
        <button
          type="button"
          onClick={() => openLink(LICENSE_URL)}
          className={clsx(
            "text-left text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1.5"
          )}
        >
          <FontAwesomeIcon icon={faScroll} className="w-3 h-3" />
          GPL-3.0-or-later
        </button>
      </div>

      {/* Links */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
          Links
        </p>
        <LinkRow
          icon={faGlobe}
          label="Website"
          description="touch-typer.kochie.io"
          href={WEBSITE}
        />
        <LinkRow
          icon={faShield}
          label="Privacy Policy"
          description="How your data is handled"
          href={PRIVACY_URL}
        />
        <LinkRow
          icon={faGithub}
          label="GitHub"
          description="Source code"
          href={GITHUB_REPO}
        />
        <LinkRow
          icon={faBug}
          label="File an Issue"
          description="Report bugs or request features"
          href={ISSUES_URL}
        />
        <FeedbackRow />
      </div>

      {/* Third-party licenses */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
          Open Source
        </p>
        <ThirdPartyLicenses />
      </div>
    </div>
  );
}
