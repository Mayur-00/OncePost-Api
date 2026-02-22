# Quick Implementation Guide - Subscription System

## 📋 What Was Created

### Database Models (Prisma)
- ✅ `SubscriptionPlan` - Stores plan details (FREE, BASIC, PRO)
- ✅ `Subscription` - User subscription records
- ✅ `Transaction` - Payment transaction history

### TypeScript Files
- ✅ `src/modules/subscription/subscription.types.ts` - All TypeScript interfaces
- ✅ `src/modules/subscription/subscription.services.ts` - Business logic
- ✅ `src/modules/subscription/subscription.controller.ts` - API endpoints
- ✅ `src/modules/subscription/subscription.routes.ts` - Route definitions
- ✅ `src/modules/subscription/index.ts` - Module exports
- ✅ `src/utils/razorpay.utility.ts` - Razorpay integration utilities

### Database Scripts
- ✅ `prisma/seed.ts` - Seeding script for subscription plans
- ✅ New migration file will be created when you run migrations

### Documentation
- ✅ `SUBSCRIPTION_SYSTEM.md` - Complete documentation
- ✅ `.env.razorpay` - Environment variables template

## 🚀 Step-by-Step Setup

### Step 1: Update Environment Variables
```bash
# Add these to your .env file
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Step 2: Create Database Migration
```bash
npm run migration:dev -- --name "add_subscription_and_transaction_models"
```
(This creates the migration from your updated schema)

### Step 3: Run Database Seed
```bash
npm run seed
```
This will populate your database with the three subscription plans:
- FREE (₹0)
- BASIC (₹499/month)
- PRO (₹1,999/month)

### Step 4: Mount Routes in app.ts
```typescript
import { subscriptionRoutes } from "./modules/subscription/index.js";

// Add this to your Express app
app.use("/api/subscriptions", subscriptionRoutes);
```

### Step 5: Install Razorpay Package (if not installed)
```bash
npm install razorpay
```

### Step 6: Configure Razorpay Webhooks
1. Go to https://dashboard.razorpay.com/
2. Navigate to Settings > Webhooks
3. Add URL: `https://yourdomain.com/api/subscriptions/webhook/razorpay`
4. Select events: payment.captured, payment.failed
5. Copy the signing secret to your .env file

## 📊 Subscription Plans

| Plan | Price | Posts/Month | Accounts | Analytics | Priority Support |
|------|-------|------------|----------|-----------|-----------------|
| FREE | ₹0 | 5 | 1 | No | No |
| BASIC | ₹499 | 50 | 5 | Yes | No |
| PRO | ₹1,999 | Unlimited | Unlimited | Yes | Yes |

## 🔌 API Endpoints

### Public
- `GET /api/subscriptions/plans` - List all plans
- `GET /api/subscriptions/plans/:planId` - Get specific plan

### Protected (requires auth)
- `POST /api/subscriptions/create-order` - Create Razorpay order
- `POST /api/subscriptions/verify-payment` - Verify & create subscription
- `GET /api/subscriptions/current` - Get user's subscription
- `GET /api/subscriptions/status` - Get subscription status
- `POST /api/subscriptions/upgrade` - Upgrade subscription
- `POST /api/subscriptions/cancel` - Cancel subscription
- `GET /api/subscriptions/transactions` - Get transaction history
- `GET /api/subscriptions/check-feature` - Check feature access

### Webhooks
- `POST /api/subscriptions/webhook/razorpay` - Razorpay webhook handler

## 💾 Database Schema

```
User (existing)
├── subscriptions (new relation)
└── transactions (new relation)

SubscriptionPlan (new)
├── id
├── plan_tier (FREE, BASIC, PRO)
├── price (in INR)
├── currency
├── description
├── features[]
├── maxPostsPerMonth
├── maxSocialAccounts
├── analyticsEnabled
├── schedulingEnabled
├── prioritySupport
├── customBranding
├── createdAt
├── updatedAt
└── subscriptions[] (relation)

Subscription (new)
├── id
├── user_id
├── plan_tier_id
├── status (active, cancelled, expired)
├── razorpay_subscription_id
├── current_period_start
├── current_period_end
├── cancelled_at
├── createdAt
├── updatedAt
├── user (relation)
├── plan (relation)
└── transactions[] (relation)

Transaction (new)
├── id
├── user_id
├── subscription_id
├── razorpay_payment_id
├── razorpay_order_id
├── razorpay_signature
├── amount (in INR)
├── currency
├── status (PENDING, COMPLETED, FAILED, REFUNDED)
├── type (SUBSCRIPTION_UPGRADE, SUBSCRIPTION_RENEWAL)
├── description
├── failure_reason
├── createdAt
├── updatedAt
├── user (relation)
└── subscription (relation)
```

## 🔐 Security Features

- ✅ Razorpay signature verification
- ✅ Webhook signature validation
- ✅ Payment verification before creating subscription
- ✅ Auth middleware on protected routes
- ✅ Encrypted Razorpay keys in environment variables

## 💡 Usage Examples

### Check if user can use a feature
```typescript
const canUseAnalytics = await SubscriptionService.hasFeatureAccess(
  userId, 
  'analytics'
);
```

### Get user's subscription status
```typescript
const status = await SubscriptionService.getSubscriptionStatus(userId);
// Returns: { status: 'active', plan: 'BASIC', expiresAt: Date, daysRemaining: 30 }
```

### Create Razorpay order
```typescript
const order = await RazorpayService.createOrder(
  499,  // amount in INR
  'INR',
  'receipt_' + Date.now()
);
```

## ⚠️ Important Notes

1. **Database Connection Required**: You must have a PostgreSQL database configured to run migrations
2. **Razorpay Account**: Create a Razorpay account at https://razorpay.com/
3. **Webhook Configuration**: Set up webhooks in Razorpay dashboard for payment updates
4. **Test Mode**: Use Razorpay test credentials during development
5. **One-Time Payments**: This system uses Razorpay one-time payments, NOT subscriptions
6. **Monthly Renewal**: Payment flow for renewals should be implemented based on your business logic

## 🔍 Testing

### Test Card Details
- Card: 4111 1111 1111 1111
- Expiry: Any future date (MM/YY)
- CVV: Any 3 digits

### Test API Flow
1. Get plans: `curl http://localhost:3000/api/subscriptions/plans`
2. Create order: `curl -X POST http://localhost:3000/api/subscriptions/create-order -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"planId":"PLAN_ID"}'`
3. Verify payment: `curl -X POST http://localhost:3000/api/subscriptions/verify-payment -H "Authorization: Bearer TOKEN" -d '{"planId":"PLAN_ID", "razorpay_order_id":"...", "razorpay_payment_id":"...", "razorpay_signature":"..."}'`

## 📝 Next Steps

1. ✅ Run migration: `npm run migration:dev`
2. ✅ Seed data: `npm run seed`
3. ✅ Add routes to app.ts
4. ✅ Configure Razorpay environment variables
5. ✅ Set up webhooks in Razorpay dashboard
6. ✅ Test payment flow
7. 🚀 Deploy to production

## 📚 Additional Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay API Reference](https://razorpay.com/api/rest/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- Full documentation: See `SUBSCRIPTION_SYSTEM.md`

## 🆘 Troubleshooting

### Migration fails
- Check database connection in .env
- Ensure PostgreSQL is running
- Run `npm run prisma:generate` first

### Seed fails
- Ensure migration ran successfully
- Check database connection
- Verify SubscriptionPlan model exists

### Razorpay integration fails
- Verify API keys in .env
- Check webhook signature configuration
- Test with Razorpay test credentials first

### Payment verification fails
- Ensure Razorpay_KEY_SECRET is correct
- Check webhook secret configuration
- Verify signature is not tampered

Need help? Check `SUBSCRIPTION_SYSTEM.md` for detailed documentation!
