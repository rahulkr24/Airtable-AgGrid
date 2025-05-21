
import datetime, time
from pytz import timezone
import requests, json
from dateutil import parser
pytest_api_count = 0


def get_now():
    value = datetime.datetime.now(timezone("Asia/Kolkata"))
    return (value)

def pytest_call_rest_api(request_type: str, endpoint: str = None, data: dict = None, params: dict = None, files: dict = None, token: str = None, content_type: str = 'application/json') -> json:
    global pytest_api_count
    pytest_api_count += 1
    ts = time.time()

    headers_dic = {'Content-Type': content_type}
    if token:
        headers_dic['Authorization'] = f'Bearer {token}'
    if files:
        headers_dic.pop('Content-Type', None) 
    response = None
    try:
        if request_type == "get":
            response = requests.get(endpoint, params=params, headers=headers_dic)

        elif request_type == "post":
            if files:
                response = requests.post(endpoint, files=files, params=params, headers=headers_dic)
            else:
                response = requests.post(endpoint, data=json.dumps(data), params=params, headers=headers_dic)

        elif request_type == "patch":
            if data:
                response = requests.patch(endpoint, data=json.dumps(data), params=params, headers=headers_dic)
            else:
                response = requests.patch(endpoint, params=params, headers=headers_dic)

        elif request_type == "delete":
            response = requests.delete(endpoint, params=params, headers=headers_dic)

        else:
            print("ERROR: Invalid request_type specified.")
            return { "status": "failure", "status_code": 400, "message": "Invalid request_type" }

    except Exception as e:
        return { "status": "failure", "status_code": 500, "message": f"Exception during API call: {e}", "statusbool": False, "timestamp": get_now(), "test_processing_time": round((time.time() - ts) * 1000, 1)}

    result = {}
    if response and response.status_code == 200:
        result = response.json()
        result["status_code"] = 200
    elif response and response.status_code in (401, 404):
        result = response.json()
        result["status"] = "failure"
        result["status_code"] = response.status_code
    else:
        result["status"] = "failure"
        result["status_code"] = 500
        result["message"] = 'API call failed or server unreachable.'
        result['statusbool'] = False

    result["timestamp"] = get_now()
    result["test_processing_time"] = round((time.time() - ts) * 1000, 1)
    return result
