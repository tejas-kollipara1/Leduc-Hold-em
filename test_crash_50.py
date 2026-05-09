import requests
import time

url_start = "http://localhost:5001/api/start_session"
url_play = "http://localhost:5001/api/play_hand"

print("Starting session...")
res = requests.post(url_start, json={"opponent": "aggressive", "agent": "oa"})
print(res.json())

for i in range(1, 60):
    try:
        r = requests.post(url_play)
        if r.status_code != 200:
            print(f"Failed at iteration {i}: {r.status_code}")
            print(r.text)
            break
        if i % 10 == 0:
            print(f"Completed {i} iterations")
    except Exception as e:
        print(f"Exception at iteration {i}: {e}")
        break

print("Done simulating.")
