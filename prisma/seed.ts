
import prisma from '../src/config/prisma.js'
import dotenv from "dotenv";
dotenv.config()

async function main() {
  // Clear existing plans
  await prisma.subscriptionPlan.deleteMany();

  // Create subscription plans
  const freePlan = await prisma.subscriptionPlan.create({
    data: {
      plan_tier: "FREE",
      price: 0,
      currency: "INR",
      description:
        "Perfect for trying out. Limited features for casual content creators.",
      features: [
        "Up to 2 posts per month",
        "2 social account connection",
        "Basic post scheduling",
        "Standard analytics ",
      ],
      maxPostsPerMonth: 2,
      schedulingEnabled: true,
      prioritySupport: false,
    },
  });

  const basicPlan = await prisma.subscriptionPlan.create({
    data: {
      plan_tier: "PRO",
      price: 199,
      currency: "INR",
      description:
        "Great for small creators and freelancers. Grow your presence across platforms.",
      features: [
        "Up to 20 posts per month",
        "Unlimited social accounts",
        "Advanced scheduling ",
        "Full analytics dashboard (last 30 days)",
        "Email support (24-48 hours)",
        "Basic content calendar",
      ],
      maxPostsPerMonth: 20,
      schedulingEnabled: true,
      prioritySupport: false,

    },
  });

 

  console.log("Subscription plans seeded successfully:");
  console.log(`✓ FREE Plan - ₹${freePlan.price}`);
  console.log(`✓ BASIC Plan - ₹${basicPlan.price}/month`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("\nDatabase seeding completed!");
  })
  .catch(async (e) => {
    console.error("Seeding error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
