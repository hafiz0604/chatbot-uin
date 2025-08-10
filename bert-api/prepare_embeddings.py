from sentence_transformers import SentenceTransformer
import numpy as np
import json

# Load model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Load FAQ dari prosedur_akademik.json
with open('prosedur_akademik.json', encoding='utf-8') as f:
    faq_items = json.load(f)

# Gabungkan question + answer agar embedding lebih kontekstual
texts = [item['question'] + "\n" + item['answer'] for item in faq_items]

# Buat embedding
embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)

# Simpan embedding dan data FAQ
np.save('prosedur_akademik_embeddings.npy', embeddings)
with open('prosedur_akademik_texts.json', 'w', encoding='utf-8') as f:
    json.dump(texts, f, ensure_ascii=False, indent=2)

print(f"Sukses membuat embedding untuk {len(texts)} item FAQ.")