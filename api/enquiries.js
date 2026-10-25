import { db, auth } from 'hatchable';
export const access='public';
export const methods=['GET','POST','PATCH'];
export default async function(req,res){
 try{
  const user=await auth.getUser(req);if(!user)return res.status(401).json({error:'Sign in to manage enquiries.'});const uid=String(user.id);
  if(req.method==='GET'){const {rows}=await db.query("SELECT e.*,l.title AS listing_title FROM enquiries e JOIN listings l ON l.id=e.listing_id WHERE e.buyer_id=$1 OR e.seller_id=$1 ORDER BY e.created_at DESC LIMIT 100",[uid]);return res.json({enquiries:rows});}
  if(req.method==='POST'){
   const b=req.body||{},id=Number(b.listingId),type=String(b.enquiryType||'purchase'),message=String(b.message||'').trim().slice(0,1000);
   if(!Number.isSafeInteger(id)||id<1||!['purchase','exchange'].includes(type)||message.length<5)return res.status(400).json({error:'Provide a listing, enquiry type, and message of at least 5 characters.'});
   const {rows}=await db.query("SELECT id,seller_id,title,listing_type FROM listings WHERE id=$1 AND status='active'",[id]);if(!rows.length)return res.status(404).json({error:'This listing is no longer available.'});const l=rows[0];if(l.seller_id===uid)return res.status(400).json({error:'You cannot enquire about your own listing.'});if(type==='purchase'&&l.listing_type==='exchange')return res.status(400).json({error:'This item is exchange-only.'});if(type==='exchange'&&l.listing_type!=='exchange')return res.status(400).json({error:'This listing is not exchange-only.'});
   const e=await db.query('INSERT INTO enquiries(listing_id,buyer_id,seller_id,enquiry_type,message) VALUES($1,$2,$3,$4,$5) RETURNING id,status,created_at',[id,uid,l.seller_id,type,message]);
   await db.query('INSERT INTO notifications(user_id,kind,title,body,listing_id) VALUES($1,$2,$3,$4,$5)',[l.seller_id,'enquiry','New enquiry for '+l.title,message,id]);
   return res.status(201).json({enquiry:e.rows[0]});
  }
  const id=Number(req.body?.enquiryId),status=String(req.body?.status||'');if(!Number.isSafeInteger(id)||!['accepted','rejected','withdrawn','closed'].includes(status))return res.status(400).json({error:'Invalid enquiry update.'});
  const {rows}=await db.query('SELECT * FROM enquiries WHERE id=$1',[id]);const e=rows[0];if(!e)return res.status(404).json({error:'Enquiry not found.'});
  const seller=e.seller_id===uid,buyer=e.buyer_id===uid;if(!seller&&!buyer)return res.status(403).json({error:'You are not a participant in this enquiry.'});
  if(status==='withdrawn'&&!buyer)return res.status(403).json({error:'Only the buyer can withdraw this enquiry.'});if(['accepted','rejected','closed'].includes(status)&&!seller)return res.status(403).json({error:'Only the seller can respond or close.'});
  if(e.status!=='pending')return res.status(409).json({error:'This enquiry has already been resolved.'});
  await db.query('UPDATE enquiries SET status=$1,updated_at=now() WHERE id=$2',[status,id]);
  await db.query('INSERT INTO notifications(user_id,kind,title,body,listing_id) VALUES($1,$2,$3,$4,$5)',[seller?e.buyer_id:e.seller_id,'enquiry_update','Enquiry '+status,'Your enquiry was '+status+'.',e.listing_id]);
  return res.json({ok:true,status});
 }catch(e){console.error('enquiries',e);res.status(500).json({error:'Could not process enquiry.'});}
}