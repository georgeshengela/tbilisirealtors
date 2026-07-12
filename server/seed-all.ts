/**
 * Seeds all existing mock data (properties, agents, blog posts) into the database.
 * Run: npx tsx server/seed-all.ts
 */
import { db, client } from './db.js';
import { properties, agents, blogPosts } from './schema.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const PROPERTY_IMAGES = {
  luxury1: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  luxury2: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  luxury3: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80',
  luxury4: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
  luxury5: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
  luxury6: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
  luxury7: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
  luxury8: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
  apt1: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
  apt2: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
  apt3: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
  interior1: 'https://images.unsplash.com/photo-1616137466211-f939a420be84?w=800&q=80',
  interior2: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80',
  interior3: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
  city1: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
};

const AGENT_PHOTOS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80',
];

const seedAgents = [
  {
    id: 'a1', name: 'გიორგი ბერიძე', photo: AGENT_PHOTOS[0],
    phone: '+995 599 123 456', email: 'giorgi@tbilisirealtors.ge',
    rating: '4.9', reviewCount: 127, propertyCount: 48, yearsExperience: 8,
    specialization: ['საცხოვრებელი', 'კომერციული'],
    bio: 'გამოცდილი უძრავი განცხადების სპეციალისტი, რომელიც 8 წლის განმავლობაში ეხმარება კლიენტებს იდეალური სახლის პოვნაში.',
    company: 'TbilisiRealtors.ge', verified: true, languages: ['ქართული', 'ინგლისური', 'რუსული'], isActive: true,
  },
  {
    id: 'a2', name: 'ნინო კვარაცხელია', photo: AGENT_PHOTOS[1],
    phone: '+995 577 234 567', email: 'nino@tbilisirealtors.ge',
    rating: '4.8', reviewCount: 93, propertyCount: 35, yearsExperience: 6,
    specialization: ['საცხოვრებელი', 'ვილები'],
    bio: 'ნინო სპეციალიზდება ძვირადღირებულ სახლებსა და ვილებზე.',
    company: 'TbilisiRealtors.ge', verified: true, languages: ['ქართული', 'ინგლისური'], isActive: true,
  },
  {
    id: 'a3', name: 'ლაშა მამულაშვილი', photo: AGENT_PHOTOS[2],
    phone: '+995 595 345 678', email: 'lasha@tbilisirealtors.ge',
    rating: '4.7', reviewCount: 78, propertyCount: 62, yearsExperience: 10,
    specialization: ['კომერციული', 'ინვესტიციები'],
    bio: 'კომერციული უძრავი განცხადების ექსპერტი 10 წლიანი გამოცდილებით.',
    company: 'TbilisiRealtors.ge', verified: true, languages: ['ქართული', 'ინგლისური', 'გერმანული'], isActive: true,
  },
  {
    id: 'a4', name: 'მარიამ გელაშვილი', photo: AGENT_PHOTOS[3],
    phone: '+995 598 456 789', email: 'mariam@tbilisirealtors.ge',
    rating: '4.9', reviewCount: 145, propertyCount: 57, yearsExperience: 9,
    specialization: ['ახალი ბინები', 'საინვესტიციო'],
    bio: 'მარიამი ცნობილია კლიენტებთან ინდივიდუალური მიდგომით.',
    company: 'TbilisiRealtors.ge', verified: true, languages: ['ქართული', 'ინგლისური', 'ფრანგული'], isActive: true,
  },
  {
    id: 'a5', name: 'დავით ჩიქოვანი', photo: AGENT_PHOTOS[4],
    phone: '+995 591 567 890', email: 'davit@tbilisirealtors.ge',
    rating: '4.6', reviewCount: 61, propertyCount: 29, yearsExperience: 5,
    specialization: ['ახალი განაშენიანება', 'აპარტამენტები'],
    bio: 'ახალგაზრდა სპეციალისტი, სპეციალიზებული ახალ განაშენიანებებში.',
    company: 'TbilisiRealtors.ge', verified: true, languages: ['ქართული', 'ინგლისური'], isActive: true,
  },
  {
    id: 'a6', name: 'ანა ლომიძე', photo: AGENT_PHOTOS[5],
    phone: '+995 593 678 901', email: 'ana@tbilisirealtors.ge',
    rating: '4.8', reviewCount: 89, propertyCount: 41, yearsExperience: 7,
    specialization: ['სახლები', 'მიწა'],
    bio: 'ანა სპეციალიზდება საცხოვრებელ სახლებსა და მიწის ნაკვეთებზე.',
    company: 'TbilisiRealtors.ge', verified: false, languages: ['ქართული', 'ინგლისური', 'თურქული'], isActive: true,
  },
];

const seedProperties = [
  { id:'p1', title:'ლუქსუსური პენტჰაუსი მთის ხედით', price:'850000', pricePerSqm:'3400', address:'ვაშლოვანის ქუჩა 12, მე-15 სართული', city:'თბილისი', district:'ვაკე', type:'apartment', status:'sale', bedrooms:4, bathrooms:3, area:'250', floor:15, totalFloors:15, yearBuilt:2023, images:[PROPERTY_IMAGES.luxury1, PROPERTY_IMAGES.luxury2, PROPERTY_IMAGES.interior1, PROPERTY_IMAGES.interior2, PROPERTY_IMAGES.interior3], amenities:['კონდიციონერი','ლიფტი','პარკინგი','დაცვა 24/7','სპა','სპოტ-დარბაზი','ბასეინი','ტერასა'], features:['სმარტ-ჰოუს','პანორამული ხედი'], agentId:'a1', agentName:'გიორგი ბერიძე', agentPhone:'+995 599 123 456', agentEmail:'giorgi@tbilisirealtors.ge', isFeatured:true, isNew:true, isPremium:true, viewCount:1247, listedDate:'2026-06-15', coordinates:{lat:41.6941,lng:44.8337}, description:'განსაკუთრებული პენტჰაუსი ვაკეში, საიდანაც იხსნება მთის და ქალაქის პანორამული ხედები.' },
  { id:'p2', title:'ელეგანტური ვილა ნუცუბიძეზე', price:'650000', pricePerSqm:'2600', address:'ნუცუბიძის ქ. 45', city:'თბილისი', district:'ნუცუბიძე', type:'villa', status:'sale', bedrooms:5, bathrooms:4, area:'250', yearBuilt:2022, images:[PROPERTY_IMAGES.luxury4, PROPERTY_IMAGES.luxury5, PROPERTY_IMAGES.luxury6, PROPERTY_IMAGES.interior1], amenities:['კერძო ბაღი','ბასეინი','ბარბეკიუ','გარაჟი'], features:['ორი სართული','ქვის ფასადი'], agentId:'a2', agentName:'ნინო კვარაცხელია', agentPhone:'+995 577 234 567', agentEmail:'nino@tbilisirealtors.ge', isFeatured:true, isNew:false, isPremium:true, viewCount:892, listedDate:'2026-05-20', coordinates:{lat:41.7200,lng:44.7900}, description:'მშვენიერი ვილა ნუცუბიძის პლატოზე.' },
  { id:'p3', title:'მოდერნული ბინა ვარკეთილში', price:'95000', pricePerSqm:'1450', address:'ვარკეთილი 3, კვ. 4, ბლოკი B', city:'თბილისი', district:'ვარკეთილი', type:'apartment', status:'sale', bedrooms:3, bathrooms:1, area:'65', floor:7, totalFloors:12, yearBuilt:2020, images:[PROPERTY_IMAGES.apt1, PROPERTY_IMAGES.apt2, PROPERTY_IMAGES.interior2], amenities:['ლიფტი','კონდიციონერი','ეზო'], features:['ევრო-განახლება','სრული ავეჯი'], agentId:'a3', agentName:'ლაშა მამულაშვილი', agentPhone:'+995 595 345 678', agentEmail:'lasha@tbilisirealtors.ge', isFeatured:false, isNew:true, isPremium:false, viewCount:456, listedDate:'2026-06-28', coordinates:{lat:41.7350,lng:44.8100}, description:'ახლად გარემონტებული 3-ოთახიანი ბინა ვარკეთილის ახალ კომპლექსში.' },
  { id:'p4', title:'საოფისე სივრცე გლდანში', price:'2500', pricePerSqm:'25', address:'გლდანის გამზირი 14', city:'თბილისი', district:'გლდანი', type:'commercial', status:'rent', bedrooms:0, bathrooms:2, area:'100', floor:3, totalFloors:8, yearBuilt:2019, images:[PROPERTY_IMAGES.apt3, PROPERTY_IMAGES.interior3, PROPERTY_IMAGES.luxury3], amenities:['პარკინგი','ინტერნეტი','გათბობა','კონდიციონერი'], features:['ღია სივრცე','კონფ.-ოთახი'], agentId:'a3', agentName:'ლაშა მამულაშვილი', agentPhone:'+995 595 345 678', agentEmail:'lasha@tbilisirealtors.ge', isFeatured:false, isNew:false, isPremium:false, viewCount:234, listedDate:'2026-06-01', coordinates:{lat:41.7500,lng:44.8200}, description:'კომფორტული საოფისე სივრცე გლდანის ბიზნეს ცენტრში.' },
  { id:'p5', title:'ბრწყინვალე ბინა ძველ თბილისში', price:'320000', pricePerSqm:'3200', address:'ლეღვთახევის ქ. 8', city:'თბილისი', district:'ძველი თბილისი', type:'apartment', status:'sale', bedrooms:2, bathrooms:2, area:'100', floor:2, totalFloors:3, yearBuilt:1920, images:[PROPERTY_IMAGES.luxury7, PROPERTY_IMAGES.luxury8, PROPERTY_IMAGES.interior1, PROPERTY_IMAGES.interior2], amenities:['ტერასა','ეზო','სარდაფი'], features:['ისტორიული ფასადი','ხის ჭერი','კამინი'], agentId:'a4', agentName:'მარიამ გელაშვილი', agentPhone:'+995 598 456 789', agentEmail:'mariam@tbilisirealtors.ge', isFeatured:true, isNew:false, isPremium:true, viewCount:1089, listedDate:'2026-04-10', coordinates:{lat:41.6890,lng:44.8100}, description:'ისტორიული ძველი თბილისის გულში მდებარე ანტიკური ბინა.' },
  { id:'p6', title:'ახალი აპარტამენტი საბურთალოზე', price:'1800', pricePerSqm:'30', address:'ქავთარაძის ქ. 22, ბლოკი C', city:'თბილისი', district:'საბურთალო', type:'apartment', status:'rent', bedrooms:2, bathrooms:1, area:'60', floor:5, totalFloors:10, yearBuilt:2021, images:[PROPERTY_IMAGES.apt2, PROPERTY_IMAGES.apt3, PROPERTY_IMAGES.interior3], amenities:['ლიფტი','კონდიციონერი','პარკინგი'], features:['ახალი ავეჯი','ნათელი ოთახები'], agentId:'a5', agentName:'დავით ჩიქოვანი', agentPhone:'+995 591 567 890', agentEmail:'davit@tbilisirealtors.ge', isFeatured:false, isNew:true, isPremium:false, viewCount:321, listedDate:'2026-06-30', coordinates:{lat:41.7150,lng:44.7700}, description:'ახალ კომპლექსში განახლებული 2-ოთახიანი ბინა.' },
  { id:'p7', title:'სახელმწიფო სახლი მთაწმინდაზე', price:'1200000', pricePerSqm:'4000', address:'მთაწმინდა, ქ. კოტე', city:'თბილისი', district:'მთაწმინდა', type:'house', status:'sale', bedrooms:6, bathrooms:5, area:'300', yearBuilt:2024, images:[PROPERTY_IMAGES.luxury5, PROPERTY_IMAGES.luxury6, PROPERTY_IMAGES.luxury7, PROPERTY_IMAGES.interior1, PROPERTY_IMAGES.interior2], amenities:['ბასეინი','სპა','ფიტნეს','ბაღი','გარაჟი','დაცვა'], features:['პანორამული ხედი','სმარტ-ჰოუს','3 სართული'], agentId:'a1', agentName:'გიორგი ბერიძე', agentPhone:'+995 599 123 456', agentEmail:'giorgi@tbilisirealtors.ge', isFeatured:true, isNew:true, isPremium:true, viewCount:2341, listedDate:'2026-06-01', coordinates:{lat:41.6960,lng:44.7980}, description:'ექსკლუზიური სახლი მთაწმინდის კალთაზე.' },
  { id:'p8', title:'ბინა ისანში - ბაღის ხედით', price:'55000', pricePerSqm:'1100', address:'ისნის გამზ. 5', city:'თბილისი', district:'ისანი', type:'apartment', status:'sale', bedrooms:1, bathrooms:1, area:'50', floor:3, totalFloors:9, yearBuilt:2022, images:[PROPERTY_IMAGES.apt1, PROPERTY_IMAGES.apt3, PROPERTY_IMAGES.interior3], amenities:['ლიფტი','ეზო','ბავშვთა მოედანი'], features:['კომფორტული განლაგება','ნათელი'], agentId:'a6', agentName:'ანა ლომიძე', agentPhone:'+995 593 678 901', agentEmail:'ana@tbilisirealtors.ge', isFeatured:false, isNew:false, isPremium:false, viewCount:178, listedDate:'2026-05-15', coordinates:{lat:41.6800,lng:44.8500}, description:'კომფორტული 1-ოთახიანი ბინა ისნის ახალ კომპლექსში.' },
  { id:'p9', title:'ლუქს-ოფისი ვაკეში', price:'8000', pricePerSqm:'40', address:'ჭავჭავაძის გამზ. 70', city:'თბილისი', district:'ვაკე', type:'commercial', status:'rent', bedrooms:0, bathrooms:4, area:'200', floor:10, totalFloors:15, yearBuilt:2023, images:[PROPERTY_IMAGES.luxury3, PROPERTY_IMAGES.interior2, PROPERTY_IMAGES.interior3], amenities:['A-კლასი','პარკინგი','ინტერნეტი','გათბობა','დაცვა'], features:['ღია სივრცე','კონფ.-ოთახი','კუხნია'], agentId:'a3', agentName:'ლაშა მამულაშვილი', agentPhone:'+995 595 345 678', agentEmail:'lasha@tbilisirealtors.ge', isFeatured:false, isNew:false, isPremium:true, viewCount:567, listedDate:'2026-03-20', coordinates:{lat:41.7100,lng:44.7800}, description:'A-კლასის საოფისე სივრცე ვაკის ბიზნეს ცენტრში.' },
  { id:'p10', title:'კოტეჯი მცხეთაში', price:'280000', pricePerSqm:'1400', address:'მცხეთა, კახეთის გზ. 3', city:'მცხეთა', district:'ცენტრი', type:'house', status:'sale', bedrooms:4, bathrooms:3, area:'200', yearBuilt:2021, images:[PROPERTY_IMAGES.luxury8, PROPERTY_IMAGES.luxury4, PROPERTY_IMAGES.interior1], amenities:['ბაღი','მარანი','ბარბეკიუ','გარაჟი'], features:['ქვის ფასადი','ხის ჭერი','ღვინის სარდაფი'], agentId:'a6', agentName:'ანა ლომიძე', agentPhone:'+995 593 678 901', agentEmail:'ana@tbilisirealtors.ge', isFeatured:false, isNew:false, isPremium:false, viewCount:432, listedDate:'2026-04-25', coordinates:{lat:41.8460,lng:44.7190}, description:'ულამაზესი კოტეჯი ისტორიულ მცხეთაში.' },
  { id:'p11', title:'ახალი ბინა ბათუმში - ზღვის ხედი', price:'195000', pricePerSqm:'2600', address:'ნინოშვილის ქ. 2, Sea Towers', city:'ბათუმი', district:'ცენტრი', type:'apartment', status:'sale', bedrooms:2, bathrooms:2, area:'75', floor:18, totalFloors:25, yearBuilt:2024, images:[PROPERTY_IMAGES.luxury2, PROPERTY_IMAGES.luxury5, PROPERTY_IMAGES.interior2, PROPERTY_IMAGES.interior3], amenities:['ბასეინი','სპა','ფიტნეს','კონსიერჟი','პარკინგი'], features:['ზღვის ხედი','სმარტ-ჰოუს'], agentId:'a4', agentName:'მარიამ გელაშვილი', agentPhone:'+995 598 456 789', agentEmail:'mariam@tbilisirealtors.ge', isFeatured:true, isNew:true, isPremium:true, viewCount:1678, listedDate:'2026-07-01', coordinates:{lat:41.6168,lng:41.6367}, description:'ბათუმის ყველაზე მოთხოვნად ლოკაციაზე ახალი ბინა.' },
  { id:'p12', title:'სასოფლო სახლი კახეთში', price:'120000', pricePerSqm:'800', address:'სიღნაღი, ბოდბის ქ. 5', city:'სიღნაღი', district:'ცენტრი', type:'house', status:'sale', bedrooms:3, bathrooms:2, area:'150', yearBuilt:2018, images:[PROPERTY_IMAGES.luxury6, PROPERTY_IMAGES.luxury7, PROPERTY_IMAGES.interior1], amenities:['ვენახი','ბაღი','მარანი'], features:['ქართული სტილი','ვენახი'], agentId:'a6', agentName:'ანა ლომიძე', agentPhone:'+995 593 678 901', agentEmail:'ana@tbilisirealtors.ge', isFeatured:false, isNew:false, isPremium:false, viewCount:289, listedDate:'2026-05-01', coordinates:{lat:41.6224,lng:45.9219}, description:'ტრადიციული ქართული სახლი კახეთის მხარეში.' },
  { id:'p13', title:'Studio Vake - New', price:'78000', pricePerSqm:'1950', address:'Chavchavadze 55', city:'თბილისი', district:'ვაკე', type:'apartment', status:'sale', bedrooms:1, bathrooms:1, area:'40', floor:6, totalFloors:12, yearBuilt:2024, images:[PROPERTY_IMAGES.apt1], amenities:['ლიფტი','კონდ.'], features:['Furnished','New'], agentId:'a1', agentName:'გიორგი ბერიძე', agentPhone:'+995 599 123 456', agentEmail:'giorgi@tbilisirealtors.ge', isFeatured:false, isNew:true, isPremium:false, viewCount:312, listedDate:'2026-07-01', coordinates:{lat:41.708,lng:44.773}, description:'Comfortable studio in Vake. Euro-renovation, furnished.' },
  { id:'p14', title:'5-room Penthouse Saburtalo', price:'420000', pricePerSqm:'2800', address:'Svanetis 1, Sapphire', city:'თბილისი', district:'საბურთალო', type:'apartment', status:'sale', bedrooms:5, bathrooms:3, area:'150', floor:14, totalFloors:18, yearBuilt:2023, images:[PROPERTY_IMAGES.luxury5], amenities:['Pool','Spa','Fitness','Parking'], features:['2 Terraces','Panorama'], agentId:'a4', agentName:'მარიამ გელაშვილი', agentPhone:'+995 598 456 789', agentEmail:'mariam@tbilisirealtors.ge', isFeatured:true, isNew:false, isPremium:true, viewCount:876, listedDate:'2026-05-10', coordinates:{lat:41.718,lng:44.769}, description:'Spacious 5-room in new elite complex.' },
  { id:'p15', title:'Apartment Nadzaladevi New Complex', price:'65000', pricePerSqm:'1300', address:'Nikoladze 25', city:'თბილისი', district:'ნაძალადევი', type:'apartment', status:'sale', bedrooms:2, bathrooms:1, area:'50', floor:4, totalFloors:10, yearBuilt:2021, images:[PROPERTY_IMAGES.apt3], amenities:['Lift','Yard'], features:['New Complex'], agentId:'a5', agentName:'დავით ჩიქოვანი', agentPhone:'+995 591 567 890', agentEmail:'davit@tbilisirealtors.ge', isFeatured:false, isNew:false, isPremium:false, viewCount:198, listedDate:'2026-04-15', coordinates:{lat:41.742,lng:44.826}, description:'2-room apartment in new complex.' },
  { id:'p16', title:'Batumi Central New Complex', price:'155000', pricePerSqm:'2067', address:'Ninoshvili 15', city:'ბათუმი', district:'ცენტრი', type:'apartment', status:'sale', bedrooms:3, bathrooms:2, area:'75', floor:8, totalFloors:20, yearBuilt:2023, images:[PROPERTY_IMAGES.luxury7], amenities:['Pool','Concierge','Parking'], features:['Sea view','New'], agentId:'a4', agentName:'მარიამ გელაშვილი', agentPhone:'+995 598 456 789', agentEmail:'mariam@tbilisirealtors.ge', isFeatured:false, isNew:true, isPremium:false, viewCount:543, listedDate:'2026-06-20', coordinates:{lat:41.640,lng:41.643}, description:'3-room flat, 200m to sea. New complex.' },
  { id:'p17', title:'Luxury Villa Bodbe Winery', price:'380000', pricePerSqm:'1900', address:'Bodbe', city:'სიღნაღი', district:'ბოდბე', type:'villa', status:'sale', bedrooms:4, bathrooms:3, area:'200', yearBuilt:2020, images:[PROPERTY_IMAGES.luxury8], amenities:['Vineyard','Garden','Winery'], features:['Stone facade','Wine cellar'], agentId:'a6', agentName:'ანა ლომიძე', agentPhone:'+995 593 678 901', agentEmail:'ana@tbilisirealtors.ge', isFeatured:false, isNew:false, isPremium:true, viewCount:234, listedDate:'2026-03-10', coordinates:{lat:41.604,lng:45.900}, description:'Exclusive villa near Bodbe. Vineyard, garden, wine cellar.' },
  { id:'p18', title:'A++ Office Space Vake', price:'12000', pricePerSqm:'48', address:'Chavchavadze 80', city:'თბილისი', district:'ვაკე', type:'commercial', status:'rent', bedrooms:0, bathrooms:4, area:'250', floor:12, totalFloors:20, yearBuilt:2024, images:[PROPERTY_IMAGES.interior1], amenities:['VIP Parking','24/7 Security'], features:['Smart office','Panoramic view'], agentId:'a3', agentName:'ლაშა მამულაშვილი', agentPhone:'+995 595 345 678', agentEmail:'lasha@tbilisirealtors.ge', isFeatured:false, isNew:true, isPremium:true, viewCount:412, listedDate:'2026-07-02', coordinates:{lat:41.710,lng:44.779}, description:'Class-A office in Vake Business Center.' },
  { id:'p19', title:'4-room Isani Modern Flat', price:'2200', pricePerSqm:'28.6', address:'Isnis 12', city:'თბილისი', district:'ისანი', type:'apartment', status:'rent', bedrooms:4, bathrooms:2, area:'77', floor:9, totalFloors:14, yearBuilt:2022, images:[PROPERTY_IMAGES.apt2], amenities:['Lift','AC','Parking'], features:['Wide balcony','Renovated'], agentId:'a6', agentName:'ანა ლომიძე', agentPhone:'+995 593 678 901', agentEmail:'ana@tbilisirealtors.ge', isFeatured:false, isNew:false, isPremium:false, viewCount:156, listedDate:'2026-06-12', coordinates:{lat:41.682,lng:44.848}, description:'Modern 4-room in new Isani quarter.' },
  { id:'p20', title:'Elite Villa Tbilisi Sea Pool', price:'950000', pricePerSqm:'3800', address:'Tbilisi Sea Villas', city:'თბილისი', district:'თბილისის ზღვა', type:'villa', status:'sale', bedrooms:5, bathrooms:4, area:'250', yearBuilt:2023, images:[PROPERTY_IMAGES.luxury4], amenities:['Pool','Spa','Garage','Garden','Security'], features:['3 floors','Smart home'], agentId:'a1', agentName:'გიორგი ბერიძე', agentPhone:'+995 599 123 456', agentEmail:'giorgi@tbilisirealtors.ge', isFeatured:true, isNew:true, isPremium:true, viewCount:1893, listedDate:'2026-07-03', coordinates:{lat:41.789,lng:44.842}, description:'Exceptional villa at Tbilisi Sea.' },
  { id:'p21', title:'პენტჰაუსი ბათუმში — ზღვის პანორამა', price:'720000', pricePerSqm:'4800', address:'ბარათაშვილის ქ. 1, Orbi Beach Tower', city:'ბათუმი', district:'ბულვარი', type:'apartment', status:'sale', bedrooms:3, bathrooms:3, area:'150', floor:28, totalFloors:30, yearBuilt:2024, images:[PROPERTY_IMAGES.luxury2, PROPERTY_IMAGES.interior2], amenities:['კონსიერჟი','ბასეინი','სპა','ფიტნეს','პარკინგი'], features:['270° ზღვის ხედი','სმარტ-ჰოუს'], agentId:'a4', agentName:'მარიამ გელაშვილი', agentPhone:'+995 598 456 789', agentEmail:'mariam@tbilisirealtors.ge', isFeatured:true, isNew:true, isPremium:true, viewCount:2104, listedDate:'2026-07-05', coordinates:{lat:41.6410,lng:41.6380}, description:'ბათუმის ყველაზე მაღლა მდებარე ლუქს-პენტჰაუსი.' },
  { id:'p22', title:'ექსკლუზიური ვილა — ვაკის ბაღნარი', price:'1450000', pricePerSqm:'4143', address:'ჭოველიძის ჩიხი 7', city:'თბილისი', district:'ვაკე', type:'villa', status:'sale', bedrooms:4, bathrooms:4, area:'350', yearBuilt:2024, images:[PROPERTY_IMAGES.luxury6, PROPERTY_IMAGES.luxury5], amenities:['კერძო ბასეინი','ბაღი','გარაჟი','სმარტ-ჰოუს'], features:['ლანდ-დიზაინი','კინო-დარბაზი'], agentId:'a2', agentName:'ნინო კვარაცხელია', agentPhone:'+995 577 234 567', agentEmail:'nino@tbilisirealtors.ge', isFeatured:true, isNew:true, isPremium:true, viewCount:1742, listedDate:'2026-07-06', coordinates:{lat:41.7080,lng:44.7760}, description:'ვაკის ყველაზე კულტიურ უბანში.' },
  { id:'p23', title:'სტუდია — რუსთაველის ბულვარი', price:'185000', pricePerSqm:'4625', address:'რუსთაველის გამზ. 42', city:'თბილისი', district:'ცენტრი', type:'apartment', status:'sale', bedrooms:1, bathrooms:1, area:'40', floor:12, totalFloors:14, yearBuilt:2023, images:[PROPERTY_IMAGES.apt1, PROPERTY_IMAGES.interior1], amenities:['ლიფტი','კონდ.','კონსიერჟი'], features:['ბულვარის ხედი','ავეჯით'], agentId:'a1', agentName:'გიორგი ბერიძე', agentPhone:'+995 599 123 456', agentEmail:'giorgi@tbilisirealtors.ge', isFeatured:true, isNew:false, isPremium:true, viewCount:1385, listedDate:'2026-06-18', coordinates:{lat:41.6960,lng:44.8010}, description:'უნიკალური სტუდიო რუსთაველის ბულვარზე.' },
  { id:'p24', title:'ლუქს-ოთახი ქუთაისში', price:'98000', pricePerSqm:'1960', address:'წერეთლის გამზ. 118', city:'ქუთაისი', district:'ცენტრი', type:'apartment', status:'sale', bedrooms:2, bathrooms:1, area:'50', floor:6, totalFloors:12, yearBuilt:2023, images:[PROPERTY_IMAGES.apt2, PROPERTY_IMAGES.apt3], amenities:['ლიფტი','ეზო','პარკინგი'], features:['ახალი კომპლ.','ევრო-განახლება'], agentId:'a5', agentName:'დავით ჩიქოვანი', agentPhone:'+995 591 567 890', agentEmail:'davit@tbilisirealtors.ge', isFeatured:true, isNew:true, isPremium:true, viewCount:876, listedDate:'2026-07-07', coordinates:{lat:42.2690,lng:42.6960}, description:'ქუთაისის პრემიუმ-სეგმენტის სიახლე.' },
  { id:'p25', title:'VIP კომერციული — ჭავჭავაძის 62', price:'18500', pricePerSqm:'37', address:'ჭავჭავაძის გამზ. 62', city:'თბილისი', district:'ვაკე', type:'commercial', status:'rent', bedrooms:0, bathrooms:5, area:'500', floor:3, totalFloors:3, yearBuilt:2024, images:[PROPERTY_IMAGES.luxury3, PROPERTY_IMAGES.interior2], amenities:['VIP პარკინგი','A/C','ინტ. 1GB'], features:['3 ეტაჟი','ტერასა'], agentId:'a3', agentName:'ლაშა მამულაშვილი', agentPhone:'+995 595 345 678', agentEmail:'lasha@tbilisirealtors.ge', isFeatured:true, isNew:true, isPremium:true, viewCount:1021, listedDate:'2026-07-08', coordinates:{lat:41.7120,lng:44.7800}, description:'A++ კლასის საოფისე კომპლექსი ვაკის ბიზნეს-ჰაბში.' },
];

const seedBlogPosts = [
  { id:'b1', title:'თბილისის უძრავი განცხადების ბაზრის 2026 წლის ტენდენციები', excerpt:'გაიგეთ, რა ტენდენციები ახასიათებს 2026 წელს თბილისის უძრავი განცხადების ბაზარს.', content:'', authorId:'a1', authorName:'გიორგი ბერიძე', category:'ბაზრის ანალიზი', tags:['ინვესტიცია','ბაზარი','თბილისი'], image:PROPERTY_IMAGES.city1, publishDate:'2026-06-15', readTime:8, isFeatured:true, isPublished:true },
  { id:'b2', title:'ბინის ყიდვის 10 მნიშვნელოვანი ნაბიჯი', excerpt:'სახელმძღვანელო პირველი ბინის მყიდველებისთვის.', content:'', authorId:'a2', authorName:'ნინო კვარაცხელია', category:'გზამკვლევი', tags:['ბინის ყიდვა','გზამკვლევი'], image:PROPERTY_IMAGES.luxury3, publishDate:'2026-06-10', readTime:12, isFeatured:false, isPublished:true },
  { id:'b3', title:'საინვესტიციო განცხადება: ბათუმი vs თბილისი', excerpt:'შედარებითი ანალიზი - სად ჯობს ინვესტიცია?', content:'', authorId:'a3', authorName:'ლაშა მამულაშვილი', category:'ინვესტიცია', tags:['ბათუმი','თბილისი','ინვესტიცია'], image:PROPERTY_IMAGES.luxury5, publishDate:'2026-06-05', readTime:10, isFeatured:true, isPublished:true },
  { id:'b4', title:'ახალი ბინა: ყიდვა თუ კომპენსაცია?', excerpt:'დეველოპერული კომპენსაცია ან ახალი ბინის ყიდვა?', content:'', authorId:'a4', authorName:'მარიამ გელაშვილი', category:'გზამკვლევი', tags:['ახალი ბინა','კომპენსაცია'], image:PROPERTY_IMAGES.apt2, publishDate:'2026-05-28', readTime:7, isFeatured:false, isPublished:true },
  { id:'b5', title:'სად ჯობს ცხოვრება: ვაკე, საბურთალო თუ ისანი?', excerpt:'თბილისის პოპულარული უბნების შედარება.', content:'', authorId:'a5', authorName:'დავით ჩიქოვანი', category:'ცხოვრების სტილი', tags:['ვაკე','საბურთალო','ისანი'], image:PROPERTY_IMAGES.luxury7, publishDate:'2026-05-20', readTime:9, isFeatured:false, isPublished:true },
  { id:'b6', title:'ინტერიერის დიზაინის 2026 წლის ტენდენციები', excerpt:'ყველაზე პოპულარული ინტერიერის სტილები 2026 წელს.', content:'', authorId:'a6', authorName:'ანა ლომიძე', category:'დიზაინი', tags:['ინტერიერი','დიზაინი'], image:PROPERTY_IMAGES.interior1, publishDate:'2026-05-15', readTime:6, isFeatured:false, isPublished:true },
];

async function seedAll() {
  console.log('Seeding all mock data into database...\n');

  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await db.execute(sql`DELETE FROM properties`);
    await db.execute(sql`DELETE FROM agents`);
    await db.execute(sql`DELETE FROM blog_posts`);

    // Seed agents
    console.log('Inserting 6 agents...');
    for (const agent of seedAgents) {
      await db.insert(agents).values(agent).onConflictDoNothing();
    }
    console.log('✅ Agents done');

    // Seed properties
    console.log('Inserting 25 properties...');
    for (const prop of seedProperties) {
      await db.insert(properties).values(prop).onConflictDoNothing();
    }
    console.log('✅ Properties done');

    // Seed blog posts
    console.log('Inserting 6 blog posts...');
    for (const post of seedBlogPosts) {
      await db.insert(blogPosts).values(post).onConflictDoNothing();
    }
    console.log('✅ Blog posts done');

    console.log('\n🎉 All mock data seeded successfully!');
    console.log('   Agents:      6');
    console.log('   Properties:  25');
    console.log('   Blog Posts:  6');

  } catch (err) {
    console.error('❌ Seed error:', err);
    throw err;
  } finally {
    await client.end();
  }
}

seedAll();
