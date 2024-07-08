# [Stage 01] Create the production build

# This stage creates a build for the app

FROM node:16.17 AS build

# Create the working directory

WORKDIR /usr/src/app

# Bundle app source

COPY . ./

# Install app dependencies

RUN npm ci

# Run the build

RUN npm run build

# [Stage 02] Run the application

# This takes the production build from the build stage and runs the application

FROM node:16.17

WORKDIR /usr/src/app

# Install app dependencies

COPY package.json ./

COPY package-lock.json ./

RUN npm ci

# Get the build from the previous stage

COPY --from=build /usr/src/app/dist ./dist

# Expose the application port

EXPOSE 3300

# Start the application

CMD node --experimental-specifier-resolution=node ./dist/index.js