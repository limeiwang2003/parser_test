FROM node:latest
RUN mkdir /app
WORKDIR /app

#ENV PATH /app/node_modules/.bin:$PATH

#git clone https://github.com/komljen/dockerfile-examples.git && cd dockerfile-examples
git clone https://github.com/limeiwang2003/parser_test.git

#COPY package.json yarn.lock /app/
#RUN yarn install

echo "sample parser from Limei"
COPY . /app/