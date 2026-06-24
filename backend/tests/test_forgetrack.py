"""ForgeTrack backend regression tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://fittrack-progress-12.preview.emergentagent.com').rstrip('/')
TRAINER_CODE = 'TRAINER'

session = requests.Session()
session.headers.update({"Content-Type": "application/json"})

# shared state
state = {}


# ============ AUTH ============
class TestAuth:
    def test_trainer_login_success(self):
        r = session.post(f"{BASE_URL}/api/auth/login", json={"role": "trainer", "code": TRAINER_CODE})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["role"] == "trainer"
        assert d["user_id"] == "trainer"

    def test_trainer_login_wrong_code(self):
        r = session.post(f"{BASE_URL}/api/auth/login", json={"role": "trainer", "code": "WRONG"})
        assert r.status_code == 401

    def test_client_login_invalid_code(self):
        r = session.post(f"{BASE_URL}/api/auth/login", json={"role": "client", "code": "ZZZ999"})
        assert r.status_code == 401


# ============ CLIENTS ============
class TestClients:
    def test_create_client(self):
        r = session.post(f"{BASE_URL}/api/clients", json={"name": "TEST_Client_Alpha"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d and "code" in d and d["name"] == "TEST_Client_Alpha"
        assert len(d["code"]) == 6
        assert "_id" not in d
        state["client_id"] = d["id"]
        state["client_code"] = d["code"]

    def test_list_clients(self):
        r = session.get(f"{BASE_URL}/api/clients")
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        assert any(c["id"] == state["client_id"] for c in arr)
        for c in arr:
            assert "_id" not in c

    def test_get_one_client(self):
        r = session.get(f"{BASE_URL}/api/clients/{state['client_id']}")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == state["client_id"]
        assert "_id" not in d

    def test_client_login_with_generated_code(self):
        r = session.post(f"{BASE_URL}/api/auth/login", json={"role": "client", "code": state["client_code"]})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["role"] == "client"
        assert d["user_id"] == state["client_id"]

    def test_get_client_not_found(self):
        r = session.get(f"{BASE_URL}/api/clients/non-existent-id")
        assert r.status_code == 404


# ============ EXERCISES ============
class TestExercises:
    def test_create_exercise(self):
        payload = {
            "name": "TEST_Bench_Press",
            "muscle_group": "Chest",
            "instructions": "Lie down, press up",
            "media_base64": "data:image/png;base64,iVBORw0KGgo=",
            "media_type": "image",
        }
        r = session.post(f"{BASE_URL}/api/exercises", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == payload["name"]
        assert d["muscle_group"] == "Chest"
        assert "_id" not in d
        state["exercise_id"] = d["id"]

    def test_list_exercises(self):
        r = session.get(f"{BASE_URL}/api/exercises")
        assert r.status_code == 200
        arr = r.json()
        assert any(e["id"] == state["exercise_id"] for e in arr)

    def test_update_exercise(self):
        payload = {
            "name": "TEST_Bench_Press_v2",
            "muscle_group": "Chest",
            "instructions": "Updated",
            "media_base64": "",
            "media_type": "",
        }
        r = session.put(f"{BASE_URL}/api/exercises/{state['exercise_id']}", json=payload)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Bench_Press_v2"
        # verify persistence
        r2 = session.get(f"{BASE_URL}/api/exercises/{state['exercise_id']}")
        assert r2.json()["name"] == "TEST_Bench_Press_v2"


# ============ PROGRAMS ============
class TestPrograms:
    def test_empty_program_for_new_client(self):
        r = session.get(f"{BASE_URL}/api/programs/{state['client_id']}")
        assert r.status_code == 200
        d = r.json()
        assert d["client_id"] == state["client_id"]
        assert d["weeks"] == []
        assert "_id" not in d

    def test_upsert_program_create(self):
        payload = {
            "client_id": state["client_id"],
            "name": "TEST_Program",
            "weeks": [
                {
                    "week_number": 1,
                    "name": "Week 1",
                    "days": [
                        {
                            "day_number": 1,
                            "name": "Push",
                            "items": [
                                {
                                    "exercise_id": state["exercise_id"],
                                    "target_sets": 4,
                                    "target_reps": 8,
                                    "target_weight": 60,
                                    "notes": "",
                                }
                            ],
                        }
                    ],
                }
            ],
        }
        r = session.post(f"{BASE_URL}/api/programs", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["weeks"]) == 1
        assert d["weeks"][0]["days"][0]["name"] == "Push"
        assert "_id" not in d

    def test_upsert_program_update(self):
        payload = {
            "client_id": state["client_id"],
            "name": "TEST_Program",
            "weeks": [
                {
                    "week_number": 1,
                    "name": "Week 1",
                    "days": [
                        {
                            "day_number": 1,
                            "name": "Pull",  # renamed
                            "items": [],
                        }
                    ],
                }
            ],
        }
        r = session.post(f"{BASE_URL}/api/programs", json=payload)
        assert r.status_code == 200
        assert r.json()["weeks"][0]["days"][0]["name"] == "Pull"
        # Verify GET reflects update
        g = session.get(f"{BASE_URL}/api/programs/{state['client_id']}")
        assert g.json()["weeks"][0]["days"][0]["name"] == "Pull"


# ============ LOGS ============
class TestLogs:
    def test_create_log(self):
        payload = {
            "client_id": state["client_id"],
            "exercise_id": state["exercise_id"],
            "week_number": 1,
            "day_number": 1,
            "sets": [
                {"set_number": 1, "weight": 60, "reps": 10},
                {"set_number": 2, "weight": 60, "reps": 8},
            ],
            "notes": "",
        }
        r = session.post(f"{BASE_URL}/api/logs", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["client_id"] == state["client_id"]
        assert len(d["sets"]) == 2
        assert "_id" not in d
        state["log_id"] = d["id"]

    def test_get_logs(self):
        r = session.get(f"{BASE_URL}/api/logs/{state['client_id']}")
        assert r.status_code == 200
        arr = r.json()
        assert any(l["id"] == state["log_id"] for l in arr)

    def test_logs_filter_by_exercise(self):
        r = session.get(f"{BASE_URL}/api/logs/{state['client_id']}", params={"exercise_id": state["exercise_id"]})
        assert r.status_code == 200
        arr = r.json()
        assert all(l["exercise_id"] == state["exercise_id"] for l in arr)
        assert len(arr) >= 1

    def test_logs_filter_by_week(self):
        r = session.get(f"{BASE_URL}/api/logs/{state['client_id']}", params={"week_number": 1})
        assert r.status_code == 200
        assert all(l["week_number"] == 1 for l in r.json())

    def test_logs_filter_by_week_no_match(self):
        r = session.get(f"{BASE_URL}/api/logs/{state['client_id']}", params={"week_number": 99})
        assert r.status_code == 200
        assert r.json() == []


# ============ CLEANUP ============
class TestCleanup:
    def test_delete_exercise(self):
        r = session.delete(f"{BASE_URL}/api/exercises/{state['exercise_id']}")
        assert r.status_code == 200

    def test_delete_client_cascades(self):
        r = session.delete(f"{BASE_URL}/api/clients/{state['client_id']}")
        assert r.status_code == 200
        # verify client gone
        r2 = session.get(f"{BASE_URL}/api/clients/{state['client_id']}")
        assert r2.status_code == 404
        # verify logs cleared
        r3 = session.get(f"{BASE_URL}/api/logs/{state['client_id']}")
        assert r3.json() == []
