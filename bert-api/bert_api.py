from fastapi import FastAPI, Request
from transformers import pipeline

# Pakai model multibahasa yang stabil!
qa_pipeline = pipeline(
    'question-answering',
    model='deepset/xlm-roberta-base-squad2'
)

app = FastAPI()

@app.post("/answer")
async def answer(request: Request):
    data = await request.json()
    question = data.get("question")
    context = data.get("context")
    result = qa_pipeline(question=question, context=context)
    return {"answer": result['answer'], "score": result['score']}