FROM node:latest
RUN mkdir /app
WORKDIR /app

RUN git clone https://github.com/limeiwang2003/parser_test.git 

RUN echo "sample parser from Limei"
COPY . /app/
