import { db, auth } from 'hatchable';
export const access='public';
export const methods=['GET','PATCH'];
export default async function(req,res){
 try{const u=await auth.getUser(req);if(!u)return res.status(401).json({error:'Sign in to view notifications.'});const uid=String(u.id);
 if(req.method==='GET'){const {rows}=await db.query('SELECT id,kind,title,body,listing_id,conversation_id,is_read,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[uid]);return res.json({notifications:rows});}
 const id=Number(req.body?.id);if(id){await db.query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2',[id,uid])}else{await db.query('UPDATE notifications SET is_read=true WHERE user_id=$1',[uid])}return res.json({ok:true});
 }catch(e){console.error('notifications',e);res.status(500).json({error:'Could not load notifications.'})}
}