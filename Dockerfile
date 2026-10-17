# Build: SvelteKit + adapter-node -> ./build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-bin-links --no-audit --no-fund
COPY . .
RUN node node_modules/@sveltejs/kit/svelte-kit.js sync && \
	node node_modules/vite/bin/vite.js build

# Run: hanya hasil build, tanpa devDependencies berlebih
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=127.0.0.1
ENV PORT=3103
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-bin-links --no-audit --no-fund
COPY --from=build /app/build ./build
EXPOSE 3103
CMD ["node", "build/index.js"]
