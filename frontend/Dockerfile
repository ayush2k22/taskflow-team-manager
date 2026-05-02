FROM node:16-alpine
WORKDIR /app
COPY package.json ./
RUN cat package.json
RUN npm install --legacy-peer-deps --verbose 2>&1 | tail -20
RUN ls node_modules | grep react
COPY . .
RUN ./node_modules/.bin/react-scripts build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]