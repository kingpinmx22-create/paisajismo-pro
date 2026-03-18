# Use Node.js 22 as the base image
FROM node:22-slim AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
FROM base AS deps
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build the application
FROM deps AS build
COPY . .
# Ensure attached_assets exists for Vite build
RUN mkdir -p attached_assets && touch attached_assets/.gitkeep
RUN pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

# Copy built server and public assets
# The server expects 'public' to be in the same directory as index.js in production
COPY --from=build /app/dist/index.js ./index.js
COPY --from=build /app/dist/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]
