import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your organization settings."
      />

      <Card className="border-neutral-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization name</Label>
            <Input placeholder="My Organization" />
          </div>
          <div className="space-y-2">
            <Label>Billing email</Label>
            <Input type="email" placeholder="billing@example.com" />
          </div>
          <Button size="sm">Save changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
