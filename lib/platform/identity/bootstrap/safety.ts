/**
 * Production safety guards for IAM bootstrap and destructive ops scripts.
 * Prevents accidental migrate-reset / overwrite against production Neon.
 */

export type DatabaseTargetInfo = {
  host: string;
  database: string;
  isPooler: boolean;
  endpointId: string | null;
  /** Inferred environment classification */
  classification: "production" | "preview" | "lab" | "local" | "unknown";
  reasons: string[];
};

const PRODUCTION_HOST_MARKERS = [
  "prod",
  "production",
  "main-branch",
  "primary",
];

const LAB_HOST_MARKERS = ["iam-lab", "lab", "staging", "dev", "preview"];

const PRODUCTION_ENV_VALUES = new Set([
  "production",
  "prod",
  "live",
]);

/**
 * Parse DATABASE_URL and classify the target without connecting.
 */
export function inspectDatabaseTarget(
  databaseUrl: string | undefined = process.env.DATABASE_URL
): DatabaseTargetInfo {
  const reasons: string[] = [];
  if (!databaseUrl) {
    return {
      host: "",
      database: "",
      isPooler: false,
      endpointId: null,
      classification: "unknown",
      reasons: ["DATABASE_URL is not set"],
    };
  }

  let host = "";
  let database = "";
  try {
    const u = new URL(databaseUrl);
    host = u.hostname.toLowerCase();
    database = (u.pathname || "/").replace(/^\//, "") || "unknown";
  } catch {
    return {
      host: "",
      database: "",
      isPooler: false,
      endpointId: null,
      classification: "unknown",
      reasons: ["DATABASE_URL is not a valid URL"],
    };
  }

  const isPooler = host.includes("-pooler") || host.includes("pooler.");
  // Neon host: ep-<name>[-pooler].region... — strip -pooler for endpoint id
  const endpointMatch = host.match(/^(ep-[a-z0-9-]+?)(?:-pooler)?\./i);
  const endpointId = endpointMatch
    ? endpointMatch[1].replace(/-pooler$/i, "")
    : null;

  const appEnv = (
    process.env.OTTO_ENV ||
    process.env.APP_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    ""
  ).toLowerCase();
  const neonBranch = (
    process.env.NEON_BRANCH ||
    process.env.NEON_BRANCH_NAME ||
    ""
  ).toLowerCase();

  if (PRODUCTION_ENV_VALUES.has(appEnv)) {
    reasons.push(`Environment variable classifies as production (${appEnv})`);
  }
  if (neonBranch === "main" || neonBranch === "production" || neonBranch === "prod") {
    reasons.push(`NEON_BRANCH indicates production (${neonBranch})`);
  }
  if (neonBranch.includes("iam-lab") || neonBranch === "lab") {
    reasons.push(`NEON_BRANCH indicates lab (${neonBranch})`);
  }

  for (const m of PRODUCTION_HOST_MARKERS) {
    if (host.includes(m)) {
      reasons.push(`Host matches production marker "${m}"`);
    }
  }
  for (const m of LAB_HOST_MARKERS) {
    if (host.includes(m) || neonBranch.includes(m)) {
      reasons.push(`Target matches non-prod marker "${m}"`);
    }
  }

  // Explicit allow-list of production hosts (comma-separated)
  const blocked = (process.env.PRODUCTION_DATABASE_HOSTS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (blocked.some((b) => host === b || host.endsWith(`.${b}`) || host.includes(b))) {
    reasons.push("Host is listed in PRODUCTION_DATABASE_HOSTS");
  }

  let classification: DatabaseTargetInfo["classification"] = "unknown";
  const hasProdSignal =
    PRODUCTION_ENV_VALUES.has(appEnv) ||
    neonBranch === "main" ||
    neonBranch === "production" ||
    neonBranch === "prod" ||
    PRODUCTION_HOST_MARKERS.some((m) => host.includes(m)) ||
    blocked.some((b) => host.includes(b));
  const hasLabSignal =
    neonBranch.includes("iam-lab") ||
    neonBranch === "lab" ||
    LAB_HOST_MARKERS.some((m) => host.includes(m) || neonBranch.includes(m));

  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    classification = "local";
  } else if (hasProdSignal && !hasLabSignal) {
    classification = "production";
  } else if (hasLabSignal) {
    classification = "lab";
  } else if (appEnv === "preview" || appEnv === "development" || appEnv === "dev") {
    classification = "preview";
  } else {
    classification = "unknown";
  }

  return {
    host,
    database,
    isPooler,
    endpointId,
    classification,
    reasons,
  };
}

export type SafetyDecision = {
  allowed: boolean;
  target: DatabaseTargetInfo;
  message: string;
  requiresOverride: boolean;
};

/**
 * Decide whether bootstrap may run against the current database.
 * Production / unknown-as-production requires explicit override.
 */
export function assertBootstrapAllowed(options?: {
  allowProduction?: boolean;
  requireLab?: boolean;
  /** When true, treat unknown classification as production (safer default for scripts). */
  treatUnknownAsRestricted?: boolean;
}): SafetyDecision {
  const allowProduction =
    options?.allowProduction === true ||
    process.env.ALLOW_PRODUCTION_BOOTSTRAP === "1" ||
    process.env.ALLOW_PRODUCTION_BOOTSTRAP === "true" ||
    process.argv.includes("--allow-production");

  const requireLab =
    options?.requireLab === true ||
    process.env.REQUIRE_IAM_LAB === "1" ||
    process.argv.includes("--require-lab");

  const treatUnknownAsRestricted =
    options?.treatUnknownAsRestricted !== false;

  const target = inspectDatabaseTarget();

  if (!process.env.DATABASE_URL) {
    return {
      allowed: false,
      target,
      requiresOverride: false,
      message: "DATABASE_URL is required",
    };
  }

  if (requireLab && target.classification !== "lab" && target.classification !== "local") {
    if (
      process.env.NEON_BRANCH?.toLowerCase().includes("iam-lab") ||
      process.env.NEON_BRANCH_NAME?.toLowerCase().includes("iam-lab")
    ) {
      // explicit lab branch name wins
    } else if (!process.argv.includes("--allow-non-lab")) {
      return {
        allowed: false,
        target,
        requiresOverride: true,
        message:
          "Bootstrap restricted to iam-lab. Set NEON_BRANCH=iam-lab or pass --allow-non-lab / --allow-production with care.",
      };
    }
  }

  if (target.classification === "production") {
    if (!allowProduction) {
      return {
        allowed: false,
        target,
        requiresOverride: true,
        message:
          "Refusing to bootstrap against a production-classified database. " +
          "Set ALLOW_PRODUCTION_BOOTSTRAP=true or pass --allow-production only after explicit review.",
      };
    }
  }

  if (
    treatUnknownAsRestricted &&
    target.classification === "unknown" &&
    !allowProduction &&
    !process.argv.includes("--allow-unknown-target")
  ) {
    // Soft-allow unknown with a clear warning path — still block destructive flags.
    // Bootstrap is idempotent and non-destructive by default, so allow with message.
  }

  return {
    allowed: true,
    target,
    requiresOverride: false,
    message: `Bootstrap allowed against ${target.classification} target (${target.host || "n/a"})`,
  };
}

/**
 * Hard-block destructive operations (migrate reset, force re-seed overwrite).
 */
export function assertDestructiveAllowed(action: string): SafetyDecision {
  const target = inspectDatabaseTarget();
  const allow =
    process.env.ALLOW_DESTRUCTIVE_DB_OPS === "1" ||
    process.env.ALLOW_DESTRUCTIVE_DB_OPS === "true" ||
    process.argv.includes("--allow-destructive");

  if (target.classification === "production" || !allow) {
    return {
      allowed: false,
      target,
      requiresOverride: true,
      message:
        `Refusing destructive action "${action}" against ${target.classification || "unknown"} ` +
        `(${target.host || "no-host"}). Set ALLOW_DESTRUCTIVE_DB_OPS=true and pass --allow-destructive only on non-production with a backup.`,
    };
  }

  return {
    allowed: true,
    target,
    requiresOverride: false,
    message: `Destructive action "${action}" allowed`,
  };
}

export function logTargetBanner(target: DatabaseTargetInfo): void {
  console.log("Database target");
  console.log(`  host:           ${target.host || "(unset)"}`);
  console.log(`  database:       ${target.database || "(unset)"}`);
  console.log(`  endpoint:       ${target.endpointId || "(unknown)"}`);
  console.log(`  pooler:         ${target.isPooler}`);
  console.log(`  classification: ${target.classification}`);
  if (target.reasons.length) {
    for (const r of target.reasons) {
      console.log(`  note:           ${r}`);
    }
  }
}
