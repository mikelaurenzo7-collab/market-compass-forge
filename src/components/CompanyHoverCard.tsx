import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { TrendingUp, Users, MapPin, Zap } from "lucide-react";
import { formatCurrency } from "@/hooks/useData";
import CompanyAvatar from "@/components/CompanyAvatar";

type CompanyPreview = {
  id: string;
  name: string;
  sector?: string | null;
  stage?: string | null;
  hq_country?: string | null;
  employee_count?: number | null;
  valuation?: number | null;
  arr?: number | null;
  latestEvent?: string | null;
};

const CompanyHoverCard = ({
  company,
  children,
}: {
  company: CompanyPreview;
  children: ReactNode;
}) => {
  const navigate = useNavigate();

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-72 p-0 border-border bg-card shadow-xl"
      >
        <div
          className="p-3 cursor-pointer hover:bg-secondary/30 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/companies/${company.id}`);
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CompanyAvatar name={company.name} sector={company.sector} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{company.name}</p>
              <div className="flex items-center gap-1.5">
                {company.sector && (
                  <span className="text-[10px] text-muted-foreground">{company.sector}</span>
                )}
                {company.stage && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent text-accent-foreground">
                    {company.stage}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {company.valuation != null && (
              <div className="flex items-center gap-1.5 text-xs">
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Val:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(company.valuation)}
                </span>
              </div>
            )}
            {company.arr != null && (
              <div className="flex items-center gap-1.5 text-xs">
                <Zap className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">ARR:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(company.arr)}
                </span>
              </div>
            )}
            {company.employee_count != null && (
              <div className="flex items-center gap-1.5 text-xs">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{company.employee_count.toLocaleString()}</span>
              </div>
            )}
            {company.hq_country && (
              <div className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{company.hq_country}</span>
              </div>
            )}
          </div>

          {company.latestEvent && (
            <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 border-t border-border/50 pt-2">
              {company.latestEvent}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default CompanyHoverCard;
