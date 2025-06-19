FROM public.ecr.aws/docker/library/node:18-alpine
ARG artifact_version
LABEL artifact_version=$artifact_version
 
# Create app directory
WORKDIR /usr/src/app/sales-portal-credit
 
COPY sales-portal-credit/ /usr/src/app/sales-portal-credit/
RUN mkdir -p /var/log/node
 
RUN npm install
 
RUN chmod 500 /usr/src/app/sales-portal-credit/init.sh
EXPOSE 3009
ENTRYPOINT ["/bin/sh", "/usr/src/app/sales-portal-credit/init.sh"]