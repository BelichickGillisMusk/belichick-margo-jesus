FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY skills ./skills

ENV NODE_ENV=production
ENV PORT=8080
ENV MILA_PORT=8080
EXPOSE 8080

CMD ["node", "src/mila-chatbot/index.js"]
