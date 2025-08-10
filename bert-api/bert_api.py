from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline
from sentence_transformers import SentenceTransformer
import numpy as np
import json
import re
import ast


app = FastAPI()
qa_pipeline = pipeline("question-answering", model="deepset/xlm-roberta-base-squad2")

# Load embedding & FAQ texts
model = SentenceTransformer('all-MiniLM-L6-v2')
faq_embeddings = np.load('prosedur_akademik_embeddings.npy')
with open('prosedur_akademik_texts.json', encoding='utf-8') as f:
    faq_texts = json.load(f)

class QARequest(BaseModel):
    question: str

def extract_all_steps(context):
    match = re.search(r"prosedur.*?:([\s\S]+)", context, flags=re.IGNORECASE)
    steps_text = match.group(1) if match else context

    lines = steps_text.split('\n')
    steps = []
    curr_step = ""
    for line in lines:
        line = line.strip()
        if re.match(r"^\d+\.", line):  # New step line
            if curr_step:
                steps.append(curr_step.strip())
            curr_step = line
        elif re.match(r"^[a-z]\.", line):  # Sub-step
            if curr_step:
                curr_step += " " + line
            else:
                curr_step = line
        else:
            if line:
                curr_step += " " + line
    if curr_step:
        steps.append(curr_step.strip())
    steps = [s.replace('  ', ' ') for s in steps if len(s) > 10]
    return "\n".join(steps)

def get_best_context(question: str):
    q_emb = model.encode([question], normalize_embeddings=True)
    sims = np.dot(faq_embeddings, q_emb[0])
    best_idx = int(np.argmax(sims))
    best_sim = float(sims[best_idx])
    # Debug print
    print("\n===== DEBUG SIMILARITY SEARCH =====")
    print("Pertanyaan user:", question)
    print("FAQ terpilih (idx):", best_idx)
    print("FAQ context terpilih:", faq_texts[best_idx])
    print("Similarity score:", best_sim)
    print("===================================\n")
    return faq_texts[best_idx], best_sim, best_idx

@app.post("/answer")
def bert_answer(req: QARequest):
    try:
        context, sim_score, idx = get_best_context(req.question)

        # Pisahkan context menjadi question dan answer
        if '\n' in context:
            q, a = context.split('\n', 1)
        else:
            q, a = context, ""

        # Jika similarity sangat rendah, fallback: hanya tampilkan answer
        if sim_score < 0.40:
            return {
                "answer": a.strip() or context,
                "score": None,
                "bab": ""
            }

        # Jika similarity tinggi (context cocok FAQ), juga tampilkan langsung answer
        # (atau jika ingin tetap pakai QA pipeline di atas threshold, boleh, tapi untuk FAQ biasanya jawab langsung saja)
        if sim_score >= 0.8:
            return {
                "answer": a.strip(),
                "score": sim_score,
                "bab": ""
            }

        # Prosedur khusus
        if "prosedur" in req.question.lower():
            steps = extract_all_steps(context)
            if steps:
                return {
                    "answer": f"Berikut prosedur:\n{steps}",
                    "score": None,
                    "bab": ""
                }
            else:
                return {
                    "answer": a.strip() or context,
                    "score": None,
                    "bab": ""
                }

        # QA pipeline untuk case yang lain
        result = qa_pipeline({'question': req.question, 'context': context})
        answer = result['answer']
        if result['score'] < 0.1 or len(answer) < 15:
            return {
                "answer": a.strip() or context,
                "score": result['score'],
                "bab": ""
            }
        return {
            "answer": answer,
            "score": result['score'],
            "bab": ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))