import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatCard,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
  Progress,
  Avatar,
  SearchBar,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Folder,
  Users2,
  MessageSquare,
  Search,
  Mail,
  Lock,
  Moon,
  Sun,
  Palette,
  Type,
  Maximize2,
  Box,
  Layers,
  Component as ComponentIcon,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { TypoHeading, TypoSection, TypoCard, TypoCaption } from "@/components/shared/Typography";

export const Route = createFileRoute("/_app/design-system")({
  head: () => ({
    meta: [
      { title: "Design System & UI Standards — DevLink" },
      {
        name: "description",
        content: "Centralized design tokens, semantic themes, and standardized UI components.",
      },
    ],
  }),
  component: DesignSystemPage,
});

function DesignSystemPage() {
  const { isDark, toggleTheme } = useTheme();
  const [progressVal, setProgressVal] = React.useState(68);
  const [inputValue, setInputValue] = React.useState("");
  const [searchVal, setSearchVal] = React.useState("");
  const [buttonLoading, setButtonLoading] = React.useState(false);
  const [switchChecked, setSwitchChecked] = React.useState(true);

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-8 sm:px-6 space-y-12 pb-24">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Palette size={18} />
            </span>
            <TypoHeading as="h1">DevLink Design System</TypoHeading>
            <Badge variant="primary" className="ml-2">v1.0 • Issue #952</Badge>
          </div>
          <TypoCaption as="p">
            Production-ready design tokens, semantic light/dark themes, and standardized UI components.
          </TypoCaption>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="gap-2"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </Button>
        </div>
      </div>

      {/* ── Section 1: Color Tokens ──────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-primary" />
          <TypoSection as="h2">1. Semantic Color Tokens</TypoSection>
        </div>
        <p className="text-xs text-muted-foreground">
          Theme-aware semantic tokens. The UI strictly consumes semantic tokens so both light and dark modes look balanced and accessible.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <ColorSwatch name="Primary Cyan" token="--primary" hex="#05b7d7" bgClass="bg-primary" textClass="text-primary-foreground" />
          <ColorSwatch name="Background" token="--background" hex="Adaptive" bgClass="bg-background" textClass="text-foreground" border />
          <ColorSwatch name="Surface / Card" token="--surface" hex="Adaptive" bgClass="bg-card" textClass="text-card-foreground" border />
          <ColorSwatch name="Surface Muted" token="--muted" hex="Adaptive" bgClass="bg-muted" textClass="text-muted-foreground" border />
          <ColorSwatch name="Border" token="--border" hex="Adaptive" bgClass="bg-border" textClass="text-foreground" />
          <ColorSwatch name="Primary Soft" token="--primary-soft" hex="12-16% Cyan" bgClass="bg-primary-soft" textClass="text-primary" border />
          <ColorSwatch name="Success" token="--success" hex="#1a7f37 / #3fb950" bgClass="bg-success" textClass="text-success-foreground" />
          <ColorSwatch name="Warning" token="--warning" hex="#bf8700 / #d29922" bgClass="bg-warning" textClass="text-warning-foreground" />
          <ColorSwatch name="Danger / Destructive" token="--destructive" hex="#cf222e / #f85149" bgClass="bg-destructive" textClass="text-destructive-foreground" />
          <ColorSwatch name="Info" token="--info" hex="#0969da / #58a6ff" bgClass="bg-info" textClass="text-info-foreground" />
          <ColorSwatch name="Text Primary" token="--foreground" hex="Adaptive" bgClass="bg-foreground" textClass="text-background" />
          <ColorSwatch name="Text Secondary" token="--text-secondary" hex="Adaptive" bgClass="bg-secondary" textClass="text-secondary-foreground" border />
        </div>
      </section>

      {/* ── Section 2: Typography Scale ───────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Type size={18} className="text-primary" />
          <TypoSection as="h2">2. Typography Scale</TypoSection>
        </div>
        <p className="text-xs text-muted-foreground">
          Built on Inter with clear weights, tight letter-spacing for headings, and high legibility.
        </p>

        <Card className="divide-y divide-border/60">
          <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="w-48 shrink-0">
              <span className="text-xs font-mono font-semibold text-primary">Hero Display</span>
              <p className="text-[11px] text-muted-foreground">36-60px • Bold 800</p>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Build Together with DevLink
            </p>
          </div>
          <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="w-48 shrink-0">
              <span className="text-xs font-mono font-semibold text-primary">Heading 1 / Page Title</span>
              <p className="text-[11px] text-muted-foreground">24-30px • Bold 700</p>
            </div>
            <TypoHeading as="h1">Developer Dashboard & Projects</TypoHeading>
          </div>
          <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="w-48 shrink-0">
              <span className="text-xs font-mono font-semibold text-primary">Section Heading</span>
              <p className="text-[11px] text-muted-foreground">20-24px • Semibold 600</p>
            </div>
            <TypoSection as="h2">Recommended AI Matches</TypoSection>
          </div>
          <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="w-48 shrink-0">
              <span className="text-xs font-mono font-semibold text-primary">Card Title</span>
              <p className="text-[11px] text-muted-foreground">16-18px • Semibold 600</p>
            </div>
            <TypoCard as="h3">Cloud Native Microservices Platform</TypoCard>
          </div>
          <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="w-48 shrink-0">
              <span className="text-xs font-mono font-semibold text-primary">Body Regular</span>
              <p className="text-[11px] text-muted-foreground">14-16px • Regular 400</p>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              DevLink is an open-source collaboration platform connecting talented builders, engineers, and creators.
            </p>
          </div>
          <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="w-48 shrink-0">
              <span className="text-xs font-mono font-semibold text-primary">Caption & Labels</span>
              <p className="text-[11px] text-muted-foreground">12-13px • Regular/Medium</p>
            </div>
            <TypoCaption as="p">Last active 5 minutes ago • 24 team members collaborating</TypoCaption>
          </div>
        </Card>
      </section>

      {/* ── Section 3: Spacing & Radius Scales ────────────────────── */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* Spacing */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Maximize2 size={18} className="text-primary" />
            <TypoSection as="h2">3. Spacing Scale (8px Grid)</TypoSection>
          </div>
          <Card className="p-5 space-y-3">
            <SpacingBar label="--space-1 (4px)" width="w-1" />
            <SpacingBar label="--space-2 (8px)" width="w-2" />
            <SpacingBar label="--space-3 (12px)" width="w-3" />
            <SpacingBar label="--space-4 (16px)" width="w-4" />
            <SpacingBar label="--space-6 (24px)" width="w-6" />
            <SpacingBar label="--space-8 (32px)" width="w-8" />
            <SpacingBar label="--space-12 (48px)" width="w-12" />
            <SpacingBar label="--space-16 (64px)" width="w-16" />
          </Card>
        </div>

        {/* Radius */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Box size={18} className="text-primary" />
            <TypoSection as="h2">4. Border Radius Scale</TypoSection>
          </div>
          <Card className="p-5 grid grid-cols-2 gap-4">
            <div className="border border-border/70 bg-surface p-4 rounded-sm text-center">
              <p className="text-xs font-semibold">radius-sm (6px)</p>
              <p className="text-[11px] text-muted-foreground">Tags & Sub-items</p>
            </div>
            <div className="border border-border/70 bg-surface p-4 rounded-md text-center">
              <p className="text-xs font-semibold">radius-md (10px)</p>
              <p className="text-[11px] text-muted-foreground">Buttons & Inputs</p>
            </div>
            <div className="border border-border/70 bg-surface p-4 rounded-lg text-center">
              <p className="text-xs font-semibold">radius-lg (14px)</p>
              <p className="text-[11px] text-muted-foreground">Cards & Modals</p>
            </div>
            <div className="border border-border/70 bg-surface p-4 rounded-full text-center">
              <p className="text-xs font-semibold">radius-pill (9999px)</p>
              <p className="text-[11px] text-muted-foreground">Badges & Avatars</p>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Section 4: Reusable UI Components Catalog ─────────────── */}
      <section className="space-y-8">
        <div className="flex items-center gap-2">
          <ComponentIcon size={18} className="text-primary" />
          <TypoSection as="h2">5. Reusable Component Suite</TypoSection>
        </div>

        {/* Buttons */}
        <Card className="p-6 space-y-5">
          <div>
            <TypoCard as="h3">Button Component</TypoCard>
            <p className="text-xs text-muted-foreground">
              Supports variants: primary, secondary, outline, ghost, danger, link, plus sizes sm, md, lg, icon, and loading states.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Cyan</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link Button</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50">
            <Button size="sm">Small (sm)</Button>
            <Button size="md">Medium (md)</Button>
            <Button size="lg">Large (lg)</Button>
            <Button
              loading={buttonLoading}
              onClick={() => {
                setButtonLoading(true);
                setTimeout(() => setButtonLoading(false), 1500);
              }}
            >
              {buttonLoading ? "Submitting..." : "Click for Loading State"}
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>

        {/* Form Inputs */}
        <Card className="p-6 space-y-5">
          <div>
            <TypoCard as="h3">Form Inputs & Controls</TypoCard>
            <p className="text-xs text-muted-foreground">
              Standardized Input, Textarea, Select, Checkbox, Radio, and Switch with labels, validation errors, and helper text.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Standard Input"
              placeholder="e.g. alex@devlink.com"
              leftIcon={<Mail size={15} />}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helperText="We will never share your email."
            />

            <Input
              label="Password Input"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock size={15} />}
              required
            />

            <Input
              label="Validation Error State"
              defaultValue="invalid_username@"
              error="Username can only contain alphanumeric characters."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-border/50">
            <Textarea
              label="Project Description"
              placeholder="Briefly describe what you're building..."
              helperText="Markdown is supported."
            />

            <div className="space-y-4">
              <label className="text-xs font-semibold text-foreground block">Interactive Controls</label>
              <div className="flex items-center gap-3">
                <Switch
                  id="demo-switch"
                  checked={switchChecked}
                  onCheckedChange={setSwitchChecked}
                />
                <Label htmlFor="demo-switch" className="text-xs">
                  Available for new collaborations
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="demo-check" defaultChecked />
                <Label htmlFor="demo-check" className="text-xs">
                  Receive email notifications
                </Label>
              </div>

              <RadioGroup defaultValue="public" className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="r1" />
                  <Label htmlFor="r1" className="text-xs">Public</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="r2" />
                  <Label htmlFor="r2" className="text-xs">Private</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </Card>

        {/* Stat Cards */}
        <div className="space-y-4">
          <div>
            <TypoCard as="h3">Standardized StatCard Component</TypoCard>
            <p className="text-xs text-muted-foreground">
              Replaces one-off statistic cards across the dashboard and analytics.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Folder}
              value="12"
              label="Active Projects"
              trend="+ 25% this month"
              trendType="positive"
              iconColor="text-blue-500"
              bgColor="bg-blue-500/10"
              interactive
            />
            <StatCard
              icon={Users2}
              value="48"
              label="Team Contributors"
              trend="+ 12% new joins"
              trendType="positive"
              iconColor="text-emerald-500"
              bgColor="bg-emerald-500/10"
              interactive
            />
            <StatCard
              icon={MessageSquare}
              value="5"
              label="Unread Messages"
              trend="- 15% pending"
              trendType="negative"
              iconColor="text-violet-500"
              bgColor="bg-violet-500/10"
              interactive
            />
            <StatCard
              icon={Sparkles}
              value="94%"
              label="AI Compatibility Score"
              trend="+ 8% accuracy"
              trendType="positive"
              iconColor="text-primary"
              bgColor="bg-primary-soft"
              interactive
            />
          </div>
        </div>

        {/* Badges & Chips */}
        <Card className="p-6 space-y-5">
          <div>
            <TypoCard as="h3">Badge & Tag System</TypoCard>
            <p className="text-xs text-muted-foreground">
              Compact pill badges for project statuses, AI match percentages, roles, and categories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant="primary">Primary Cyan</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success" dot>Active / Online</Badge>
            <Badge variant="warning" dot>Pending Review</Badge>
            <Badge variant="danger" dot>Action Required</Badge>
            <Badge variant="info">AI 98% Match</Badge>
            <Badge variant="outline">TypeScript</Badge>
            <Badge variant="outline">React 19</Badge>
            <Badge variant="outline">FastAPI</Badge>
          </div>
        </Card>

        {/* Alerts & Notifications */}
        <div className="space-y-4">
          <div>
            <TypoCard as="h3">Alert Banners & Notice Components</TypoCard>
            <p className="text-xs text-muted-foreground">
              Standardized alerts for system maintenance, verification, and critical alerts.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Alert variant="info" onDismiss={() => {}}>
              <AlertTitle>New Feature: AI Repository Linking</AlertTitle>
              <AlertDescription>
                Connect your GitHub repositories to automatically score project code quality.
              </AlertDescription>
            </Alert>

            <Alert variant="success" onDismiss={() => {}}>
              <AlertTitle>Profile Updated</AlertTitle>
              <AlertDescription>
                Your skills and portfolio changes have been saved to DevLink.
              </AlertDescription>
            </Alert>

            <Alert variant="warning" onDismiss={() => {}}>
              <AlertTitle>Scheduled Maintenance</AlertTitle>
              <AlertDescription>
                DevLink services will undergo planned infrastructure upgrades Sunday at 02:00 UTC.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive" onDismiss={() => {}}>
              <AlertTitle>Email Verification Needed</AlertTitle>
              <AlertDescription>
                Please verify your email address to unlock project applications.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Progress & SearchBar */}
        <div className="grid sm:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <TypoCard as="h3">Progress Component</TypoCard>
              <span className="text-xs font-semibold text-primary">{progressVal}%</span>
            </div>
            <Progress value={progressVal} />
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProgressVal(Math.max(0, progressVal - 15))}
              >
                -15%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProgressVal(Math.min(100, progressVal + 15))}
              >
                +15%
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <TypoCard as="h3">SearchBar Component</TypoCard>
            <SearchBar
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onClear={() => setSearchVal("")}
              placeholder="Try searching components..."
            />
            <p className="text-[11px] text-muted-foreground">
              Also supports trigger button mode for modal search bars (⌘K).
            </p>
          </Card>
        </div>

        {/* Avatars */}
        <Card className="p-6 space-y-5">
          <div>
            <TypoCard as="h3">Avatar System</TypoCard>
            <p className="text-xs text-muted-foreground">
              Standardized sizes (xs, sm, md, lg, xl), initials fallback, and live status dots.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <Avatar name="Sarah Connor" size="xs" online />
              <span className="text-[10px] text-muted-foreground">XS (24px)</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Avatar name="Alex Rivera" size="sm" online />
              <span className="text-[10px] text-muted-foreground">SM (32px)</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Avatar name="Michael Scott" size="md" online />
              <span className="text-[10px] text-muted-foreground">MD (40px)</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Avatar name="Elena Rostova" size="lg" online={false} />
              <span className="text-[10px] text-muted-foreground">LG (48px)</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Avatar name="DevLink Bot" size="xl" online />
              <span className="text-[10px] text-muted-foreground">XL (64px)</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

function ColorSwatch({
  name,
  token,
  hex,
  bgClass,
  textClass,
  border = false,
}: {
  name: string;
  token: string;
  hex: string;
  bgClass: string;
  textClass: string;
  border?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border/70 bg-surface overflow-hidden shadow-xs">
      <div
        className={`h-16 w-full flex items-center justify-center font-mono text-[11px] font-bold ${bgClass} ${textClass} ${
          border ? "border-b border-border/50" : ""
        }`}
      >
        Aa
      </div>
      <div className="p-2.5">
        <p className="text-xs font-semibold truncate text-foreground">{name}</p>
        <p className="text-[10px] font-mono text-muted-foreground truncate">{token}</p>
      </div>
    </div>
  );
}

function SpacingBar({ label, width }: { label: string; width: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs font-mono text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 bg-muted/40 rounded h-3 overflow-hidden">
        <div className={`h-full bg-primary/70 rounded ${width}`} />
      </div>
    </div>
  );
}
