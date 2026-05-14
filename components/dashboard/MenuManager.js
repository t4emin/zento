"use client";

import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api-client";

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
        setLoadMessage("Loaded menu items from the backend API.");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMenuItems([]);
        setLoadMessage(error.message || "Unable to load menu items from the backend API.");
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
  }, []);

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
      setStatusMessage("Please fill in all menu item fields.");
      return;
    }

    if (Number.isNaN(normalizedItem.price) || normalizedItem.price <= 0) {
      setStatusMessage("Please enter a valid price greater than 0.");
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
        setStatusMessage(getApiErrorMessage(payload, "Unable to save menu item."));
        return;
      }

      const nextItems = editingId
        ? menuItems.map((item) =>
            item.id === editingId ? mapMenuItem(payload.item) : item
          )
        : [...menuItems, mapMenuItem(payload.item)];

      setMenuItems(nextItems);
      setStatusMessage(editingId ? "Menu item updated." : "Menu item added.");
      resetForm();
    } catch {
      setStatusMessage("Unable to save menu item.");
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
    setStatusMessage(`Editing ${item.name}.`);
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
        setStatusMessage(getApiErrorMessage(payload, "Unable to delete menu item."));
        return;
      }

      setMenuItems((currentItems) =>
        currentItems.filter((item) => item.id !== itemId)
      );
      setStatusMessage("Menu item deleted.");

      if (editingId === itemId) {
        resetForm();
      }
    } catch {
      setStatusMessage("Unable to delete menu item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="z-menu-manager">
      <div className="z-menu-manager-header z-card">
        <div>
          <p className="z-dashboard-kicker">Menu Management</p>
          <h1>Manage demo menu items</h1>
          <p className="z-dashboard-copy">
            Add, update, or remove items that will appear in the customer ordering flow.
          </p>
        </div>
        <div className="z-menu-summary">
          <strong>{menuItems.length}</strong>
          <span>items in demo menu</span>
        </div>
      </div>

      {isLoading ? <p className="z-dashboard-notice">Loading menu items...</p> : null}
      {!isLoading && loadMessage ? (
        <p className="z-dashboard-notice">{loadMessage}</p>
      ) : null}

      <div className="z-menu-manager-grid">
        <section className="z-menu-form-panel z-card">
          <div className="z-panel-heading">
            <h2>{editingId ? "Edit Menu Item" : "Add Menu Item"}</h2>
            <p>Fields: name, price, category, description, availability</p>
          </div>

          <form className="z-menu-form" onSubmit={handleSubmit}>
            <label className="z-field">
              <span>Name</span>
              <input
                type="text"
                value={formState.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Pad Thai"
              />
            </label>

            <label className="z-field">
              <span>Price</span>
              <input
                type="number"
                min="1"
                step="1"
                value={formState.price}
                onChange={(event) => updateField("price", event.target.value)}
                placeholder="120"
              />
            </label>

            <label className="z-field">
              <span>Category</span>
              <input
                type="text"
                value={formState.category}
                onChange={(event) => updateField("category", event.target.value)}
                placeholder="Mains"
              />
            </label>

            <label className="z-field">
              <span>Description</span>
              <textarea
                rows="4"
                value={formState.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Rice noodles with tamarind sauce and peanuts."
              />
            </label>

            <label className="z-checkbox-field">
              <input
                type="checkbox"
                checked={formState.isAvailable}
                onChange={(event) => updateField("isAvailable", event.target.checked)}
              />
              <span>Available for ordering</span>
            </label>

            {statusMessage ? <p className="z-form-message">{statusMessage}</p> : null}

            <div className="z-form-actions">
              <button type="submit" className="z-btn z-btn-primary">
                {isSaving ? "Saving..." : editingId ? "Save Changes" : "Add Item"}
              </button>
              <button
                type="button"
                className="z-btn z-btn-secondary"
                onClick={resetForm}
                disabled={isSaving}
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        <section className="z-menu-list-panel z-card">
          <div className="z-panel-heading">
            <h2>Current Items</h2>
            <p>Items are loaded from PostgreSQL through the backend API.</p>
          </div>

          {menuItems.length === 0 ? (
            <div className="z-empty-state">
              <h3>No menu items yet</h3>
              <p>Add your first item using the form on this page.</p>
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
                          {item.isAvailable ? "Available" : "Unavailable"}
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
                      Edit
                    </button>
                    <button
                      type="button"
                      className="z-btn z-btn-secondary"
                      onClick={() => handleDelete(item.id)}
                      disabled={isSaving}
                    >
                      Delete
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
