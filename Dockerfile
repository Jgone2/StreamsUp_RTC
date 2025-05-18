FROM node:20-bullseye-slim
WORKDIR /app

COPY package*.json yarn.lock ./
RUN yarn install --force

COPY . .

CMD ["yarn", "start:dev"]
EXPOSE 3000
