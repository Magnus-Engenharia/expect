import { useState, useRef, useEffect } from "react";
import { type Member, type UserProfile, generateMemberId } from "../data.ts";
import { Modal } from "../components/modal.tsx";
import { useToast } from "../components/toast.tsx";
import { DataTable, type Column } from "../components/data-table.tsx";

const DEBOUNCE_MS = 300;
const EMAIL_REGEX = /^[^@]+@[^@]+\.[^@]+$/;

interface TeamPageProps {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  currentUser: UserProfile;
}

const capitalizeNameFromEmail = (email: string): string => {
  const part = email.split("@")[0];
  if (part.length === 0) return email;
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
};

export const TeamPage = ({ members, setMembers, currentUser }: TeamPageProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "viewer">("member");
  const { showToast } = useToast();

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      debounceTimerRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const filteredMembers = members.filter((member) => {
    if (!debouncedQuery.trim()) return true;
    const query = debouncedQuery.toLowerCase();
    return member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query);
  });

  const handleRoleChange = (memberId: string, newRole: Member["role"]) => {
    setMembers((previous) =>
      previous.map((member) => (member.id === memberId ? { ...member, role: newRole } : member)),
    );
    const member = members.find((m) => m.id === memberId);
    if (member) {
      showToast(`Role updated for ${member.name}`);
    }
  };

  const handleConfirmRemove = () => {
    if (!memberToRemove) return;
    const name = memberToRemove.name;
    setMembers((previous) => previous.filter((member) => member.id !== memberToRemove.id));
    showToast(`${name} removed from team`);
    setMemberToRemove(null);
  };

  const inviteEmailValid = EMAIL_REGEX.test(inviteEmail);
  const inviteEmailDuplicate = members.some(
    (member) => member.email.toLowerCase() === inviteEmail.toLowerCase(),
  );
  const inviteFormValid = inviteEmailValid && !inviteEmailDuplicate;

  const handleInviteSubmit = () => {
    if (!inviteFormValid) return;
    const name = capitalizeNameFromEmail(inviteEmail);
    const newMember: Member = {
      id: generateMemberId(),
      email: inviteEmail,
      name,
      role: inviteRole,
      joinedAt: new Date().toISOString().split("T")[0],
    };
    setMembers((previous) => [...previous, newMember]);
    showToast(`Invited ${inviteEmail}`);
    setInviteModalOpen(false);
    setInviteEmail("");
    setInviteRole("member");
  };

  const columns: Column<Member>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => row.name,
      sortValue: (row) => row.name,
    },
    {
      key: "email",
      header: "Email",
      render: (row) => row.email,
      sortValue: (row) => row.email,
    },
    {
      key: "role",
      header: "Role",
      render: (row) => {
        if (currentUser.role === "admin") {
          return (
            <select
              value={row.role}
              onChange={(event) => handleRoleChange(row.id, event.target.value as Member["role"])}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="admin">admin</option>
              <option value="member">member</option>
              <option value="viewer">viewer</option>
            </select>
          );
        }
        return <span className="capitalize">{row.role}</span>;
      },
      sortValue: (row) => row.role,
    },
    {
      key: "joined",
      header: "Joined",
      render: (row) => row.joinedAt,
      sortValue: (row) => row.joinedAt,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <button
          onClick={() => setMemberToRemove(row)}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Remove
        </button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <button
          onClick={() => setInviteModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Invite Member
        </button>
      </div>

      <input
        type="text"
        placeholder="Search members..."
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        className="w-full max-w-md mb-4 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      <DataTable columns={columns} data={filteredMembers} rowKey={(row) => row.id} />

      <Modal
        isOpen={memberToRemove !== null}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemove}
        title={memberToRemove ? `Remove ${memberToRemove.name}?` : ""}
        confirmLabel="Remove"
        destructive
      >
        <p className="text-gray-600">
          This will remove them from the team. This action cannot be undone.
        </p>
      </Modal>

      <Modal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setInviteEmail("");
          setInviteRole("member");
        }}
        onConfirm={handleInviteSubmit}
        title="Invite Member"
        confirmLabel="Invite"
        confirmDisabled={!inviteFormValid}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="colleague@example.com"
            />
            {inviteEmail.length > 0 && !inviteEmailValid && (
              <p className="mt-1 text-sm text-red-600">Please enter a valid email address</p>
            )}
            {inviteEmail.length > 0 && inviteEmailValid && inviteEmailDuplicate && (
              <p className="mt-1 text-sm text-red-600">This person is already a team member</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "member" || value === "viewer") {
                  setInviteRole(value);
                }
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="member">member</option>
              <option value="viewer">viewer</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};
