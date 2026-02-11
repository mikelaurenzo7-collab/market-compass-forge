import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EarlyAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

const EarlyAccessModal = ({ isOpen, onClose, featureName = "this feature" }: EarlyAccessModalProps) => {
  const [formData, setFormData] = useState({ name: "", email: "", firm: "", title: "", interest: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const interests = [
    "Fund Intelligence",
    "Real Estate Intel",
    "AI Research",
    "Document Analysis",
    "Deal Flow Tracking",
    "Company Screening",
    "Other"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.from("waitlist_signups").insert({
        name: formData.name,
        email: formData.email,
        firm: formData.firm || null,
        title: formData.title || null,
        interest: formData.interest || null,
      });
      if (error) throw error;
    } catch (err) {
      console.error("Waitlist signup error:", err);
    }
    
    setSubmitted(true);
    setLoading(false);
    
    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setFormData({ name: "", email: "", firm: "", title: "", interest: "" });
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Get Early Access</DialogTitle>
          <DialogDescription>
            Join the waitlist for {featureName} and be among the first to use it.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium text-foreground">You're on the list!</p>
            <p className="text-xs text-muted-foreground text-center">
              We'll notify you at {formData.email} when {featureName} is ready.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name *</label>
              <Input
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email *</label>
              <Input
                type="email"
                placeholder="you@firm.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Firm</label>
              <Input
                placeholder="Your firm (optional)"
                value={formData.firm}
                onChange={(e) => setFormData({ ...formData, firm: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
              <Input
                placeholder="Your title (optional)"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary Interest</label>
              <Select value={formData.interest} onValueChange={(value) => setFormData({ ...formData, interest: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an interest" />
                </SelectTrigger>
                <SelectContent>
                  {interests.map((interest) => (
                    <SelectItem key={interest} value={interest}>
                      {interest}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-4 gap-2" 
              disabled={loading || !formData.name || !formData.email}
            >
              <Mail className="h-4 w-4" />
              {loading ? "Joining..." : "Join Waitlist"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EarlyAccessModal;
