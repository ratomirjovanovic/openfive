"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

const columns: ColumnDef<MemberRow>[] = [
  { accessorKey: "user_id", header: "User ID" },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <StatusBadge status={row.original.role} />,
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-600">
        {new Date(row.original.created_at).toLocaleDateString()}
      </span>
    ),
  },
];

export default function UsersPage() {
  const [showInvite, setShowInvite] = useState(false);
  const members: MemberRow[] = [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        description="Manage team members and their access levels."
        action={
          <Button onClick={() => setShowInvite(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Invite member
          </Button>
        }
      />

      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No team members"
          description="Invite team members to collaborate on managing your LLM gateway."
          actionLabel="Invite member"
          onAction={() => setShowInvite(true)}
        />
      ) : (
        <DataTable columns={columns} data={members} />
      )}

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              Add a team member to this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email address</Label>
              <Input type="email" placeholder="team@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select defaultValue="member">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button>Send invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
