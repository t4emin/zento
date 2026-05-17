"use client";

import { useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/lib/api-client";
import { formatText, t } from "@/lib/i18n";
import { useI18n } from "@/components/providers/I18nProvider";

function formatPrice(price) {
  return `฿${price}`;
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
  return cartItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

function calculateBaseItemsTotal(cartItems) {
  return cartItems.reduce((total, item) => total + item.basePrice * item.quantity, 0);
}

function calculateOptionTotal(cartItems) {
  return cartItems.reduce(
    (total, item) => total + (item.unitPrice - item.basePrice) * item.quantity,
    0
  );
}

function createCartItemKey(menuItemId, selectedOptionItemIds) {
  return `${menuItemId}::${[...selectedOptionItemIds].sort().join(",")}`;
}

function getGroupSelectionRules(group) {
  if (group.type === "single") {
    return {
      minSelect: group.isRequired ? 1 : 0,
      maxSelect: 1,
    };
  }

  return {
    minSelect: Math.max(group.isRequired ? 1 : 0, group.minSelect || 0),
    maxSelect: group.maxSelect || Number.POSITIVE_INFINITY,
  };
}

function buildSelectedOptionsSummary(menuItem, selections) {
  const selectedOptionsSnapshot = [];
  const selectedOptionItemIds = [];
  let optionDeltaTotal = 0;

  for (const group of menuItem.optionGroups || []) {
    const groupSelections = selections[group.id] || [];
    const selectedItems = (group.optionItems || []).filter((optionItem) =>
      groupSelections.includes(optionItem.id)
    );

    if (selectedItems.length === 0) {
      continue;
    }

    selectedOptionsSnapshot.push({
      groupName: group.name,
      items: selectedItems.map((optionItem) => ({
        name: optionItem.name,
        priceDelta: optionItem.priceDelta,
      })),
    });

    for (const selectedItem of selectedItems) {
      selectedOptionItemIds.push(selectedItem.id);
      optionDeltaTotal += Number(selectedItem.priceDelta || 0);
    }
  }

  return {
    selectedOptionItemIds,
    selectedOptionsSnapshot,
    optionDeltaTotal,
  };
}

function validateSelections(menuItem, selections) {
  for (const group of menuItem.optionGroups || []) {
    const selectedCount = (selections[group.id] || []).length;
    const rules = getGroupSelectionRules(group);

    if (selectedCount < rules.minSelect) {
      return {
        ok: false,
        type: "required",
        groupName: group.name,
      };
    }

    if (selectedCount > rules.maxSelect) {
      return {
        ok: false,
        type: "tooMany",
        groupName: group.name,
        count: rules.maxSelect,
      };
    }
  }

  return { ok: true };
}

export default function CustomerMenu({
  restaurantSlug,
  tableCode = "",
  sessionCode = "",
  orderingMode = "table",
}) {
  const { dict } = useI18n();
  const [restaurantName, setRestaurantName] = useState(restaurantSlug);
  const [menuItems, setMenuItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [activeTableCode, setActiveTableCode] = useState(tableCode);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [configuringItemId, setConfiguringItemId] = useState("");
  const [optionSelections, setOptionSelections] = useState({});
  const [invalidOptionGroupId, setInvalidOptionGroupId] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadMessage, setLoadMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cartPanelRef = useRef(null);
  const [nowMs, setNowMs] = useState(0);

  const isSessionMode = orderingMode === "session";
  const menuEndpoint = isSessionMode
    ? `/api/public/restaurants/${restaurantSlug}/sessions/${sessionCode}/menu`
    : `/api/public/restaurants/${restaurantSlug}/tables/${tableCode}/menu`;
  const submitEndpoint = isSessionMode
    ? `/api/public/restaurants/${restaurantSlug}/sessions/${sessionCode}/orders`
    : `/api/public/restaurants/${restaurantSlug}/tables/${tableCode}/orders`;

  const groupedItems = buildCategoryGroups(menuItems);
  const categoryEntries = Object.entries(groupedItems);
  const baseItemsTotal = calculateBaseItemsTotal(cartItems);
  const optionTotal = calculateOptionTotal(cartItems);
  const total = calculateCartTotal(cartItems);
  const remainingMilliseconds =
    isSessionMode && sessionMeta?.expiresAt && nowMs
      ? new Date(sessionMeta.expiresAt).getTime() - nowMs
      : null;
  const isSessionExpired =
    isSessionMode &&
    (sessionMeta?.status === "expired" ||
      (remainingMilliseconds !== null && remainingMilliseconds <= 0));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  function formatRemainingTime(milliseconds) {
    if (milliseconds === null) {
      return "";
    }

    if (milliseconds <= 0) {
      return t(dict, "customer.expiredSession");
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  useEffect(() => {
    let isMounted = true;

    async function loadMenu() {
      setIsLoading(true);
      setErrorMessage("");
      setLoadMessage("");

      try {
        const response = await fetch(menuEndpoint, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Unable to load the menu."));
        }

        if (!isMounted) {
          return;
        }

        setRestaurantName(payload.restaurant.name);
        setActiveTableCode(payload.table.code);
        setMenuItems(payload.items);
        setSessionMeta(payload.session || null);
        setLoadMessage(t(dict, "customer.loaded"));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMenuItems([]);
        setSessionMeta(null);
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
  }, [dict, menuEndpoint]);

  function addConfiguredItemToCart(menuItem, selectionSummary) {
    const nextKey = createCartItemKey(menuItem.id, selectionSummary.selectedOptionItemIds);
    const unitPrice = menuItem.price + selectionSummary.optionDeltaTotal;

    setSuccessMessage("");
    setErrorMessage("");
    setInvalidOptionGroupId("");
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((cartItem) => cartItem.key === nextKey);

      if (!existingItem) {
        return [
          ...currentItems,
          {
            key: nextKey,
            id: menuItem.id,
            name: menuItem.name,
            basePrice: menuItem.price,
            unitPrice,
            quantity: 1,
            selectedOptionItemIds: selectionSummary.selectedOptionItemIds,
            selectedOptionsSnapshot: selectionSummary.selectedOptionsSnapshot,
          },
        ];
      }

      return currentItems.map((cartItem) =>
        cartItem.key === nextKey
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      );
    });
  }

  function handleAddItem(menuItem) {
    if (isSessionExpired) {
      setErrorMessage(t(dict, "customer.expiredSession"));
      return;
    }

    if (!Array.isArray(menuItem.optionGroups) || menuItem.optionGroups.length === 0) {
      addConfiguredItemToCart(menuItem, {
        selectedOptionItemIds: [],
        selectedOptionsSnapshot: [],
        optionDeltaTotal: 0,
      });
      return;
    }

    setConfiguringItemId((currentId) => (currentId === menuItem.id ? "" : menuItem.id));
    setOptionSelections({});
    setInvalidOptionGroupId("");
    setSuccessMessage("");
    setErrorMessage("");
  }

  function updateSingleSelection(groupId, optionItemId) {
    setOptionSelections((currentSelections) => ({
      ...currentSelections,
      [groupId]: [optionItemId],
    }));
  }

  function toggleMultipleSelection(group, optionItemId) {
    setOptionSelections((currentSelections) => {
      const currentGroupSelections = currentSelections[group.id] || [];
      const isSelected = currentGroupSelections.includes(optionItemId);
      const rules = getGroupSelectionRules(group);

      if (isSelected) {
        return {
          ...currentSelections,
          [group.id]: currentGroupSelections.filter((id) => id !== optionItemId),
        };
      }

      if (currentGroupSelections.length >= rules.maxSelect) {
        setErrorMessage(
          formatText(t(dict, "customer.optionMaxReached"), {
            groupName: group.name,
            count: rules.maxSelect,
          })
        );
        setInvalidOptionGroupId(group.id);
        return currentSelections;
      }

      return {
        ...currentSelections,
        [group.id]: [...currentGroupSelections, optionItemId],
      };
    });
  }

  function handleConfirmOptions(menuItem) {
    const validationResult = validateSelections(menuItem, optionSelections);

    if (!validationResult.ok) {
      const invalidGroup = (menuItem.optionGroups || []).find(
        (group) => group.name === validationResult.groupName
      );

      setInvalidOptionGroupId(invalidGroup?.id || "");
      setErrorMessage(
        validationResult.type === "tooMany"
          ? formatText(t(dict, "customer.optionMaxReached"), {
              groupName: validationResult.groupName,
              count: validationResult.count,
            })
          : formatText(t(dict, "customer.optionRequired"), {
              groupName: validationResult.groupName,
            })
      );
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-option-group-id="${invalidGroup?.id || ""}"] input`)
          ?.focus();
      });
      return;
    }

    addConfiguredItemToCart(menuItem, buildSelectedOptionsSummary(menuItem, optionSelections));
    setConfiguringItemId("");
    setOptionSelections({});
    setInvalidOptionGroupId("");
  }

  function increaseItem(cartItemKey) {
    setCartItems((currentItems) =>
      currentItems.map((cartItem) =>
        cartItem.key === cartItemKey
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      )
    );
  }

  function decreaseItem(cartItemKey) {
    setCartItems((currentItems) =>
      currentItems
        .map((cartItem) =>
          cartItem.key === cartItemKey
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        )
        .filter((cartItem) => cartItem.quantity > 0)
    );
  }

  function removeItem(cartItemKey) {
    setCartItems((currentItems) => currentItems.filter((cartItem) => cartItem.key !== cartItemKey));
  }

  async function submitOrder() {
    if (isSessionExpired) {
      setErrorMessage(t(dict, "customer.expiredSession"));
      cartPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage(t(dict, "customer.cartValidation"));
      cartPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setSuccessMessage("");
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(submitEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note: orderNote,
          items: cartItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            selectedOptionItemIds: item.selectedOptionItemIds,
          })),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(payload, t(dict, "customer.submitFailed")));
        return;
      }

      setCartItems([]);
      setOrderNote("");
      setSuccessMessage(formatText(t(dict, "customer.submitted"), { tableCode: payload.table.code }));
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
        <p>{formatText(t(dict, "customer.tableLabel"), { tableCode: activeTableCode || tableCode })}</p>
        {isSessionMode && sessionMeta ? (
          <div className="z-customer-session-meta">
            <p>{formatText(t(dict, "customer.sessionLabel"), { sessionCode: sessionMeta.code })}</p>
            {sessionMeta.customerCount ? (
              <p>
                {formatText(t(dict, "customer.sessionCustomerCount"), {
                  count: sessionMeta.customerCount,
                })}
              </p>
            ) : null}
            {sessionMeta.startedAt ? (
              <p>
                {formatText(t(dict, "customer.sessionStartedAt"), {
                  startedAt: formatDateTime(sessionMeta.startedAt),
                })}
              </p>
            ) : null}
            {sessionMeta.expiresAt ? (
              <p>
                {formatText(t(dict, "customer.sessionExpiresAt"), {
                  expiresAt: formatDateTime(sessionMeta.expiresAt),
                })}
              </p>
            ) : null}
            {remainingMilliseconds !== null ? (
              <p>
                {formatText(t(dict, "customer.remainingTime"), {
                  remainingTime: formatRemainingTime(remainingMilliseconds),
                })}
              </p>
            ) : null}
            {sessionMeta.note ? (
              <p>{formatText(t(dict, "customer.sessionNote"), { note: sessionMeta.note })}</p>
            ) : null}
            {isSessionExpired ? (
              <p className="z-customer-error">{t(dict, "customer.expiredSession")}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="z-customer-layout">
        <section className="z-customer-menu-panel z-card">
          <div className="z-customer-panel-head">
            <h2>{t(dict, "customer.menuTitle")}</h2>
            <p>{t(dict, "customer.menuDescription")}</p>
          </div>

          {isLoading ? <p className="z-customer-notice">{t(dict, "customer.loading")}</p> : null}
          {!isLoading && loadMessage ? <p className="z-customer-notice">{loadMessage}</p> : null}
          {!isLoading && errorMessage ? <p className="z-customer-error">{errorMessage}</p> : null}

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
                    <span>{formatText(t(dict, "customer.categoryItems"), { count: items.length })}</span>
                  </div>

                  <div className="z-customer-menu-grid">
                    {items.map((item) => {
                      const pendingSelectionSummary = buildSelectedOptionsSummary(item, optionSelections);
                      const previewPrice = item.price + pendingSelectionSummary.optionDeltaTotal;

                      return (
                        <article key={item.id} className="z-customer-menu-item">
                          <div className="z-customer-item-head">
                            <h4>{item.name}</h4>
                            <strong>{formatPrice(item.price)}</strong>
                          </div>
                          <p>{item.description}</p>

                          {Array.isArray(item.optionGroups) && item.optionGroups.length > 0 ? (
                            <p className="z-customer-option-note">
                              {formatText(t(dict, "customer.optionGroupsCount"), {
                                count: item.optionGroups.length,
                              })}
                            </p>
                          ) : null}

                          <button
                            type="button"
                            className="z-btn z-btn-primary"
                            onClick={() => handleAddItem(item)}
                            disabled={isSessionExpired}
                          >
                            {Array.isArray(item.optionGroups) && item.optionGroups.length > 0
                              ? t(dict, "customer.customizeItem")
                              : t(dict, "customer.addToCart")}
                          </button>

                          {configuringItemId === item.id ? (
                            <div className="z-customer-option-configurator">
                              <div className="z-customer-option-configurator-head">
                                <h5>{t(dict, "customer.optionConfiguratorTitle")}</h5>
                                <strong>{formatPrice(previewPrice)}</strong>
                              </div>

                              {(item.optionGroups || []).map((group) => {
                                const rules = getGroupSelectionRules(group);
                                const currentSelections = optionSelections[group.id] || [];

                                return (
                                  <section
                                    key={group.id}
                                    data-option-group-id={group.id}
                                    className={`z-customer-option-group ${
                                      invalidOptionGroupId === group.id ? "z-customer-option-group-error" : ""
                                    }`}
                                  >
                                    <div className="z-customer-option-group-head">
                                      <div>
                                        <h6>
                                          {group.name}
                                          {rules.minSelect > 0 ? (
                                            <span className="z-field-required"> *</span>
                                          ) : (
                                            <span className="z-field-optional"> {t(dict, "forms.optional")}</span>
                                          )}
                                        </h6>
                                        <p>
                                          {group.type === "single"
                                            ? t(dict, "customer.optionTypeSingle")
                                            : t(dict, "customer.optionTypeMultiple")}
                                        </p>
                                      </div>
                                      <span>
                                        {formatText(t(dict, "customer.optionRules"), {
                                          min: rules.minSelect,
                                          max:
                                            Number.isFinite(rules.maxSelect) ? rules.maxSelect : t(dict, "customer.optionNoLimit"),
                                        })}
                                      </span>
                                    </div>

                                    <div className="z-customer-option-item-list">
                                      {(group.optionItems || []).map((optionItem) => (
                                        <label key={optionItem.id} className="z-customer-option-item">
                                          <input
                                            type={group.type === "single" ? "radio" : "checkbox"}
                                            name={group.id}
                                            checked={currentSelections.includes(optionItem.id)}
                                            onChange={() =>
                                              group.type === "single"
                                                ? updateSingleSelection(group.id, optionItem.id)
                                                : toggleMultipleSelection(group, optionItem.id)
                                            }
                                          />
                                          <span>{optionItem.name}</span>
                                          <strong>
                                            {optionItem.priceDelta > 0
                                              ? `+${formatPrice(optionItem.priceDelta)}`
                                              : formatPrice(0)}
                                          </strong>
                                        </label>
                                      ))}
                                    </div>
                                    {invalidOptionGroupId === group.id ? (
                                      <p className="z-field-error-text">{errorMessage}</p>
                                    ) : null}
                                  </section>
                                );
                              })}

                              <div className="z-customer-option-actions">
                                <button
                                  type="button"
                                  className="z-btn z-btn-primary"
                                  onClick={() => handleConfirmOptions(item)}
                                  disabled={isSessionExpired}
                                >
                                  {t(dict, "customer.addConfiguredItem")}
                                </button>
                                <button
                                  type="button"
                                  className="z-btn z-btn-secondary"
                                  onClick={() => {
                                    setConfiguringItemId("");
                                    setOptionSelections({});
                                    setInvalidOptionGroupId("");
                                  }}
                                >
                                  {t(dict, "common.cancel")}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </section>

        <aside ref={cartPanelRef} className="z-cart-panel z-card">
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
                <article key={item.key} className="z-cart-item">
                  <div className="z-cart-item-head">
                    <div>
                      <h3>{item.name}</h3>
                      <p>{formatText(t(dict, "customer.eachPrice"), { price: formatPrice(item.unitPrice) })}</p>
                      {item.selectedOptionsSnapshot.map((group) => (
                        <p key={`${item.key}-${group.groupName}`} className="z-cart-item-option-line">
                          {group.groupName}: {group.items.map((optionItem) => optionItem.name).join(", ")}
                        </p>
                      ))}
                    </div>
                    <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
                  </div>

                  <div className="z-cart-item-actions">
                    <div className="z-quantity-controls">
                      <button
                        type="button"
                        className="z-btn z-btn-secondary"
                        onClick={() => decreaseItem(item.key)}
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        className="z-btn z-btn-secondary"
                        onClick={() => increaseItem(item.key)}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="z-btn z-btn-secondary"
                      onClick={() => removeItem(item.key)}
                    >
                      {t(dict, "customer.remove")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="z-cart-summary">
            <label className="z-field">
              <span>
                {t(dict, "customer.orderNote")}
                <span className="z-field-optional"> {t(dict, "forms.optional")}</span>
              </span>
              <textarea
                value={orderNote}
                onChange={(event) => setOrderNote(event.target.value)}
                placeholder={t(dict, "customer.orderNotePlaceholder")}
                maxLength={500}
              />
            </label>

            <div className="z-cart-summary-line">
              <span>{t(dict, "customer.itemTotal")}</span>
              <strong>{formatPrice(baseItemsTotal)}</strong>
            </div>

            <div className="z-cart-summary-line">
              <span>{t(dict, "customer.optionTotal")}</span>
              <strong>{formatPrice(optionTotal)}</strong>
            </div>

            <div className="z-cart-summary-line">
              <span>{t(dict, "customer.grandTotal")}</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            {successMessage ? <p className="z-form-message">{successMessage}</p> : null}
            {errorMessage ? <p className="z-customer-error">{errorMessage}</p> : null}

            <button
              type="button"
              className="z-btn z-btn-primary z-cart-submit"
              disabled={cartItems.length === 0 || isSubmitting || isSessionExpired}
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
