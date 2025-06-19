FROM public.ecr.aws/docker/library/python:3.12.6-slim-bullseye
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y libssl-dev=1.1.1w-0+deb11u1  && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /code

COPY sales-portal-mt-ecom/requirements.txt /code/requirements.txt
COPY sales-portal-mt-ecom/src /code/src
COPY sales-portal-mt-ecom/app.py /code/app.py

RUN pip install -r /code/requirements.txt

EXPOSE 3006

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "3006","--workers","10", "--no-server-header"]
