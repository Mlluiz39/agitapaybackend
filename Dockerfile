FROM node:20-bookworm-slim

# Instalação das dependências necessárias para rodar o Puppeteer (Chromium) internamente no contêiner
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Informa ao Puppeteer para não realizar o download do Chromium e usar o binário do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copia e instala as dependências
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Compila o projeto (TypeScript)
RUN npm run build

# Expõe a porta
EXPOSE 3000

# Inicia o servidor
CMD ["npm", "start"]
