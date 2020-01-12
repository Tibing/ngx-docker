import { BuildImageOptions } from './command/build-image';

export const Dockerfile = (options: BuildImageOptions) => `
### STAGE 1: Build ###
FROM node:${options.nodeVersion} AS build
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run ${options.buildCommand}

### STAGE 2: Run ###
FROM nginx:1.17.1-alpine
COPY --from=build /usr/src/app/dist/${options.imageName} /usr/share/nginx/html
`.trim();
