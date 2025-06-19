FROM 301555797293.dkr.ecr.ap-south-1.amazonaws.com/sales-portal-base:dev_latest
ARG artifact_version
LABEL artifact_version=$artifact_version

# Create app directory
WORKDIR /usr/src/app/sales-portal-ars-service

# Copy app files
# COPY sales-portal-ars-service/* /
# COPY . .
COPY sales-portal-ars-service/ /usr/src/app/sales-portal-ars-service/
RUN mkdir -p /var/log/node
RUN pwd

# Install app dependencies
# RUN apt-get -y update
# RUN sed -i s/deb.debian.org/archive.debian.org/g /etc/apt/sources.list
RUN npm install
RUN ls -l
# COPY sales-portal-ars-service/init.sh /init.sh
RUN chmod 777 /usr/src/app/sales-portal-ars-service/init.sh
RUN ls -l
RUN cat /usr/src/app/sales-portal-ars-service/init.sh
EXPOSE 3004

# start app
 ENTRYPOINT ["/bin/sh", "/usr/src/app/sales-portal-ars-service/init.sh"]

# CMD sleep 1000s

# FROM 301555797293.dkr.ecr.ap-south-1.amazonaws.com/sales-portal-base:node_14.17.6
# ARG artifact_version
# LABEL artifact_version=$artifact_version

# # Create app directory
# WORKDIR /usr/src/app/sales-portal-order
# # Copy app files
# # COPY sales-portal-order/* /
# # COPY . .
# COPY sales-portal-order/* /usr/src/app/sales-portal-order/
# RUN ls -l
# RUN mkdir -p /var/log/node
# # Install app dependencies
# # RUN apt-get -y update
# RUN sed -i s/deb.debian.org/archive.debian.org/g /etc/apt/sources.list
# RUN npm install
# RUN ls 
# # COPY sales-portal-order/init.sh /init.sh
# RUN chmod 500 /usr/src/app/sales-portal-order/init.sh
# EXPOSE 3004
# # start app
# ENTRYPOINT /usr/src/app/sales-portal-order/init.sh
# # CMD sleep 1000s
