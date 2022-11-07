FROM node:16

WORKDIR /app

COPY package.json package.json

RUN npm install --save-dev hardhat && \
            npm install

COPY . .

ENTRYPOINT ["/app/docker-entrypoint.sh"]
