import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "customer" | "admin";
export type KycStatus = "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";
export type MatchStatus = "MATCH" | "MISMATCH" | "UNCERTAIN";

export type ComparisonField = {
  label: string;
  existing: string;
  extracted: string;
  result: MatchStatus;
};

export type DemoRequest = {
  id: string;
  customerId: string;
  name: string;
  email: string;
  status: KycStatus;
  submitted: string;
  updated: string;
  documents: string[];
  fields: ComparisonField[];
  reason?: string | undefined;
};

export type AuditEvent = {
  id: string;
  requestId: string;
  customerId: string;
  customer: string;
  admin: string;
  action: string;
  field: string;
  previous: string;
  next: string;
  reason: string;
  timestamp: string;
};

const seedRequests: DemoRequest[] = [
  {
    id: "KYC-2841",
    customerId: "CUS-1042",
    name: "Anaya Rao",
    email: "anaya.rao@example.test",
    status: "UNDER_REVIEW",
    submitted: "12 Oct 2026",
    updated: "12 Oct 2026",
    documents: ["Aadhaar", "Voter ID"],
    fields: [
      { label: "Full name", existing: "Anaya Rao", extracted: "Anaya Rao", result: "MATCH" },
      {
        label: "Date of birth",
        existing: "14 Mar 1994",
        extracted: "14 Mar 1994",
        result: "MATCH",
      },
      {
        label: "Address",
        existing: "18 Lake View Rd, Pune",
        extracted: "18 Lakeview Road, Pune",
        result: "UNCERTAIN",
      },
      {
        label: "Document number",
        existing: "XXXX XXXX 4821",
        extracted: "XXXX XXXX 4821",
        result: "MATCH",
      },
    ],
  },
  {
    id: "KYC-2838",
    customerId: "CUS-1038",
    name: "Kabir Mehta",
    email: "kabir.mehta@example.test",
    status: "UNDER_REVIEW",
    submitted: "11 Oct 2026",
    updated: "12 Oct 2026",
    documents: ["Aadhaar", "Voter ID"],
    fields: [
      {
        label: "Full name",
        existing: "Kabir Mehta",
        extracted: "Kabir R. Mehta",
        result: "MISMATCH",
      },
      {
        label: "Date of birth",
        existing: "23 Jul 1988",
        extracted: "23 Jul 1988",
        result: "MATCH",
      },
      {
        label: "Address",
        existing: "44 Palm Grove, Mumbai",
        extracted: "44 Palm Grove, Mumbai",
        result: "MATCH",
      },
      {
        label: "Document number",
        existing: "XXXX XXXX 7305",
        extracted: "XXXX XXXX 7305",
        result: "MATCH",
      },
    ],
  },
  {
    id: "KYC-2834",
    customerId: "CUS-1031",
    name: "Meera Iyer",
    email: "meera.iyer@example.test",
    status: "SUBMITTED",
    submitted: "10 Oct 2026",
    updated: "10 Oct 2026",
    documents: ["Aadhaar", "Voter ID"],
    fields: [
      { label: "Full name", existing: "Meera Iyer", extracted: "Meera Iyer", result: "MATCH" },
      { label: "Date of birth", existing: "02 Dec 1990", extracted: "—", result: "UNCERTAIN" },
      {
        label: "Address",
        existing: "9 Park Street, Chennai",
        extracted: "9 Park St, Chennai",
        result: "UNCERTAIN",
      },
      {
        label: "Document number",
        existing: "XXXX XXXX 1954",
        extracted: "XXXX XXXX 1954",
        result: "MATCH",
      },
    ],
  },
  {
    id: "KYC-2827",
    customerId: "CUS-1024",
    name: "Rohan Das",
    email: "rohan.das@example.test",
    status: "VERIFIED",
    submitted: "08 Oct 2026",
    updated: "09 Oct 2026",
    documents: ["Aadhaar", "Voter ID"],
    fields: [
      { label: "Full name", existing: "Rohan Das", extracted: "Rohan Das", result: "MATCH" },
      {
        label: "Date of birth",
        existing: "17 Jan 1992",
        extracted: "17 Jan 1992",
        result: "MATCH",
      },
      {
        label: "Address",
        existing: "71 Green Avenue, Delhi",
        extracted: "71 Green Avenue, Delhi",
        result: "MATCH",
      },
      {
        label: "Document number",
        existing: "XXXX XXXX 6410",
        extracted: "XXXX XXXX 6410",
        result: "MATCH",
      },
    ],
  },
  {
    id: "KYC-2819",
    customerId: "CUS-1016",
    name: "Tara Shah",
    email: "tara.shah@example.test",
    status: "REJECTED",
    submitted: "06 Oct 2026",
    updated: "07 Oct 2026",
    documents: ["Aadhaar", "Voter ID"],
    reason: "The submitted address proof was not legible.",
    fields: [
      { label: "Full name", existing: "Tara Shah", extracted: "Tara Shah", result: "MATCH" },
      {
        label: "Date of birth",
        existing: "31 May 1995",
        extracted: "31 May 1995",
        result: "MATCH",
      },
      { label: "Address", existing: "12 Rose Lane, Jaipur", extracted: "—", result: "UNCERTAIN" },
      {
        label: "Document number",
        existing: "XXXX XXXX 8022",
        extracted: "XXXX XXXX 8022",
        result: "MATCH",
      },
    ],
  },
];

const seedAudit: AuditEvent[] = [
  {
    id: "AUD-0481",
    requestId: "KYC-2827",
    customerId: "CUS-1024",
    customer: "Rohan Das",
    admin: "Nisha Verma",
    action: "Request verified",
    field: "KYC status",
    previous: "Under review",
    next: "Verified",
    reason: "All required fields matched.",
    timestamp: "09 Oct 2026 · 14:32",
  },
  {
    id: "AUD-0478",
    requestId: "KYC-2819",
    customerId: "CUS-1016",
    customer: "Tara Shah",
    admin: "Nisha Verma",
    action: "Request rejected",
    field: "KYC status",
    previous: "Under review",
    next: "Rejected",
    reason: "The submitted address proof was not legible.",
    timestamp: "07 Oct 2026 · 11:08",
  },
];

type DemoContextValue = {
  role: Role | null;
  ready: boolean;
  requests: DemoRequest[];
  audit: AuditEvent[];
  request: (id: string) => DemoRequest | undefined;
  login: (role: Role) => void;
  logout: () => void;
  process: (id: string) => void;
  reject: (id: string, reason: string) => void;
  updateAndProcess: (id: string, field: string, value: string, reason: string) => void;
  submitDocuments: (files: string[]) => string;
  reset: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

const ROLE_KEY = "pramana-demo-role";

function readStoredRole(): Role | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(ROLE_KEY);
  return stored === "customer" || stored === "admin" ? stored : null;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  // Persisted to session storage so a direct load or refresh of a deep route
  // keeps the demo session instead of bouncing to the unauthorized screen.
  // Loaded after mount to avoid an SSR/client hydration mismatch.
  const [role, setRoleState] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setRoleState(readStoredRole());
    setReady(true);
  }, []);
  const setRole = (next: Role | null) => {
    setRoleState(next);
    if (typeof window !== "undefined") {
      if (next) window.sessionStorage.setItem(ROLE_KEY, next);
      else window.sessionStorage.removeItem(ROLE_KEY);
    }
  };
  const [requests, setRequests] = useState<DemoRequest[]>(seedRequests);
  const [audit, setAudit] = useState<AuditEvent[]>(seedAudit);
  const value = useMemo<DemoContextValue>(() => {
    const appendAudit = (
      req: DemoRequest,
      action: string,
      field: string,
      previous: string,
      next: string,
      reason: string,
    ) => {
      setAudit((rows) => [
        {
          id: `AUD-${String(Date.now()).slice(-5)}`,
          requestId: req.id,
          customerId: req.customerId,
          customer: req.name,
          admin: "Nisha Verma · Demo",
          action,
          field,
          previous,
          next,
          reason,
          timestamp: new Date().toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        },
        ...rows,
      ]);
    };
    return {
      role,
      ready,
      requests,
      audit,
      request: (id: string) => requests.find((item) => item.id === id),
      login: (nextRole: Role) => setRole(nextRole),
      logout: () => setRole(null),
      process: (id: string) => {
        const req = requests.find((item) => item.id === id);
        if (!req) return;
        // A request with mismatched or unresolved uncertain fields is not a clean match.
        if (req.fields.some((field) => field.result !== "MATCH")) return;
        setRequests((rows) =>
          rows.map((item) =>
            item.id === id ? { ...item, status: "VERIFIED", updated: "12 Oct 2026" } : item,
          ),
        );
        appendAudit(
          req,
          "Request verified",
          "KYC status",
          req.status.replaceAll("_", " "),
          "Verified",
          "All required fields reviewed and matched.",
        );
      },
      reject: (id: string, reason: string) => {
        const req = requests.find((item) => item.id === id);
        if (!req) return;
        setRequests((rows) =>
          rows.map((item) =>
            item.id === id ? { ...item, status: "REJECTED", reason, updated: "12 Oct 2026" } : item,
          ),
        );
        appendAudit(
          req,
          "Request rejected",
          "KYC status",
          req.status.replaceAll("_", " "),
          "Rejected",
          reason,
        );
      },
      updateAndProcess: (id: string, field: string, proposed: string, reason: string) => {
        const req = requests.find((item) => item.id === id);
        if (!req) return;
        const original = req.fields.find((item) => item.label === field);
        if (!original) return;
        const previous = original.existing;
        const corrected = req.fields.map((entry) =>
          entry.label === field
            ? { ...entry, existing: proposed, extracted: proposed, result: "MATCH" as const }
            : entry,
        );
        // Only verify when every remaining field is a match; otherwise stay under review.
        const resolved = corrected.every((entry) => entry.result === "MATCH");
        setRequests((rows) =>
          rows.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: resolved ? "VERIFIED" : "UNDER_REVIEW",
                  updated: "12 Oct 2026",
                  fields: corrected,
                }
              : item,
          ),
        );
        appendAudit(
          req,
          resolved ? "Record corrected & verified" : "Record corrected",
          field,
          previous,
          proposed,
          reason,
        );
      },
      submitDocuments: (files: string[]) => {
        const id = `KYC-${String(Date.now()).slice(-4)}`;
        const existing = requests.find((item) => item.customerId === "CUS-1042");
        if (existing) {
          setRequests((rows) =>
            rows.map((item) =>
              item.id === existing.id
                ? {
                    ...item,
                    status: "SUBMITTED",
                    documents: files,
                    submitted: "12 Oct 2026",
                    updated: "12 Oct 2026",
                    reason: undefined,
                  }
                : item,
            ),
          );
          return existing.id;
        }
        const newReq: DemoRequest = {
          ...seedRequests[0]!,
          id,
          status: "SUBMITTED",
          documents: files,
          submitted: "12 Oct 2026",
          updated: "12 Oct 2026",
        };
        setRequests((rows) => [newReq, ...rows]);
        return id;
      },
      reset: () => {
        setRequests(seedRequests);
        setAudit(seedAudit);
        setRole(null);
      },
    };
  }, [role, ready, requests, audit]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used within DemoProvider");
  return value;
}
