"use client";

import { useEffect, useState } from "react";

import { useDashboardSession } from "@/components/providers/DashboardSessionProvider";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatText, t } from "@/lib/i18n";
import { useI18n } from "@/components/providers/I18nProvider";

const INITIAL_FORM_STATE = {
  email: "",
  name: "",
  role: "staff",
  password: "",
};

export default function StaffManager() {
  const { dict } = useI18n();
  const { session } = useDashboardSession();
  const [users, setUsers] = useState([]);
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadStaff() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/staff", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Failed to load staff"));
        }

        if (!isMounted) {
          return;
        }

        setUsers(payload.users);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatusMessage(error.message || t(dict, "staff.loadFailed"));
        setUsers([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStaff();

    return () => {
      isMounted = false;
    };
  }, [dict]);

  function updateField(fieldName, value) {
    setFormState((currentState) => ({
      ...currentState,
      [fieldName]: value,
    }));
  }

  function resetForm() {
    setFormState(INITIAL_FORM_STATE);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatusMessage("");
    setIsSaving(true);

    try {
      const response = await fetch(editingId ? `/api/staff/${editingId}` : "/api/staff", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId
            ? {
                name: formState.name,
                role: formState.role,
                password: formState.password,
              }
            : formState
        ),
      });
      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(getApiErrorMessage(payload, t(dict, "staff.saveFailed")));
        return;
      }

      if (editingId) {
        setUsers((currentUsers) =>
          currentUsers.map((user) => (user.id === editingId ? payload.user : user))
        );
        setStatusMessage(t(dict, "staff.updated"));
      } else {
        setUsers((currentUsers) => [...currentUsers, payload.user]);
        setStatusMessage(t(dict, "staff.created"));
      }

      resetForm();
    } catch {
      setStatusMessage(t(dict, "staff.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(user) {
    setEditingId(user.id);
    setFormState({
      email: user.email,
      name: user.name,
      role: user.role,
      password: "",
    });
  }

  async function handleDelete(userId) {
    setStatusMessage("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/staff/${userId}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(getApiErrorMessage(payload, t(dict, "staff.deleteFailed")));
        return;
      }

      setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
      setStatusMessage(t(dict, "staff.deleted"));
    } catch {
      setStatusMessage(t(dict, "staff.deleteFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="z-menu-manager">
      <div className="z-menu-manager-header z-card">
        <div>
          <p className="z-dashboard-kicker">{t(dict, "staff.kicker")}</p>
          <h1>{t(dict, "staff.title")}</h1>
          <p className="z-dashboard-copy">{t(dict, "staff.description")}</p>
          {session?.restaurant?.name ? <p className="z-dashboard-copy">{session.restaurant.name}</p> : null}
        </div>
      </div>

      {isLoading ? <p className="z-dashboard-notice">{t(dict, "staff.loading")}</p> : null}
      {statusMessage ? <p className="z-dashboard-notice">{statusMessage}</p> : null}

      <div className="z-menu-manager-grid">
        <section className="z-menu-form-panel z-card">
          <div className="z-panel-heading">
            <h2>{editingId ? t(dict, "staff.editTitle") : t(dict, "staff.addTitle")}</h2>
            <p>{t(dict, "staff.formDescription")}</p>
          </div>

          <form className="z-menu-form" onSubmit={handleSubmit}>
            {!editingId ? (
              <label className="z-field">
                <span>{t(dict, "staff.fields.email")}</span>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(event) => updateField("email", event.target.value)}
                />
              </label>
            ) : null}

            <label className="z-field">
              <span>{t(dict, "staff.fields.name")}</span>
              <input
                type="text"
                value={formState.name}
                onChange={(event) => updateField("name", event.target.value)}
              />
            </label>

            <label className="z-field">
              <span>{t(dict, "staff.fields.role")}</span>
              <select
                value={formState.role}
                onChange={(event) => updateField("role", event.target.value)}
              >
                <option value="owner">{t(dict, "roles.owner")}</option>
                <option value="manager">{t(dict, "roles.manager")}</option>
                <option value="staff">{t(dict, "roles.staff")}</option>
              </select>
            </label>

            <label className="z-field">
              <span>{editingId ? t(dict, "staff.fields.newPassword") : t(dict, "staff.fields.password")}</span>
              <input
                type="password"
                value={formState.password}
                onChange={(event) => updateField("password", event.target.value)}
              />
            </label>

            <div className="z-empty-state">
              <h3>{t(dict, "staff.permissionTitle")}</h3>
              <p>{t(dict, "staff.permissionDescription")}</p>
              <p>{t(dict, "staff.permissionOwner")}</p>
              <p>{t(dict, "staff.permissionManager")}</p>
              <p>{t(dict, "staff.permissionStaff")}</p>
            </div>

            <div className="z-form-actions">
              <button type="submit" className="z-btn z-btn-primary" disabled={isSaving}>
                {editingId ? t(dict, "common.save") : t(dict, "staff.addTitle")}
              </button>
              <button type="button" className="z-btn z-btn-secondary" onClick={resetForm} disabled={isSaving}>
                {t(dict, "common.clear")}
              </button>
            </div>
          </form>
        </section>

        <section className="z-menu-list-panel z-card">
          <div className="z-panel-heading">
            <h2>{t(dict, "staff.listTitle")}</h2>
            <p>{t(dict, "staff.listDescription")}</p>
          </div>

          {users.length === 0 ? (
            <div className="z-empty-state">
              <h3>{t(dict, "staff.emptyTitle")}</h3>
              <p>{t(dict, "staff.emptyDescription")}</p>
            </div>
          ) : (
            <div className="z-menu-list">
              {users.map((user) => (
                <article key={user.id} className="z-menu-item-card">
                  <div className="z-menu-item-head">
                    <div>
                      <div className="z-menu-item-topline">
                        <h3>{user.name}</h3>
                        <span className="z-status-pill z-status-on">{t(dict, `roles.${user.role}`)}</span>
                      </div>
                      <p className="z-menu-item-category">{user.email}</p>
                    </div>
                  </div>

                  <div className="z-item-actions">
                    <button
                      type="button"
                      className="z-btn z-btn-secondary"
                      onClick={() => handleEdit(user)}
                      disabled={isSaving}
                    >
                      {t(dict, "common.edit")}
                    </button>
                    <button
                      type="button"
                      className="z-btn z-btn-secondary"
                      onClick={() => handleDelete(user.id)}
                      disabled={isSaving || user.id === session?.user?.id}
                    >
                      {user.id === session?.user?.id
                        ? t(dict, "staff.cannotDeleteSelf")
                        : t(dict, "common.delete")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
