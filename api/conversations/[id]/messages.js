import { db, auth } from 'hatchable';
export const access='public';
export const methods=['GET','POST'];
export default async function(req,res){
 try{
  const u=await auth.getUser(req);if(!u)return res.status(401).json({error:'Sign in to view messages.'});const uid=String(u.id),id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Invalid conversation.'});const c=await db.query('SELECT * FROM conversations WHERE id=$1 AND (participant_a=$2 OR participant_b=$2)',[id,uid]);if(!c.rows.length)return res.status(404).json({error:'Conversation not found.'});
  if(req.method==='GET'){
   const {rows}=await db.query("SELECT m.id,m.sender_id,m.body,m.read_at,m.created_at,COALESCE(NULLIF(p.display_name,'Student'),NULLIF(u.name,''),NULLIF(split_part(u.email,'@',1),''),'Student') AS sender_name FROM messages m LEFT JOIN profiles p ON p.user_id=m.sender_id LEFT JOIN users u ON (u.hatchable_user_id=m.sender_id OR u.id=m.sender_id) WHERE m.conversation_id=$1 ORDER BY m.created_at ASC LIMIT 300",[id]);
   await db.query('UPDATE messages SET read_at=now() WHERE conversation_id=$1 AND sender_id<>$2 AND read_at IS NULL',[id,uid]);return res.json({messages:rows})
  }
  const body=String(req.body?.body||'').trim().slice(0,2000);if(body.length<1)return res.status(400).json({error:'Message cannot be empty.'});const m=await db.query('INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,$3) RETURNING id,sender_id,body,created_at',[id,uid,body]);await db.query('UPDATE conversations SET last_message=$1,last_message_at=now() WHERE id=$2',[body.slice(0,180),id]);const other=c.rows[0].participant_a===uid?c.rows[0].participant_b:c.rows[0].participant_a;try{await db.query('INSERT INTO notifications(user_id,kind,title,body,conversation_id,listing_id) VALUES($1,$2,$3,$4,$5,$6)',[other,'message','New message',body.slice(0,160),id,c.rows[0].listing_id])}catch(notificationError){console.error('notification insert skipped',notificationError)}return res.status(201).json({message:m.rows[0]});
 }catch(e){console.error('messages',e);res.status(500).json({error:'Could not process message.'})}
}