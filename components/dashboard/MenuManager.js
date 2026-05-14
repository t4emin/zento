"use client";

import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api-client";
import { formatText, t } from "@/lib/i18n";
import { useI18n } from "@/components/providers/I18nProvider";

const INITIAL_FORM_STATE = {
  name: "",
  price: "",
  category: "",
  description: "",
  isAvailable: true,
};

function createMenuId(name) {
  return `item-${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
}

function mapMenuItem(item) {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    category: item.category,
    description: item.description,
    isAvailable: item.isAvailable,
  };
}

export default function MenuManager() {
  const { dict } = useI18n();
  const [menuItems, setMenuItems] = useState([]);
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMenuItems() {
      setIsLoading(true);
      setLoadMessage("");

      try {
        const response = await fetch("/api/menu?restaurantSlug=demo", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Failed to load menu API"));
        }

        const apiItems = payload.items.map(mapMenuItem);
        if (!isMounted) {
          return;
        }

        setMenuItems(apiItems);
        setLoadMessage(t(dict, "menu.loaded"));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMenuItems([]);
        setLoadMessage(error.message || t(dict, "menu.loadFailed"));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMenuItems();

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

    const normalizedItem = {
      id: editingId || createMenuId(formState.name),
      name: formState.name.trim(),
      price: Number(formState.price),
      category: formState.category.trim(),
      description: formState.description.trim(),
      isAvailable: formState.isAvailable,
    };

    if (!normalizedItem.name || !normalizedItem.category || !normalizedItem.description) {
      setStatusMessage(t(dict, "menu.errors.fillAllFields"));
      return;
    }

    if (Number.isNaN(normalizedItem.price) || normalizedItem.price <= 0) {
      setStatusMessage(t(dict, "menu.errors.invalidPrice"));
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      const response = await fetch(
        editingId ? `/api/menu/${editingId}` : "/api/menu",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurantSlug: "demo",
            ...normalizedItem,
          }),
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(getApiErrorMessage(payload, t(dict, "menu.errors.saveFailed")));
        return;
      }

      const nextItems = editingId
        ? menuItems.map((item) =>
            item.id === editingId ? mapMenuItem(payload.item) : item
          )
        : [...menuItems, mapMenuItem(payload.item)];

      setMenuItems(nextItems);
      setStatusMessage(
        editingId ? t(dict, "menu.statuses.itemUpdated") : t(dict, "menu.statuses.itemAdded")
      );
      resetForm();
    } catch {
      setStatusMessage(t(dict, "menu.errors.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setFormState({
      name: item.name,
      price: String(item.price),
      category: item.category,
      description: item.description,
      isAvailable: item.isAvailable,
    });
    setStatusMessage(
      formatText(t(dict, "menu.statuses.editing"), { name: item.name })
    );
  }

  async function handleDelete(itemId) {
    setStatusMessage("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/menu/${itemId}?restaurantSlug=demo`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(getApiErrorMessage(payload, t(dict, "menu.errors.deleteFailed")));
        return;
      }

      setMenuItems((currentItems) =>
        currentItems.filter((item) => item.id !== itemId)
      );
      setStatusMessage(t(dict, "menu.statuses.itemDeleted"));

      if (editingId === itemId) {
        resetForm();
      }
    } catch {
      setStatusMessage(t(dict, "menu.errors.deleteFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="z-menu-manager">
      <div className="z-menu-manager-header z-card">
        <div>
          <p className="z-dashboard-kicker">{t(dict, "menu.pageKicker")}</p>
          <h1>{t(dict, "menu.pageTitle")}</h1>
          <p className="z-dashboard-copy">
            {t(dict, "menu.pageDescription")}
          </p>
        </div>
        <div className="z-menu-summary">
          <strong>{menuItems.length}</strong>
          <span>{t(dict, "menu.summarySuffix")}</span>
        </div>
      </div>

      {isLoading ? <p className="z-dashboard-notice">{t(dict, "menu.loading")}</p> : null}
      {!isLoading && loadMessage ? (
        <p className="z-dashboard-notice">{loadMessage}</p>
      ) : null}

      <div className="z-menu-manager-grid">
        <section className="z-menu-form-panel z-card">
          <div className="z-panel-heading">
            <h2>{editingId ? t(dict, "menu.formEditTitle") : t(dict, "menu.formAddTitle")}</h2>
            <p>{t(dict, "menu.formDescription")}</p>
          </div>

          <form className="z-menu-form" onSubmit={handleSubmit}>
            <label className="z-field">
              <span>{t(dict, "menu.fields.name")}</span>
              <input
                type="text"
                value={formState.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder={t(dict, "menu.placeholders.name")}
              />
            </label>

            <label className="z-field">
              <span>{t(dict, "menu.fields.price")}</span>
              <input
                type="number"
                min="1"
                step="1"
                value={formState.price}
                onChange={(event) => updateField("price", event.target.value)}
                placeholder={t(dict, "menu.placeholders.price")}
              />
            </label>

            <label className="z-field">
              <span>{t(dict, "menu.fields.category")}</span>
              <input
                type="text"
                value={formState.category}
                onChange={(event) => updateField("category", event.target.value)}
                placeholder={t(dict, "menu.placeholders.category")}
              />
            </label>

            <label className="z-field">
              <span>{t(dict, "menu.fields.description")}</span>
              <textarea
                rows="4"
                value={formState.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder={t(dict, "menu.placeholders.description")}
              />
            </label>

            <label className="z-checkbox-field">
              <input
                type="checkbox"
                checked={formState.isAvailable}
                onChange={(event) => updateField("isAvailable", event.target.checked)}
              />
              <span>{t(dict, "menu.fields.available")}</span>
            </label>

            {statusMessage ? <p className="z-form-message">{statusMessage}</p> : null}

            <div className="z-form-actions">
              <button type="submit" className="z-btn z-btn-primary">
                {isSaving
                  ? t(dict, "menu.statuses.saving")
                  : editingId
                    ? t(dict, "common.save")
                    : t(dict, "menu.formAddTitle")}
              </button>
              <button
                type="button"
                className="z-btn z-btn-secondary"
                onClick={resetForm}
                disabled={isSaving}
              >
                {t(dict, "common.clear")}
              </button>
            </div>
          </form>
        </section>

        <section className="z-menu-list-panel z-card">
          <div className="z-panel-heading">
            <h2>{t(dict, "menu.listTitle")}</h2>
            <p>{t(dict, "menu.listDescription")}</p>
          </div>

          {menuItems.length === 0 ? (
            <div className="z-empty-state">
              <h3>{t(dict, "menu.emptyTitle")}</h3>
              <p>{t(dict, "menu.emptyDescription")}</p>
            </div>
          ) : (
            <div className="z-menu-list">
              {menuItems.map((item) => (
                <article key={item.id} className="z-menu-item-card">
                  <div className="z-menu-item-head">
                    <div>
                      <div className="z-menu-item-topline">
                        <h3>{item.name}</h3>
                        <span
                          className={`z-status-pill ${
                            item.isAvailable ? "z-status-on" : "z-status-off"
                          }`}
                        >
                          {item.isAvailable
                            ? t(dict, "common.available")
                            : t(dict, "common.unavailable")}
                        </span>
                      </div>
                      <p className="z-menu-item-category">{item.category}</p>
                    </div>
                    <strong className="z-menu-item-price">฿{item.price}</strong>
                  </div>

                  <p className="z-menu-item-description">{item.description}</p>

                  <div className="z-item-actions">
                    <button
                      type="button"
                      className="z-btn z-btn-secondary"
                      onClick={() => handleEdit(item)}
                      disabled={isSaving}
                    >
                      {t(dict, "common.edit")}
                    </button>
                    <button
                      type="button"
                      className="z-btn z-btn-secondary"
                      onClick={() => handleDelete(item.id)}
                      disabled={isSaving}
                    >
                      {t(dict, "common.delete")}
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
