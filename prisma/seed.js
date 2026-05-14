const bcrypt = require("bcrypt");
const { PrismaClient, UserRole } = require("@prisma/client");

const prisma = new PrismaClient();

const restaurantData = {
  slug: "demo",
  name: "Zento Demo Restaurant",
};

const tableData = [
  { code: "T01", label: "Table T01" },
  { code: "T02", label: "Table T02" },
  { code: "T03", label: "Table T03" },
];

const menuItemsData = [
  {
    id: "item-pad-krapow",
    name: "Pad Krapow Chicken",
    price: 89,
    category: "Mains",
    description: "Stir-fried chicken with holy basil, chili, and jasmine rice.",
    isAvailable: true,
  },
  {
    id: "item-thai-omelette",
    name: "Thai Omelette Rice",
    price: 79,
    category: "Mains",
    description: "Crisp Thai-style omelette served over hot rice.",
    isAvailable: true,
  },
  {
    id: "item-tom-yum",
    name: "Tom Yum Soup",
    price: 129,
    category: "Soup",
    description: "Hot and sour soup with herbs, mushroom, and shrimp.",
    isAvailable: true,
  },
  {
    id: "item-papaya-salad",
    name: "Papaya Salad",
    price: 95,
    category: "Salads",
    description: "Green papaya salad with lime, chili, and roasted peanuts.",
    isAvailable: true,
  },
  {
    id: "item-thai-milk-tea",
    name: "Thai Milk Tea",
    price: 55,
    category: "Drinks",
    description: "Sweet Thai tea with milk served over ice.",
    isAvailable: true,
  },
  {
    id: "item-mango-sticky-rice",
    name: "Mango Sticky Rice",
    price: 109,
    category: "Desserts",
    description: "Sweet mango with coconut sticky rice.",
    isAvailable: true,
  },
];

const demoUserData = {
  email: process.env.SEED_DEMO_OWNER_EMAIL || "demo@zento.dev",
  name: process.env.SEED_DEMO_OWNER_NAME || "Demo Owner",
  role: UserRole.owner,
  password:
    process.env.SEED_DEMO_OWNER_PASSWORD ||
    (process.env.NODE_ENV === "production" ? "" : "demo1234"),
};

async function main() {
  if (!demoUserData.password) {
    throw new Error("SEED_DEMO_OWNER_PASSWORD is required when seeding production data");
  }

  const passwordHash = await bcrypt.hash(demoUserData.password, 10);
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: restaurantData.slug },
    update: { name: restaurantData.name },
    create: restaurantData,
  });

  await prisma.restaurantSettings.upsert({
    where: { restaurantId: restaurant.id },
    update: {},
    create: {
      restaurantId: restaurant.id,
      currency: "THB",
      timezone: "Asia/Bangkok",
    },
  });

  for (const table of tableData) {
    await prisma.table.upsert({
      where: {
        restaurantId_code: {
          restaurantId: restaurant.id,
          code: table.code,
        },
      },
      update: {
        label: table.label,
        isActive: true,
      },
      create: {
        restaurantId: restaurant.id,
        code: table.code,
        label: table.label,
      },
    });
  }

  for (const menuItem of menuItemsData) {
    await prisma.menuItem.upsert({
      where: { id: menuItem.id },
      update: {
        restaurantId: restaurant.id,
        name: menuItem.name,
        description: menuItem.description,
        price: menuItem.price,
        category: menuItem.category,
        isAvailable: menuItem.isAvailable,
      },
      create: {
        ...menuItem,
        restaurantId: restaurant.id,
      },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: "staff@zento.demo",
    },
  });

  await prisma.user.upsert({
    where: { email: demoUserData.email },
    update: {
      restaurantId: restaurant.id,
      name: demoUserData.name,
      role: demoUserData.role,
      passwordHash,
    },
    create: {
      restaurantId: restaurant.id,
      email: demoUserData.email,
      name: demoUserData.name,
      role: demoUserData.role,
      passwordHash,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
