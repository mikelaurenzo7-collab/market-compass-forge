FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

RUN npm install

WORKDIR /app/apps/web
EXPOSE 3000

ENV NEXT_PUBLIC_API_URL=http://localhost:8000

CMD ["npm", "run", "dev"]
