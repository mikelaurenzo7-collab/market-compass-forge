const SECTOR_COLORS: Record<string, string> = {
  "AI/ML": "bg-violet-500/15 text-violet-400",
  "Fintech": "bg-emerald-500/15 text-emerald-400",
  "Cybersecurity": "bg-red-500/15 text-red-400",
  "Enterprise SaaS": "bg-blue-500/15 text-blue-400",
  "Developer Tools": "bg-amber-500/15 text-amber-400",
  "Healthcare": "bg-pink-500/15 text-pink-400",
  "Defense Tech": "bg-slate-500/15 text-slate-300",
  "Consumer": "bg-orange-500/15 text-orange-400",
  "Infrastructure": "bg-cyan-500/15 text-cyan-400",
  "Logistics": "bg-teal-500/15 text-teal-400",
  "Crypto/Web3": "bg-yellow-500/15 text-yellow-400",
  "Climate Tech": "bg-green-500/15 text-green-400",
  "EdTech": "bg-indigo-500/15 text-indigo-400",
  "E-Commerce": "bg-fuchsia-500/15 text-fuchsia-400",
  "Real Estate": "bg-stone-500/15 text-stone-400",
  "Financial Services": "bg-emerald-500/15 text-emerald-400",
  "Manufacturing": "bg-zinc-500/15 text-zinc-400",
  "Construction": "bg-amber-600/15 text-amber-500",
  "Services": "bg-sky-500/15 text-sky-400",
};

const DEFAULT_COLOR = "bg-accent text-accent-foreground";

interface CompanyAvatarProps {
  name: string;
  sector?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

const CompanyAvatar = ({ name, sector, size = "sm" }: CompanyAvatarProps) => {
  const initials = name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const colorClass = sector ? SECTOR_COLORS[sector] ?? DEFAULT_COLOR : DEFAULT_COLOR;

  return (
    <div className={`rounded flex items-center justify-center shrink-0 font-bold ${sizeClasses[size]} ${colorClass}`}>
      {initials}
    </div>
  );
};

export default CompanyAvatar;
