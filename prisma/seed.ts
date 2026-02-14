
import prisma from '../src/config/prisma.js'

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
        "Up to 5 posts per month",
        "2 social account connection",
        "Basic post scheduling",
        "Standard analytics (last 7 days)",
        "Community support",
      ],
      maxPostsPerMonth: 5,
      maxSocialAccounts: 2,
      analyticsEnabled: false,
      schedulingEnabled: true,
      prioritySupport: false,
      customBranding: false,
    },
  });

  const basicPlan = await prisma.subscriptionPlan.create({
    data: {
      plan_tier: "BASIC",
      price: 499,
      currency: "INR",
      description:
        "Great for small creators and freelancers. Grow your presence across platforms.",
      features: [
        "Up to 50 posts per month",
        "Up to 5 social accounts",
        "Advanced scheduling (queue posts)",
        "Full analytics dashboard (last 30 days)",
        "Post performance insights",
        "Bulk upload support",
        "Email support (24-48 hours)",
        "Basic content calendar",
      ],
      maxPostsPerMonth: 50,
      maxSocialAccounts: 5,
      analyticsEnabled: true,
      schedulingEnabled: true,
      prioritySupport: false,
      customBranding: false,
    },
  });

  const proPlan = await prisma.subscriptionPlan.create({
    data: {
      plan_tier: "PRO",
      price: 1999,
      currency: "INR",
      description:
        "For serious content creators and agencies. Advanced tools for managing multiple clients.",
      features: [
        "Unlimited posts per month",
        "Unlimited social accounts",
        "Advanced AI-powered scheduling",
        "Unlimited analytics & insights",
        "Competitor analysis",
        "Team collaboration (up to 5 members)",
        "Priority support (2-hour response)",
        "Custom branding & white-label options",
        "Advanced reporting & exports",
        "API access",
        "Content calendar with collaboration",
        "Post templates & drafts library",
        "Multi-language support",
      ],
      maxPostsPerMonth: 99999,
      maxSocialAccounts: 99999,
      analyticsEnabled: true,
      schedulingEnabled: true,
      prioritySupport: true,
      customBranding: true,
    },
  });

  console.log("Subscription plans seeded successfully:");
  console.log(`✓ FREE Plan - ₹${freePlan.price}`);
  console.log(`✓ BASIC Plan - ₹${basicPlan.price}/month`);
  console.log(`✓ PRO Plan - ₹${proPlan.price}/month`);
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
