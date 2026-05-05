FROM node:22

RUN apt update && apt install -y \
    python3 \
    ffmpeg \
    curl

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

CMD ["node", "index.js"]