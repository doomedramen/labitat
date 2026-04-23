"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/login-form";
import { GroupDialog } from "@/components/editor/group-dialog";
import { ItemDialog } from "@/components/editor/item-dialog";
import type { GroupWithCache, GroupWithItems, ItemWithCache } from "@/lib/types";

interface DialogsProps {
  loginOpen: boolean;
  onLoginOpenChange: (open: boolean) => void;
  groupDialogOpen: boolean;
  onGroupDialogOpenChange: (open: boolean) => void;
  itemDialogOpen: boolean;
  onItemDialogOpenChange: (open: boolean) => void;
  editingGroup: GroupWithCache | null;
  editingItem: ItemWithCache | null;
  targetGroupId: string;
  onGroupsChanged: (groups: GroupWithItems[]) => void;
}

export function Dialogs({
  loginOpen,
  onLoginOpenChange,
  groupDialogOpen,
  onGroupDialogOpenChange,
  itemDialogOpen,
  onItemDialogOpenChange,
  editingGroup,
  editingItem,
  targetGroupId,
  onGroupsChanged,
}: DialogsProps) {
  return (
    <>
      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={onGroupDialogOpenChange}
        group={editingGroup}
        onGroupsChanged={onGroupsChanged}
      />
      <ItemDialog
        key={editingItem?.id ?? "new"}
        open={itemDialogOpen}
        onOpenChange={onItemDialogOpenChange}
        item={editingItem}
        groupId={targetGroupId}
        onGroupsChanged={onGroupsChanged}
      />
      <Dialog open={loginOpen} onOpenChange={onLoginOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in</DialogTitle>
            <DialogDescription>Enter your credentials to access your dashboard.</DialogDescription>
          </DialogHeader>
          <LoginForm />
        </DialogContent>
      </Dialog>
    </>
  );
}
