export const access='public';
export const methods=['GET'];
export default async function(req,res){
 const q=String(req.query.q||'').trim().slice(0,120);if(q.length<2)return res.status(400).json({error:'Enter at least two characters.'});
 try{const url='https://openlibrary.org/search.json?q='+encodeURIComponent(q)+'&limit=8&fields=key,title,author_name,first_publish_year,isbn,cover_i';const r=await fetch(url,{timeout_ms:7000});if(!r.ok)return res.status(502).json({error:'Book search is temporarily unavailable.'});const data=await r.json();const books=(data.docs||[]).map(b=>({key:b.key,title:b.title||'',authors:b.author_name||[],year:b.first_publish_year||null,isbn:(b.isbn||[]).slice(0,3),coverUrl:b.cover_i?'https://covers.openlibrary.org/b/id/'+b.cover_i+'-M.jpg':null}));return res.json({source:'Open Library',books});}catch(e){console.error('Open Library',e);return res.status(502).json({error:'Could not reach Open Library. You can still create a listing manually.'})}
}