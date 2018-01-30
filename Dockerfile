
FROM node:8-alpine


WORKDIR /jest-runner-minitest

COPY package.json yarn.lock tsconfig.json ./
ADD src ./src
# ADD example ./example
# ADD integrationTests ./integrationTests

RUN yarn --ignore-scripts && yarn build

CMD ["yarn", "test"]