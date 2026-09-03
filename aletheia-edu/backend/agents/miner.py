"""
Agent 1: Curriculum Miner.

Queries the `curricula` table in Supabase (seeded by supabase_schema.sql).
Falls back to a small hardcoded list if the DB is unreachable so the
frontend never shows an empty dropdown during local demos.
"""

from utils.supabase_client import supabase


def get_mock_curriculum_list():
    try:
        res = supabase.table("curricula").select("id, name, grade, subject").order("created_at").execute()
        if res.data:
            return res.data
    except Exception as e:
        print(f"Falling back to hardcoded curricula list: {e}")

    return [
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "name": "Cambridge IGCSE Biology (0610)",
            "grade": "Grade 11",
            "subject": "Biology",
        },
        {
            "id": "00000000-0000-0000-0000-000000000002",
            "name": "Cambridge IGCSE Physics (0625) – Forces & Energy",
            "grade": "Grade 10-11",
            "subject": "Physics",
        },
        {
            "id": "00000000-0000-0000-0000-000000000003",
            "name": "Cambridge IGCSE Chemistry (0620) – Foundations",
            "grade": "Grade 10-11",
            "subject": "Chemistry",
        },
        {
            "id": "00000000-0000-0000-0000-000000000004",
            "name": "Core Mathematics – Algebra & Graphs",
            "grade": "Grade 9-10",
            "subject": "Mathematics",
        },
    ]


def get_mock_curriculum_details(curriculum_id: str):
    try:
        res = supabase.table("curricula").select("*").eq("id", curriculum_id).single().execute()
        if res.data:
            return res.data
    except Exception as e:
        print(f"Falling back to hardcoded curriculum details: {e}")

    return {
        "id": curriculum_id,
        "name": "Cambridge IGCSE Biology (0610)",
        "grade": "Grade 11",
        "subject": "Biology",
        "topics_list": ["Cell Structure", "Diffusion", "Enzymes", "Photosynthesis"],
        "topic_facts": {},
    }
