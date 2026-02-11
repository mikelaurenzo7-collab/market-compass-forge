import { useCompanyDocuments } from "@/hooks/useCompanyData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUp, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentUploadProps {
  companyId: string;
}

export default function DocumentUpload({ companyId }: DocumentUploadProps) {
  const { data: documents, isLoading } = useCompanyDocuments(companyId);

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Documents</h3>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" disabled>
          <FileUp className="h-3.5 w-3.5" />
          Upload
        </Button>
      </div>

      {!documents?.length ? (
        <Card className="bg-card/50 border-border/50 border-dashed">
          <CardContent className="p-8 text-center">
            <FileUp className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Upload pitch decks, financials, or term sheets for AI extraction
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">File</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Version</TableHead>
                  <TableHead className="text-xs">Red Flags</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} className="border-border/30">
                    <TableCell className="text-sm font-medium">{doc.file_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{doc.document_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">v{doc.version}</TableCell>
                    <TableCell>
                      {Array.isArray(doc.red_flags) && doc.red_flags.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          <span className="text-xs text-amber-500">{doc.red_flags.length}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
