import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  Home,
  LayoutDashboard,
  ListFilter,
  LockKeyhole,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDemo,
  type DemoRequest,
  type KycStatus,
  type MatchStatus,
  type Role,
} from "@/components/pramana/demo-state";

type PageKey =
  | "landing"
  | "login"
  | "unauthorized"
  | "customer-dashboard"
  | "documents"
  | "submit"
  | "status"
  | "customer-profile"
  | "admin-dashboard"
  | "requests"
  | "request-detail"
  | "audit"
  | "customers"
  | "admin-profile";

const appLinks = {
  customer: [
    { title: "Overview", to: "/customer/dashboard", icon: LayoutDashboard },
    { title: "My documents", to: "/customer/documents", icon: FileText },
    { title: "Verification status", to: "/customer/status", icon: Activity },
    { title: "My profile", to: "/customer/profile", icon: UserRound },
  ],
  admin: [
    { title: "Overview", to: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Request queue", to: "/admin/requests", icon: FileCheck2 },
    { title: "Customers", to: "/admin/customers", icon: Users },
    { title: "Audit history", to: "/admin/audit", icon: ShieldCheck },
  ],
} as const;

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-semibold tracking-tight ${inverse ? "text-sidebar-foreground" : "text-foreground"}`}
    >
      <span
        className={`grid size-9 place-items-center rounded-lg ${inverse ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-primary text-primary-foreground"}`}
      >
        <Fingerprint size={20} />
      </span>
      <span className="text-[17px]">Pramāṇa</span>
    </span>
  );
}

function StatusBadge({ status }: { status: KycStatus | string }) {
  const normalized = status.replaceAll("_", " ");
  const tone =
    status === "VERIFIED"
      ? "status-success"
      : status === "REJECTED"
        ? "status-danger"
        : status === "UNDER_REVIEW"
          ? "status-warning"
          : "status-neutral";
  const Icon =
    status === "VERIFIED"
      ? CheckCircle2
      : status === "REJECTED"
        ? CircleAlert
        : status === "UNDER_REVIEW"
          ? Clock3
          : FileText;
  return (
    <span className={`status-pill ${tone}`}>
      <Icon size={13} />
      {normalized.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}
    </span>
  );
}

function DemoBanner({
  children = "Demo workspace · All records and actions are simulated",
}: {
  children?: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-accent/70 px-4 py-2 text-xs font-medium text-accent-foreground sm:px-7">
      <Shield size={14} />
      {children}
      <span className="ml-auto hidden text-muted-foreground sm:block">
        No real identity data is used
      </span>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Users;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const tones = {
    blue: "bg-accent text-primary",
    green: "bg-success/10 text-success",
    amber: "bg-warning/20 text-warning-foreground",
    red: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={`grid size-9 shrink-0 place-items-center rounded-md ${tones[tone]}`}>
          <Icon size={17} />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <span className="text-xs text-muted-foreground">{note}</span>
      </div>
    </div>
  );
}

function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
          Pramāṇa workspace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function AppShell({ children, area }: { children: ReactNode; area: "customer" | "admin" }) {
  const { logout, reset, role } = useDemo();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menu = appLinks[area];
  const userName = role === "admin" ? "Nisha Verma" : "Anaya Rao";
  const userSubtitle = role === "admin" ? "Compliance reviewer" : "Customer account";
  const path = useRouterState({ select: (state) => state.location.pathname });
  const signout = () => {
    logout();
    toast.success("Signed out of the demo workspace.");
    void navigate({ to: "/login" });
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-sidebar text-sidebar-foreground transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[72px] items-center border-b border-sidebar-border px-6">
          <Brand inverse />
        </div>
        <div className="px-5 pt-6">
          <div className="rounded-md border border-sidebar-border bg-sidebar-accent/70 p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-primary">
              <span className="size-1.5 rounded-full bg-sidebar-primary" />
              {area === "admin" ? "Operations" : "Personal account"}
            </div>
            <p className="mt-2 text-sm font-medium">
              {area === "admin" ? "Verification desk" : "Identity verification"}
            </p>
          </div>
        </div>
        <nav className="flex-1 px-3 pt-6" aria-label="Main navigation">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-sidebar-foreground/55">
            Workspace
          </p>
          <div className="space-y-1">
            {menu.map(({ title, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`flex h-10 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors ${path === to ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"}`}
              >
                <Icon size={17} />
                {title}
                {path === to && (
                  <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary" />
                )}
              </Link>
            ))}
          </div>
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <button
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-sidebar-accent"
            onClick={() =>
              void navigate({ to: area === "admin" ? "/admin/profile" : "/customer/profile" })
            }
          >
            <span className="grid size-9 place-items-center rounded-full bg-sidebar-accent text-sm font-semibold">
              {area === "admin" ? "NV" : "AR"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{userName}</span>
              <span className="block truncate text-[11px] text-sidebar-foreground/60">
                {userSubtitle}
              </span>
            </span>
            <MoreHorizontal size={16} />
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => {
              reset();
              toast.success("Demo data restored to its initial state.");
              void navigate({ to: "/login" });
            }}
          >
            <RefreshCw size={15} />
            Reset demo data
          </Button>
        </div>
      </aside>
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-foreground/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="min-h-screen md:pl-[248px]">
        <DemoBanner />
        <header className="sticky top-0 z-20 flex h-[66px] items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </Button>
            <span className="hidden text-sm text-muted-foreground sm:block">
              {area === "admin" ? "Operations" : "My account"}
            </span>
            <span className="hidden text-muted-foreground sm:block">/</span>
            <span className="text-sm font-medium">
              {path.split("/").at(-1)?.replaceAll("-", " ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              onClick={() =>
                toast("You’re all caught up", {
                  description: "Demo notifications will appear here.",
                })
              }
            >
              <Bell size={18} />
            </Button>
            <span className="mx-1 hidden h-7 w-px bg-border sm:block" />
            <Button variant="ghost" size="sm" className="gap-2" onClick={signout}>
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8">
          {children}
          <footer className="mt-10 border-t border-border py-4 text-xs text-muted-foreground">
            Pramāṇa · A frontend demonstration. Verification outcomes shown here are simulated.
          </footer>
        </main>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card">
        <header className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <Link to="/login">
            <Button size="sm">
              Sign in <ArrowRight size={15} />
            </Button>
          </Link>
        </header>
      </div>
      <section className="surface-grid relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:py-24">
          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              Identity review workspace
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Identity verification,
              <br />
              <span className="text-primary">made simpler.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              A clearer way to submit identity documents, compare key information, and bring human
              review into the verification process.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg">
                  Sign in to workspace <ArrowRight size={17} />
                </Button>
              </Link>
              <a href="#workflow">
                <Button size="lg" variant="outline">
                  Explore the workflow
                </Button>
              </a>
            </div>
            <div className="mt-8 flex items-center gap-5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-success" />
                Traceable review
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileCheck2 size={15} className="text-primary" />
                Aadhaar & Voter ID
              </span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[590px] rounded-lg border border-border bg-card p-2 shadow-xl">
            <div className="overflow-hidden rounded-md border border-border">
              <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
                    <Fingerprint size={15} />
                  </span>
                  <span className="text-xs font-semibold">Review queue</span>
                </div>
                <span className="status-pill status-warning">
                  <Clock3 size={12} />4 to review
                </span>
              </div>
              <div className="grid grid-cols-[1.15fr_1fr_1fr] gap-2 border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Customer</span>
                <span>Documents</span>
                <span>Match</span>
              </div>
              {[
                ["Anaya Rao", "KYC-2841", "2 documents", "Review"],
                ["Kabir Mehta", "KYC-2838", "2 documents", "Mismatch"],
                ["Rohan Das", "KYC-2827", "2 documents", "Verified"],
              ].map(([name, id, docs, state]) => (
                <div
                  key={id}
                  className="grid grid-cols-[1.15fr_1fr_1fr] items-center gap-2 border-b border-border/70 px-4 py-4 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{name}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{id}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{docs}</p>
                  <span
                    className={`status-pill w-fit ${state === "Verified" ? "status-success" : state === "Mismatch" ? "status-danger" : "status-warning"}`}
                  >
                    {state === "Verified" ? <Check size={11} /> : <Clock3 size={11} />}
                    {state}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-background px-4 py-3">
                <span className="text-[10px] text-muted-foreground">
                  Review activity · Demo environment
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                  View workspace <ArrowUpRight size={12} />
                </span>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 shadow-md sm:flex">
              <span className="grid size-8 place-items-center rounded bg-success/10 text-success">
                <CheckCircle2 size={17} />
              </span>
              <span>
                <span className="block text-xs font-semibold">Field comparison</span>
                <span className="text-[10px] text-muted-foreground">
                  Human review, with context
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>
      <section id="workflow" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            A transparent workflow
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            From documents to a clear decision.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Keep each step visible, from customer submission to a review that can be understood
            later.
          </p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Upload,
              title: "Submit documents",
              text: "Customers provide Aadhaar and Voter ID in one guided flow.",
            },
            {
              icon: SlidersHorizontal,
              title: "Compare information",
              text: "Extracted details are presented beside the customer record.",
            },
            {
              icon: ShieldCheck,
              title: "Review with context",
              text: "Authorized reviewers can process, correct, or reject with a recorded reason.",
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="border-t-2 border-primary/25 pt-5">
              <span className="grid size-10 place-items-center rounded-md bg-accent text-primary">
                <Icon size={19} />
              </span>
              <p className="mt-5 text-xs font-medium text-muted-foreground">0{i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="border-y border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-lg font-semibold">A focused identity review workspace</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Frontend demonstration with fictional records and simulated decisions.
            </p>
          </div>
          <Link to="/login">
            <Button variant="outline">
              Explore the demo <ArrowRight size={15} />
            </Button>
          </Link>
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Brand />
        <span>Pramāṇa · Synthetic data only · 2026</span>
      </footer>
    </main>
  );
}

function LoginPage() {
  const { login } = useDemo();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const enter = (role: Role) => {
    login(role);
    void navigate({ to: role === "admin" ? "/admin/dashboard" : "/customer/dashboard" });
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter an email and password to continue.");
      return;
    }
    setBusy(true);
    setError("");
    window.setTimeout(() => {
      setBusy(false);
      setError("Demo sign-in uses the role buttons below. Use a demo role to continue.");
    }, 650);
  };
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_.95fr]">
      <section className="surface-grid relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <Link to="/">
          <Brand inverse />
        </Link>
        <div className="max-w-lg">
          <span className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-primary-foreground/70">
            <ShieldCheck size={15} />
            DEMO WORKSPACE
          </span>
          <h1 className="text-4xl font-semibold leading-tight">
            A considered approach to identity verification.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-primary-foreground/75">
            A frontend-only demonstration of document submission and human-led review.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-primary-foreground/15 bg-primary-foreground/5 p-4">
              <FileCheck2 size={18} />
              <p className="mt-3 text-sm font-semibold">Document review</p>
              <p className="mt-1 text-xs text-primary-foreground/65">Aadhaar and Voter ID</p>
            </div>
            <div className="rounded-md border border-primary-foreground/15 bg-primary-foreground/5 p-4">
              <Activity size={18} />
              <p className="mt-3 text-sm font-semibold">Decision history</p>
              <p className="mt-1 text-xs text-primary-foreground/65">Context for every action</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-primary-foreground/60">Pramāṇa · Simulated demo environment</p>
      </section>
      <section className="flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <Link to="/">
              <Brand />
            </Link>
          </div>
          <span className="grid size-12 place-items-center rounded-lg bg-accent text-primary">
            <LockKeyhole size={21} />
          </span>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your Pramāṇa workspace.</p>
          <form className="mt-7 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium">
              Email address
              <Input
                className="mt-2 h-11 bg-card"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <span className="relative mt-2 block">
                <Input
                  className="h-11 bg-card pr-20"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  aria-label="Password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-xs font-medium text-primary"
                  onClick={() => setShow(!show)}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </span>
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <Button className="h-11 w-full" type="submit" disabled={busy}>
              {busy ? "Checking…" : "Continue with email"}
              <ArrowRight size={16} />
            </Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            OR TRY A DEMO ROLE
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-11 justify-start"
              onClick={() => enter("customer")}
            >
              <UserRound size={17} />
              <span className="text-left">
                <span className="block">Customer</span>
                <span className="block text-[10px] font-normal text-muted-foreground">
                  Anaya Rao
                </span>
              </span>
              <ArrowRight className="ml-auto" size={15} />
            </Button>
            <Button variant="outline" className="h-11 justify-start" onClick={() => enter("admin")}>
              <ShieldCheck size={17} />
              <span className="text-left">
                <span className="block">Admin / Auditor</span>
                <span className="block text-[10px] font-normal text-muted-foreground">
                  Nisha Verma
                </span>
              </span>
              <ArrowRight className="ml-auto" size={15} />
            </Button>
          </div>
          <div className="mt-6 rounded-md border border-warning/35 bg-warning/10 p-3 text-xs leading-5 text-warning-foreground">
            <CircleAlert className="mr-1.5 inline size-3.5" />
            Demo authentication is simulated and is not production authentication.
          </div>
          <Link
            to="/"
            className="mt-6 block text-center text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Back to Pramāṇa
          </Link>
        </div>
      </section>
    </div>
  );
}

function CustomerDashboard() {
  const { requests } = useDemo();
  const navigate = useNavigate();
  const request = requests.find((item) => item.customerId === "CUS-1042") ?? requests[0];
  const verified = request?.status === "VERIFIED";
  const stages = [
    "Documents required",
    "Documents submitted",
    "Information review",
    "Manual review",
    "Final decision",
  ];
  const activeIndex = verified ? 4 : request?.status === "UNDER_REVIEW" ? 3 : 1;
  return (
    <>
      <PageHeading
        title="Good morning, Anaya"
        description="Here’s the latest on your identity verification."
        action={
          <Button onClick={() => void navigate({ to: "/customer/submit" })}>
            <Plus size={16} />
            Submit documents
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1.45fr_.8fr]">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Your verification status</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {verified
                  ? "Identity verified"
                  : request?.status === "REJECTED"
                    ? "Action required"
                    : "Review in progress"}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                {verified
                  ? "Your identity information has been reviewed successfully."
                  : request?.reason
                    ? request.reason
                    : "Your documents are with our review team. We’ll update this page when there’s progress."}
              </p>
            </div>
            <StatusBadge status={request?.status ?? "SUBMITTED"} />
          </div>
          <div className="mt-7 grid gap-0 sm:grid-cols-5">
            {stages.map((stage, index) => {
              const done = index < activeIndex;
              const active = index === activeIndex;
              return (
                <div key={stage} className="relative flex gap-3 pb-4 sm:block sm:pb-0">
                  <div
                    className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold ${done ? "border-success bg-success text-success-foreground" : active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}
                  >
                    {done ? <Check size={14} /> : index + 1}
                  </div>
                  {index < stages.length - 1 && (
                    <div
                      className={`absolute left-[13px] top-7 h-[calc(100%-4px)] w-px sm:left-7 sm:top-[13px] sm:h-px sm:w-[calc(100%-20px)] ${done ? "bg-success" : "bg-border"}`}
                    />
                  )}
                  <p
                    className={`pt-1 text-xs sm:mt-3 sm:pr-2 ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                  >
                    {stage}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reference number</p>
              <p className="mt-2 text-lg font-semibold">{request?.id ?? "KYC-2841"}</p>
            </div>
            <span className="grid size-10 place-items-center rounded-md bg-accent text-primary">
              <Fingerprint size={19} />
            </span>
          </div>
          <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Submitted</span>
              <span className="font-medium">{request?.submitted}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Documents</span>
              <span className="font-medium">2 received</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Last updated</span>
              <span className="font-medium">{request?.updated}</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-5 w-full"
            onClick={() => void navigate({ to: "/customer/status" })}
          >
            View verification status <ArrowRight size={15} />
          </Button>
        </section>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.45fr_.8fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Your documents</h2>
            <Link to="/customer/documents" className="text-xs font-medium text-primary">
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Aadhaar", "Voter ID"].map((name) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
              >
                <span className="grid size-10 place-items-center rounded-md bg-accent text-primary">
                  <FileText size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {request?.documents.includes(name) ? "Received · 12 Oct 2026" : "Not submitted"}
                  </span>
                </span>
                <CheckCircle2 className="text-success" size={17} />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Account details</h2>
          <p className="mt-1 text-xs text-muted-foreground">Customer reference CUS-1042</p>
          <div className="mt-4 space-y-3 text-sm">
            <p className="flex justify-between gap-2">
              <span className="text-muted-foreground">Email</span>
              <span>an•••@example.test</span>
            </p>
            <p className="flex justify-between gap-2">
              <span className="text-muted-foreground">Phone</span>
              <span>+91 •••••• 4821</span>
            </p>
          </div>
          <Link
            to="/customer/profile"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            View profile <ArrowRight size={13} />
          </Link>
        </section>
      </div>
    </>
  );
}

type LocalFile = { name: string; size: number; type: string; url: string };

function UploadCard({
  title,
  value,
  onChange,
}: {
  title: string;
  value?: LocalFile | undefined;
  onChange: (file?: LocalFile) => void;
}) {
  const [error, setError] = useState("");
  const pick = (file?: File) => {
    if (!file) return;
    if (!/^(application\/pdf|image\/(jpeg|png))$/.test(file.type)) {
      setError("Choose a PDF, JPG or PNG file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be 10 MB or less.");
      return;
    }
    setError("");
    if (value?.url) URL.revokeObjectURL(value.url);
    onChange({ name: file.name, size: file.size, type: file.type, url: URL.createObjectURL(file) });
  };
  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    pick(event.dataTransfer.files.item(0) ?? undefined);
  };
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-md bg-accent text-primary">
          <FileText size={18} />
        </span>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">PDF, JPG or PNG · Up to 10 MB</p>
        </div>
      </div>
      {value ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded border border-border bg-card">
            {value.type.startsWith("image/") ? (
              <img
                src={value.url}
                alt={`${title} preview`}
                className="h-full w-full object-cover"
              />
            ) : (
              <FileText size={21} className="text-primary" />
            )}
          </div>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{value.name}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {(value.size / 1024 / 1024).toFixed(2)} MB · Ready
            </span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${title}`}
            onClick={() => {
              URL.revokeObjectURL(value.url);
              onChange(undefined);
            }}
          >
            <X size={16} />
          </Button>
        </div>
      ) : (
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-input bg-background px-4 py-5 text-center transition-colors hover:border-primary/50 hover:bg-accent/30"
        >
          <span className="grid size-9 place-items-center rounded-full bg-accent text-primary">
            <Upload size={16} />
          </span>
          <span className="mt-2 text-sm font-medium">
            Drop file here or <span className="text-primary">browse</span>
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            Your file stays on this device in this demo.
          </span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="sr-only"
            onChange={(event: ChangeEvent<HTMLInputElement>) => pick(event.target.files?.[0])}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function DocumentsPage() {
  const { requests } = useDemo();
  const current = requests.find((item) => item.customerId === "CUS-1042") ?? requests[0];
  return (
    <>
      <PageHeading
        title="My documents"
        description="Review documents associated with your identity verification."
        action={
          <Link to="/customer/submit">
            <Button>
              <Upload size={16} />
              Submit documents
            </Button>
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {["Aadhaar", "Voter ID"].map((doc) => (
          <section key={doc} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-md bg-accent text-primary">
                <FileText size={18} />
              </span>
              <div className="flex-1">
                <h2 className="font-semibold">{doc}</h2>
                <p className="text-xs text-muted-foreground">Identity document</p>
              </div>
              <StatusBadge
                status={
                  !current?.documents.includes(doc)
                    ? "NOT_SUBMITTED"
                    : current.status === "VERIFIED"
                      ? "VERIFIED"
                      : "SUBMITTED"
                }
              />
            </div>
            <div className="mt-5 border-t border-border pt-4 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Document status</span>
                <span>
                  {!current?.documents.includes(doc)
                    ? "Not submitted"
                    : current.status === "VERIFIED"
                      ? "Verified"
                      : "Submitted"}
                </span>
              </p>
              <p className="mt-3 flex justify-between">
                <span className="text-muted-foreground">Request</span>
                <span>{current?.id}</span>
              </p>
              <p className="mt-3 flex justify-between">
                <span className="text-muted-foreground">Submitted</span>
                <span>{current?.submitted ?? "—"}</span>
              </p>
            </div>
          </section>
        ))}
      </div>
      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold">Document handling</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Files selected in this demo are held in page memory only for local preview. They are not
          uploaded, saved, or sent to a verification service.
        </p>
      </div>
    </>
  );
}

function SubmitPage() {
  const { submitDocuments } = useDemo();
  const navigate = useNavigate();
  const [aadhaar, setAadhaar] = useState<LocalFile>();
  const [voter, setVoter] = useState<LocalFile>();
  const [busy, setBusy] = useState(false);
  const submit = () => {
    if (!aadhaar || !voter) {
      toast.error("Add both documents before submitting.");
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      const id = submitDocuments(["Aadhaar", "Voter ID"]);
      setBusy(false);
      toast.success(`Demo request ${id} submitted.`);
      void navigate({ to: "/customer/status" });
    }, 550);
  };
  useEffect(
    () => () => {
      if (aadhaar?.url) URL.revokeObjectURL(aadhaar.url);
      if (voter?.url) URL.revokeObjectURL(voter.url);
    },
    [aadhaar?.url, voter?.url],
  );
  return (
    <>
      <PageHeading
        title="Submit documents"
        description="Add both required documents to start a simulated review."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <UploadCard title="Aadhaar" value={aadhaar} onChange={setAadhaar} />
          <UploadCard title="Voter ID" value={voter} onChange={setVoter} />
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              By continuing, you confirm these fictional files are for demo purposes only.
            </p>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Submitting…" : "Confirm and submit"}
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
        <aside className="h-fit rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Submission checklist
          </p>
          <h2 className="mt-2 text-lg font-semibold">Two documents required</h2>
          <div className="mt-5 space-y-3">
            {[
              { label: "Aadhaar", done: Boolean(aadhaar) },
              { label: "Voter ID", done: Boolean(voter) },
              { label: "Review & confirm", done: Boolean(aadhaar && voter) },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span
                  className={`grid size-6 place-items-center rounded-full ${done ? "bg-success text-success-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  {done ? <Check size={13} /> : <span className="text-[10px]">•</span>}
                </span>
                <span className={done ? "font-medium" : "text-muted-foreground"}>{label}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            Accepted files: PDF, JPG and PNG. Maximum 10 MB per file. The selected files remain on
            this device in the current page only.
          </p>
        </aside>
      </div>
    </>
  );
}

function Timeline({ request }: { request: DemoRequest }) {
  const steps = [
    "Documents submitted",
    "Information comparison",
    "Manual review",
    "Final decision",
  ];
  const progress =
    request.status === "VERIFIED" || request.status === "REJECTED"
      ? 4
      : request.status === "UNDER_REVIEW"
        ? 3
        : 1;
  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const complete = index < progress;
        const active = index === progress - 1 && progress < 4;
        return (
          <div className="relative flex gap-3 pb-5 last:pb-0" key={step}>
            <span
              className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full border text-xs ${complete ? "border-success bg-success text-success-foreground" : active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}
            >
              {complete ? <Check size={14} /> : index + 1}
            </span>
            {index < steps.length - 1 && (
              <span
                className={`absolute left-[13px] top-7 h-[calc(100%-12px)] w-px ${index < progress - 1 ? "bg-success" : "bg-border"}`}
              />
            )}
            <div className="pt-1">
              <p
                className={`text-sm ${active ? "font-semibold" : complete ? "font-medium" : "text-muted-foreground"}`}
              >
                {step}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {complete
                  ? index === 0
                    ? request.submitted
                    : index === 3
                      ? request.updated
                      : "Demo review"
                  : active
                    ? "In progress"
                    : "Waiting"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusPage() {
  const { requests } = useDemo();
  const request = requests.find((item) => item.customerId === "CUS-1042") ?? requests[0];
  if (!request)
    return (
      <EmptyState title="No verification request" text="Submit your identity documents to begin." />
    );
  return (
    <>
      <PageHeading
        title="Verification status"
        description="Track your request and see the latest review update."
        action={
          <Link to="/customer/dashboard">
            <Button variant="outline">
              <ChevronLeft size={15} />
              Dashboard
            </Button>
          </Link>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Request {request.id}</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {request.status === "VERIFIED"
                  ? "Verification complete"
                  : request.status === "REJECTED"
                    ? "Action needed"
                    : "Your request is being reviewed"}
              </h2>
            </div>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {request.reason ??
              (request.status === "VERIFIED"
                ? "Your identity details have been marked verified in this demo."
                : "Your documents have been received. The review team is comparing the submitted details.")}
          </p>
          <div className="mt-7 border-t border-border pt-6">
            <h3 className="mb-5 text-sm font-semibold">Review timeline</h3>
            <Timeline request={request} />
          </div>
        </section>
        <aside className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold">Request details</h2>
          <div className="mt-4 space-y-4 text-sm">
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-medium">{request.id}</span>
            </p>
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">Submitted</span>
              <span className="font-medium">{request.submitted}</span>
            </p>
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">Last updated</span>
              <span className="font-medium">{request.updated}</span>
            </p>
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">Documents</span>
              <span className="font-medium">{request.documents.join(", ")}</span>
            </p>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current next step
            </h3>
            <p className="text-sm leading-5">
              {request.status === "VERIFIED"
                ? "No further action is needed."
                : request.status === "REJECTED"
                  ? "Review the reason and prepare updated documents."
                  : "The review team will share an update here."}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function ProfilePage({ admin = false }: { admin?: boolean }) {
  const { requests } = useDemo();
  const req = requests.find((item) => item.customerId === "CUS-1042") ?? requests[0];
  const entries = admin
    ? [
        ["Name", "Nisha Verma"],
        ["Role", "Compliance reviewer"],
        ["Email", "ni•••@pramana.demo"],
        ["Workspace", "Operations · Demo"],
      ]
    : [
        ["Full name", "Anaya Rao"],
        ["Customer reference", "CUS-1042"],
        ["Email address", "an•••@example.test"],
        ["Phone number", "+91 •••••• 4821"],
        ["Date of birth", "14 Mar 1994"],
        ["Address", "18 Lake View Road, Pune"],
        ["Account created", "04 Feb 2025"],
        ["KYC status", req?.status.replaceAll("_", " ") ?? "Submitted"],
      ];
  return (
    <>
      <PageHeading
        title={admin ? "My profile" : "Customer profile"}
        description="Fictional account information for this demo."
      />
      <div className="max-w-3xl rounded-lg border border-border bg-card">
        <div className="flex items-center gap-4 border-b border-border p-5 sm:p-6">
          <span className="grid size-14 place-items-center rounded-full bg-accent text-lg font-semibold text-primary">
            {admin ? "NV" : "AR"}
          </span>
          <div>
            <h2 className="text-lg font-semibold">{admin ? "Nisha Verma" : "Anaya Rao"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {admin ? "Admin / Auditor" : "Customer · CUS-1042"}
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2">
          {entries.map(([label, value], index) => (
            <div
              key={label}
              className={`border-b border-border px-5 py-4 sm:px-6 ${index % 2 === 0 ? "sm:border-r" : ""}`}
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1.5 text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>
        <p className="p-5 text-xs text-muted-foreground sm:px-6">
          Sensitive contact details are masked in this view. Profile details are read-only.
        </p>
      </div>
    </>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-card px-5 py-10 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-secondary text-muted-foreground">
          <Search size={19} />
        </span>
        <h3 className="mt-3 font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function RequestsTable({ rows }: { rows: DemoRequest[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [sort, setSort] = useState(false);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const filtered = useMemo(
    () =>
      rows
        .filter(
          (item) =>
            `${item.id} ${item.customerId} ${item.name}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (status === "All statuses" ||
              item.status === status.toUpperCase().replaceAll(" ", "_")),
        )
        .sort((a, b) =>
          sort
            ? new Date(b.submitted).getTime() - new Date(a.submitted).getTime()
            : new Date(a.submitted).getTime() - new Date(b.submitted).getTime(),
        ),
    [rows, query, status, sort],
  );
  const shown = filtered.slice(page * 5, page * 5 + 5);
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Search request, customer ID or name"
            aria-label="Search requests"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(0);
          }}
          aria-label="Filter request status"
        >
          {["All statuses", "Under review", "Submitted", "Verified", "Rejected"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setQuery("");
            setStatus("All statuses");
            setPage(0);
          }}
        >
          Reset
        </Button>
      </div>
      {shown.length === 0 ? (
        <EmptyState
          title="No requests found"
          text="Try another search term or clear the selected filters."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border bg-background text-xs text-muted-foreground">
                <tr>
                  {[
                    "Request / Customer",
                    "Customer",
                    "Documents",
                    "Match summary",
                    "Status",
                    "Submitted",
                  ].map((label, i) => (
                    <th key={label} className="px-4 py-3 font-medium">
                      {label === "Submitted" ? (
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() => setSort(!sort)}
                        >
                          {label}
                          {sort ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((item) => {
                  const matches = item.fields.filter((field) => field.result === "MATCH").length;
                  const mismatches = item.fields.filter(
                    (field) => field.result === "MISMATCH",
                  ).length;
                  const uncertain = item.fields.filter(
                    (field) => field.result === "UNCERTAIN",
                  ).length;
                  return (
                    <tr
                      key={item.id}
                      onClick={() =>
                        void navigate({ to: "/admin/requests/$id", params: { id: item.id } })
                      }
                      className="cursor-pointer transition-colors hover:bg-accent/30"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-primary">{item.id}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.customerId}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {item.documents.join(" · ")}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className="text-success">{matches} match</span>
                        {mismatches > 0 && (
                          <span className="ml-2 text-destructive">{mismatches} mismatch</span>
                        )}
                        {uncertain > 0 && (
                          <span className="ml-2 text-warning-foreground">
                            {uncertain} uncertain
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {item.submitted}
                      </td>
                      <td className="px-4 py-3.5">
                        <ChevronRight size={15} className="text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>
              Showing {page * 5 + 1}–{Math.min(page * 5 + shown.length, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={page === 0}
                onClick={() => setPage(Math.max(page - 1, 0))}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={(page + 1) * 5 >= filtered.length}
                onClick={() => setPage(page + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AdminDashboard({ requests }: { requests: DemoRequest[] }) {
  const pending = requests.filter((item) => ["UNDER_REVIEW", "SUBMITTED"].includes(item.status));
  const verified = requests.filter((item) => item.status === "VERIFIED").length;
  const rejected = requests.filter((item) => item.status === "REJECTED").length;
  const mismatch = requests.filter((item) =>
    item.fields.some((field) => field.result === "MISMATCH"),
  ).length;
  return (
    <>
      <PageHeading
        title="Review overview"
        description="Monitor verification requests and reviewer activity."
        action={
          <Link to="/admin/requests">
            <Button variant="outline">
              Open request queue <ArrowRight size={15} />
            </Button>
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Total requests"
          value={requests.length}
          note="All demo requests"
          icon={FileCheck2}
        />
        <Metric
          label="Pending review"
          value={pending.length}
          note="Needs attention"
          icon={Clock3}
          tone="amber"
        />
        <Metric label="Verified" value={verified} note="Completed" icon={BadgeCheck} tone="green" />
        <Metric
          label="Rejected"
          value={rejected}
          note="Decision recorded"
          icon={CircleAlert}
          tone="red"
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Recent requests</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Latest activity in the review queue
              </p>
            </div>
            <Link className="text-xs font-medium text-primary" to="/admin/requests">
              View all
            </Link>
          </div>
          <RequestsTable rows={requests.slice(0, 4)} />
        </section>
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Review snapshot</h2>
              <p className="mt-1 text-xs text-muted-foreground">Request status distribution</p>
            </div>
            <span className="grid size-9 place-items-center rounded-md bg-accent text-primary">
              <Gauge size={17} />
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {[
              { label: "Pending review", count: pending.length, color: "bg-warning" },
              { label: "Verified", count: verified, color: "bg-success" },
              { label: "Rejected", count: rejected, color: "bg-destructive" },
            ].map(({ label, count, color }) => (
              <div key={label}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span>{label}</span>
                  <span className="font-semibold">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{
                      width: `${requests.length ? Math.max((count / requests.length) * 100, 4) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-md border border-warning/35 bg-warning/10 p-3">
            <span className="grid size-8 shrink-0 place-items-center rounded bg-warning/20 text-warning-foreground">
              <ListFilter size={16} />
            </span>
            <p className="text-xs leading-5 text-warning-foreground">
              <span className="font-semibold">
                {mismatch} mismatch case{mismatch === 1 ? "" : "s"}
              </span>{" "}
              require field-level review before a decision.
            </p>
          </div>
          <Link
            to="/admin/requests"
            className="mt-5 flex h-9 items-center justify-center gap-2 rounded-md border border-border text-xs font-medium transition-colors hover:bg-accent"
          >
            Go to review queue <ArrowRight size={14} />
          </Link>
        </section>
      </div>
    </>
  );
}

function RequestsPage({ requests }: { requests: DemoRequest[] }) {
  const [quick, setQuick] = useState("All requests");
  const filtered = requests.filter(
    (item) =>
      quick === "All requests" ||
      (quick === "Pending review"
        ? ["UNDER_REVIEW", "SUBMITTED"].includes(item.status)
        : item.status === quick.toUpperCase()),
  );
  return (
    <>
      <PageHeading
        title="Request queue"
        description="Search and review submitted identity verification requests."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {["All requests", "Pending review", "Verified", "Rejected"].map((filter) => (
          <Button
            key={filter}
            variant={quick === filter ? "default" : "outline"}
            size="sm"
            onClick={() => setQuick(filter)}
          >
            {filter}
            {filter === "All requests" && (
              <span className="ml-1 opacity-70">{requests.length}</span>
            )}
          </Button>
        ))}
      </div>
      <RequestsTable rows={filtered} />
    </>
  );
}

function ComparisonResult({ result }: { result: MatchStatus }) {
  const tones =
    result === "MATCH"
      ? "status-success"
      : result === "MISMATCH"
        ? "status-danger"
        : "status-warning";
  const Icon = result === "MATCH" ? CheckCircle2 : result === "MISMATCH" ? CircleAlert : Clock3;
  return (
    <span className={`status-pill ${tones}`}>
      <Icon size={12} />
      {result.charAt(0) + result.slice(1).toLowerCase()}
    </span>
  );
}

function RequestDetail({ id }: { id: string }) {
  const { request, process, reject, updateAndProcess } = useDemo();
  const navigate = useNavigate();
  const item = request(id);
  const [dialog, setDialog] = useState<"process" | "reject" | "update" | null>(null);
  const [reason, setReason] = useState("");
  const [field, setField] = useState("");
  const [proposed, setProposed] = useState("");
  const [busy, setBusy] = useState(false);
  if (!item)
    return (
      <EmptyState
        title="Request not found"
        text="This request may have been reset or removed from the demo."
      />
    );
  const counts = {
    MATCH: item.fields.filter((entry) => entry.result === "MATCH").length,
    MISMATCH: item.fields.filter((entry) => entry.result === "MISMATCH").length,
    UNCERTAIN: item.fields.filter((entry) => entry.result === "UNCERTAIN").length,
  };
  const hasIssues = counts.MISMATCH > 0 || counts.UNCERTAIN > 0;
  const canProcess = item.status !== "VERIFIED" && item.status !== "REJECTED" && !hasIssues;
  const save = () => {
    if (dialog === "reject" && !reason.trim()) {
      toast.error("Enter a reason before rejecting this request.");
      return;
    }
    if (dialog === "update" && (!reason.trim() || !proposed.trim())) {
      toast.error("Enter a proposed value and a reason.");
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      if (dialog === "reject") {
        reject(item.id, reason.trim());
        toast.success("Demo request rejected.");
      }
      if (dialog === "update") {
        updateAndProcess(item.id, field, proposed.trim(), reason.trim());
        toast.success("Demo record updated and request verified.");
      }
      if (dialog === "process") {
        process(item.id);
        toast.success("Demo request marked verified.");
      }
      setBusy(false);
      setDialog(null);
      setReason("");
      setProposed("");
    }, 500);
  };
  const openUpdate = () => {
    const mismatch = item.fields.find((entry) => entry.result === "MISMATCH");
    const target =
      mismatch ?? item.fields.find((entry) => entry.result === "UNCERTAIN") ?? item.fields[0];
    if (target) {
      setField(target.label);
      setProposed(target.extracted === "—" ? target.existing : target.extracted);
    }
    setReason("");
    setDialog("update");
  };
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => void navigate({ to: "/admin/requests" })}>
          <ChevronLeft size={16} />
          Back to queue
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openUpdate}
            disabled={item.status === "VERIFIED"}
          >
            Update & process
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setReason("");
              setDialog("reject");
            }}
            disabled={item.status === "REJECTED"}
          >
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => setDialog("process")}
            disabled={!canProcess}
            title={
              hasIssues ? "Resolve mismatched or uncertain fields before processing." : undefined
            }
          >
            Process request
          </Button>
        </div>
      </div>
      {item.status !== "VERIFIED" && item.status !== "REJECTED" && hasIssues && (
        <p className="mb-5 rounded-md border border-warning/35 bg-warning/10 px-3 py-2 text-xs leading-5 text-warning-foreground">
          This request has {counts.MISMATCH > 0 ? `${counts.MISMATCH} mismatched` : ""}
          {counts.MISMATCH > 0 && counts.UNCERTAIN > 0 ? " and " : ""}
          {counts.UNCERTAIN > 0 ? `${counts.UNCERTAIN} uncertain` : ""} field
          {counts.MISMATCH + counts.UNCERTAIN === 1 ? "" : "s"}. Resolve them with “Update &
          process” or reject the request — it cannot be processed as a clean match.
        </p>
      )}
      <div className="mb-5 flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Verification request
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{item.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.id} <span className="mx-1.5">·</span> {item.customerId}{" "}
            <span className="mx-1.5">·</span> Submitted {item.submitted}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="font-semibold">Field comparison</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Simulated extraction results · not a real identity check
                </p>
              </div>
              <span className="status-pill status-neutral">
                <Activity size={12} />
                Demo extraction
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-border bg-background text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Field</th>
                    <th className="px-5 py-3 font-medium">Customer record</th>
                    <th className="px-5 py-3 font-medium">Extracted data</th>
                    <th className="px-5 py-3 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {item.fields.map((entry) => (
                    <tr key={entry.label}>
                      <td className="px-5 py-4 font-medium">{entry.label}</td>
                      <td className="px-5 py-4 text-muted-foreground">{entry.existing}</td>
                      <td className="px-5 py-4">{entry.extracted}</td>
                      <td className="px-5 py-4">
                        <ComparisonResult result={entry.result} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-4 border-t border-border px-5 py-3 text-xs text-muted-foreground">
              <span>
                <strong className="text-success">{counts.MATCH}</strong> matches
              </span>
              <span>
                <strong className="text-destructive">{counts.MISMATCH}</strong> mismatches
              </span>
              <span>
                <strong className="text-warning-foreground">{counts.UNCERTAIN}</strong> uncertain
              </span>
            </div>
          </section>
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Submitted documents</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Synthetic preview cards · no real identity images
                </p>
              </div>
              <span className="status-pill status-neutral">2 documents</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {item.documents.map((doc, index) => (
                <div
                  key={doc}
                  className="relative overflow-hidden rounded-md border border-border bg-background"
                >
                  <div className="flex h-28 items-center justify-center bg-secondary/60">
                    <div className="relative w-36 rounded border border-border bg-card p-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded bg-accent text-primary">
                          <Fingerprint size={13} />
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider">{doc}</span>
                      </div>
                      <div className="mt-2 h-1 w-20 rounded bg-border" />
                      <div className="mt-1 h-1 w-14 rounded bg-border" />
                      <span className="absolute bottom-2 right-2 text-[8px] text-muted-foreground">
                        XXXX · {index ? "7305" : "4821"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-xs font-semibold">{doc}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Preview unavailable · demo document
                      </p>
                    </div>
                    <FileText size={16} className="text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Verification summary</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on simulated field comparison
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                [counts.MATCH, "Match", "text-success"],
                [counts.MISMATCH, "Mismatch", "text-destructive"],
                [counts.UNCERTAIN, "Uncertain", "text-warning-foreground"],
              ].map(([n, label, color]) => (
                <div key={label} className="rounded-md bg-background p-3 text-center">
                  <p className={`text-xl font-semibold ${color}`}>{n}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-md border border-border p-3 text-xs leading-5 text-muted-foreground">
              {counts.MISMATCH
                ? "A field differs from the existing record. Review before deciding."
                : counts.UNCERTAIN
                  ? "Some data could not be confirmed with confidence. Manual review is recommended."
                  : "All displayed fields match in this simulated scenario."}
            </div>
          </section>
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Existing customer record</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Fictional baseline · {item.customerId}
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <p className="flex justify-between gap-3">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{item.fields[0]?.existing}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted-foreground">Date of birth</span>
                <span className="font-medium">{item.fields[1]?.existing}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted-foreground">Document ref.</span>
                <span className="font-medium">XXXX · {item.id.slice(-2)}05</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">••••••@example.test</span>
              </p>
            </div>
          </section>
        </aside>
      </div>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "process"
                ? "Process verification request?"
                : dialog === "reject"
                  ? "Reject verification request?"
                  : "Update customer record"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "process"
                ? `Request ${item.id} will be marked verified in the demo.`
                : dialog === "reject"
                  ? `A reason is required before rejecting ${item.id}.`
                  : `Correct a supported field and include the reason for request ${item.id}.`}
            </DialogDescription>
          </DialogHeader>
          {dialog === "reject" && (
            <label className="text-sm font-medium">
              Rejection reason
              <Textarea
                className="mt-2"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Describe why this request cannot be approved"
              />
            </label>
          )}
          {dialog === "update" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Field to update
                <select
                  className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={field}
                  onChange={(event) => {
                    setField(event.target.value);
                    const target = item.fields.find((entry) => entry.label === event.target.value);
                    setProposed(
                      target?.extracted === "—" ? target.existing : (target?.extracted ?? ""),
                    );
                  }}
                >
                  {item.fields.map((entry) => (
                    <option key={entry.label}>{entry.label}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-secondary p-3">
                  <p className="text-[10px] text-muted-foreground">Existing</p>
                  <p className="mt-1 text-xs font-medium">
                    {item.fields.find((entry) => entry.label === field)?.existing ?? "—"}
                  </p>
                </div>
                <div className="rounded-md bg-accent p-3">
                  <p className="text-[10px] text-muted-foreground">Proposed</p>
                  <Input
                    className="mt-1 h-8 bg-card text-xs"
                    value={proposed}
                    onChange={(event) => setProposed(event.target.value)}
                  />
                </div>
              </div>
              <label className="block text-sm font-medium">
                Reason for change
                <Textarea
                  className="mt-2"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain the source for this correction"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Confirming records the correction and marks this demo request verified.
              </p>
            </div>
          )}
          {dialog === "process" && (
            <div className="rounded-md bg-secondary p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Request:</span> {item.id}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Current status:</span>{" "}
                {item.status.replaceAll("_", " ")}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={dialog === "reject" ? "destructive" : "default"}
              onClick={save}
              disabled={busy}
            >
              {busy
                ? "Saving…"
                : dialog === "process"
                  ? "Confirm process"
                  : dialog === "reject"
                    ? "Confirm rejection"
                    : "Confirm update & process"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuditPage() {
  const { audit } = useDemo();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [action, setAction] = useState("All actions");
  const filtered = audit.filter(
    (event) =>
      `${event.id} ${event.customerId} ${event.customer} ${event.requestId} ${event.admin}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (action === "All actions" || event.action.toLowerCase().includes(action.toLowerCase())),
  );
  return (
    <>
      <PageHeading
        title="Audit history"
        description="A read-only record of simulated reviewer decisions and changes."
      />
      <DemoBanner>Demo audit · Entries are locally simulated and cannot be edited</DemoBanner>
      <div className="my-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-9"
            placeholder="Search customer, request or reviewer"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search audit history"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          value={action}
          onChange={(event) => setAction(event.target.value)}
          aria-label="Filter audit action"
        >
          {["All actions", "verified", "rejected", "corrected"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          title="No audit events found"
          text="Actions completed in this demo will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-background text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                {[
                  "Timestamp",
                  "Audit record",
                  "Customer / request",
                  "Reviewer",
                  "Action",
                  "Field change",
                  "",
                ].map((head) => (
                  <th key={head} className="px-4 py-3 font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((event) => (
                <Fragment key={event.id}>
                  <tr
                    className="cursor-pointer hover:bg-accent/20"
                    onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground">{event.timestamp}</td>
                    <td className="px-4 py-3 font-medium">{event.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium">{event.customer}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {event.customerId} · {event.requestId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs">{event.admin}</td>
                    <td className="px-4 py-3 text-xs">{event.action}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{event.field}</td>
                    <td className="px-4 py-3">
                      <ChevronDown
                        size={15}
                        className={`transition-transform ${expanded === event.id ? "rotate-180" : ""}`}
                      />
                    </td>
                  </tr>
                  {expanded === event.id && (
                    <tr className="bg-background">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="grid gap-3 text-xs sm:grid-cols-4">
                          <div>
                            <p className="text-muted-foreground">Previous value</p>
                            <p className="mt-1 font-medium">{event.previous}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">New value</p>
                            <p className="mt-1 font-medium">{event.next}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-muted-foreground">Reason</p>
                            <p className="mt-1 font-medium">{event.reason}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function CustomersPage({ requests }: { requests: DemoRequest[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const filtered = requests.filter(
    (item) =>
      `${item.customerId} ${item.name} ${item.email}`.toLowerCase().includes(query.toLowerCase()) &&
      (status === "All statuses" || item.status === status.toUpperCase().replaceAll(" ", "_")),
  );
  const navigate = useNavigate();
  return (
    <>
      <PageHeading
        title="Customers"
        description="Customer directory and latest verification status."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-9"
            placeholder="Search name or customer ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search customers"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter customers by status"
        >
          {["All statuses", "Under review", "Submitted", "Verified", "Rejected"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No customers found" text="Try another search or status filter." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[740px] text-left text-sm">
            <thead className="border-b border-border bg-background text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Customer", "Contact", "Latest request", "KYC status", "Updated", ""].map(
                  (head) => (
                    <th className="px-4 py-3 font-medium" key={head}>
                      {head}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.customerId} className="hover:bg-accent/20">
                  <td className="px-4 py-4">
                    <p className="font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.customerId}</p>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {item.email.replace(/^(.{2}).*(@.*)$/, "$1•••$2")}
                  </td>
                  <td className="px-4 py-4 text-xs font-medium">{item.id}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">{item.updated}</td>
                  <td className="px-4 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void navigate({ to: "/admin/requests/$id", params: { id: item.id } })
                      }
                    >
                      View details <ArrowRight size={13} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function UnauthorizedPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-warning/20 text-warning-foreground">
          <LockKeyhole size={22} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">This workspace is unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sign in with the appropriate demo role to continue. Role checks in this app are simulated
          and are not production security.
        </p>
        <Link to="/login">
          <Button className="mt-5">Back to sign in</Button>
        </Link>
      </div>
    </div>
  );
}

function ProtectedPage({ page, id }: { page: PageKey; id?: string | undefined }) {
  const { role, ready, requests } = useDemo();
  const expected =
    page.startsWith("admin") || ["requests", "request-detail", "audit", "customers"].includes(page)
      ? "admin"
      : "customer";
  // Wait until the stored demo role is restored before deciding access.
  if (!ready) return null;
  if (role !== expected) return <UnauthorizedPage />;
  let content: ReactNode;
  if (page === "customer-dashboard") content = <CustomerDashboard />;
  else if (page === "documents") content = <DocumentsPage />;
  else if (page === "submit") content = <SubmitPage />;
  else if (page === "status") content = <StatusPage />;
  else if (page === "customer-profile") content = <ProfilePage />;
  else if (page === "admin-dashboard") content = <AdminDashboard requests={requests} />;
  else if (page === "requests") content = <RequestsPage requests={requests} />;
  else if (page === "request-detail") content = <RequestDetail id={id ?? ""} />;
  else if (page === "audit") content = <AuditPage />;
  else if (page === "customers") content = <CustomersPage requests={requests} />;
  else content = <ProfilePage admin />;
  return <AppShell area={expected}>{content}</AppShell>;
}

export function DemoPage({ page, id }: { page: PageKey; id?: string | undefined }) {
  if (page === "landing") return <LandingPage />;
  if (page === "login") return <LoginPage />;
  if (page === "unauthorized") return <UnauthorizedPage />;
  return <ProtectedPage page={page} id={id} />;
}
