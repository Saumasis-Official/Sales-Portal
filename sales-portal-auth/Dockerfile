FROM 301555797293.dkr.ecr.ap-south-1.amazonaws.com/sales-portal-base:dev_latest
ARG artifact_version
LABEL artifact_version=$artifact_version

# Create app directory
WORKDIR /usr/src/app/sales-portal-auth

# Copy app files
COPY sales-portal-auth/ /usr/src/app/sales-portal-auth/

RUN mkdir -p /var/log/node

# Install app dependencies
# RUN sed -i s/deb.debian.org/archive.debian.org/g /etc/apt/sources.list
# RUN apt-get -y update
RUN npm install

# COPY init.sh /init.sh
RUN chmod 777 /usr/src/app/sales-portal-auth/init.sh

EXPOSE 3001

# start app
ENTRYPOINT ["/bin/sh", "/usr/src/app/sales-portal-auth/init.sh"]
