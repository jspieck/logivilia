import json

with open("logicals.json", "r", encoding="utf8") as fp:
  logicals = json.load(fp)

transformedLogicals = []
for logical in logicals:
  transformedLogicals.append({
    "name": logical["name"],
    "difficulty": logical["difficulty"],
    "description": logical["description"],
    "question": logical["question"],
    "clues": logical["clues"],
    "attributes": logical["attributes"],
    "image": logical["image"],
    "solution": logical["solution"],
    "date": logical["date"],
    "userId": 1
  })

with open("logicalsT.json", "w", encoding="utf8") as fp:
  json.dump(transformedLogicals, fp)