from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import re
import logging
import time
import os
import traceback
from typing import Dict, List, Tuple, Set, Optional, Union, Any
from collections import Counter
from functools import lru_cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("qa_api.log")
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="UIN Sunan Kalijaga QA API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
faq_data = []
keyword_index = {}
topic_map = {}
faq_by_topic = {}
question_tokens = {}
answer_tokens = {}

# Constants
MIN_CONFIDENCE_THRESHOLD = 0.3  # Threshold for valid answers
FUZZY_MATCH_THRESHOLD = 65      # Threshold for fuzzy matching
MAX_CACHE_SIZE = 1000           # Maximum number of cached embeddings
DEBUG_MODE = os.environ.get('DEBUG_MODE', 'false').lower() == 'true'

# Pemetaan topik untuk pencarian lebih cepat
topic_map = {
    "sks": ["sistem kredit semester", "sks", "satuan kredit", "beban belajar", "kredit", "bobot sks", "satuan sks"],
    "kkn": ["kkn", "kuliah kerja nyata", "pengabdian masyarakat", "kuliah kerja", "lppm", "kuliah lapangan"],
    "skripsi": ["skripsi", "tugas akhir", "munaqasyah", "sidang", "proposal", "penelitian", "penulisan skripsi", "ujian skripsi"],
    "wisuda": ["wisuda", "yudisium", "alumni", "toga", "prosesi wisuda", "syarat wisuda", "persyaratan wisuda"],
    "cuti": ["cuti akademik", "cuti", "istirahat kuliah", "tidak aktif", "mengambil cuti", "izin cuti", "pengajuan cuti"],
    "nilai": ["nilai", "penilaian", "grade", "ipk", "indeks prestasi", "rubrik", "evaluasi", "nilai akhir", "nilai ujian"],
    "predikat": ["predikat", "kelulusan", "lulus", "cum laude", "pujian", "memuaskan", "predikat lulus", "predikat kelulusan"],
    "perpustakaan": ["perpustakaan", "pustaka", "buku", "peminjaman", "literatur", "jurnal", "referensi", "layanan perpustakaan"],
    "ijazah": ["ijazah", "transkrip", "skpi", "surat keterangan pendamping", "diploma", "transkrip nilai", "surat keterangan"],
    "masa studi": ["masa studi", "lama studi", "batas waktu", "drop out", "do", "putus studi", "batas studi"],
    "dosen": ["dosen", "pembimbing", "penasihat akademik", "dpa", "pengajar", "pembimbing", "dosen wali", "pembimbing akademik"],
    "semester antara": ["semester antara", "semester pendek", "sp", "antara", "kuliah antara", "kuliah singkat"],
    "semester": ["semester", "kuliah", "gasal", "genap", "perkuliahan", "masa kuliah", "semester gasal", "semester genap"],
    "krs": ["krs", "kartu rencana studi", "pengisian krs", "revisi krs", "rkrs", "kontrak", "rencana studi", "revisi rencana studi"],
    "beasiswa": ["beasiswa", "bidik misi", "kip", "prestasi", "bantuan biaya", "dana pendidikan", "bantuan beasiswa"],
    "fasilitas": ["fasilitas", "layanan", "perpustakaan", "ptipd", "laboratorium", "lab", "sarana prasarana"],
    "pendaftaran": ["pendaftaran", "registrasi", "herregistrasi", "daftar ulang", "proses pendaftaran", "registrasi ulang"],
    "penganuliran": ["anulir", "penganuliran", "pembatalan", "dibatalkan", "penghapusan", "hapus mata kuliah", "batalkan mata kuliah"],
    "klinik": ["klinik", "kesehatan", "dokter", "poliklinik", "obat", "sakit", "layanan kesehatan", "perawatan"],
    "putus studi": ["putus studi", "drop out", "do", "gagal", "berhenti", "dikeluarkan", "berhenti kuliah"],
    "batas studi": ["batas studi", "maksimal", "masa studi", "14 semester", "batas waktu", "lama studi"],
    "ujian": ["ujian", "uts", "uas", "nilai", "evaluasi", "tes", "ulangan", "ujian tengah semester", "ujian akhir semester"],
    "ppb": ["pusat pengembangan bahasa", "ppb", "bahasa", "toafl", "toec", "ikla", "kursus bahasa", "pelatihan bahasa"],
    "layanan perpustakaan": ["layanan perpustakaan", "sirkulasi", "peminjaman", "referensi", "corner", "pustaka digital"],
    "persyaratan wisuda": ["persyaratan wisuda", "syarat wisuda", "mengikuti wisuda", "daftar wisuda", "prosesi wisuda"],
    "layanan difabel": ["difabel", "pld", "layanan difabel", "disabilitas", "berkebutuhan khusus", "inklusif"],
    "layanan kesehatan": ["klinik", "kesehatan", "dokter", "poliklinik", "obat", "perawatan", "layanan kesehatan"]
}

# Stopwords dalam bahasa Indonesia yang diperluas
STOPWORDS = {
    'yang', 'di', 'dan', 'itu', 'dengan', 'untuk', 'pada', 'tidak', 'ini', 'dari', 
    'dalam', 'akan', 'adalah', 'sebagai', 'juga', 'saya', 'ke', 'karena', 'tersebut',
    'bisa', 'oleh', 'atau', 'sangat', 'dapat', 'secara', 'bahwa', 'harus', 'tentang',
    'apakah', 'bagaimana', 'berapa', 'dimana', 'kapan', 'siapa', 'apa', 'jika', 'bila',
    'maka', 'namun', 'tetapi', 'setelah', 'belum', 'sudah', 'telah', 'lalu', 'lagi',
    'sedang', 'masih', 'saja', 'hanya', 'semua', 'ada', 'agar', 'supaya', 'tapi',
    'pun', 'ya', 'mau', 'biar', 'deh', 'dong', 'sih', 'per', 'hal', 'para', 'saat',
    'ketika', 'kalau', 'bagi', 'serta', 'hingga', 'sampai', 'selama', 'sejak',
    'ialah', 'yakni', 'yaitu', 'ayo', 'mari', 'yuk', 'hai', 'halo', 'hei'
}

# Keywords prioritas tinggi
HIGH_PRIORITY_KEYWORDS = {
    'kkn', 'sks', 'ipk', 'skpi', 'krs', 'do', 'wisuda', 'skripsi', 'cuti',
    'yudisium', 'ijazah', 'transkrip', 'perpustakaan', 'dosen', 'beasiswa',
    'semester', 'perkuliahan', 'persyaratan', 'syarat', 'reguler', 'mandiri',
    'pendaftaran', 'kuliah', 'akademik', 'nilai', 'lab', 'praktikum', 'ujian',
    'pusat', 'layanan'
}

# Phrases that should be kept together when tokenizing
IMPORTANT_PHRASES = [
    "kuliah kerja nyata", "kartu rencana studi", "pusat perpustakaan", 
    "pusat pengembangan bahasa", "masa studi", "semester antara", 
    "kartu tanda mahasiswa", "indeks prestasi kumulatif", "tugas akhir",
    "satuan kredit semester", "sistem kredit semester", "predikat kelulusan",
    "cuti akademik", "putus studi", "drop out", "persyaratan wisuda",
    "klinik pratama", "layanan perpustakaan", "pusat layanan difabel",
    "ptipd", "lp2m", "jam pelayanan", "prosedur wisuda", "batas studi"
]

# Question classifier patterns
QUESTION_PATTERNS = {
    "definisi": [
        r"apa (itu|yang dimaksud dengan|definisi dari|pengertian dari|arti dari) ([a-zA-Z0-9\s]+)\??",
        r"jelaskan (tentang|mengenai|apa itu) ([a-zA-Z0-9\s]+)\??"
    ],
    "prosedur": [
        r"(bagaimana|gimana) (cara|prosedur|tahapan|langkah|proses) ([a-zA-Z0-9\s]+)\??",
        r"(bagaimana|gimana) ([a-zA-Z0-9\s]+) dilakukan\??",
        r"(bagaimana|gimana) (mengajukan|mendaftar|mengambil|mengurus) ([a-zA-Z0-9\s]+)\??"
    ],
    "syarat": [
        r"(apa|apa saja) (syarat|persyaratan|ketentuan) ([a-zA-Z0-9\s]+)\??",
        r"(apa|apa saja) yang (dibutuhkan|diperlukan) untuk ([a-zA-Z0-9\s]+)\??"
    ],
    "waktu": [
        r"(kapan|berapa lama|sampai kapan) ([a-zA-Z0-9\s]+)\??",
        r"(batas waktu|deadline) ([a-zA-Z0-9\s]+) (apa|kapan|berapa)\??"
    ],
    "lokasi": [
        r"(dimana|di mana|tempat) ([a-zA-Z0-9\s]+)\??",
        r"(dimana|di mana) (lokasi|tempat|ruang|gedung) ([a-zA-Z0-9\s]+)\??"
    ],
    "fasilitas": [
        r"(apa saja|apa) (fasilitas|layanan|fitur) ([a-zA-Z0-9\s]+)\??",
        r"(fasilitas|layanan) apa (saja yang|yang) (disediakan|tersedia|ada) ([a-zA-Z0-9\s]+)\??"
    ]
}

def load_models():
    """Load all necessary models and data"""
    global faq_data, keyword_index, faq_by_topic
    global question_tokens, answer_tokens
    
    logger.info("Loading models and data...")
    try:
        # Load FAQ data first
        try:
            with open('prosedur_akademik.json', encoding='utf-8') as f:
                faq_data = json.load(f)
                
            # Add IDs to FAQ items if not present
            for idx, item in enumerate(faq_data):
                if 'id' not in item:
                    item['id'] = idx
                    
            logger.info(f"Loaded {len(faq_data)} FAQ items")
            
            # Preprocess FAQ data
            preprocess_faq_data()
            
            # Build indices
            build_keyword_index()
            categorize_by_topics()
            
            return True
        except Exception as e:
            logger.error(f"Failed to load FAQ data: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    except Exception as e:
        logger.error(f"Error in load_models: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def preprocess_faq_data():
    """Preprocess FAQ data for better retrieval"""
    global faq_data, question_tokens, answer_tokens
    
    logger.info("Preprocessing FAQ data...")
    
    for idx, item in enumerate(faq_data):
        # Process question tokens
        question = item['question'].lower()
        # Preserve important phrases before tokenization
        for phrase in IMPORTANT_PHRASES:
            if phrase in question:
                question = question.replace(phrase, phrase.replace(' ', '_'))
        
        # Tokenize and store
        tokens = set(re.findall(r'\b\w+\b', question))
        tokens = {t.replace('_', ' ') for t in tokens}  # Convert preserved phrases back
        question_tokens[idx] = tokens
        
        # Process answer tokens
        answer = item['answer'].lower()
        # Preserve important phrases before tokenization
        for phrase in IMPORTANT_PHRASES:
            if phrase in answer:
                answer = answer.replace(phrase, phrase.replace(' ', '_'))
        
        # Tokenize and store
        tokens = set(re.findall(r'\b\w+\b', answer))
        tokens = {t.replace('_', ' ') for t in tokens}  # Convert preserved phrases back
        answer_tokens[idx] = tokens
    
    logger.info(f"Preprocessed {len(faq_data)} FAQ items")

def build_keyword_index():
    """Build keyword index for faster retrieval"""
    global keyword_index, faq_data, question_tokens, answer_tokens
    
    logger.info("Building keyword index...")
    keyword_index = {}
    
    for idx, item in enumerate(faq_data):
        # Get preprocessed tokens
        q_tokens = question_tokens.get(idx, set())
        a_tokens = answer_tokens.get(idx, set())
        
        # Combine tokens
        all_tokens = q_tokens.union(a_tokens)
        
        # Filter tokens
        keywords = [word for word in all_tokens if len(word) > 2 and word not in STOPWORDS]
        
        # Add high priority keywords
        for word in HIGH_PRIORITY_KEYWORDS:
            if word in item['question'].lower() or word in item['answer'].lower():
                keywords.append(word)
        
        # Extract phrases for better matching
        phrases = extract_phrases(item['question'] + " " + item['answer'])
        keywords.extend(phrases)
        
        # Add to index
        for keyword in set(keywords):  # Use set to remove duplicates
            if keyword not in keyword_index:
                keyword_index[keyword] = []
            keyword_index[keyword].append(idx)
    
    logger.info(f"Keyword index built with {len(keyword_index)} unique keywords")

def categorize_by_topics():
    """Categorize FAQ items by topics for faster retrieval"""
    global faq_data, faq_by_topic, topic_map
    
    logger.info("Categorizing FAQ items by topics...")
    faq_by_topic = {topic: [] for topic in topic_map}
    
    for idx, item in enumerate(faq_data):
        text = (item['question'] + ' ' + item['answer']).lower()
        
        for topic, keywords in topic_map.items():
            for keyword in keywords:
                if keyword in text:
                    faq_by_topic[topic].append(idx)
                    break
    
    # Remove duplicates
    for topic in faq_by_topic:
        faq_by_topic[topic] = list(set(faq_by_topic[topic]))
    
    # Log stats
    topic_counts = {topic: len(indices) for topic, indices in faq_by_topic.items()}
    logger.info(f"FAQ items categorized by topics: {topic_counts}")

def extract_phrases(text: str) -> List[str]:
    """Extract meaningful phrases from text"""
    phrases = []
    
    # Preserve important phrases
    text_processed = text.lower()
    for phrase in IMPORTANT_PHRASES:
        if phrase in text_processed:
            phrases.append(phrase)
            text_processed = text_processed.replace(phrase, phrase.replace(' ', '_'))
    
    # Extract ngrams
    words = re.findall(r'\b\w+\b', text_processed)
    words = [w.replace('_', ' ') for w in words]  # Convert preserved phrases back
    
    # Add bigrams and trigrams as phrases
    for i in range(len(words) - 1):
        if words[i] not in STOPWORDS and words[i+1] not in STOPWORDS:
            phrases.append(f"{words[i]} {words[i+1]}")
    
    for i in range(len(words) - 2):
        if words[i] not in STOPWORDS and words[i+2] not in STOPWORDS:
            phrases.append(f"{words[i]} {words[i+1]} {words[i+2]}")
    
    return phrases

def identify_question_type(question: str) -> str:
    """Identify the type of question being asked"""
    question = question.lower()
    
    for q_type, patterns in QUESTION_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, question):
                return q_type
    
    return "general"

def identify_topics(query: str) -> List[str]:
    """Identify topics present in the query"""
    query = query.lower()
    identified_topics = []
    
    # First check for direct mentions of topics
    for topic, keywords in topic_map.items():
        for keyword in keywords:
            if keyword in query:
                identified_topics.append(topic)
                break
    
    # If no topics found, try fuzzy matching with basic string matching
    if not identified_topics:
        query_words = set(re.findall(r'\b\w+\b', query))
        query_words = {w for w in query_words if w not in STOPWORDS}
        
        for topic, keywords in topic_map.items():
            for keyword in keywords:
                for word in query_words:
                    # Simple substring match
                    if word in keyword or keyword in word:
                        identified_topics.append(topic)
                        break
                if topic in identified_topics:
                    break
    
    logger.info(f"Identified topics: {identified_topics}")
    return identified_topics

def extract_query_keywords(query: str) -> List[str]:
    """Extract keywords from query"""
    query = query.lower()
    
    # Preserve important phrases
    query_processed = query
    for phrase in IMPORTANT_PHRASES:
        if phrase in query_processed:
            query_processed = query_processed.replace(phrase, phrase.replace(' ', '_'))
    
    # Extract words
    query_words = set(re.findall(r'\b\w+\b', query_processed))
    query_words = {w.replace('_', ' ') for w in query_words}  # Convert preserved phrases back
    
    # Filter by length and remove stopwords
    query_keywords = [word for word in query_words if len(word) > 2 and word not in STOPWORDS]
    
    # Include important keywords even if they're short
    for word in HIGH_PRIORITY_KEYWORDS:
        if word in query:
            query_keywords.append(word)
    
    # Extract phrases
    phrases = extract_phrases(query)
    query_keywords.extend(phrases)
    
    # Include exact phrases from important phrases list
    for phrase in IMPORTANT_PHRASES:
        if phrase in query:
            query_keywords.append(phrase)
    
    return list(set(query_keywords))  # Remove duplicates

def find_candidates_by_topics_and_keywords(
    query_keywords: List[str], 
    identified_topics: List[str],
    question_type: str
) -> Set[int]:
    """Find candidate FAQ items based on topics and keywords"""
    global keyword_index, topic_map, faq_data, faq_by_topic
    
    candidates = set()
    
    # First try: Find by exact topic match
    if identified_topics:
        topic_candidates = set()
        for topic in identified_topics:
            topic_candidates.update(faq_by_topic.get(topic, []))
        
        # If we have good topic candidates and keyword matches
        if topic_candidates:
            keyword_matches = set()
            for keyword in query_keywords:
                if keyword in keyword_index:
                    keyword_matches.update(keyword_index[keyword])
            
            # Find candidates that match both topics and keywords
            candidates = topic_candidates.intersection(keyword_matches) if keyword_matches else topic_candidates
    
    # Second try: If no candidates yet, try just with keywords
    if not candidates:
        for keyword in query_keywords:
            if keyword in keyword_index:
                candidates.update(keyword_index[keyword])
    
    # Third try: If still no candidates, use all FAQ items from identified topics
    if not candidates and identified_topics:
        for topic in identified_topics:
            candidates.update(faq_by_topic.get(topic, []))
    
    # Fourth try: If still no candidates, try finding by question type
    if not candidates and question_type != "general":
        type_matches = []
        for idx, item in enumerate(faq_data):
            # Add items matching the question type pattern
            for pattern in QUESTION_PATTERNS.get(question_type, []):
                if re.search(pattern, item['question'].lower()):
                    type_matches.append(idx)
                    break
        candidates.update(type_matches)
    
    # Last resort: If still no candidates, return all FAQ items
    if not candidates and faq_data:
        candidates = set(range(len(faq_data)))
    
    # Limit number of candidates for performance
    if len(candidates) > 50:
        # Keep candidates from identified topics if available
        priority_candidates = set()
        if identified_topics:
            for topic in identified_topics:
                topic_items = set(faq_by_topic.get(topic, []))
                priority_candidates.update(topic_items.intersection(candidates))
        
        if priority_candidates and len(priority_candidates) >= 10:
            candidates = priority_candidates
        else:
            # Otherwise just take a sample
            candidates = set(list(candidates)[:50])
    
    return candidates

def calculate_keyword_match_score(
    query: str,
    query_keywords: List[str],
    idx: int
) -> float:
    """Calculate keyword match score for an FAQ item"""
    global faq_data, question_tokens, answer_tokens
    
    item = faq_data[idx]
    question = item['question'].lower()
    answer = item['answer'].lower()
    
    # Get preprocessed tokens
    q_tokens = question_tokens.get(idx, set())
    a_tokens = answer_tokens.get(idx, set())
    
    # Count keyword matches
    question_matches = sum(1 for kw in query_keywords if kw in q_tokens)
    answer_matches = sum(1 for kw in query_keywords if kw in a_tokens)
    
    # Calculate match ratio (percentage of query keywords found)
    if query_keywords:
        match_ratio = (question_matches + answer_matches * 0.5) / len(query_keywords)
    else:
        match_ratio = 0
    
    # Exact phrase matching bonus
    exact_match_bonus = 0
    for phrase in IMPORTANT_PHRASES:
        if len(phrase) > 5 and phrase in query.lower():
            if phrase in question or phrase in answer:
                exact_match_bonus += 0.2  # Add 20% bonus for each important phrase match
    
    # Calculate final score
    score = match_ratio * 0.6 + exact_match_bonus
    return min(1.0, score)  # Cap at 1.0

def calculate_simple_match_score(
    query: str,
    idx: int
) -> float:
    """Calculate a simple match score for an FAQ item"""
    global faq_data
    
    item = faq_data[idx]
    question = item['question'].lower()
    answer = item['answer'].lower()
    
    # Simple word overlap
    query_words = set(re.findall(r'\b\w+\b', query.lower()))
    query_words = {w for w in query_words if w not in STOPWORDS and len(w) > 2}
    
    question_words = set(re.findall(r'\b\w+\b', question))
    answer_words = set(re.findall(r'\b\w+\b', answer))
    
    all_words = question_words.union(answer_words)
    
    # Count matches
    matches = sum(1 for w in query_words if w in all_words)
    
    # Calculate score
    if len(query_words) > 0:
        score = matches / len(query_words)
    else:
        score = 0
    
    # Exact phrase bonus
    if len(query) > 10:
        if query in question or query in answer:
            score += 0.3
        elif query.split()[-1] in question or query.split()[-1] in answer:
            score += 0.1
    
    return min(1.0, score)

def calculate_match_scores(
    query: str, 
    query_keywords: List[str],
    identified_topics: List[str], 
    candidates: Set[int],
    question_type: str
) -> List[Tuple[int, float, Dict[str, Any]]]:
    """Calculate match scores for candidate FAQ items"""
    global faq_data
    
    # Scores for all candidates
    scored_candidates = []
    
    for idx in candidates:
        item = faq_data[idx]
        
        # Calculate different types of match scores
        keyword_score = calculate_keyword_match_score(query, query_keywords, idx)
        simple_score = calculate_simple_match_score(query, idx)
        
        # Topic match bonus
        topic_match_score = 0.0
        if identified_topics:
            for topic in identified_topics:
                if idx in faq_by_topic.get(topic, []):
                    topic_match_score += 0.2  # 20% bonus per topic match
        
        # Question type match bonus
        type_match_bonus = 0.0
        if question_type != "general":
            for pattern in QUESTION_PATTERNS.get(question_type, []):
                if re.search(pattern, item['question'].lower()):
                    type_match_bonus = 0.15
                    break
        
        # Length penalty (prefer shorter answers)
        answer_length = len(item['answer'])
        length_factor = max(0, 1 - (answer_length / 2000))  # Penalty for very long answers
        length_score = length_factor * 0.1  # 10% maximum impact
        
        # Calculate final weighted score
        final_score = (
            keyword_score * 0.5 +       # 50% weight for keyword matching
            simple_score * 0.3 +        # 30% weight for simple matching
            topic_match_score +         # Topic match bonus
            type_match_bonus +          # Question type match bonus
            length_score                # Length score
        )
        
        # Store detailed scoring for debugging
        scoring_details = {
            "keyword_score": keyword_score,
            "simple_score": simple_score,
            "topic_match_score": topic_match_score,
            "type_match_bonus": type_match_bonus,
            "length_score": length_score
        }
        
        scored_candidates.append((idx, final_score, scoring_details))
    
    # Sort by score (descending)
    scored_candidates.sort(key=lambda x: x[1], reverse=True)
    return scored_candidates

def get_best_matching_answer(query: str, threshold: float = 0.3) -> Tuple[Optional[Dict], float, Dict]:
    """Find the best matching answer from FAQ data"""
    global faq_data
    
    if not faq_data:
        logger.error("FAQ data not loaded!")
        return None, 0.0, {"error": "FAQ data not loaded"}
    
    try:
        # Step 1: Analyze question
        question_type = identify_question_type(query)
        logger.info(f"Question type: {question_type}")
        
        # Step 2: Identify topics in the query
        identified_topics = identify_topics(query)
        
        # Step 3: Extract keywords from the query
        query_keywords = extract_query_keywords(query)
        logger.info(f"Query keywords: {query_keywords}")
        
        # Step 4: Find candidates by topics and keywords
        candidates = find_candidates_by_topics_and_keywords(
            query_keywords, 
            identified_topics, 
            question_type
        )
        logger.info(f"Found {len(candidates)} candidates by keywords and topics")
        
        # Step 5: Calculate match scores for candidates
        match_scores = calculate_match_scores(
            query, 
            query_keywords,
            identified_topics, 
            candidates,
            question_type
        )
        
        # Step 6: Get the best match
        if match_scores:
            best_idx, best_score, details = match_scores[0]
            best_match = faq_data[best_idx]
            
            # Only return if the score is above threshold
            if best_score >= threshold:
                logger.info(f"Best match found with score {best_score:.4f}")
                return best_match, best_score, {
                    "matched_idx": best_idx,
                    "score_details": details,
                    "question_type": question_type,
                    "identified_topics": identified_topics,
                    "top_matches": [{"idx": idx, "score": score, "question": faq_data[idx]["question"]} 
                                   for idx, score, _ in match_scores[:3]]
                }
            else:
                logger.info(f"Best match score {best_score:.4f} below threshold {threshold}")
        
        # No good match found
        return None, 0.0, {
            "error": "No good match found",
            "question_type": question_type,
            "identified_topics": identified_topics
        }
    except Exception as e:
        logger.error(f"Error finding best match: {str(e)}")
        logger.error(traceback.format_exc())
        return None, 0.0, {"error": str(e)}

def is_valid_question(question: str) -> bool:
    """Validate if the input is a proper question"""
    if not question or len(question.strip()) < 3:
        return False
    
    # Check for random characters or repetitive patterns
    if re.match(r'^[a-z]{1,3}(.*)\1+$', question.lower()) or re.match(r'^[a-z0-9]{1,3}+$', question.lower()):
        return False
    
    # Check for presence of common Indonesian question words or academic terms
    common_words = [
        'apa', 'bagaimana', 'kenapa', 'mengapa', 'siapa', 'dimana', 'kapan', 'berapa',
        'yang', 'dan', 'atau', 'jika', 'untuk', 'pada', 'dalam', 'dengan',
        'akademik', 'kuliah', 'mahasiswa', 'dosen', 'ujian', 'semester', 'skripsi',
        'wisuda', 'cuti', 'nilai', 'ijazah', 'krs', 'kkn', 'perpustakaan', 'beasiswa',
        'syarat', 'prosedur', 'jadwal', 'persyaratan', 'batas', 'maksimal', 'minimal'
    ]
    
    for word in common_words:
        if word in question.lower():
            return True
    
    return False

def clean_answer(answer: str) -> str:
    """Clean and format the answer text"""
    # Remove excessive whitespace
    answer = re.sub(r'\s+', ' ', answer).strip()
    
    # Remove "Berikut prosedur:" prefix that sometimes appears
    answer = re.sub(r'^Berikut prosedur:\s*', '', answer)
    
    # Remove any leading question text that might have been included
    answer_parts = answer.split('?')
    if len(answer_parts) > 1 and len(answer_parts[0]) < 100:  # If first part looks like a question
        answer = '?'.join(answer_parts[1:]).strip()
    
    # Make sure answer starts with a capital letter
    if answer and len(answer) > 0:
        answer = answer[0].upper() + answer[1:]
    
    # Make sure answer ends with proper punctuation
    if answer and not answer.endswith(('.', '!', '?')):
        answer += '.'
    
    return answer

class QARequest(BaseModel):
    question: str
    context: Optional[str] = None
    debug: Optional[bool] = False

class Health(BaseModel):
    status: str
    models_loaded: Dict[str, bool]
    data_stats: Dict[str, int]

@app.get("/")
def root():
    return {"status": "API is running", "version": "2.0"}

@app.get("/health", response_model=Health)
def health_check():
    """Check API health status"""
    return Health(
        status="ok",
        models_loaded={
            "faq_data": len(faq_data) > 0
        },
        data_stats={
            "faq_count": len(faq_data),
            "keyword_index_size": len(keyword_index),
            "topic_categories": len(faq_by_topic) if faq_by_topic else 0
        }
    )

@app.post("/reload_models")
def reload_models(background_tasks: BackgroundTasks):
    """Reload models in the background to prevent timeout"""
    background_tasks.add_task(load_models)
    return {"status": "success", "message": "Models reload started in background"}

@app.post("/answer")
async def answer(req: QARequest, request: Request):
    start_time = time.time()
    client_ip = request.client.host
    question_id = f"{int(time.time())}-{hash(req.question) % 10000}"
    
    # Log setiap permintaan dengan ID
    logger.info(f"[{question_id}] Received question from {client_ip}: {req.question}")
    
    try:
        # Check if data is loaded
        if len(faq_data) == 0:
            logger.error(f"[{question_id}] FAQ data not loaded!")
            raise HTTPException(status_code=503, detail="Data not loaded or initialized")
        
        # Clean the question
        question = req.question.strip()
        
        # Validate question
        if not is_valid_question(question):
            logger.warning(f"[{question_id}] Invalid question: {question}")
            return {
                "answer": "Maaf, saya tidak memahami pertanyaan Anda. Mohon ajukan pertanyaan yang lebih jelas tentang prosedur akademik UIN Sunan Kalijaga.",
                "score": 0.0,
                "bab": "",
                "processing_time": time.time() - start_time
            }
        
        # Get best matching answer
        best_match, score, debug_info = get_best_matching_answer(question)
        
        # Debug logging
        if req.debug or DEBUG_MODE:
            logger.info(f"[{question_id}] Debug info: {debug_info}")
        
        if best_match:
            logger.info(f"[{question_id}] Found match with score: {score:.4f}")
            # Clean and format the answer
            answer = clean_answer(best_match["answer"])
            
            result = {
                "answer": answer,
                "score": score,
                "bab": best_match.get("bab", ""),
                "jawaban": answer  # Tambahkan field 'jawaban' untuk kompatibilitas
            }
        else:
            logger.info(f"[{question_id}] No good match found")
            result = {
                "answer": "Maaf, saya tidak menemukan informasi yang spesifik tentang pertanyaan Anda dalam pedoman akademik UIN Sunan Kalijaga. Mohon ajukan pertanyaan yang lebih spesifik atau hubungi bagian akademik untuk informasi lebih lanjut.",
                "score": score,
                "bab": "",
                "jawaban": "Maaf, saya tidak menemukan informasi yang spesifik tentang pertanyaan Anda dalam pedoman akademik UIN Sunan Kalijaga. Mohon ajukan pertanyaan yang lebih spesifik atau hubungi bagian akademik untuk informasi lebih lanjut."
            }
        
        # Add processing time
        result["processing_time"] = time.time() - start_time
        
        # Add debug info if requested
        if req.debug or DEBUG_MODE:
            result["debug_info"] = debug_info
        
        # Log completion
        logger.info(f"[{question_id}] Processed in {result['processing_time']:.3f}s, score: {score:.4f}")
        return result
        
    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"[{question_id}] Error processing request: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail={
                "error": str(e),
                "processing_time": total_time
            }
        )
    
@app.post("/test_questions")
async def test_questions(questions: List[str]):
    """Test a batch of questions and return metrics"""
    results = []
    
    for question in questions:
        start_time = time.time()
        best_match, score, debug_info = get_best_matching_answer(question)
        
        if best_match:
            answer = clean_answer(best_match["answer"])
            results.append({
                "question": question,
                "answer": answer,
                "score": score,
                "processing_time": time.time() - start_time,
                "matched_id": best_match.get("id", debug_info.get("matched_idx", -1))
            })
        else:
            results.append({
                "question": question,
                "answer": "No answer found",
                "score": 0.0,
                "processing_time": time.time() - start_time,
                "error": debug_info.get("error", "Unknown error")
            })
    
    # Calculate aggregate metrics
    avg_score = sum(r["score"] for r in results) / len(results) if results else 0
    avg_time = sum(r["processing_time"] for r in results) / len(results) if results else 0
    
    return {
        "results": results,
        "metrics": {
            "total_questions": len(questions),
            "answered_questions": sum(1 for r in results if r.get("score", 0) > 0),
            "average_score": avg_score,
            "average_time": avg_time
        }
    }

# Initialize models on startup
@app.on_event("startup")
def startup_event():
    try:
        load_models()
    except Exception as e:
        logger.error(f"Failed to initialize models on startup: {str(e)}")
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("bert_api_fixed:app", host="0.0.0.0", port=8000, workers=1, log_level="info")