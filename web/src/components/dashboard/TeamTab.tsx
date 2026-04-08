// --- Team Tab ---
// Team management: view members, invite, change roles, remove

import { useState, useEffect, useCallback } from "react";
import type { TeamInfo, TeamMember } from "./types";
import { apiFetch } from "./utils";

interface TeamTabProps {
  readonly apiKey: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  member: "bg-green-500/10 text-green-400 border-green-500/20",
  viewer: "bg-muted-foreground/10 text-muted-foreground border-border",
};

function TeamTab({ apiKey }: TeamTabProps) {
  const [teams, setTeams] = useState<readonly TeamInfo[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [createMode, setCreateMode] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<readonly TeamInfo[]>("/teams/", apiKey);
      setTeams(data);
      if (data.length > 0 && !selectedTeam) {
        const full = await apiFetch<TeamInfo>(`/teams/${data[0].id}`, apiKey);
        setSelectedTeam(full);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load teams";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [apiKey, selectedTeam]);

  useEffect(() => {
    loadTeams();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateTeam = useCallback(async () => {
    if (!newTeamName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const team = await apiFetch<TeamInfo>("/teams/", apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      setSelectedTeam(team);
      setCreateMode(false);
      setNewTeamName("");
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setSaving(false);
    }
  }, [newTeamName, apiKey, loadTeams]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !selectedTeam) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/teams/${selectedTeam.id}/members`, apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      setInviteEmail("");
      // Reload team
      const full = await apiFetch<TeamInfo>(`/teams/${selectedTeam.id}`, apiKey);
      setSelectedTeam(full);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setSaving(false);
    }
  }, [inviteEmail, inviteRole, selectedTeam, apiKey]);

  const handleRemoveMember = useCallback(
    async (email: string) => {
      if (!selectedTeam) return;
      setError("");
      try {
        await apiFetch(
          `/teams/${selectedTeam.id}/members/${encodeURIComponent(email)}`,
          apiKey,
          { method: "DELETE" },
        );
        const full = await apiFetch<TeamInfo>(`/teams/${selectedTeam.id}`, apiKey);
        setSelectedTeam(full);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove member");
      }
    },
    [selectedTeam, apiKey],
  );

  const handleChangeRole = useCallback(
    async (email: string, newRole: string) => {
      if (!selectedTeam) return;
      setError("");
      try {
        await apiFetch(
          `/teams/${selectedTeam.id}/members/${encodeURIComponent(email)}/role`,
          apiKey,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
          },
        );
        const full = await apiFetch<TeamInfo>(`/teams/${selectedTeam.id}`, apiKey);
        setSelectedTeam(full);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to change role");
      }
    },
    [selectedTeam, apiKey],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage team members and roles
          </p>
        </div>
        {!createMode && (
          <button
            onClick={() => setCreateMode(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            New Team
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3 text-xs text-red-500">
          {error}
        </div>
      )}

      {/* Create team form */}
      {createMode && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Create Team
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Team name"
              className="flex-1 bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
            />
            <button
              onClick={handleCreateTeam}
              disabled={saving || !newTeamName.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              {saving ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => {
                setCreateMode(false);
                setNewTeamName("");
              }}
              className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Loading teams...
        </div>
      )}

      {/* No teams */}
      {!loading && teams.length === 0 && !createMode && (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <div className="text-4xl mb-3">{"\u2660"}</div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            No teams yet
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Create a team to collaborate on agent policies and audit
          </p>
          <button
            onClick={() => setCreateMode(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Create Your First Team
          </button>
        </div>
      )}

      {/* Team view */}
      {selectedTeam && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Team header */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {selectedTeam.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedTeam.members.length} member
                  {selectedTeam.members.length !== 1 ? "s" : ""}
                  {" \u00B7 "}
                  <span className="font-mono">{selectedTeam.id}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Invite form */}
          <div className="px-5 py-4 border-b border-border bg-primary/[0.02]">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Invite Member
            </h3>
            <div className="flex items-center gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none cursor-pointer appearance-none w-[120px]"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={saving || !inviteEmail.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                {saving ? "Inviting..." : "Invite"}
              </button>
            </div>
          </div>

          {/* Members list */}
          <div className="divide-y divide-border">
            {selectedTeam.members.map((member) => (
              <MemberRow
                key={member.email}
                member={member}
                isOwner={member.role === "owner"}
                onRemove={() => handleRemoveMember(member.email)}
                onChangeRole={(role) =>
                  handleChangeRole(member.email, role)
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Member Row ---

interface MemberRowProps {
  readonly member: TeamMember;
  readonly isOwner: boolean;
  readonly onRemove: () => void;
  readonly onChangeRole: (role: string) => void;
}

function MemberRow({ member, isOwner, onRemove, onChangeRole }: MemberRowProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-primary/[0.02] transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          {member.email.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">
            {member.email}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {member.joined_at ? "Joined" : "Invited"}{" "}
            {new Date(member.joined_at ?? member.invited_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-[11px] font-semibold border ${
            ROLE_COLORS[member.role] ?? ROLE_COLORS.viewer
          }`}
        >
          {ROLE_LABELS[member.role] ?? member.role}
        </span>

        {!isOwner && (
          <div className="flex items-center gap-1.5">
            <select
              defaultValue={member.role}
              onChange={(e) => onChangeRole(e.target.value)}
              className="bg-background border border-border rounded-lg px-2 py-1 text-[11px] text-foreground outline-none cursor-pointer appearance-none"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={onRemove}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1.5"
              title="Remove member"
            >
              {"\u2715"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { TeamTab };
