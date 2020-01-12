export const Dockerfile = (projectName: string, buildCommand: string) => `
### STAGE 1: Build ###
FROM node:12.7-alpine AS build
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run ${buildCommand}

### STAGE 2: Run ###
FROM nginx:1.17.1-alpine
COPY --from=build /usr/src/app/dist/${projectName} /usr/share/nginx/html
`.trim();
