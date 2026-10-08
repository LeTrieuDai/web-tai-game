# 1. Báo cho Docker biết: Lấy bộ khung Node.js bản 20 
FROM node:20-alpine

# 2. Tạo một thư mục ảo bên trong Docker để chứa code
WORKDIR /usr/src/app

# 3. Copy file chứa tên các thư viện (package.json) 
COPY package*.json ./

# 4. Tự động gõ lệnh cài đặt thư viện (express, mongoose,...)
RUN npm install

# 5. Copy toàn bộ code Web Game Store vào trong Docker
COPY . .

# 6. Báo cho Docker biết là web này chạy ở cổng 3000
EXPOSE 3000

# 7. Lệnh: Tự động chạy server.js khi khởi động
CMD ["node", "server.js"]
