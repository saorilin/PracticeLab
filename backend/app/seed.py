import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Exercise

PRESET_EXERCISES = [
    {
        "slug": "subdivision-ladder",
        "name": "Subdivision Ladder",
        "primary_category": "rhythm",
        "difficulty": "beginner",
        "tags": ["subdivision", "metronome", "timing"],
        "summary": "Move between quarter, eighth, triplet, and sixteenth-note subdivisions.",
        "goal": "Keep the pulse stable while the number of notes per beat changes.",
        "steps": [
            "Set the metronome to 60 BPM.",
            "Play one bar of each subdivision.",
            "Return to quarter notes without losing the pulse.",
        ],
        "technique_notes": ["Use one pitch first.", "Count aloud before increasing BPM."],
        "common_mistakes": ["Rushing triplets", "Changing pick depth between subdivisions"],
        "min_bpm": 50,
        "max_bpm": 100,
        "target_duration_seconds": 300,
    },
    {
        "slug": "four-finger-independence",
        "name": "Four Finger Independence",
        "primary_category": "left-hand",
        "difficulty": "beginner",
        "tags": ["warm-up", "finger-independence", "chromatic"],
        "summary": "A controlled chromatic pattern for independent fretting-hand movement.",
        "goal": "Move each finger without lifting the others unnecessarily.",
        "steps": ["Play 1-2-3-4 on each string.", "Keep unused fingers close to the fretboard."],
        "technique_notes": ["Use minimum pressure.", "Stop if the hand becomes tense."],
        "common_mistakes": ["Flying fingers", "Collapsed wrist"],
        "min_bpm": 50,
        "max_bpm": 120,
        "target_repetitions": 8,
    },
    {
        "slug": "alternate-picking-string-crossing",
        "name": "Alternate Picking String Crossing",
        "primary_category": "right-hand",
        "difficulty": "intermediate",
        "tags": ["alternate-picking", "string-crossing", "economy"],
        "summary": "Practice even alternate picking while crossing adjacent strings.",
        "goal": "Keep pick motion small and timing even across string changes.",
        "steps": [
            "Choose two adjacent strings.",
            "Play four notes per string.",
            "Reverse direction.",
        ],
        "technique_notes": ["Use a shallow pick depth."],
        "common_mistakes": ["Large wrist motion", "Accidental economy picking"],
        "min_bpm": 60,
        "max_bpm": 150,
        "target_duration_seconds": 240,
    },
    {
        "slug": "burst-synchronization",
        "name": "Burst Synchronization",
        "primary_category": "synchronization",
        "difficulty": "intermediate",
        "tags": ["burst", "speed", "synchronization"],
        "summary": "Short fast bursts separated by enough rest to reset both hands.",
        "goal": "Coordinate fretting and picking at a speed above continuous playing tempo.",
        "steps": ["Play one beat of sixteenth notes.", "Rest for three beats.", "Repeat cleanly."],
        "technique_notes": ["The final note must sound as clearly as the first."],
        "common_mistakes": ["Continuing after a messy burst", "Holding tension during rests"],
        "min_bpm": 70,
        "max_bpm": 180,
        "target_repetitions": 12,
    },
    {
        "slug": "unused-string-muting",
        "name": "Unused String Muting",
        "primary_category": "control",
        "difficulty": "beginner",
        "tags": ["muting", "noise-control", "tone"],
        "summary": "Coordinate both hands to mute every string that should not ring.",
        "goal": "Produce one clean note while all surrounding strings remain silent.",
        "steps": [
            "Play one note on the middle strings.",
            "Check adjacent strings separately.",
            "Add gain gradually.",
        ],
        "technique_notes": ["Use both hands for muting."],
        "common_mistakes": ["Testing only with a clean tone", "Pressing too hard"],
        "target_duration_seconds": 180,
    },
]


def seed_database(session: Session) -> None:
    existing_slugs = set(session.scalars(select(Exercise.slug)))

    for item in PRESET_EXERCISES:
        if item["slug"] in existing_slugs:
            continue
        session.add(
            Exercise(
                slug=item["slug"],
                name=item["name"],
                primary_category=item["primary_category"],
                difficulty=item["difficulty"],
                tags_json=json.dumps(item["tags"]),
                summary=item["summary"],
                goal=item["goal"],
                steps_json=json.dumps(item["steps"]),
                technique_notes_json=json.dumps(item.get("technique_notes", [])),
                common_mistakes_json=json.dumps(item.get("common_mistakes", [])),
                min_bpm=item.get("min_bpm"),
                max_bpm=item.get("max_bpm"),
                target_duration_seconds=item.get("target_duration_seconds"),
                target_repetitions=item.get("target_repetitions"),
                source="PracticeLab preset",
                is_custom=False,
            )
        )
    session.commit()
