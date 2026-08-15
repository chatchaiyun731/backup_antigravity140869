import json

transcript_path = r"C:\Users\66830\.gemini\antigravity\brain\c65c70e4-1473-4c30-bb91-f17f7cbd18d7\.system_generated\logs\transcript.jsonl"

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'USER_INPUT':
                print(f"Step {data.get('step_index')}: {data.get('content')}")
                print("-" * 50)
        except Exception as e:
            pass
