FROM 301555797293.dkr.ecr.ap-south-1.amazonaws.com/sales-portal-base:dev_latest
ARG artifact_version
LABEL artifact_version=$artifact_version

# Create app directory
WORKDIR /usr/src/app/sales-portal-sap

# Copy app files
COPY sales-portal-sap/ /usr/src/app/sales-portal-sap/
RUN ls -l

RUN mkdir -p /var/log/node

# Install app dependencies
# Changed the artefacts links
# RUN sed -i s/deb.debian.org/archive.debian.org/g /etc/apt/sources.list
# RUN apt-get -y update
RUN npm install


# COPY init.sh /init.sh
RUN chmod 500 /usr/src/app/sales-portal-sap/init.sh

EXPOSE 3005

# start app
ENTRYPOINT ["/bin/sh", "/usr/src/app/sales-portal-sap/init.sh"]
