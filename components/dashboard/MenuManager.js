"use client";

import { useEffect, useState } from "react";

import { useDashboardSession } from "@/components/providers/DashboardSessionProvider";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatText, t } from "@/lib/i18n";
import { useI18n } from "@/components/providers/I18nProvider";

const INITIAL_FORM_STATE = {
  name: "",
  price: "",
  category: "",
  description: "",
  isAvailable: true,
  optionGroups: [],
};

function createClientKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyOptionItem() {
  return {
    clientKey: createClientKey("option-item"),
    id: "",
    name: "",
    priceDelta: "0",
    isAvailable: true,
    sortOrder: "",
  };
}

function createEmptyOptionGroup() {
  return {
    clientKey: createClientKey("option-group"),
    id: "",
    name: "",
    type: "single",
    isRequired: false,
    minSelect: "0",
    maxSelect: "",
    sortOrder: "",
    items: [createEmptyOptionItem()],
  };
}

function mapMenuItem(item) {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    category: item.category,
    description: item.description,
    isAvailable: item.isAvailable,
    optionGroups: Array.isArray(item.optionGroups)
      ? item.optionGroups.map((group) => ({
          clientKey: createClientKey("option-group"),
          id: group.id,
          name: group.name,
          type: group.type,
          isRequired: group.isRequired,
          minSelect: String(group.minSelect ?? 0),
          maxSelect: group.maxSelect === null || group.maxSelect === undefined ? "" : String(group.maxSelect),
          sortOrder: group.sortOrder === null || group.sortOrder === undefined ? "" : String(group.sortOrder),
          items: Array.isArray(group.optionItems)
            ? group.optionItems.map((optionItem) => ({
                clientKey: createClientKey("option-item"),
                id: optionItem.id,
                name: optionItem.name,
                priceDelta: String(optionItem.priceDelta ?? 0),
                isAvailable: optionItem.isAvailable,
                sortOrder:
                  optionItem.sortOrder === null || optionItem.sortOrder === undefined
                    ? ""
                    : String(optionItem.sortOrder),
              }))
            : [],
        }))
      : [],
  };
}

function createPayloadOptionGroups(optionGroups) {
  return optionGroups.map((group, groupIndex) => ({
    id: group.id,
    name: group.name.trim(),
    type: group.type,
    isRequired: group.isRequired,
    minSelect: group.type === "single" ? 0 : group.minSelect,
    maxSelect: group.type === "single" ? 1 : group.maxSelect,
    sortOrder: group.sortOrder === "" ? groupIndex : Number(group.sortOrder),
    items: group.items.map((optionItem, optionItemIndex) => ({
      id: optionItem.id,
      name: optionItem.name.trim(),
      priceDelta: optionItem.priceDelta === "" ? 0 : Number(optionItem.priceDelta),
      isAvailable: optionItem.isAvailable,
      sortOrder: optionItem.sortOrder === "" ? optionItemIndex : Number(optionItem.sortOrder),
    })),
  }));
}

function formatPrice(price) {
  return `฿${price}`;
}

export default function MenuManager() {
  const { dict } = useI18n();
  const { session } = useDashboardSession();
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
        const response = await fetch("/api/menu", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Failed to load menu API"));
        }

        if (!isMounted) {
          return;
        }

        setMenuItems(payload.items.map(mapMenuItem));
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

  function updateOptionGroup(groupClientKey, fieldName, value) {
    setFormState((currentState) => ({
      ...currentState,
      optionGroups: currentState.optionGroups.map((group) => {
        if (group.clientKey !== groupClientKey) {
          return group;
        }

        if (fieldName === "type" && value === "single") {
          return {
            ...group,
            type: value,
            minSelect: "0",
            maxSelect: "1",
          };
        }

        return {
          ...group,
          [fieldName]: value,
        };
      }),
    }));
  }

  function addOptionGroup() {
    setFormState((currentState) => ({
      ...currentState,
      optionGroups: [...currentState.optionGroups, createEmptyOptionGroup()],
    }));
  }

  function removeOptionGroup(groupClientKey) {
    setFormState((currentState) => ({
      ...currentState,
      optionGroups: currentState.optionGroups.filter((group) => group.clientKey !== groupClientKey),
    }));
  }

  function updateOptionItem(groupClientKey, itemClientKey, fieldName, value) {
    setFormState((currentState) => ({
      ...currentState,
      optionGroups: currentState.optionGroups.map((group) => {
        if (group.clientKey !== groupClientKey) {
          return group;
        }

        return {
          ...group,
          items: group.items.map((item) =>
            item.clientKey === itemClientKey
              ? {
                  ...item,
                  [fieldName]: value,
                }
              : item
          ),
        };
      }),
    }));
  }

  function addOptionItem(groupClientKey) {
    setFormState((currentState) => ({
      ...currentState,
      optionGroups: currentState.optionGroups.map((group) =>
        group.clientKey === groupClientKey
          ? {
              ...group,
              items: [...group.items, createEmptyOptionItem()],
            }
          : group
      ),
    }));
  }

  function removeOptionItem(groupClientKey, itemClientKey) {
    setFormState((currentState) => ({
      ...currentState,
      optionGroups: currentState.optionGroups.map((group) => {
        if (group.clientKey !== groupClientKey) {
          return group;
        }

        return {
          ...group,
          items: group.items.filter((item) => item.clientKey !== itemClientKey),
        };
      }),
    }));
  }

  function resetForm() {
    setFormState(INITIAL_FORM_STATE);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedItem = {
      name: formState.name.trim(),
      price: Number(formState.price),
      category: formState.category.trim(),
      description: formState.description.trim(),
      isAvailable: formState.isAvailable,
      optionGroups: createPayloadOptionGroups(formState.optionGroups),
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
      const response = await fetch(editingId ? `/api/menu/${editingId}` : "/api/menu", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...normalizedItem,
          ...(editingId ? { id: editingId } : {}),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(getApiErrorMessage(payload, t(dict, "menu.errors.saveFailed")));
        return;
      }

      const nextItem = mapMenuItem(payload.item);
      const nextItems = editingId
        ? menuItems.map((item) => (item.id === editingId ? nextItem : item))
        : [...menuItems, nextItem];

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
      optionGroups: item.optionGroups.length > 0 ? item.optionGroups : [],
    });
    setStatusMessage(formatText(t(dict, "menu.statuses.editing"), { name: item.name }));
  }

  async function handleDelete(itemId) {
    setStatusMessage("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/menu/${itemId}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(getApiErrorMessage(payload, t(dict, "menu.errors.deleteFailed")));
        return;
      }

      setMenuItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
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
          <p className="z-dashboard-copy">{t(dict, "menu.pageDescription")}</p>
          {session?.restaurant?.name ? (
            <p className="z-dashboard-copy">{session.restaurant.name}</p>
          ) : null}
        </div>
        <div className="z-menu-summary">
          <strong>{menuItems.length}</strong>
          <span>{t(dict, "menu.summarySuffix")}</span>
        </div>
      </div>

      {isLoading ? <p className="z-dashboard-notice">{t(dict, "menu.loading")}</p> : null}
      {!isLoading && loadMessage ? <p className="z-dashboard-notice">{loadMessage}</p> : null}

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

            <div className="z-menu-option-groups">
              <div className="z-menu-option-groups-head">
                <div>
                  <h3>{t(dict, "menu.optionGroups.title")}</h3>
                  <p>{t(dict, "menu.optionGroups.description")}</p>
                </div>
                <button
                  type="button"
                  className="z-btn z-btn-secondary"
                  onClick={addOptionGroup}
                  disabled={isSaving}
                >
                  {t(dict, "menu.optionGroups.addGroup")}
                </button>
              </div>

              {formState.optionGroups.length === 0 ? (
                <div className="z-empty-state">
                  <h3>{t(dict, "menu.optionGroups.emptyTitle")}</h3>
                  <p>{t(dict, "menu.optionGroups.emptyDescription")}</p>
                </div>
              ) : (
                <div className="z-menu-option-group-list">
                  {formState.optionGroups.map((group, groupIndex) => (
                    <section key={group.clientKey} className="z-menu-option-group-card">
                      <div className="z-menu-option-group-head">
                        <div>
                          <p className="z-dashboard-card-label">
                            {formatText(t(dict, "menu.optionGroups.groupLabel"), {
                              number: groupIndex + 1,
                            })}
                          </p>
                          <h3>{group.name || t(dict, "menu.optionGroups.newGroup")}</h3>
                        </div>
                        <button
                          type="button"
                          className="z-btn z-btn-secondary"
                          onClick={() => removeOptionGroup(group.clientKey)}
                          disabled={isSaving}
                        >
                          {t(dict, "menu.optionGroups.removeGroup")}
                        </button>
                      </div>

                      <div className="z-menu-option-group-fields">
                        <label className="z-field">
                          <span>{t(dict, "menu.optionGroups.fields.groupName")}</span>
                          <input
                            type="text"
                            value={group.name}
                            onChange={(event) =>
                              updateOptionGroup(group.clientKey, "name", event.target.value)
                            }
                            placeholder={t(dict, "menu.optionGroups.placeholders.groupName")}
                          />
                        </label>

                        <label className="z-field">
                          <span>{t(dict, "menu.optionGroups.fields.groupType")}</span>
                          <select
                            value={group.type}
                            onChange={(event) =>
                              updateOptionGroup(group.clientKey, "type", event.target.value)
                            }
                          >
                            <option value="single">{t(dict, "menu.optionGroups.types.single")}</option>
                            <option value="multiple">
                              {t(dict, "menu.optionGroups.types.multiple")}
                            </option>
                          </select>
                        </label>

                        <label className="z-checkbox-field">
                          <input
                            type="checkbox"
                            checked={group.isRequired}
                            onChange={(event) =>
                              updateOptionGroup(group.clientKey, "isRequired", event.target.checked)
                            }
                          />
                          <span>{t(dict, "menu.optionGroups.fields.required")}</span>
                        </label>

                        <label className="z-field">
                          <span>{t(dict, "menu.optionGroups.fields.minSelect")}</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            disabled={group.type === "single"}
                            value={group.type === "single" ? "0" : group.minSelect}
                            onChange={(event) =>
                              updateOptionGroup(group.clientKey, "minSelect", event.target.value)
                            }
                            placeholder="0"
                          />
                        </label>

                        <label className="z-field">
                          <span>{t(dict, "menu.optionGroups.fields.maxSelect")}</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            disabled={group.type === "single"}
                            value={group.type === "single" ? "1" : group.maxSelect}
                            onChange={(event) =>
                              updateOptionGroup(group.clientKey, "maxSelect", event.target.value)
                            }
                            placeholder={t(dict, "menu.optionGroups.placeholders.maxSelect")}
                          />
                        </label>
                      </div>

                      <div className="z-menu-option-items">
                        <div className="z-menu-option-items-head">
                          <h4>{t(dict, "menu.optionGroups.optionItemsTitle")}</h4>
                          <button
                            type="button"
                            className="z-btn z-btn-secondary"
                            onClick={() => addOptionItem(group.clientKey)}
                            disabled={isSaving}
                          >
                            {t(dict, "menu.optionGroups.addItem")}
                          </button>
                        </div>

                        <div className="z-menu-option-item-list">
                          {group.items.map((optionItem, optionItemIndex) => (
                            <div key={optionItem.clientKey} className="z-menu-option-item-card">
                              <div className="z-menu-option-group-head">
                                <div>
                                  <p className="z-dashboard-card-label">
                                    {formatText(t(dict, "menu.optionGroups.itemLabel"), {
                                      number: optionItemIndex + 1,
                                    })}
                                  </p>
                                  <h4>{optionItem.name || t(dict, "menu.optionGroups.newItem")}</h4>
                                </div>
                                <button
                                  type="button"
                                  className="z-btn z-btn-secondary"
                                  onClick={() =>
                                    removeOptionItem(group.clientKey, optionItem.clientKey)
                                  }
                                  disabled={isSaving}
                                >
                                  {t(dict, "menu.optionGroups.removeItem")}
                                </button>
                              </div>

                              <div className="z-menu-option-group-fields">
                                <label className="z-field">
                                  <span>{t(dict, "menu.optionGroups.fields.itemName")}</span>
                                  <input
                                    type="text"
                                    value={optionItem.name}
                                    onChange={(event) =>
                                      updateOptionItem(
                                        group.clientKey,
                                        optionItem.clientKey,
                                        "name",
                                        event.target.value
                                      )
                                    }
                                    placeholder={t(dict, "menu.optionGroups.placeholders.itemName")}
                                  />
                                </label>

                                <label className="z-field">
                                  <span>{t(dict, "menu.optionGroups.fields.priceDelta")}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={optionItem.priceDelta}
                                    onChange={(event) =>
                                      updateOptionItem(
                                        group.clientKey,
                                        optionItem.clientKey,
                                        "priceDelta",
                                        event.target.value
                                      )
                                    }
                                    placeholder="0"
                                  />
                                </label>

                                <label className="z-checkbox-field">
                                  <input
                                    type="checkbox"
                                    checked={optionItem.isAvailable}
                                    onChange={(event) =>
                                      updateOptionItem(
                                        group.clientKey,
                                        optionItem.clientKey,
                                        "isAvailable",
                                        event.target.checked
                                      )
                                    }
                                  />
                                  <span>{t(dict, "menu.optionGroups.fields.itemAvailable")}</span>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>

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
                        <span className={`z-status-pill ${item.isAvailable ? "z-status-on" : "z-status-off"}`}>
                          {item.isAvailable
                            ? t(dict, "common.available")
                            : t(dict, "common.unavailable")}
                        </span>
                      </div>
                      <p className="z-menu-item-category">{item.category}</p>
                    </div>
                    <strong className="z-menu-item-price">{formatPrice(item.price)}</strong>
                  </div>

                  <p className="z-menu-item-description">{item.description}</p>

                  {item.optionGroups.length > 0 ? (
                    <div className="z-menu-item-options-summary">
                      <p className="z-menu-item-options-count">
                        {formatText(t(dict, "menu.optionGroups.summary"), {
                          count: item.optionGroups.length,
                        })}
                      </p>
                      <div className="z-menu-item-options-list">
                        {item.optionGroups.map((group) => (
                          <div key={group.clientKey} className="z-menu-item-option-summary">
                            <strong>{group.name}</strong>
                            <p>
                              {group.type === "single"
                                ? t(dict, "menu.optionGroups.types.single")
                                : t(dict, "menu.optionGroups.types.multiple")}
                            </p>
                            <p>{group.items.map((optionItem) => optionItem.name).join(", ")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

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
