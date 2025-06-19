# Creating and activating virtual environment
```
python -m venv myenv

Windows---> myenv\Scripts\activate
Mac---->source myenv/bin/activate

```
# Installing packages
```
pip install -r requirements.txt
OR
python -m pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt
```

# Starting the server 
```
python3 -m uvicorn app:app --port 3006
```


# Running tests and generating coverage report
```
# Run tests with coverage
python -m coverage run -m unittest discover -s tests -p "test_*.py"

# Generate coverage report in the terminal
python -m coverage report

# Generate HTML coverage report
python -m coverage html

```


# Sample payload for sqs
```
{
  "messageId": "528207e2-8e86-4f22-9bda-df37f9dd341f",
  "receiptHandle": "AQEBUA+CFrA2uMnDWdLyryVIvNBS6JmSqJGAnyP9Tz225qqBgJbHOquM5h38AHL/2Rnbxkf6gttWU2nEm6CcZjzoXn/CNYm4byQA+sR3nmouUQERjdsWRF3QO1qbKf/fZ8zsMwtHBkZcjkEzdat0wTHmOwv+Z/QwWNtnkoyoCz1UjQQIXGbA426DnLH6JfcZ3/KU1L6koOK79IWFgKqHwe4d0RgGGzlYewllTStyT83BQchjFtANW5ThjCdpNIpqyH0NE8Jk0PZ5NSxoMvXLlLm+12OKK3mME4RKq01Leem8s7tE0fJaYoSV2cNRPub6EL5vB6NZsLV2YyLMmVW29D23tbqCDrlXXxOqDBl48M7OaSHA/0oY5cFwHNU94vPiHBR/ELc3gSnc1ycYy0RK9QhnWA==",
  "body": "4092601503",
  "attributes": {
    "ApproximateReceiveCount": "1",
    "SentTimestamp": "1708607380568",
    "SenderId": "AIDAUMNRAJUWYT2IEUFQS",
    "ApproximateFirstReceiveTimestamp": "1708607390568"
  },
  "messageAttributes": {
    "PoNumber": {
      "stringValue": "4092601503",
      "stringListValues": [],
      "binaryListValues": [],
      "dataType": "String"
    }
  },
  "md5OfBody": "80fecc68995e2bfd5e536c66c87191ec",
  "md5OfMessageAttributes": "74ae8878e6b9c0579d4731f2c7dd4fde",
  "eventSource": "aws:sqs",
  "eventSourceARN": "arn:aws:sqs:ap-south-1:301555797293:dev-sqs-edigateway-01",
  "awsRegion": "ap-south-1"
}
```