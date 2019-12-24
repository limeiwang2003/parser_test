FROM node:latest
RUN mkdir /app
WORKDIR /app

git clone https://github.com/limeiwang2003/parser_test.git 

echo "sample parser from Limei"
#COPY . /app/