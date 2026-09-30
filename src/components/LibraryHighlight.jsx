export default function LibraryHighlight({ text, query }) {
  const terms = [...new Set(query.trim().split(/\s+/u).filter(Boolean))];
  if (!terms.length) return text;
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length);
  const expression = new RegExp(`(${escaped.join('|')})`, 'gi');
  const matches = new Set(terms.map((term) => term.toLocaleLowerCase()));
  return text.split(expression).map((part, index) => matches.has(part.toLocaleLowerCase()) ? <mark key={index}>{part}</mark> : part);
}
