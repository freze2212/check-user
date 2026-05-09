# Stage 1: Build app với Node
FROM node:22 AS build
WORKDIR /app

# Copy file cấu hình và cài dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ source và build
COPY . .
RUN npm run build

# Stage 2: Serve bằng Nginx
FROM nginx:alpine
# Copy file build sang thư mục Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Lệnh chạy Nginx
CMD ["nginx", "-g", "daemon off;"]
