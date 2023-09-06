FROM public.ecr.aws/lambda/nodejs:18 as builder
WORKDIR /usr/app
COPY package.json ./
COPY src ./src
RUN npm install
RUN npm run build:app

FROM public.ecr.aws/amazonlinux/amazonlinux:2023 as downloader
WORKDIR /tmp
RUN curl -LO https://github.com/ClickHouse/ClickHouse/releases/download/v23.8.2.7-lts/clickhouse-common-static-23.8.2.7-arm64.tgz \
    && mkdir clickhouse_bin \
    && dnf install tar gzip -y \
    && tar xzf clickhouse-common-static-23.8.2.7-arm64.tgz -C clickhouse_bin --strip-components=1

FROM public.ecr.aws/lambda/nodejs:18
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /usr/app/dist/* ./
COPY --from=downloader /tmp/clickhouse_bin/usr/bin/clickhouse ./
CMD ["app.handler"]