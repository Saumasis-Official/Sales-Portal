'''
This file is used to run the application locally.
Install uvicorn and fastapi to run the application locally.
Uncomment the below code and run the file to run the application locally.
COMMAND TO EXECUTE: `python app.py` inside app directory
POSTMAN URL(DUMMY): `http://localhost:8000/mdm/v1/get-materials?customer_codes=131416&customer_codes=151300&site_codes=HDL2&site_codes=HCC2&vendor_codes=266663` 
AUTHORIZATION: as per applicable
'''


'''
import uvicorn
from fastapi import FastAPI, Request
from dotenv import load_dotenv
from main import init
from lib.helper import HelperClass

load_dotenv()
helper = HelperClass()

app = FastAPI()

@app.get("/mdm/v1/get-materials")
def root(request: Request):
    event = request
    query_params_string = request.get('query_string', "")
    query_params = helper.url_query_params_extraction(query_params_string)
    print(query_params)
    event.queryStringParameters = query_params
    res = init(event, "")
    return res

if __name__ == "__main__":
    uvicorn.run("app:app", host="localhost", port=8000, reload=True)
'''