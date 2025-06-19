#FROM python:3.8
FROM python:3.9-slim-buster
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get install -y libssl-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* 

WORKDIR /code
COPY sales-portal-ars-allocation-service/requirements.txt /code/requirements.txt
COPY sales-portal-ars-allocation-service/app.py /code/app.py
COPY sales-portal-ars-allocation-service/src /code/src
COPY sales-portal-ars-allocation-service/init.sh /code/init.sh

RUN pip3.9 install --no-cache-dir --upgrade -r /code/requirements.txt
RUN chmod 500 /code/init.sh

EXPOSE 3007
ENTRYPOINT ["/bin/sh", "/code/init.sh"]
