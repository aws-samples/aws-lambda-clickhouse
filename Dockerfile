FROM public.ecr.aws/lambda/nodejs:18 as builder
WORKDIR /usr/app
COPY package.json ./
COPY src ./src
RUN npm install
RUN npm run build:app

FROM public.ecr.aws/lambda/nodejs:18
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /usr/app/dist/* ./
COPY clickhouse_bin/clickhouse ./
CMD ["app.handler"]