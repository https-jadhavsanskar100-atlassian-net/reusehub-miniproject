import { db, auth, storage } from 'hatchable';
export const access='public';
export const methods=['GET','POST','DELETE'];
export default async function(req,res){
 try{
  const user=await auth.getUser(req);if(!user)return res.status(401).json({error:'Sign in to manage favourites.'});
  const uid=String(user.id);
  if(req.method==='GET'){
   const {rows}=await db.query("SELECT f.listing_id,l.id,l.title,l.price,l.listing_type,l.condition,l.image_urls,l.campus,l.status,l.category_id,c.name AS category_name,f.created_at FROM favourites f JOIN listings l ON l.id=f.listing_id LEFT JOIN categories c ON c.id=l.category_id WHERE f.user_id=$1 AND l.status IN ('active','reserved','sold','exchanged') ORDER BY f.created_at DESC",[uid]);
   for(const item of rows){if(Array.isArray(item.image_urls))item.image_urls=await Promise.all(item.image_urls.map(async value=>typeof value==='string'&&value.startsWith('uploads/')?await storage.url(value):value));}
   return res.json({favourites:rows});
  }
  const id=Number(req.body?.listingId);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Valid listing ID required.'});
  if(req.method==='POST'){const l=await db.query("SELECT id,seller_id FROM listings WHERE id=$1 AND status IN ('active','reserved')",[id]);if(!l.rows.length)return res.status(404).json({error:'Listing unavailable.'});if(l.rows[0].seller_id===uid)return res.status(400).json({error:'You cannot favourite your own listing.'});await db.query('INSERT INTO favourites(user_id,listing_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[uid,id]);return res.status(201).json({ok:true});}
  await db.query('DELETE FROM favourites WHERE user_id=$1 AND listing_id=$2',[uid,id]);return res.json({ok:true});
 }catch(e){console.error('favourites',e);return res.status(500).json({error:'Could not update favourites.'});}
}