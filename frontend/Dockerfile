FROM node:20-alpine AS builder

WORKDIR /workspace

# Install dependencies
COPY package.json ./
RUN npm install

# Build application
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /workspace

# Copy build output and dependencies
COPY --from=builder /workspace/package.json ./
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/.next ./.next
COPY --from=builder /workspace/public ./public

# Expose Next.js port
EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]
