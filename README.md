# CrossPost API

A powerful Node.js/TypeScript API that enables users to manage and cross-post content across multiple social media platforms (LinkedIn, X/Twitter) with a unified interface.

## Features

- **Multi-Platform Support**: Post content simultaneously to LinkedIn and X/Twitter
- **OAuth Integration**: Seamless authentication with Google and social media platforms
- **Queue-Based Processing**: BullMQ-powered background job processing for reliable post distribution
- **Media Upload**: Built-in image upload support via Cloudinary
- **Real-Time Updates**: Socket.IO integration for real-time notifications
- **JWT Authentication**: Secure session management with refresh tokens
- **User Account Management**: Connect and manage multiple social media accounts
- **Post Management**: Track post status across different platforms

## Tech Stack

- **Framework**: Express.js 5.x
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT, Google OAuth, OAuth 1.0a
- **Cache & Queue**: Redis, BullMQ
- **Media**: Cloudinary
- **Validation**: Zod
- **Logging**: Winston

## Project Structure

```
src/
├── config/              # Configuration files
│   ├── googleOAuth.config.ts
│   ├── logger.config.ts
│   ├── multerr.config.ts
│   ├── prisma.ts
│   └── redis.config.ts
├── middlewares/         # Express middlewares
│   ├── auth.middleware.ts
│   └── error.middleware.ts
├── modules/             # Feature modules
│   ├── auth/           # Authentication
│   ├── post/           # Post management
│   ├── linkedin/       # LinkedIn integration
│   ├── x/              # X/Twitter integration
│   └── shared/         # Shared services
├── workers/            # Background job workers
│   ├── linkedin/
│   └── x/
├── utils/              # Utility functions
├── queues/             # Queue configuration
└── lib/                # Library code
```

## Getting Started

### Prerequisites

- Docker
- PostgreSQL
- Redis
- Cloudinary account
- Google OAuth credentials
- LinkedIn & X/Twitter OAuth credentials

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Mayur-00/OncePost-Api.git
cd OncePost-Api
```

2. **Set up environment variables**

Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql:your_DB_pooler_url
DIRECT_DATABASE_URL=direct_DB_url
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
X_ACCESS_TOKEN=your_x_access_token
X_ACCESS_TOKEN_SECRET=your_x_access_token_secret
REDIS_HOST=your_redis_host_uri
REDIS_PORT=redis_server_port
REDIS_PASSWORD=redis_password
REDIS_URL=redis_DB_uri
PORT=5000
NODE_ENV:develement
DOMAIN:domain_name
CORS_ORIGIN:your_frontend_client_link
FRONTEND_URI:your_frontend_client_link
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

```

3. **Build and Start Container**
```bash
docker compose up -D        
```

The API will be available at `http://localhost:5000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run worker:dev-post` - Start dev posting background worker
- `npm run worker:post` - Start posting background worker
- `npm run migration:dev` - Run dev prisma migration
- `npm run migrate` - Run prisma migration
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## API Endpoints

### Authentication (`/api/v1/auth`)

- `POST /google` - Login with Google OAuth
- `POST /register` - Register a new user
- `POST /login` - Login with email and password
- `POST /refresh-access` - Refresh JWT token
- `GET /user` - Get current user profile (requires auth)
- `GET /logout` - Logout user (requires auth)
- `GET /delete` - Request account deletion (requires auth)

### Posts (`/api/v1/post`) (requires auth)

- `POST /publish-post` - Queue post for publishing to multiple platforms 
- `POST /schedule` - schedule post for publishing later on multiple platforms 
- `GET /all` - Get all posts including all platfrom posts 
- `GET /Query` - Get all posts with user's searched query

### LinkedIn (`/api/v1/linkedin`) (requires auth)

- `GET /auth` - Initiate LinkedIn OAuth flow (requires auth)
- `GET /callback` - LinkedIn OAuth callback

### X/Twitter (`/api/v1/x`) (requires auth)

- `GET /callback` - X/Twitter OAuth callback
- `POST /auth` - Initiate X/Twitter OAuth flow (requires auth)

## Database Schema

### User
- Stores user information with support for Google OAuth and credential-based auth
- Maintains relationships with social accounts, posts, and sessions

### SocialAccount
- Represents connected social media accounts (LinkedIn, X, Facebook)
- Stores OAuth tokens and platform-specific data

### Post
- Represents a post created by a user
- Tracks post status (CREATED, UPLOADED, PENDING, DRAFT, FAILED)
- Contains post content and media

### PlatformPost
- Represents the status of a post on a specific platform
- Links posts to their platform-specific implementations
- Tracks platform post ID and URL

### OAuthSession
- Manages OAuth state for authentication flows
- Implements PKCE for enhanced security

### SubscriptionPlan
- Represents Subscription plans

### Subscription 
- Represents User subscription

## Transaction
- Represents all transactions made by user
- Mostly Represnts Subscripiton transactions

## Data Models

### PostStatus
- `CREATED` - Post created but not yet uploaded
- `UPLOADED` - Post content uploaded
- `PENDING` - Awaiting platform posting
- `DRAFT` - Saved as draft
- `FAILED` - Posting failed

### PlatformPostStatus
- `PENDING` - Awaiting posting to platform
- `POSTED` - Successfully posted
- `FAILED` - Posting failed

### AuthProviderType
- `GOOGLE` - Google OAuth authentication
- `CREDENTIAL` - Email/password authentication

### SocialPlatforms
- `LINKEDIN` - LinkedIn platform
- `X` - X/Twitter platform

## Key Features

### Queue-Based Processing
The API uses BullMQ for asynchronous post processing:
- Posts are queued for each platform
- Background workers process posts independently
- Failed posts can be retried automatically

### Media Upload
- Images uploaded via Multer
- Stored in Cloudinary
- Automatic URL generation for media access

### Error Handling
- Centralized error middleware
- Custom ApiError and ApiResponse utilities
- Proper HTTP status codes

### Security
- JWT-based authentication
- OAuth 1.0a for X/Twitter
- OAuth 2.0 for Google and LinkedIn
- PKCE implementation for OAuth flows
- Password hashing with bcrypt
- CORS configuration

## Worker Processes

The API includes separate worker processes for handling background tasks:

### Dev-Post Worker
Processes Queued Posts in development 
```bash
npm run worker:dev-post
```

### Post Worker
Processes posts queued in Production
```bash
npm run worker:post
```

## Error Handling

The API uses a centralized error handling middleware that catches and formats all errors with consistent response structures:

```json
{
  "statusCode": 400,
  "data": null,
  "message": "Error message",
  "success": false
}
```

## Logging

Winston logger is configured for:
- Application logging
- Error tracking
- Request/response logging
- File and console output

## Development

### Code Quality
- ESLint configuration for code standards
- TypeScript strict mode enabled

### Testing
Test files are located in `src/__test__/` directory

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting: `npm run lint:fix`
4. Test your changes
5. Submit a pull request

## License

ISC

## Support

For issues and questions, please open an issue in the repository.
