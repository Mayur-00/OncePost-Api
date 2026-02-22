# Subscription System Documentation

## Overview

This is a complete subscription management system for the CrossPost API, integrated with Razorpay for one-time payments. The system supports three subscription tiers: FREE, BASIC, and PRO.

## Subscription Plans

### Pricing Structure (INR - Indian Rupees)

| Plan | Price | Billing |
|------|-------|---------|
| **FREE** | ₹0 | Forever |
| **BASIC** | ₹499 | Monthly |
| **PRO** | ₹1,999 | Monthly |

### Features Comparison

#### FREE Plan
- ✓ Up to 5 posts per month
- ✓ 1 social account connection
- ✓ Basic post scheduling
- ✓ Standard analytics (last 7 days)
- ✓ Community support

#### BASIC Plan (₹499/month)
- ✓ Up to 50 posts per month
- ✓ 5 social accounts
- ✓ Advanced scheduling (queue posts)
- ✓ Full analytics dashboard (last 30 days)
- ✓ Post performance insights
- ✓ Bulk upload support
- ✓ Email support (24-48 hours)
- ✓ Basic content calendar

#### PRO Plan (₹1,999/month)
- ✓ Unlimited posts per month
- ✓ Unlimited social accounts
- ✓ Advanced AI-powered scheduling
- ✓ Unlimited analytics & insights
- ✓ Competitor analysis
- ✓ Team collaboration (up to 5 members)
- ✓ Priority support (2-hour response)
- ✓ Custom branding & white-label options
- ✓ Advanced reporting & exports
- ✓ API access
- ✓ Content calendar with collaboration
- ✓ Post templates & drafts library
- ✓ Multi-language support

## Database Models

### SubscriptionPlan Model
```prisma
model SubscriptionPlan {
  id                    String    @id @default(cuid())
  plan_tier             PlanTier  @unique
  price                 Float     // Price in INR
  currency              String    @default("INR")
  description           String
  features              String[]
  maxPostsPerMonth      Int
  maxSocialAccounts     Int
  analyticsEnabled      Boolean   @default(false)
  schedulingEnabled     Boolean   @default(false)
  prioritySupport       Boolean   @default(false)
  customBranding        Boolean   @default(false)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt()
  
  subscriptions         Subscription[]
}
```

### Subscription Model
```prisma
model Subscription {
  id                      String   @id @default(cuid())
  user_id                 String
  plan_tier_id            String
  status                  String   @default("active") // active, cancelled, expired
  razorpay_subscription_id String?
  current_period_start    DateTime
  current_period_end      DateTime
  cancelled_at            DateTime?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt()
  
  user                    User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  plan                    SubscriptionPlan @relation(fields: [plan_tier_id], references: [id])
  transactions            Transaction[]
}
```

### Transaction Model
```prisma
model Transaction {
  id                      String   @id @default(cuid())
  user_id                 String
  subscription_id         String
  razorpay_payment_id     String   @unique
  razorpay_order_id       String   @unique
  razorpay_signature      String?
  amount                  Float    // Amount in INR
  currency                String   @default("INR")
  status                  TransactionStatus @default(PENDING)
  type                    TransactionType
  description             String?
  failure_reason          String?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt()
  
  user                    User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  subscription            Subscription @relation(fields: [subscription_id], references: [id], onDelete: Cascade)
}
```

## Enums

### TransactionStatus
- PENDING
- COMPLETED
- FAILED
- REFUNDED

### TransactionType
- SUBSCRIPTION_UPGRADE
- SUBSCRIPTION_RENEWAL

### PlanTier
- FREE
- BASIC
- PRO

## API Endpoints

### Public Endpoints

#### 1. Get All Subscription Plans
```
GET /api/subscriptions/plans
```

**Response:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": "plan_1",
      "plan_tier": "FREE",
      "price": 0,
      "currency": "INR",
      "description": "Perfect for trying out...",
      "features": [...],
      "maxPostsPerMonth": 5,
      "maxSocialAccounts": 1,
      "analyticsEnabled": false,
      "schedulingEnabled": true,
      "prioritySupport": false,
      "customBranding": false
    }
  ],
  "message": "Subscription plans fetched successfully"
}
```

#### 2. Get Specific Plan
```
GET /api/subscriptions/plans/:planId
```

### Protected Endpoints (Requires Authentication)

#### 1. Create Razorpay Order
```
POST /api/subscriptions/create-order
Content-Type: application/json

{
  "planId": "plan_1"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "order_id": "order_123456",
    "key_id": "rzp_live_XXXXXX",
    "amount": 499,
    "currency": "INR",
    "plan_tier": "BASIC"
  },
  "message": "Razorpay order created successfully"
}
```

#### 2. Verify Payment & Create Subscription
```
POST /api/subscriptions/verify-payment
Content-Type: application/json

{
  "planId": "plan_1",
  "razorpay_order_id": "order_123456",
  "razorpay_payment_id": "pay_123456",
  "razorpay_signature": "signature_hash"
}
```

#### 3. Get Current Subscription
```
GET /api/subscriptions/current
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "id": "sub_123",
    "user_id": "user_1",
    "plan_tier_id": "plan_1",
    "status": "active",
    "current_period_start": "2025-02-06T00:00:00Z",
    "current_period_end": "2025-03-08T00:00:00Z",
    "plan": {
      "id": "plan_1",
      "plan_tier": "BASIC",
      "price": 499,
      ...
    }
  },
  "message": "User subscription fetched successfully"
}
```

#### 4. Get Subscription Status
```
GET /api/subscriptions/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "status": "active",
    "plan": "BASIC",
    "expiresAt": "2025-03-08T00:00:00Z",
    "daysRemaining": 30
  },
  "message": "Subscription status fetched successfully"
}
```

#### 5. Upgrade Subscription
```
POST /api/subscriptions/upgrade
Content-Type: application/json
Authorization: Bearer <token>

{
  "newPlanId": "plan_2",
  "razorpay_order_id": "order_789",
  "razorpay_payment_id": "pay_789",
  "razorpay_signature": "signature_hash"
}
```

#### 6. Cancel Subscription
```
POST /api/subscriptions/cancel
Content-Type: application/json
Authorization: Bearer <token>

{
  "reason": "Optional cancellation reason"
}
```

#### 7. Get Transaction History
```
GET /api/subscriptions/transactions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": "txn_1",
      "user_id": "user_1",
      "subscription_id": "sub_123",
      "razorpay_payment_id": "pay_123456",
      "razorpay_order_id": "order_123456",
      "amount": 499,
      "currency": "INR",
      "status": "COMPLETED",
      "type": "SUBSCRIPTION_UPGRADE",
      "description": "Subscription to BASIC plan",
      "createdAt": "2025-02-06T00:00:00Z"
    }
  ],
  "message": "Transaction history fetched successfully"
}
```

#### 8. Check Feature Access
```
GET /api/subscriptions/check-feature?feature=analytics
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "feature": "analytics",
    "hasAccess": true
  },
  "message": "Feature access checked successfully"
}
```

### Webhook Endpoints

#### Razorpay Webhook
```
POST /api/subscriptions/webhook/razorpay
```

This endpoint handles Razorpay webhook events:
- `payment.captured` - Updates transaction status to COMPLETED
- `payment.failed` - Updates transaction status to FAILED

**Headers Required:**
```
X-Razorpay-Signature: webhook_signature_hash
Content-Type: application/json
```

## Setup Instructions

### 1. Environment Variables
Add these to your `.env` file:

```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
DATABASE_URL=your_database_url
```

### 2. Run Migrations
```bash
npm run migration:dev
```

### 3. Seed Database
```bash
npm run seed
```

This will create the three subscription plans (FREE, BASIC, PRO) with proper pricing and features.

### 4. Mount Subscription Routes
In your `app.ts`:

```typescript
import { subscriptionRoutes } from "./modules/subscription/index.js";

app.use("/api/subscriptions", subscriptionRoutes);
```

## Frontend Integration Example

### React Component Example

```typescript
import { useEffect, useState } from "react";

export const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([]);
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    fetch("/api/subscriptions/plans")
      .then(res => res.json())
      .then(data => setPlans(data.data));
  }, []);

  const handleUpgrade = async (planId: string) => {
    // 1. Create Razorpay order
    const orderRes = await fetch("/api/subscriptions/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ planId })
    });
    const orderData = await orderRes.json();
    const { order_id, key_id, amount } = orderData.data;

    // 2. Open Razorpay payment modal
    const options = {
      key: key_id,
      amount: amount * 100,
      currency: "INR",
      order_id,
      handler: async (response: any) => {
        // 3. Verify payment
        const verifyRes = await fetch("/api/subscriptions/verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            planId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          })
        });

        if (verifyRes.ok) {
          alert("Subscription upgraded successfully!");
          // Refresh subscription status
          window.location.reload();
        }
      }
    };

    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  };

  return (
    <div className="plans-container">
      {plans.map(plan => (
        <div key={plan.id} className="plan-card">
          <h3>{plan.plan_tier}</h3>
          <p className="price">₹{plan.price}</p>
          <ul>
            {plan.features.map((feature: string) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <button onClick={() => handleUpgrade(plan.id)}>
            {plan.price === 0 ? "Current Plan" : "Upgrade"}
          </button>
        </div>
      ))}
    </div>
  );
};
```

## Service Usage Examples

### Get User Subscription Status
```typescript
import { SubscriptionService } from "./modules/subscription/index.js";

const status = await SubscriptionService.getSubscriptionStatus(userId);
console.log(status);
// Output: { status: 'active', plan: 'BASIC', expiresAt: Date, daysRemaining: 30 }
```

### Check Feature Access
```typescript
const hasAccess = await SubscriptionService.hasFeatureAccess(userId, 'analytics');
if (hasAccess) {
  // Show analytics dashboard
}
```

### Get All Plans
```typescript
const plans = await SubscriptionService.getPlans();
plans.forEach(plan => {
  console.log(`${plan.plan_tier}: ₹${plan.price}/month`);
});
```

## Market Pricing Rationale

The pricing structure is designed based on Indian market standards:

- **FREE**: Entry-level for individual creators experimenting with cross-posting
- **BASIC (₹499/month)**: ~$6 USD equivalent - Affordable for freelancers and small creators
- **PRO (₹1,999/month)**: ~$24 USD equivalent - Suitable for agencies and serious content creators

These prices are competitive with similar SaaS tools in the Indian market and provide good value for the features offered.

## Razorpay Integration Notes

### Payment Flow
1. Frontend requests order creation
2. Backend creates Razorpay order
3. Frontend opens Razorpay checkout
4. User completes payment
5. Frontend receives payment details
6. Frontend sends verification request
7. Backend verifies signature and creates subscription
8. Razorpay sends webhook confirmation

### Webhook Configuration
Configure your Razorpay dashboard to send webhooks to:
```
https://yourdomain.com/api/subscriptions/webhook/razorpay
```

Events to subscribe:
- payment.captured
- payment.failed

## Testing Razorpay Integration

Use these test card credentials:
- **Card Number**: 4111 1111 1111 1111
- **Expiry**: Any future date (MM/YY)
- **CVV**: Any 3 digits

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Successful request
- `201`: Resource created
- `400`: Bad request or invalid data
- `401`: Unauthorized (missing/invalid token)
- `404`: Resource not found
- `500`: Server error

## Future Enhancements

- [ ] Subscription renewal reminders (email)
- [ ] Usage analytics per subscription tier
- [ ] Discount codes and coupons
- [ ] Annual billing option (with discount)
- [ ] Payment method management
- [ ] Invoice generation and download
- [ ] Subscription pause/resume functionality
- [ ] Pro-rata refunds for downgrades
