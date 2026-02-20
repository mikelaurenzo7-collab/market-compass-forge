import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";

/**
 * Platform layout — wraps all authenticated routes with the sidebar shell.
 * Children slot receives the page content within the main area.
 */
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      <CommandPalette />
    </div>
  );
}
