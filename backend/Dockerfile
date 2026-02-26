FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY check-reviews.js ./check-reviews.js

RUN mkdir -p uploads logs

EXPOSE 8080

CMD ["node", "src/server.js"]