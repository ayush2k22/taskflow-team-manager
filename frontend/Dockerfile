FROM node:16-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps --unsafe-perm
RUN ls -la node_modules/.bin/react-scripts
COPY . .
RUN ./node_modules/.bin/react-scripts build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]