FROM public.ecr.aws/lambda/python:3.11

# Copy requirements.txt
COPY sales-portal-mdm-lambda/requirements.txt ${LAMBDA_TASK_ROOT}

# Install the specified packages
RUN pip install -r requirements.txt

# Copy function code
COPY sales-portal-mdm-lambda/app/ ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "main.init" ]
