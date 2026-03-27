/**
 * leads-db/seed.js
 * Pre-populate database with all 84 companies found via research.
 * Run: node src/leads-db/seed.js
 * Safe to re-run — deduplication prevents duplicates.
 */

import { bulkUpsert, stats } from './store.js';

const LEADS = [
  // ── Stockton / San Joaquin County ─────────────────────────────────────────

  // Asphalt / Paving / Concrete
  { name:'G&L Brock Construction',            area:'Stockton / SJC',         industry:'Asphalt / Paving',        website:'brockconstruction.com',              city:'Stockton',       source:'web-search', notes:'Est. 1979. Grading, paving, underground utilities.' },
  { name:'DRYCO Construction',                area:'Stockton / SJC',         industry:'Asphalt / Paving',        website:'dryco.com',                          city:'Stockton',       source:'web-search', notes:'270 employees, 50 crews, commercial paving.' },
  { name:'Roughstock Construction',           area:'Stockton / SJC',         industry:'Asphalt / Paving',        website:'roughstockconstruction.com',          city:'Valley Springs', source:'web-search', notes:'Est. 2021. Asphalt, grading, excavation, demo.' },
  { name:'Central Valley Sealcoating & Asphalt', area:'Stockton / SJC',     industry:'Asphalt / Paving',        website:'centralvalleysealcoating.com',        city:'Stockton',       source:'web-search', notes:'Est. 1988. Asphalt, sealcoating, striping.' },
  { name:'Great West Paving',                 area:'Stockton / SJC',         industry:'Asphalt / Paving',        website:'greatwestpaving.com',                city:'Stockton',       source:'web-search', notes:'Family-owned. Merced to Stockton coverage.' },
  { name:'Action Asphalt & Concrete',         area:'Stockton / SJC',         industry:'Asphalt / Paving',        website:'actionasphalt.com',                  city:'Stockton',       source:'web-search', notes:'Est. 1999. 25+ yrs. Commercial, multi-tenant, municipal.' },
  { name:'Phase Construction & Engineering',  area:'Stockton / SJC',         industry:'Excavation / Grading',    website:'',                                   city:'Stockton',       source:'web-search', notes:'Site dev, excavation, heavy industrial paving. GPS machinery fleet.' },
  { name:'Sierra National Asphalt',           area:'Stockton / SJC',         industry:'Asphalt / Paving',        website:'',                                   city:'Stockton',       source:'web-search', notes:'General engineering, asphalt and concrete pavement.' },
  { name:'We Love Paving',                    area:'Stockton / SJC',         industry:'Asphalt / Paving',        website:'welovepaving.com',                   city:'Stockton',       source:'web-search' },

  // Excavation / Grading / Earthwork
  { name:'Flores Excavation & Demolition',    area:'Stockton / SJC',         industry:'Excavation / Grading',    website:'floresexcavationdemolition.com',      city:'Stockton',       source:'web-search', notes:'20+ yrs. Brian Flores. San Joaquin, Stanislaus, Merced counties.' },
  { name:'AAA Backhoe Service (A-1 Septic)',  area:'Stockton / SJC',         industry:'Excavation / Grading',    website:'a1septic.org',                       city:'Modesto',        source:'web-search', notes:'30+ yrs. SJC, Stanislaus, Merced. A+ BBB.' },
  { name:'Devco Development & Engineering',   area:'Stockton / SJC',         industry:'Excavation / Grading',    website:'developmentandengineering.com',       city:'Stockton',       source:'web-search', notes:'General A Engineering + General B contractor.' },
  { name:'Rockin R Inc.',                     area:'Stockton / SJC',         industry:'Excavation / Grading',    website:'',                                   city:'Modesto',        source:'web-search', notes:'Est. 2002. Grading, excavation, land clearing. DBE/WBE certified.' },
  { name:'A.M. Stephens Construction Co.',    area:'Stockton / SJC',         industry:'Excavation / Grading',    website:'',                                   city:'Modesto',        source:'web-search', notes:'40+ yrs. Excavation, earthwork, paving, concrete.' },
  { name:'D.R. Jolley Co.',                   area:'Stockton / SJC',         industry:'Demolition / Hauling',    website:'',                                   city:'Stockton',       source:'web-search', notes:'30+ yrs private and public works demolition.' },

  // Underground Utilities
  { name:'DR Pipeline, Inc.',                 area:'Stockton / SJC',         industry:'Underground Utilities',   website:'thebluebook.com',                    city:'Stockton',       source:'web-search', notes:'Storm drains, sewer, water, gas conduit. PVC/DI/HDPE/RCP.' },
  { name:'Sanco Pipelines, Inc.',             area:'Stockton / SJC',         industry:'Underground Utilities',   website:'sancopipelines.com',                 city:'Los Gatos',      source:'web-search', notes:'Est. 1956. General A + C42 license. San Joaquin & Sacramento ops.' },

  // Demolition / Waste
  { name:'Empire Demolition & Hauling',       area:'Stockton / SJC',         industry:'Demolition / Hauling',    website:'empiredemolitionandhauling.com',      city:'Sacramento',     source:'web-search', notes:'Covers Stockton, Roseville, Sacramento.' },
  { name:'CAL-INC',                           area:'NorCal (Both)',           industry:'Demolition / Hauling',    website:'cal-inc.com',                        city:'Sacramento',     source:'web-search', notes:'Abatement, demo, PCB removal. Stockton + Roseville + Sacramento.' },
  { name:'California Waste Recovery Systems', area:'Stockton / SJC',         industry:'Waste Hauling',           website:'',                                   city:'Stockton',       source:'web-search', notes:'City of Stockton permitted C&D industrial waste hauler.' },
  { name:'Republic Services',                 area:'Stockton / SJC',         industry:'Waste Hauling',           website:'republicservices.com',                city:'Stockton',       source:'web-search', notes:'City of Stockton permitted. Massive fleet.' },
  { name:'Waste Management',                  area:'Stockton / SJC',         industry:'Waste Hauling',           website:'wm.com',                             city:'Stockton',       source:'web-search', notes:'City of Stockton permitted. Massive fleet.' },

  // ── Sacramento / Roseville / Placer County ────────────────────────────────

  // Asphalt / Paving
  { name:'DRYCO Construction (Roseville)',    area:'Sacramento / Roseville',  industry:'Asphalt / Paving',        website:'dryco.com',                          city:'Roseville',      source:'web-search', notes:'270 employees, 50 crews. Est. 1985.' },
  { name:'All Phase Construction & Engineering', area:'Sacramento / Roseville', industry:'Asphalt / Paving',     website:'allphaseinc.com',                    city:'Roseville',      source:'web-search', notes:'Civil engineering + asphalt. Placer County. GPS machinery.' },
  { name:'A-1 Advantage Asphalt, Inc.',       area:'Sacramento / Roseville',  industry:'Asphalt / Paving',        website:'advantageasphalt.com',               city:'Sacramento',     source:'web-search', notes:'General engineering paving. Sacramento, Roseville, NorCal.' },
  { name:'Pacific Pavement',                  area:'Sacramento / Roseville',  industry:'Asphalt / Paving',        website:'pacificpavement.com',                city:'Sacramento',     source:'web-search', notes:'Est. 2000. 7 counties. 80% repeat business. State/county/city clients.' },
  { name:'JB Bostick Company',                area:'Sacramento / Roseville',  industry:'Asphalt / Paving',        website:'',                                   city:'Roseville',      source:'web-search', notes:'Est. 1969. Asphalt maintenance. Roseville + Anaheim offices.' },
  { name:'Sierra Asphalt',                    area:'Sacramento / Roseville',  industry:'Asphalt / Paving',        website:'',                                   city:'Rancho Cordova', source:'web-search', notes:'Est. 1977. Parking lots. Rancho Cordova.' },
  { name:'Creason Enterprises, Inc.',         area:'Sacramento / Roseville',  industry:'Asphalt / Paving',        website:'',                                   city:'Sacramento',     source:'web-search', notes:'30+ yrs. Grading, paving, underground, concrete.' },
  { name:'B&M Builders, Inc.',                area:'Sacramento / Roseville',  industry:'Asphalt / Paving',        website:'',                                   city:'Rancho Cordova', source:'web-search', notes:'Family-owned. Road construction, site dev, asphalt/concrete.' },
  { name:'T and S Paving',                    area:'Sacramento / Roseville',  industry:'Asphalt / Paving',        website:'',                                   city:'Sacramento',     source:'web-search', notes:'40+ yrs. Family-owned. Paving, concrete, grading.' },
  { name:'Action Asphalt Sacramento',         area:'Sacramento / Roseville',  industry:'Asphalt / Paving',        website:'actionasphalt.com',                  city:'Sacramento',     source:'web-search', notes:'Municipal/govt contracts. Est. 1999.' },

  // Concrete / Ready-Mix
  { name:'GR Trucking / Crete Crush',         area:'Sacramento / Roseville',  industry:'Concrete / Ready-Mix',    website:'grtrucking.net',                     city:'Sacramento',     source:'web-search', fleetSize:'80+ trucks', notes:'80+ truck fleet. 10-wheelers, transfers, side dumps, water trucks, flatbeds.' },
  { name:'Folsom Ready Mix',                  area:'Sacramento / Roseville',  industry:'Concrete / Ready-Mix',    website:'folsomreadymix.com',                 city:'Rancho Cordova', source:'web-search', fleetSize:'60+ trucks', notes:'3 batch plants: Rancho Cordova, Roseville, Redding. 60+ mixer trucks.' },
  { name:'Hanford Sand & Gravel',             area:'Sacramento / Roseville',  industry:'Concrete / Ready-Mix',    website:'hanfordsandandgravel.com',            city:'Roseville',      source:'web-search', fleetSize:'30 trucks/day', phone:'916-782-9150', notes:'3 generations. Elk Grove + Roseville locations. Up to 30 trucks/day.' },
  { name:'ABC Ready Mix',                     area:'Sacramento / Roseville',  industry:'Concrete / Ready-Mix',    website:'abcreadymix.com',                    city:'Rocklin',        source:'web-search', notes:'One of largest ready-mix suppliers. Placer County.' },
  { name:'Elite Ready Mix',                   area:'Sacramento / Roseville',  industry:'Concrete / Ready-Mix',    website:'elitereadymix.net',                  city:'Sacramento',     source:'web-search', fleetSize:'46 trucks', notes:'46-truck fleet. Pools to foundations.' },
  { name:'Townsend Concrete',                 area:'Sacramento / Roseville',  industry:'Concrete / Ready-Mix',    website:'townsendconcrete.com',               city:'West Sacramento',source:'web-search', notes:'47 yrs. Volumetric mixer trucks. Caltrans-certified.' },

  // Underground Utilities
  { name:'Nor-Cal Pipeline Services',         area:'Sacramento / Roseville',  industry:'Underground Utilities',   website:'norcalpipe.com',                     city:'West Sacramento', source:'web-search', notes:'Est. 2007. Hydro excavation, CCTV, CIPP, manhole rehab. Statewide.' },
  { name:'8A Underground Pipeline',           area:'Sacramento / Roseville',  industry:'Underground Utilities',   website:'8aundergroundpipeline.net',           city:'Sacramento',     source:'web-search', notes:'24/7. Directional drilling, sewer/water/storm install.' },
  { name:'Summit Pipelines',                  area:'Sacramento / Roseville',  industry:'Underground Utilities',   website:'undergroundconstructionsacramentoca.com', city:'Sacramento', source:'web-search', notes:'Pipeline cleaning, inspection, potholing.' },
  { name:'Underground Construction Co., Inc.',area:'NorCal (Both)',           industry:'Underground Utilities',   website:'undergroundconstruction.com',         city:'Sacramento',     source:'web-search', notes:'Largest pipeline specialty contractor in North America. NorCal oil/gas ops.' },

  // Demolition
  { name:'BK Demolition Sacramento',          area:'Sacramento / Roseville',  industry:'Demolition / Hauling',    website:'bkdemolitionsacramento.com',          city:'Sacramento',     source:'web-search', notes:'Demolition, excavation, hauling. Roseville + Sacramento coverage.' },
  { name:'Monster Demolition Sacramento',     area:'Sacramento / Roseville',  industry:'Demolition / Hauling',    website:'monsterdemolition.com',               city:'Sacramento',     source:'web-search', notes:'Demo, hauling, grading, salvage. NorCal wide.' },
  { name:'Demo Patrol',                       area:'Sacramento / Roseville',  industry:'Demolition / Hauling',    website:'demopatrol.com',                     city:'Sacramento',     source:'web-search', notes:'90-mile radius of Sacramento. 70%+ waste recycled.' },

  // Excavation / Grading (Sac region)
  { name:'Hanford Sand & Gravel (Elk Grove)', area:'Sacramento / Roseville',  industry:'Concrete / Ready-Mix',    website:'hanfordsandandgravel.com',            city:'Elk Grove',      source:'web-search', notes:'Second location. Same fleet.' },

  // ── Tree Service ───────────────────────────────────────────────────────────
  { name:'Davey Tree',                        area:'Sacramento / Roseville',  industry:'Tree Service',            website:'davey.com',                          city:'Sacramento',     source:'web-search', notes:'Leading tree care. ISA certified. Placer, Yolo, Yuba counties. Commercial fleets.' },
  { name:'A Plus Tree',                       area:'Sacramento / Roseville',  industry:'Tree Service',            website:'aplustree.com',                      city:'Sacramento',     source:'web-search', notes:'20+ yrs. Multifamily, HOA, commercial, municipalities. Proprietary tracking app.' },
  { name:'Tree Care Inc.',                    area:'Sacramento / Roseville',  industry:'Tree Service',            website:'treecareinc.biz',                    city:'Sacramento',     phone:'916-852-9500', notes:'Commercial + HOA + govt clients. Sacramento + Roseville offices.' },
  { name:'Fallen Leaf Tree',                  area:'Sacramento / Roseville',  industry:'Tree Service',            website:'fallenleaftree.com',                 city:'Sacramento',     source:'web-search', notes:'Board Certified Master Arborist. Own fleet of trucks & cranes.' },
  { name:'BP Tree Services LLC',              area:'Sacramento / Roseville',  industry:'Tree Service',            website:'bptreeservices.com',                 city:'Sacramento',     phone:'916-722-6321', notes:'50+ yrs. Family-owned. Commercial arborist services.' },
  { name:'All Green Tree Service',            area:'Sacramento / Roseville',  industry:'Tree Service',            website:'allgreentreeservicecalifornia.com',   city:'Auburn',         phone:'530-788-2026', notes:'24/7 emergency removal. Placer, Butte, Yuba, Sacramento counties.' },
  { name:'A Better Tree Service',             area:'Sacramento / Roseville',  industry:'Tree Service',            website:'abettertreeservice.net',             city:'Sacramento',     source:'web-search', notes:'Est. 1998. CA Certified Small Business. Arborist reports, tree inventory.' },
  { name:'Titan Tree Service',                area:'Sacramento / Roseville',  industry:'Tree Service',            website:'titantreeservice.com',               city:'Sacramento',     phone:'916-837-6048', notes:'30 yrs urban forestry. ISA certified. Commercial clearing.' },
  { name:'Capital Tree Service',             area:'Sacramento / Roseville',  industry:'Tree Service',            website:'capitaltreeserviceco.com',            city:'Lincoln',        source:'web-search', notes:'Placer County.' },

  // ── Towing / Heavy Haul ────────────────────────────────────────────────────
  { name:'Lodi Heavy Haul & Tow',             area:'Stockton / SJC',         industry:'Towing / Heavy Haul',     website:'lodiheavyhaul.com',                  city:'Lodi',           phone:'209-365-7000', notes:'Est. 1964. SJC, Stanislaus, Sacramento. Big rigs, cranes, dump trucks, buses, armored.' },
  { name:'Salazar Heavy Haul & Tow',          area:'Stockton / SJC',         industry:'Towing / Heavy Haul',     website:'salazarheavyhaul.com',               city:'Stockton',       source:'web-search', notes:'Semi-trucks + trailers 24/7. Local Stockton.' },
  { name:"Dave's Towing Service",             area:'Stockton / SJC',         industry:'Towing / Heavy Haul',     website:'davestowingserviceinc.com',          city:'Stockton',       source:'web-search', notes:'Est. 1981. Slideback, Landoll Trailer, 60-ton Rotator. Stockton + Manteca.' },
  { name:'Technique Towing & Heavy Haul',     area:'Stockton / SJC',         industry:'Towing / Heavy Haul',     website:'techtowingstockton.com',             city:'Stockton',       source:'web-search', notes:'Est. 1996. CTTA certified drivers. 24-hr.' },
  { name:'City Wide Tow',                     area:'Stockton / SJC',         industry:'Towing / Heavy Haul',     website:'citywidetow.com',                   city:'Stockton',       source:'web-search', notes:'<30 min response. Fleet contract service available.' },
  { name:"Chima's Tow",                       area:'Stockton / SJC',         industry:'Towing / Heavy Haul',     website:'',                                   city:'Stockton',       source:'web-search', notes:'Est. 1987. Multiple Sacramento locations. Large recovery fleet.' },
  { name:'Ace in the Hole Towing',            area:'Sacramento / Roseville',  industry:'Towing / Heavy Haul',     website:'aceintheholetowing.com',             city:'Roseville',      phone:'916-781-6111', notes:'Big rigs, large RVs, buses, heavy winch-outs. Sacramento region.' },
  { name:'United Towing',                     area:'Sacramento / Roseville',  industry:'Towing / Heavy Haul',     website:'unitedtowsac.com',                  city:'Sacramento',     phone:'916-888-8880', notes:'Sacramento, Elk Grove, Roseville, Folsom, Rocklin, Auburn.' },

  // ── Trucking / Freight ─────────────────────────────────────────────────────
  { name:'Sunview Logistics Inc.',            area:'Stockton / SJC',         industry:'Trucking / Freight',      website:'sunviewlogistics.com',               city:'Stockton',       source:'web-search', fleetSize:'300+ trucks', notes:'300+ trucks, 1100+ trailers. 48 states. FTL + LTL.' },
  { name:'Reeve Trucking',                    area:'Stockton / SJC',         industry:'Trucking / Freight',      website:'reevetrucking.com',                  city:'Stockton',       phone:'800-842-6677', notes:'Est. 1976. Heavy haul + oversize. Steel, concrete, bridge girders, cranes. 24/7.' },
  { name:'Ramsey Xpress',                     area:'Stockton / SJC',         industry:'Trucking / Freight',      website:'ramseyxpress.com',                   city:'Stockton',       source:'web-search', notes:'Transloading, storage, heavy haul. Port of Stockton/Oakland access. BNSF/UP rail.' },
  { name:'TCI Transportation',                area:'Stockton / SJC',         industry:'Trucking / Freight',      website:'tcitransportation.com',              city:'Stockton',       source:'web-search', notes:'Commercial leasing, fleet maintenance, dedicated transport.' },
  { name:'Aztec Delivery System Inc.',        area:'Stockton / SJC',         industry:'Trucking / Freight',      website:'truckingcompanystocktonca.com',      city:'Stockton',       source:'web-search', notes:'Heavy haul, flatbed, oversize loads.' },
  { name:'California Materials Aggregates',   area:'Stockton / SJC',         industry:'Trucking / Freight',      website:'californiamaterials.com',            city:'Stockton',       source:'web-search', notes:'Aggregate trucking.' },
  { name:'Cherokee Freight Lines',            area:'NorCal (Both)',           industry:'Trucking / Freight',      website:'gocfl.com',                         city:'Sacramento',     source:'web-search' },
  { name:'Kooner Fleet Management Solutions', area:'Sacramento / Roseville',  industry:'Trucking / Freight',      website:'',                                   city:'Sacramento',     source:'web-search', notes:'Est. 2016. Logistics & supply chain.' },
  { name:'Amerivet Logistics',                area:'Sacramento / Roseville',  industry:'Trucking / Freight',      website:'',                                   city:'West Sacramento',source:'web-search', notes:'Trucking + warehousing.' },
  { name:'Transport Xpress',                  area:'Sacramento / Roseville',  industry:'Trucking / Freight',      website:'',                                   city:'West Sacramento',source:'web-search', notes:'Freight forwarding, midsize.' },
  { name:'GR Trucking',                       area:'Sacramento / Roseville',  industry:'Trucking / Freight',      website:'grtrucking.net',                    city:'Sacramento',     source:'web-search', fleetSize:'80+ trucks', notes:'Aggregate hauling. Certified by Sacramento-area cities and State of CA.' },

  // ── Utilities ─────────────────────────────────────────────────────────────
  { name:'San Joaquin Electric, Inc.',        area:'Stockton / SJC',         industry:'Utility / Electric / Water', website:'sanjoaquinelectric.com',          city:'Stockton',       phone:'209-952-9980', notes:'Est. 1980. Commercial + industrial electrical. Refineries, wastewater, food processing.' },
  { name:'PG&E',                              area:'NorCal (Both)',           industry:'Utility / Electric / Water', website:'pge.com',                         city:'Sacramento',     source:'web-search', notes:'Massive diesel fleet. Stockton + Sacramento service territory.' },
  { name:'SMUD',                              area:'Sacramento / Roseville',  industry:'Utility / Electric / Water', website:'smud.org',                        city:'Sacramento',     phone:'916-452-3211', notes:'Sacramento Municipal Utility District. Large vehicle fleet.' },
  { name:'Roseville Electric',                area:'Sacramento / Roseville',  industry:'Utility / Electric / Water', website:'roseville.ca.us',                 city:'Roseville',      phone:'916-774-5600', notes:'Municipal utility. Fleet vehicles.' },
  { name:'Lodi Electric Utility',             area:'Stockton / SJC',         industry:'Utility / Electric / Water', website:'',                                city:'Lodi',           source:'web-search', notes:'Est. 1910. Residential + commercial + industrial.' },
  { name:'Cal Water – Stockton District',     area:'Stockton / SJC',         industry:'Utility / Electric / Water', website:'calwater.com',                    city:'Stockton',       source:'web-search', notes:'Est. 1927. 23 wells, 17 booster pumps, 12 storage tanks. Active infrastructure work.' },
];

const result = bulkUpsert(LEADS);
const s = stats();
console.log(`\n✅ Seed complete!`);
console.log(`   Created : ${result.created}`);
console.log(`   Updated : ${result.updated}`);
console.log(`   Skipped : ${result.skipped}`);
console.log(`   Total in DB: ${s.total}\n`);
console.log('Industry breakdown:');
Object.entries(s.byIndustry).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${v.toString().padStart(3)}  ${k}`));
console.log('\nArea breakdown:');
Object.entries(s.byArea).forEach(([k,v]) => console.log(`  ${v.toString().padStart(3)}  ${k}`));
