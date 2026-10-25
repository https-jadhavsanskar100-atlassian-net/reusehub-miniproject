import { db, auth, storage } from 'hatchable';
export const access='public';
export const methods=['GET','PATCH','DELETE'];
export default async function(req,res){
 const id=Number(req.params.id);
 if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Invalid listing ID.'});
 try{
  if(req.method==='GET'){
   const {rows}=await db.query("SELECT l.*,c.name AS category_name,COALESCE(NULLIF(p.display_name,'Student'),NULLIF(u.name,''),NULLIF(split_part(u.email,'@',1),''),'Student') AS seller_name,p.campus AS seller_campus FROM listings l LEFT JOIN categories c ON c.id=l.category_id LEFT JOIN profiles p ON p.user_id=l.seller_id LEFT JOIN users u ON (u.hatchable_user_id=l.seller_id OR u.id=l.seller_id) WHERE l.id=$1 AND (l.status='active' OR (l.status IN ('sold','exchanged') AND l.updated_at > now() - interval '1 hour'))",[id]);
   if(!rows.length)return res.status(404).json({error:'Listing not found.'});
   const listing=rows[0];if(Array.isArray(listing.image_urls))listing.image_urls=await Promise.all(listing.image_urls.map(async value=>typeof value==='string'&&value.startsWith('uploads/')?await storage.url(value):value));
   return res.json({listing});
  }
  const user=await auth.getUser(req);if(!user)return res.status(401).json({error:'Sign in first.'});
  const found=await db.query('SELECT * FROM listings WHERE id=$1',[id]);const listing=found.rows[0];
  if(!listing||listing.seller_id!==String(user.id))return res.status(404).json({error:'Listing not found.'});
  if(req.method==='DELETE'){
   if(!['draft','active','reserved','archived'].includes(listing.status))return res.status(409).json({error:'Sold or exchanged listings cannot be archived.'});
   await db.query("UPDATE listings SET status='archived',updated_at=now() WHERE id=$1",[id]);return res.json({ok:true,status:'archived'});
  }
  const body=req.body||{};
  const transitions={draft:['active','archived'],active:['reserved','sold','exchanged','archived','draft'],reserved:['active','sold','exchanged','archived'],archived:['active'],sold:[],exchanged:[],removed:[]};
  const next=String(body.status||listing.status);
  if(next!==listing.status&&!(transitions[listing.status]||[]).includes(next))return res.status(400).json({error:'That listing status change is not allowed.'});
  if(['sold','exchanged','removed'].includes(listing.status))return res.status(409).json({error:'Completed listings cannot be edited.'});
  // Status-only actions must not depend on unrelated edit-form fields such as image URLs or category values.
  if(Object.keys(body).length===1&&body.status&&next!==listing.status){
   if(next==='sold'||next==='exchanged'){
    const interested=await db.query('SELECT DISTINCT buyer_id FROM enquiries WHERE listing_id=$1 AND buyer_id<>$2 UNION SELECT DISTINCT CASE WHEN participant_a=$2 THEN participant_b ELSE participant_a END AS buyer_id FROM conversations WHERE listing_id=$1 AND (participant_a=$2 OR participant_b=$2)',[id,String(user.id)]);
    for(const person of interested.rows){try{await db.query('INSERT INTO notifications(user_id,kind,title,body,listing_id) VALUES($1,$2,$3,$4,$5)',[person.buyer_id,'listing_sold',next==='sold'?'Item marked sold':'Item exchanged',listing.title+' is no longer available.',id])}catch(notificationError){console.error('listing notification skipped',notificationError)}}
   }
   await db.query('UPDATE listings SET status=$1,updated_at=now() WHERE id=$2',[next,id]);
   return res.json({ok:true,id,status:next});
  }
  const title=String(body.title??listing.title).trim().slice(0,100),description=String(body.description??listing.description).trim().slice(0,2000);
  const type=String(body.listingType??listing.listing_type),condition=String(body.condition??listing.condition);
  const price=Number(body.price??listing.price),categoryId=Number(body.categoryId??listing.category_id);
  const campus=String(body.campus??listing.campus??'').trim().slice(0,100),location=String(body.location??listing.location??'').trim().slice(0,120),exchange=String(body.exchangePreferences??listing.exchange_preferences??'').trim().slice(0,250);
  if(title.length<3||description.length<10)return res.status(400).json({error:'Title must be at least 3 characters and description at least 10.'});
  if(!['sell','exchange','free'].includes(type)||!['New','Like New','Good','Fair'].includes(condition))return res.status(400).json({error:'Choose a valid listing type and condition.'});
  if(!Number.isFinite(price)||price<0||price>10000000)return res.status(400).json({error:'Enter a valid price.'});
  if((type==='free'||type==='exchange')&&price!==0)return res.status(400).json({error:'Free and exchange listings must have a zero price.'});
  const cat=await db.query('SELECT id FROM categories WHERE id=$1',[categoryId]);if(!cat.rows.length)return res.status(400).json({error:'Choose a valid category.'});
  let images=Array.isArray(body.imageUrls)?body.imageUrls.slice(0,5).map(x=>String(x).slice(0,1000)):listing.image_urls;
  if(!Array.isArray(images)||images.some(x=>typeof x!=='string'||(!/^https:\/\//i.test(x)&&!x.startsWith('uploads/'+String(user.id)+'/'))))return res.status(400).json({error:'Use a secure image URL or upload a photo from your account.'});
  if(next==='sold'||next==='exchanged'){
   const interested=await db.query('SELECT DISTINCT buyer_id FROM enquiries WHERE listing_id=$1 AND buyer_id<>$2 UNION SELECT DISTINCT CASE WHEN participant_a=$2 THEN participant_b ELSE participant_a END AS buyer_id FROM conversations WHERE listing_id=$1 AND (participant_a=$2 OR participant_b=$2)',[id,String(user.id)]);
   for(const person of interested.rows){try{await db.query('INSERT INTO notifications(user_id,kind,title,body,listing_id) VALUES($1,$2,$3,$4,$5)',[person.buyer_id,'listing_sold',next==='sold'?'Item marked sold':'Item exchanged',title+' is no longer available.',id])}catch(notificationError){console.error('listing notification skipped',notificationError)}}
  }
  await db.query('UPDATE listings SET title=$1,description=$2,status=$3,listing_type=$4,price=$5,condition=$6,category_id=$7,image_urls=$8::jsonb,campus=$9,location=$10,exchange_preferences=$11,updated_at=now() WHERE id=$12',[title,description,next,type,type==='sell'?price:0,condition,categoryId,JSON.stringify(images),campus,location,exchange,id]);
  return res.json({ok:true,id,status:next});
 }catch(e){console.error('listing detail',e);return res.status(500).json({error:'Could not process this listing.'});}
}