FROM node:22-alpine AS builder

RUN apk update

RUN apk add --no-cache libc6-compat

RUN apk add --no-cache openssl

WORKDIR /app

COPY . . 

RUN npm ci

RUN npm run build

FROM node:22-alpine AS installer

RUN apk update

RUN apk add --no-cache libc6-compat

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json .

RUN npm ci --omit=dev


FROM node:22-alpine AS runner

RUN apk update

RUN apk add --no-cache libc6-compat

RUN apk add --no-cache openssl

WORKDIR /app

RUN addgroup --system --gid 1001 expressjs
RUN adduser --system --uid 1001 expressjs 
USER expressjs

COPY --from=installer /app .

CMD ["npm", "run", "docker-start"]



