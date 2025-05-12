# Step 1: Build the Vite React App using Node.js 20
FROM node:20 AS build

WORKDIR /app

# Copy package.json and package-lock.json for npm
COPY package.json package-lock.json ./

RUN npm config set registry https://registry.npmjs.org/


# Install dependencies with npm
RUN npm install

# Copy source code
COPY . .

# Build for production using Vite
RUN npm run build

# Step 2: Serve the build with Nginx
FROM nginx:alpine

# Copy the build output from the previous stage to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 for HTTP traffic
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
