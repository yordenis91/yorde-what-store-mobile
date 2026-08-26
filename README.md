# Yorde What Store - Mobile App

React Native + Expo mobile application for the Yorde What Store multitenant ecommerce platform.

## 📱 About

This is a mobile-first application for WhatsApp sellers to manage their stores, products, orders, and payments directly from their phones. Built with React Native and Expo for iOS and Android.

## 🎯 Features

- **Store Management** - Full CRUD operations for products and inventory
- **Order Management** - Track orders, update status, and manage customer interactions
- **Payment Integration** - WhatsApp, Stripe, and multiple payment methods
- **WhatsApp Integration** - Direct messaging and payment links
- **Offline-First** - Works offline with local data sync when connection is restored
- **Multi-tenant** - Support for multiple seller accounts
- **Push Notifications** - Real-time order and payment notifications
- **Responsive Design** - Optimized for mobile devices

## 🏗️ Architecture

This is a monorepo using `pnpm` workspaces and `turbo` for build orchestration.

```
yorde-what-store-mobile/
├── apps/
│   ├── mobile/              # React Native + Expo app
│   └── web/                 # (Optional) React web dashboard
├── packages/
│   ├── shared/              # Shared code (types, hooks, utils, API client)
│   └── ui/                  # Shared UI components
├── turbo.json               # Turbo build config
├── pnpm-workspace.yaml      # Workspaces config
└── package.json             # Root package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Expo CLI
- EAS CLI (for building and publishing)

### Installation

```bash
# Clone the repository
git clone https://github.com/yordenis91/yorde-what-store-mobile.git
cd yorde-what-store-mobile

# Install dependencies
pnpm install

# Start the mobile app (development)
cd apps/mobile
pnpm dev
```

### Environment Variables

Create `.env` files in the appropriate directories:

**apps/mobile/.env**
```
EXPO_PUBLIC_API_URL=https://your-api-url.com
EXPO_PUBLIC_STRIPE_KEY=your_stripe_publishable_key
```

**packages/shared/.env**
```
# API Configuration
API_BASE_URL=https://your-api-url.com
```

## 📦 Workspaces

### `apps/mobile`
The React Native Expo application

```bash
cd apps/mobile
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm eas build  # Build with EAS
```

### `packages/shared`
Shared code including:
- TypeScript types and interfaces
- React hooks (useAuth, useProducts, useOrders, etc.)
- API client configuration
- Validation schemas (Zod)
- Utility functions

### `packages/ui`
Reusable UI components
- Form components
- Buttons and modals
- Layout components
- Theme configuration

## 🔗 API Integration

The app connects to the Yorde What Store API. API client configuration is in `packages/shared/api/client.ts`.

**Base URL:** `https://your-api-url.com`

**Authentication:** JWT tokens stored securely in device

## 💳 Payment Methods

- **WhatsApp** - Direct messaging for payment confirmation
- **Stripe** - Credit/debit card payments
- **Bank Transfer** - Manual bank transfers
- **Cash** - Local pickup payments

## 🔐 Security

- JWT token-based authentication
- Secure token storage using Expo SecureStore
- HTTPS only API communication
- Input validation with Zod
- Environment variables for sensitive data

## 📱 Supported Platforms

- **iOS** 12+
- **Android** 6.0+
- **Web** (via Expo Web - optional)

## 🧪 Testing

```bash
# Run tests in mobile app
cd apps/mobile
pnpm test

# Run tests in shared package
cd packages/shared
pnpm test

# Run all tests
pnpm test --filter="./packages/**" --filter="./apps/mobile"
```

## 🎨 Development

### Code Style

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- NativeWind for styling (Tailwind CSS for React Native)

### Run Linting

```bash
pnpm lint
```

### Format Code

```bash
pnpm format
```

## 📚 Project Structure

```
apps/mobile/
├── app/
│   ├── (auth)/              # Auth screens (login, register)
│   ├── (tabs)/              # Main app screens with bottom tabs
│   │   ├── dashboard.tsx
│   │   ├── products/
│   │   ├── orders/
│   │   ├── customers.tsx
│   │   └── settings.tsx
│   ├── _layout.tsx
│   └── index.tsx
├── components/              # Reusable components
├── hooks/                   # Local hooks
├── stores/                  # Zustand stores
├── types/                   # Local types
├── utils/                   # Utility functions
├── app.json                 # Expo configuration
├── package.json
└── tsconfig.json

packages/shared/
├── api/
│   └── client.ts           # Axios API client
├── hooks/
│   ├── useAuth.ts
│   ├── useProducts.ts
│   ├── useOrders.ts
│   └── useCustomers.ts
├── stores/
│   ├── authStore.ts
│   └── tenantStore.ts
├── types/
│   ├── index.ts
│   ├── models.ts
│   └── api.ts
├── utils/
│   ├── validation.ts        # Zod schemas
│   ├── formatting.ts
│   ├── whatsapp.ts
│   └── stripe.ts
└── package.json

packages/ui/
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── ...
├── theme/
│   └── colors.ts
└── package.json
```

## 📖 Documentation

- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
- [NestJS Backend API](https://github.com/yordenis91/yorde-what-store-api)
- [React Web Client](https://github.com/yordenis91/yorde-what-store-client)

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## 📝 License

This project is part of Yorde What Store. See LICENSE for details.

## 👨‍💻 Author

Created by [Yordenis](https://github.com/yordenis91)

## 📞 Support

For issues and questions, please open an issue on GitHub or contact support.

---

**Built with ❤️ for WhatsApp sellers in the Caribbean**
