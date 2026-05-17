export const MENU_OPTION_GROUP_TYPE_SINGLE = "single";
export const MENU_OPTION_GROUP_TYPE_MULTIPLE = "multiple";

export const MENU_ITEM_WITH_OPTIONS_SELECT = {
  id: true,
  name: true,
  description: true,
  price: true,
  category: true,
  isAvailable: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  optionGroups: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      isRequired: true,
      minSelect: true,
      maxSelect: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      optionItems: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          priceDelta: true,
          isAvailable: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  },
};

export const PUBLIC_MENU_ITEM_WITH_OPTIONS_SELECT = {
  id: true,
  name: true,
  description: true,
  price: true,
  category: true,
  isAvailable: true,
  sortOrder: true,
  optionGroups: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      isRequired: true,
      minSelect: true,
      maxSelect: true,
      sortOrder: true,
      optionItems: {
        where: {
          isAvailable: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          priceDelta: true,
          isAvailable: true,
          sortOrder: true,
        },
      },
    },
  },
};

export function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseInteger(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const trimmedValue = value.trim();

  if (!/^-?\d+$/.test(trimmedValue)) {
    return Number.NaN;
  }

  return Number.parseInt(trimmedValue, 10);
}

export function parseNonNegativeIntegerOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return parseInteger(value);
}

export function parsePriceDelta(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const trimmedValue = value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(trimmedValue)) {
    return Number.NaN;
  }

  return Number.parseFloat(trimmedValue);
}

export function normalizeOptionGroups(payloadOptionGroups) {
  if (!Array.isArray(payloadOptionGroups)) {
    return [];
  }

  return payloadOptionGroups.map((group, groupIndex) => {
    const rawMinSelect = parseNonNegativeIntegerOrNull(group.minSelect);
    const rawMaxSelect = parseNonNegativeIntegerOrNull(group.maxSelect);
    const type = normalizeText(group.type).toLowerCase();
    const isRequired = Boolean(group.isRequired);
    const normalizedItems = Array.isArray(group.items)
      ? group.items.map((item, itemIndex) => ({
          id: normalizeText(item.id),
          name: normalizeText(item.name),
          priceDelta: parsePriceDelta(item.priceDelta),
          isAvailable: typeof item.isAvailable === "boolean" ? item.isAvailable : true,
          sortOrder:
            parseNonNegativeIntegerOrNull(item.sortOrder) === null
              ? itemIndex
              : parseNonNegativeIntegerOrNull(item.sortOrder),
        }))
      : [];

    const minSelect =
      type === MENU_OPTION_GROUP_TYPE_SINGLE
        ? isRequired
          ? 1
          : 0
        : rawMinSelect === null
          ? isRequired
            ? 1
            : 0
          : rawMinSelect;
    const maxSelect =
      type === MENU_OPTION_GROUP_TYPE_SINGLE ? 1 : rawMaxSelect;

    return {
      id: normalizeText(group.id),
      name: normalizeText(group.name),
      type,
      isRequired,
      minSelect,
      maxSelect,
      sortOrder:
        parseNonNegativeIntegerOrNull(group.sortOrder) === null
          ? groupIndex
          : parseNonNegativeIntegerOrNull(group.sortOrder),
      items: normalizedItems,
    };
  });
}

export function validateOptionGroups(optionGroups) {
  for (const group of optionGroups) {
    if (!group.name) {
      return "each option group must include a name";
    }

    if (![MENU_OPTION_GROUP_TYPE_SINGLE, MENU_OPTION_GROUP_TYPE_MULTIPLE].includes(group.type)) {
      return "option group type must be single or multiple";
    }

    if (!Number.isInteger(group.sortOrder) || group.sortOrder < 0) {
      return "option group sortOrder must be a whole number greater than or equal to 0";
    }

    if (!Array.isArray(group.items) || group.items.length === 0) {
      return `option group "${group.name}" must include at least one option item`;
    }

    if (!Number.isInteger(group.minSelect) || group.minSelect < 0) {
      return `option group "${group.name}" has an invalid minSelect`;
    }

    if (
      group.maxSelect !== null &&
      (!Number.isInteger(group.maxSelect) || group.maxSelect < 1)
    ) {
      return `option group "${group.name}" has an invalid maxSelect`;
    }

    if (group.maxSelect !== null && group.minSelect > group.maxSelect) {
      return `option group "${group.name}" minSelect cannot be greater than maxSelect`;
    }

    if (group.minSelect > group.items.length) {
      return `option group "${group.name}" minSelect cannot exceed item count`;
    }

    if (group.maxSelect !== null && group.maxSelect > group.items.length) {
      return `option group "${group.name}" maxSelect cannot exceed item count`;
    }

    for (const item of group.items) {
      if (!item.name) {
        return `option group "${group.name}" has an option item without a name`;
      }

      if (!Number.isFinite(item.priceDelta) || item.priceDelta < 0 || !Number.isInteger(item.priceDelta)) {
        return `option item "${item.name}" must have a whole-number priceDelta greater than or equal to 0`;
      }

      if (!Number.isInteger(item.sortOrder) || item.sortOrder < 0) {
        return `option item "${item.name}" must have a valid sortOrder`;
      }
    }
  }

  return null;
}

export function serializeMenuItem(item) {
  return {
    ...item,
    optionGroups: Array.isArray(item.optionGroups)
      ? item.optionGroups.map((group) => ({
          ...group,
          optionItems: Array.isArray(group.optionItems)
            ? group.optionItems.map((optionItem) => ({
                ...optionItem,
                priceDelta: Number(optionItem.priceDelta || 0),
              }))
            : [],
        }))
      : [],
  };
}

export function serializePublicMenuItem(item) {
  const serializedItem = serializeMenuItem(item);
  const unavailableRequiredGroup = serializedItem.optionGroups.some(
    (group) => group.isRequired && (!Array.isArray(group.optionItems) || group.optionItems.length === 0)
  );

  if (unavailableRequiredGroup) {
    return null;
  }

  return {
    ...serializedItem,
    optionGroups: serializedItem.optionGroups.filter(
      (group) => Array.isArray(group.optionItems) && group.optionItems.length > 0
    ),
  };
}

export async function replaceMenuItemOptionGroups(tx, restaurantId, menuItemId, optionGroups) {
  await tx.menuOptionGroup.deleteMany({
    where: {
      menuItemId,
    },
  });

  for (const group of optionGroups) {
    await tx.menuOptionGroup.create({
      data: {
        restaurantId,
        menuItemId,
        name: group.name,
        type: group.type,
        isRequired: group.isRequired,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        sortOrder: group.sortOrder,
        optionItems: {
          create: group.items.map((item) => ({
            name: item.name,
            priceDelta: item.priceDelta,
            isAvailable: item.isAvailable,
            sortOrder: item.sortOrder,
          })),
        },
      },
    });
  }
}

export function normalizeSubmittedOrderItems(payload) {
  if (!Array.isArray(payload.items)) {
    return null;
  }

  return payload.items.map((item) => ({
    id: normalizeText(item.id),
    quantity: parseInteger(item.quantity),
    selectedOptionItemIds: Array.isArray(item.selectedOptionItemIds)
      ? [...new Set(item.selectedOptionItemIds.map((value) => normalizeText(value)).filter(Boolean))]
      : [],
  }));
}

function createOrderItemSignature(orderItem) {
  return `${orderItem.id}::${[...orderItem.selectedOptionItemIds].sort().join(",")}`;
}

export function validateSubmittedOrderItems(orderItems) {
  if (!orderItems || orderItems.length === 0) {
    return "items must be a non-empty array";
  }

  if (
    orderItems.some(
      (item) =>
        !item.id ||
        Number.isNaN(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isInteger(item.quantity)
    )
  ) {
    return "each order item must include a valid id and integer quantity greater than 0";
  }

  const signatures = orderItems.map(createOrderItemSignature);

  if (new Set(signatures).size !== signatures.length) {
    return "duplicate menu item configurations are not allowed in one order payload";
  }

  return null;
}

export function buildValidatedOrderItems(orderItems, menuItems) {
  const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));
  const validatedItems = [];

  for (const orderItem of orderItems) {
    const menuItem = menuItemMap.get(orderItem.id);

    if (!menuItem) {
      return { error: `Menu item not found: ${orderItem.id}` };
    }

    if (!menuItem.isAvailable) {
      return { error: `Menu item is unavailable: ${menuItem.name}` };
    }

    const selectedItemMap = new Map();

    for (const group of menuItem.optionGroups || []) {
      for (const optionItem of group.optionItems || []) {
        selectedItemMap.set(optionItem.id, {
          ...optionItem,
          groupId: group.id,
          groupName: group.name,
          groupType: group.type,
          groupIsRequired: group.isRequired,
          groupMinSelect: group.minSelect,
          groupMaxSelect: group.maxSelect,
          groupSortOrder: group.sortOrder,
        });
      }
    }

    for (const selectedOptionItemId of orderItem.selectedOptionItemIds) {
      if (!selectedItemMap.has(selectedOptionItemId)) {
        return { error: `Invalid option selection for menu item: ${menuItem.name}` };
      }

      if (!selectedItemMap.get(selectedOptionItemId).isAvailable) {
        return {
          error: `Selected option is unavailable for menu item: ${menuItem.name}`,
        };
      }
    }

    const selectedByGroup = new Map();

    for (const selectedOptionItemId of orderItem.selectedOptionItemIds) {
      const selectedOptionItem = selectedItemMap.get(selectedOptionItemId);

      if (!selectedByGroup.has(selectedOptionItem.groupId)) {
        selectedByGroup.set(selectedOptionItem.groupId, []);
      }

      selectedByGroup.get(selectedOptionItem.groupId).push(selectedOptionItem);
    }

    for (const group of menuItem.optionGroups || []) {
      const selectedItemsForGroup = selectedByGroup.get(group.id) || [];
      const minSelect =
        group.type === MENU_OPTION_GROUP_TYPE_SINGLE
          ? group.isRequired
            ? 1
            : 0
          : Math.max(group.isRequired ? 1 : 0, group.minSelect || 0);
      const maxSelect =
        group.type === MENU_OPTION_GROUP_TYPE_SINGLE ? 1 : group.maxSelect || Number.POSITIVE_INFINITY;

      if (group.type === MENU_OPTION_GROUP_TYPE_SINGLE && selectedItemsForGroup.length > 1) {
        return { error: `Select only one option in group: ${group.name}` };
      }

      if (selectedItemsForGroup.length < minSelect) {
        return { error: `Selection required for group: ${group.name}` };
      }

      if (selectedItemsForGroup.length > maxSelect) {
        return { error: `Too many selections for group: ${group.name}` };
      }
    }

    const selectedOptionsSnapshot = (menuItem.optionGroups || [])
      .map((group) => {
        const selectedItemsForGroup = (selectedByGroup.get(group.id) || []).sort(
          (left, right) => {
            if (left.sortOrder !== right.sortOrder) {
              return left.sortOrder - right.sortOrder;
            }

            return left.name.localeCompare(right.name);
          }
        );

        if (selectedItemsForGroup.length === 0) {
          return null;
        }

        return {
          groupName: group.name,
          items: selectedItemsForGroup.map((item) => ({
            name: item.name,
            priceDelta: Number(item.priceDelta || 0),
          })),
        };
      })
      .filter(Boolean);

    const selectedOptionPriceTotal = orderItem.selectedOptionItemIds.reduce(
      (sum, selectedOptionItemId) => sum + Number(selectedItemMap.get(selectedOptionItemId).priceDelta || 0),
      0
    );
    const unitPrice = menuItem.price + selectedOptionPriceTotal;

    validatedItems.push({
      menuItemId: menuItem.id,
      itemNameSnapshot: menuItem.name,
      unitPriceSnapshot: unitPrice,
      quantity: orderItem.quantity,
      lineTotal: unitPrice * orderItem.quantity,
      selectedOptionsSnapshot: selectedOptionsSnapshot.length > 0 ? selectedOptionsSnapshot : null,
    });
  }

  return {
    items: validatedItems,
    totalAmount: validatedItems.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}
