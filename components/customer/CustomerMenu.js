"use client";

import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api-client";
import { formatText, t } from "@/lib/i18n";
import { useI18n } from "@/components/providers/I18nProvider";

function formatPrice(price) {
  return `฿${price}`;
}

function buildCategoryGroups(items) {
  return items.reduce((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }

    groups[item.category].push(item);
    return groups;
  }, {});
}

function calculateCartTotal(cartItems) {
  return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
}

export default function CustomerMenu({ restaurantSlug, tableCode }) {
  const { dict } = useI18n();
  const [restaurantName, setRestaurantName] = useState(restaurantSlug);
  const [menuItems, setMenuItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadMessage, setLoadMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const groupedItems = buildCategoryGroups(menuItems);
  const categoryEntries = Object.entries(groupedItems);
  const total = calculateCartTotal(cartItems);

  useEffect(() => {
    let isMounted = true;

    async function loadMenu() {
      setIsLoading(true);
      setErrorMessage("");
      setLoadMessage("");

      try {
        const response = await fetch(
          `/api/public/restaurants/${restaurantSlug}/tables/${tableCode}/menu`,
          {
            cache: "no-store",
          }
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Unable to load the menu."));
        }

        if (!isMounted) {
          return;
        }

        setRestaurantName(payload.restaurant.name);
        setMenuItems(payload.items);
        setLoadMessage(t(dict, "customer.loaded"));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error.message || t(dict, "customer.loadFailed"));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMenu();

    return () => {
      isMounted = false;
    };
  }, [dict, restaurantSlug, tableCode]);

  function addItemToCart(item) {
    setSuccessMessage("");
    setErrorMessage("");
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((cartItem) => cartItem.id === item.id);

      if (!existingItem) {
        return [
          ...currentItems,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
          },
        ];
      }

      return currentItems.map((cartItem) =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      );
    });
  }

  function increaseItem(itemId) {
    setCartItems((currentItems) =>
      currentItems.map((cartItem) =>
        cartItem.id === itemId
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      )
    );
  }

  function decreaseItem(itemId) {
    setCartItems((currentItems) =>
      currentItems
        .map((cartItem) =>
          cartItem.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        )
        .filter((cartItem) => cartItem.quantity > 0)
    );
  }

  function removeItem(itemId) {
    setCartItems((currentItems) =>
      currentItems.filter((cartItem) => cartItem.id !== itemId)
    );
  }

  async function submitOrder() {
    if (cartItems.length === 0) {
      return;
    }

    setSuccessMessage("");
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/public/restaurants/${restaurantSlug}/tables/${tableCode}/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: cartItems.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(payload, t(dict, "customer.submitFailed")));
        return;
      }

      setCartItems([]);
      setSuccessMessage(
        formatText(t(dict, "customer.submitted"), { tableCode: payload.table.code })
      );
    } catch {
      setErrorMessage(t(dict, "customer.submitFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="z-customer-page">
      <section className="z-customer-hero">
        <p className="z-home-badge">{t(dict, "customer.kicker")}</p>
        <h1>{restaurantName}</h1>
        <p>{formatText(t(dict, "customer.tableLabel"), { tableCode })}</p>
      </section>

      <div className="z-customer-layout">
        <section className="z-customer-menu-panel z-card">
          <div className="z-customer-panel-head">
            <h2>{t(dict, "customer.menuTitle")}</h2>
            <p>{t(dict, "customer.menuDescription")}</p>
          </div>

          {isLoading ? <p className="z-customer-notice">{t(dict, "customer.loading")}</p> : null}
          {!isLoading && loadMessage ? (
            <p className="z-customer-notice">{loadMessage}</p>
          ) : null}
          {!isLoading && errorMessage ? (
            <p className="z-customer-error">{errorMessage}</p>
          ) : null}

          {!isLoading && !errorMessage && categoryEntries.length === 0 ? (
            <div className="z-empty-state">
              <h3>{t(dict, "customer.noItemsTitle")}</h3>
              <p>{t(dict, "customer.noItemsDescription")}</p>
            </div>
          ) : !isLoading && !errorMessage ? (
            <div className="z-customer-category-list">
              {categoryEntries.map(([category, items]) => (
                <section key={category} className="z-customer-category">
                  <div className="z-customer-category-head">
                    <h3>{category}</h3>
                    <span>
                      {formatText(t(dict, "customer.categoryItems"), { count: items.length })}
                    </span>
                  </div>

                  <div className="z-customer-menu-grid">
                    {items.map((item) => (
                      <article key={item.id} className="z-customer-menu-item">
                        <div className="z-customer-item-head">
                          <h4>{item.name}</h4>
                          <strong>{formatPrice(item.price)}</strong>
                        </div>
                        <p>{item.description}</p>
                        <button
                          type="button"
                          className="z-btn z-btn-primary"
                          onClick={() => addItemToCart(item)}
                        >
                          {t(dict, "customer.addToCart")}
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="z-cart-panel z-card">
          <div className="z-customer-panel-head">
            <h2>{t(dict, "customer.cartTitle")}</h2>
            <p>{formatText(t(dict, "customer.cartSelected"), { count: cartItems.length })}</p>
          </div>

          {cartItems.length === 0 ? (
            <div className="z-empty-state">
              <h3>{t(dict, "customer.cartEmptyTitle")}</h3>
              <p>{t(dict, "customer.cartEmptyDescription")}</p>
            </div>
          ) : (
            <div className="z-cart-list">
              {cartItems.map((item) => (
                <article key={item.id} className="z-cart-item">
                  <div className="z-cart-item-head">
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        {formatText(t(dict, "customer.eachPrice"), {
                          price: formatPrice(item.price),
                        })}
                      </p>
                    </div>
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                  </div>

                  <div className="z-cart-item-actions">
                    <div className="z-quantity-controls">
                      <button
                        type="button"
                        className="z-btn z-btn-secondary"
                        onClick={() => decreaseItem(item.id)}
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        className="z-btn z-btn-secondary"
                        onClick={() => increaseItem(item.id)}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="z-btn z-btn-secondary"
                      onClick={() => removeItem(item.id)}
                    >
                      {t(dict, "customer.remove")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="z-cart-summary">
            <div className="z-cart-summary-line">
              <span>{t(dict, "common.total")}</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            {successMessage ? <p className="z-form-message">{successMessage}</p> : null}
            {errorMessage ? <p className="z-customer-error">{errorMessage}</p> : null}

            <button
              type="button"
              className="z-btn z-btn-primary z-cart-submit"
              disabled={cartItems.length === 0 || isSubmitting}
              onClick={submitOrder}
            >
              {isSubmitting ? t(dict, "customer.submitting") : t(dict, "customer.submit")}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
