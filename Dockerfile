# 1. اختار نسخة Node مناسبة
FROM node:20-slim

# 2. تحديد فولدر الشغل جوه الـ Container
WORKDIR /app

# 3. نسخ ملفات الـ package وتسطيب الـ dependencies
COPY package*.json ./
RUN npm install

# 4. نسخ باقي كود المشروع
COPY . .

# 5. فتح البورت اللي السيرفر شغال عليه
EXPOSE 3000

# 6. أمر التشغيل
CMD ["npm", "start"]