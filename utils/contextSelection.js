const natural = require('natural');
const fs = require('fs');
const path = require('path');

const babChunks = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/bab_chunks.json'), 'utf-8'));

function getTopNContextTFIDF(question, topN = 3) {
  const TfIdf = natural.TfIdf;
  const tfidf = new TfIdf();
  babChunks.forEach(bab => tfidf.addDocument(bab.content));

  let scores = [];
  for (let i = 0; i < babChunks.length; i++) {
    const score = tfidf.tfidf(question, i);
    scores.push({ index: i, score });
  }
  scores.sort((a, b) => b.score - a.score);

  const topContexts = scores.slice(0, topN).map(s => babChunks[s.index].content);
  return topContexts.join('\n\n');
}

module.exports = { getTopNContextTFIDF };