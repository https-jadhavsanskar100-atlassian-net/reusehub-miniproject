import { db, auth } from 'hatchable';
export const access='public';
export const methods=['GET','POST'];
export default async function(req,res){
 try{
  const u=await auth.getUser(req);if(!u)return res.status(401).json({error:'Sign in to message students.'});const uid=String(u.id);
  if(req.method==='GET'){
   const {rows}=await db.query("SELECT c.id,c.listing_id,c.last_message,c.last_message_at,c.created_at,l.title AS listing_title,CASE WHEN c.participant_a=$1 THEN c.participant_b ELSE c.participant_a END AS other_user_id,COALESCE(NULLIF(p.display_name,'Student'),NULLIF(u.name,''),NULLIF(split_part(u.email,'@',1),''),'Student') AS other_name,(SELECT count(*)::int FROM messages m WHERE m.conversation_id=c.id AND m.sender_id<>$1 AND m.read_at IS NULL) AS unread_count FROM conversations c LEFT JOIN listings l ON l.id=c.listing_id LEFT JOIN profiles p ON p.user_id=CASE WHEN c.participant_a=$1 THEN c.participant_b ELSE c.participant_a END LEFT JOIN users u ON (u.hatchable_user_id=CASE WHEN c.participant_a=$1 THEN c.participant_b ELSE c.participant_a END OR u.id=CASE WHEN c.participant_a=$1 THEN c.participant_b ELSE c.participant_a END) WHERE c.participant_a=$1 OR c.participant_b=$1 ORDER BY c.last_message_at DESC LIMIT 100",[uid]);
   return res.json({conversations:rows});
  }
  const id=Number(req.body?.listingId),initial=String(req.body?.message||'').trim().slice(0,2000);
  if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Valid listing ID required.'});
  const l=await db.query("SELECT id,seller_id,title,status FROM listings WHERE id=$1 AND status IN ('active','reserved')",[id]);
  if(!l.rows.length)return res.status(404).json({error:'This listing is no longer available.'});
  const listing=l.rows[0],seller=String(listing.seller_id);
  if(seller===uid)return res.status(400).json({error:'You cannot message yourself.'});
  if(listing.status==='reserved'&&initial.toLowerCase().includes('buy'))return res.status(409).json({error:'This item is reserved. Check with the seller before enquiring.'});
  const a=[uid,seller].sort();
  let found=await db.query('SELECT id,listing_id,participant_a,participant_b,last_message,last_message_at FROM conversations WHERE listing_id=$1 AND participant_a=$2 AND participant_b=$3 LIMIT 1',[id,a[0],a[1]]);
  if(!found.rows.length)found=await db.query('INSERT INTO conversations(listing_id,participant_a,participant_b) VALUES($1,$2,$3) RETURNING id,listing_id,participant_a,participant_b,last_message,last_message_at',[id,a[0],a[1]]);
  const c=found.rows[0];
  if(initial){
   const m=await db.query('INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,$3) RETURNING id,sender_id,body,created_at',[c.id,uid,initial]);
   await db.query('UPDATE conversations SET last_message=$1,last_message_at=now() WHERE id=$2',[initial.slice(0,180),c.id]);
   // Notifications are best-effort: a notification policy must never roll back the message itself.
   try{await db.query('INSERT INTO notifications(user_id,kind,title,body,listing_id,conversation_id) VALUES($1,$2,$3,$4,$5,$6)',[seller,'message','New message about '+listing.title,initial.slice(0,160),id,c.id])}catch(notificationError){console.error('notification insert skipped',notificationError)}
   return res.status(201).json({conversation:{...c,last_message:initial,last_message_at:new Date().toISOString()},message:m.rows[0]});
  }
  return res.status(201).json({conversation:c});
 }catch(e){console.error('conversations',e);return res.status(500).json({error:'Could not open conversation. Please try again.'})}
}