"""Seed 30 realistic Pune complaints across Hadapsar, Kothrud, Hinjewadi, Katraj, Pimpri, etc."""
import sqlite3
import random
from datetime import datetime, timedelta
from database import get_db, init_db

# Pune locality reference centroids (Approximate centroids for Leaflet map & clustering)
PUNE_LOCALITIES = {
    "Hadapsar": {"lat": 18.5089, "lng": 73.9259},
    "Kothrud": {"lat": 18.5074, "lng": 73.8077},
    "Hinjewadi": {"lat": 18.5912, "lng": 73.7389},
    "Pimpri": {"lat": 18.6279, "lng": 73.8009},
    "Katraj": {"lat": 18.4575, "lng": 73.8677},
    "Shivajinagar": {"lat": 18.5314, "lng": 73.8446},
    "Baner": {"lat": 18.5590, "lng": 73.7868},
    "Viman Nagar": {"lat": 18.5679, "lng": 73.9143},
    "Swargate": {"lat": 18.5018, "lng": 73.8636},
    "Aundh": {"lat": 18.5602, "lng": 73.8031}
}

SEED_RECORDS = [
    # Kothrud - Water shortage (Cluster 1)
    {
        "locality": "Kothrud",
        "landmark": "Near Karve Statue, Dahanukar Colony",
        "category": "Water Supply & Shortage",
        "department": "Water Supply Department",
        "urgency": "high",
        "lang": "mr-IN",
        "text": "आमच्या डहाणूकर कॉलनीमध्ये गेल्या तीन दिवसांपासून पिण्याचे पाणी आलेले नाही. टँकरचे पाणी विकत घ्यावे लागत आहे.",
        "summary": "Severe 3-day drinking water outage in Dahanukar Colony",
        "duration": "A few days",
        "status": "In Progress"
    },
    {
        "locality": "Kothrud",
        "landmark": "Mayur Colony lane 4",
        "category": "Water Supply & Shortage",
        "department": "Water Supply Department",
        "urgency": "high",
        "lang": "mr-IN",
        "text": "मयूर कॉलनी मध्ये पाण्याची पाईपलाईन फुटल्याने रस्ता जलमय झाला आहे आणि घरात पाणी येत नाही.",
        "summary": "Broken main water pipeline flooding street and cutting household supply",
        "duration": "1-2 days",
        "status": "Assigned"
    },
    {
        "locality": "Kothrud",
        "landmark": "Near Paud Road bus stop",
        "category": "Water Supply & Shortage",
        "department": "Water Supply Department",
        "urgency": "medium",
        "lang": "hi-IN",
        "text": "पौड रोड बस स्टॉप के पास पीने का पानी बहुत कम प्रेशर से आ रहा है, दूसरी मंजिल तक पानी नहीं चढ़ता।",
        "summary": "Extremely low municipal water pressure near Paud Road",
        "duration": "More than a week",
        "status": "Submitted"
    },
    {
        "locality": "Kothrud",
        "landmark": "Ideal Colony near Ground",
        "category": "Water Supply & Shortage",
        "department": "Water Supply Department",
        "urgency": "high",
        "lang": "en-IN",
        "text": "Water pipeline is leaking continuous gallons of clean municipal drinking water into the open drain.",
        "summary": "Massive drinking water leakage into open drain",
        "duration": "A few days",
        "status": "Submitted"
    },

    # Hinjewadi - Potholes & Road Damage (Cluster 2)
    {
        "locality": "Hinjewadi",
        "landmark": "Phase 1 Shivaji Chowk to Cognizant road",
        "category": "Roads & Potholes",
        "department": "Road & Maintenance Department",
        "urgency": "critical",
        "lang": "en-IN",
        "text": "Massive crater-sized potholes on Phase 1 main road. Two software engineers suffered severe bike accidents last night.",
        "summary": "Dangerous deep potholes causing vehicular accidents in Phase 1",
        "duration": "More than a week",
        "status": "Under Review"
    },
    {
        "locality": "Hinjewadi",
        "landmark": "Near Infosys Circle Phase 2",
        "category": "Roads & Potholes",
        "department": "Road & Maintenance Department",
        "urgency": "high",
        "lang": "mr-IN",
        "text": "इन्फोसिस सर्कल जवळ संपूर्ण रस्ता उखडला आहे, चिखल आणि खड्ड्यांमुळे दररोज ट्रॅफिक जॅम होतो.",
        "summary": "Badly damaged mud road causing daily gridlock near Infosys Circle",
        "duration": "More than a month",
        "status": "In Progress"
    },
    {
        "locality": "Hinjewadi",
        "landmark": "Maan Road Junction",
        "category": "Roads & Potholes",
        "department": "Road & Maintenance Department",
        "urgency": "high",
        "lang": "hi-IN",
        "text": "मान रोड जंक्शन पर बड़े-बड़े गड्ढे हैं, बारिश के बाद पानी भर जाता है जिससे गड्ढा दिखता नहीं है।",
        "summary": "Waterlogged invisible potholes creating fatal road hazard",
        "duration": "A few days",
        "status": "Submitted"
    },

    # Hadapsar - Garbage & Waste (Cluster 3)
    {
        "locality": "Hadapsar",
        "landmark": "Near Gadital Vegetable Market",
        "category": "Garbage & Solid Waste",
        "department": "Solid Waste Management",
        "urgency": "high",
        "lang": "mr-IN",
        "text": "गाडीतळ भाजी मार्केट जवळ कचराकुंडी आठवडाभरापासून उचललेली नाही. प्रचंड दुर्गंधी सुटली असून मोकाट जनावरे फिरत आहेत.",
        "summary": "Uncollected overflowing garbage dump attracting stray animals at Gadital",
        "duration": "More than a week",
        "status": "Assigned"
    },
    {
        "locality": "Hadapsar",
        "landmark": "Magarpatta South Gate corner",
        "category": "Garbage & Solid Waste",
        "department": "Solid Waste Management",
        "urgency": "medium",
        "lang": "en-IN",
        "text": "Huge heap of construction debris and domestic wet waste dumped on the footpath.",
        "summary": "Illegal debris and garbage dumping blocking pedestrian pavement",
        "duration": "A few days",
        "status": "Submitted"
    },
    {
        "locality": "Hadapsar",
        "landmark": "Sayyed Nagar railway crossing",
        "category": "Garbage & Solid Waste",
        "department": "Solid Waste Management",
        "urgency": "high",
        "lang": "hi-IN",
        "text": "सैयद नगर रेलवे क्रॉसिंग के पास कचरे में आग लगा दी गई है जिससे जहरीला धुआं फैल रहा है।",
        "summary": "Hazardous toxic smoke from illegal garbage burning near railway crossing",
        "duration": "Today",
        "status": "Resolved"
    },
    {
        "locality": "Hadapsar",
        "landmark": "Sasane Nagar galli no 3",
        "category": "Garbage & Solid Waste",
        "department": "Solid Waste Management",
        "urgency": "medium",
        "lang": "mr-IN",
        "text": "ससाणे नगर मध्ये घंटागाडी तीन दिवसांपासून कचरा गोळा करायला आलेली नाही.",
        "summary": "Door-to-door garbage collection vehicle missed pickup for 3 days",
        "duration": "A few days",
        "status": "Submitted"
    },

    # Katraj - Drainage & Sewage Overflow (Cluster 4)
    {
        "locality": "Katraj",
        "landmark": "Near Katraj Dairy chowk",
        "category": "Drainage & Sewage",
        "department": "Drainage & Sewage Board",
        "urgency": "critical",
        "lang": "mr-IN",
        "text": "कात्रज डेअरी चौकात ड्रेनेजचे झाकण तुटून घाण पाणी रस्त्यावर वाहत आहे. साथीचे आजार पसरण्याची भीती आहे.",
        "summary": "Chamber broken and raw sewage overflowing onto main intersection",
        "duration": "A few days",
        "status": "In Progress"
    },
    {
        "locality": "Katraj",
        "landmark": "Santosh Nagar lane 2",
        "category": "Drainage & Sewage",
        "department": "Drainage & Sewage Board",
        "urgency": "high",
        "lang": "hi-IN",
        "text": "संतोष नगर में गटर चोक हो गया है और गंदा पानी घरों के सामने भर गया है।",
        "summary": "Clogged drainage canal backflowing into residential doorsteps",
        "duration": "A few days",
        "status": "Under Review"
    },
    {
        "locality": "Katraj",
        "landmark": "Near Rajiv Gandhi Zoological Park gate",
        "category": "Drainage & Sewage",
        "department": "Drainage & Sewage Board",
        "urgency": "medium",
        "lang": "en-IN",
        "text": "Storm water drain is fully choked with plastic and sludge, creating stagnant water pools.",
        "summary": "Plastic-choked storm drain creating mosquito breeding spot",
        "duration": "More than a week",
        "status": "Submitted"
    },

    # Pimpri - Broken Streetlights (Cluster 5)
    {
        "locality": "Pimpri",
        "landmark": "Near Dr. Ambedkar Chowk main road",
        "category": "Streetlights & Electricity",
        "department": "Electrical Department",
        "urgency": "medium",
        "lang": "mr-IN",
        "text": "आंबेडकर चौक ते स्टेशन रस्त्यावरील सर्व पथदिवे बंद आहेत. रात्रीच्या वेळी महिलांसाठी रस्ता असुरक्षित वाटतो.",
        "summary": "Entire stretch of streetlights dark from Ambedkar Chowk to station",
        "duration": "More than a week",
        "status": "Submitted"
    },
    {
        "locality": "Pimpri",
        "landmark": "Nehrunagar bus stop road",
        "category": "Streetlights & Electricity",
        "department": "Electrical Department",
        "urgency": "high",
        "lang": "hi-IN",
        "text": "बिजली का खंभा झुक गया है और नंगी तार नीचे लटक रही है, कभी भी बड़ा हादसा हो सकता है।",
        "summary": "Tilted electric pole with dangling live high-voltage wires",
        "duration": "Today",
        "status": "In Progress"
    },
    {
        "locality": "Pimpri",
        "landmark": "Finolex Chowk service road",
        "category": "Streetlights & Electricity",
        "department": "Electrical Department",
        "urgency": "low",
        "lang": "en-IN",
        "text": "Three streetlights are flickering constantly throughout the night on the service road.",
        "summary": "Flickering streetlights on service lane",
        "duration": "A few days",
        "status": "Resolved"
    },

    # Baner - Potholes & Construction Damage
    {
        "locality": "Baner",
        "landmark": "Near High Street junction",
        "category": "Roads & Potholes",
        "department": "Road & Maintenance Department",
        "urgency": "high",
        "lang": "en-IN",
        "text": "Road dug up for pipeline laying has not been resurfaced for over 3 weeks. Dust and bumps are horrible.",
        "summary": "Unfinished trench excavation causing traffic jams on High Street",
        "duration": "More than a month",
        "status": "Under Review"
    },
    {
        "locality": "Baner",
        "landmark": "Pan Card Club Road",
        "category": "Roads & Potholes",
        "department": "Road & Maintenance Department",
        "urgency": "medium",
        "lang": "mr-IN",
        "text": "पॅन कार्ड क्लब रस्त्यावर खड्डे पडले आहेत. दुचाकी घसरून अपघात होतात.",
        "summary": "Multiple slippery potholes along Pan Card Club Road",
        "duration": "A few days",
        "status": "Submitted"
    },

    # Viman Nagar - Garbage & Water
    {
        "locality": "Viman Nagar",
        "landmark": "Near Phoenix Mall back gate",
        "category": "Garbage & Solid Waste",
        "department": "Solid Waste Management",
        "urgency": "medium",
        "lang": "en-IN",
        "text": "Commercial food vendors are dumping waste oil and food scraps in the public open space.",
        "summary": "Illegal commercial waste dumping behind Phoenix Mall",
        "duration": "A few days",
        "status": "Assigned"
    },
    {
        "locality": "Viman Nagar",
        "landmark": "Symbiosis Road lane 2",
        "category": "Streetlights & Electricity",
        "department": "Electrical Department",
        "urgency": "medium",
        "lang": "hi-IN",
        "text": "कॉलेज के पीछे वाली गली में लाइट नहीं जलती, रात को अंधेरे में चलना मुश्किल होता है।",
        "summary": "Completely dark college alleyway due to broken streetlights",
        "duration": "More than a week",
        "status": "Resolved"
    },

    # Shivajinagar - Water & Drainage
    {
        "locality": "Shivajinagar",
        "landmark": "FC Road Goodluck Cafe corner",
        "category": "Drainage & Sewage",
        "department": "Drainage & Sewage Board",
        "urgency": "high",
        "lang": "mr-IN",
        "text": "एफसी रोडवर गटाराचे पाणी रस्त्यावर येत आहे, ग्राहकांना आणि पादचाऱ्यांना चालणे मुश्कील झाले आहे.",
        "summary": "Sewage overflowing on bustling FC Road sidewalk",
        "duration": "Today",
        "status": "In Progress"
    },
    {
        "locality": "Shivajinagar",
        "landmark": "Model Colony water reservoir road",
        "category": "Water Supply & Shortage",
        "department": "Water Supply Department",
        "urgency": "medium",
        "lang": "en-IN",
        "text": "Turbid and muddy yellow drinking water received in household taps today morning.",
        "summary": "Contaminated yellowish drinking water received in taps",
        "duration": "Today",
        "status": "Submitted"
    },

    # Katraj & Swargate extra reports
    {
        "locality": "Swargate",
        "landmark": "Jedhe Chowk Bus Stand Area",
        "category": "Roads & Potholes",
        "department": "Road & Maintenance Department",
        "urgency": "critical",
        "lang": "hi-IN",
        "text": "जेधे चौक पर बस डिपो के पास सड़क बुरी तरह धंस गई है। भारी बसों के लिए खतरा बना हुआ है।",
        "summary": "Depression / road cave-in hazard near Swargate Jedhe Chowk",
        "duration": "A few days",
        "status": "Assigned"
    },
    {
        "locality": "Swargate",
        "landmark": "Near Sarasbaug entrance",
        "category": "Garbage & Solid Waste",
        "department": "Solid Waste Management",
        "urgency": "medium",
        "lang": "mr-IN",
        "text": "सारसबाग प्रवेशद्वाराजवळ पर्यटकांनी टाकलेला कचरा आणि प्लास्टिकचा ढीग साचला आहे.",
        "summary": "Plastic waste and litter accumulation near Sarasbaug entrance",
        "duration": "A few days",
        "status": "Resolved"
    },
    {
        "locality": "Aundh",
        "landmark": "Near Bremen Chowk",
        "category": "Streetlights & Electricity",
        "department": "Electrical Department",
        "urgency": "low",
        "lang": "en-IN",
        "text": "Smart streetlight sensor stays on continuously during bright daylight.",
        "summary": "Streetlight sensor staying on during day, wasting electricity",
        "duration": "More than a month",
        "status": "Submitted"
    },
    {
        "locality": "Aundh",
        "landmark": "Spicer College Road",
        "category": "Roads & Potholes",
        "department": "Road & Maintenance Department",
        "urgency": "high",
        "lang": "mr-IN",
        "text": "रस्त्यावर अनेक ठिकाणी डांबराचे खड्डे झाले असून सायकल आणि दुचाकी घसरतात.",
        "summary": "Multiple asphalt potholes causing bike skids on Spicer College Road",
        "duration": "A few days",
        "status": "Under Review"
    },
    {
        "locality": "Hinjewadi",
        "landmark": "Wipro Circle to Blue Ridge Road",
        "category": "Streetlights & Electricity",
        "department": "Electrical Department",
        "urgency": "high",
        "lang": "en-IN",
        "text": "Over 1.5 km stretch has zero functioning lights. Serious safety concern for night shift IT employees.",
        "summary": "1.5 km blackout on arterial Blue Ridge connecting road",
        "duration": "A few days",
        "status": "In Progress"
    },
    {
        "locality": "Katraj",
        "landmark": "Katraj Ghat start point",
        "category": "Garbage & Solid Waste",
        "department": "Solid Waste Management",
        "urgency": "high",
        "lang": "mr-IN",
        "text": "घाटाच्या वळणावर लोकांनी मोठ्या प्रमाणात प्लास्टिक आणि कचरा फेकला आहे.",
        "summary": "Illegal dumping of bulk plastic along Katraj Ghat slope",
        "duration": "More than a week",
        "status": "Submitted"
    },
    {
        "locality": "Kothrud",
        "landmark": "Near Vanaz Metro Station",
        "category": "Roads & Potholes",
        "department": "Road & Maintenance Department",
        "urgency": "medium",
        "lang": "mr-IN",
        "text": "मेट्रो स्टेशन खालील रस्त्यावर पावसाचे पाणी साचून खड्डे पडले आहेत.",
        "summary": "Waterlogged road cavities below Vanaz Metro Station",
        "duration": "A few days",
        "status": "Submitted"
    }
]

def seed_database():
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    # Clear existing demo records
    cursor.execute("DELETE FROM status_history")
    cursor.execute("DELETE FROM complaints")
    cursor.execute("DELETE FROM issue_clusters")
    cursor.execute("DELETE FROM departments")

    # Seed Departments
    departments_data = [
        ("Water Supply Department", "Water Supply Department", "पाणी पुरवठा विभाग", "जल आपूर्ति विभाग", "water@pmc.gov.in", "020-25501001"),
        ("Road & Maintenance Department", "Road & Maintenance Department", "रस्ते व देखभाल विभाग", "सड़क एवं रखरखाव विभाग", "roads@pmc.gov.in", "020-25501002"),
        ("Solid Waste Management", "Solid Waste Management", "घनकचरा व्यवस्थापन विभाग", "ठोस अपशिष्ट प्रबंधन विभाग", "waste@pmc.gov.in", "020-25501003"),
        ("Drainage & Sewage Board", "Drainage & Sewage Board", "मलनिस्सारण व ड्रेनेज विभाग", "जल निकासी एवं सीवेज बोर्ड", "drainage@pmc.gov.in", "020-25501004"),
        ("Electrical Department", "Electrical Department", "विद्युत व पथदिवे विभाग", "विद्युत विभाग", "electrical@pmc.gov.in", "020-25501005"),
        ("Public Health Department", "Public Health Department", "सार्वजनिक आरोग्य विभाग", "सार्वजनिक स्वास्थ्य विभाग", "health@pmc.gov.in", "020-25501006"),
        ("Traffic & Transport Division", "Traffic & Transport Division", "वाहतूक व वाहतूक नियंत्रण", "यातायात एवं परिवहन प्रभाग", "traffic@pmc.gov.in", "020-25501007"),
        ("General Administration", "General Administration", "सामान्य प्रशासन विभाग", "सामान्य प्रशासन", "admin@pmc.gov.in", "020-25501000")
    ]
    cursor.executemany("INSERT INTO departments VALUES (?, ?, ?, ?, ?, ?)", departments_data)

    # First, let's cluster the complaints deterministically by (locality, category)
    cluster_map = {}
    now = datetime.now()

    for idx, rec in enumerate(SEED_RECORDS, 1):
        complaint_id = f"JS-PUNE-{1000 + idx}"
        locality = rec["locality"]
        category = rec["category"]
        dept = rec["department"]
        cluster_key = f"{locality.lower()}_{category.lower().replace(' ', '_').replace('&', 'and')}"

        centroid = PUNE_LOCALITIES.get(locality, {"lat": 18.5204, "lng": 73.8567})
        # Add slight realistic jitter (+/- 100-300m) around centroid
        lat = centroid["lat"] + random.uniform(-0.003, 0.003)
        lng = centroid["lng"] + random.uniform(-0.003, 0.003)

        created_days_ago = random.randint(0, 10)
        created_time = (now - timedelta(days=created_days_ago, hours=random.randint(1, 12))).strftime("%Y-%m-%d %H:%M:%S")

        if cluster_key not in cluster_map:
            cluster_id = f"CLU-{locality[:3].upper()}-{random.randint(100, 999)}"
            cluster_map[cluster_key] = {
                "id": cluster_id,
                "locality": locality,
                "category": category,
                "title": f"Collective {category} in {locality}",
                "description": f"Grouped civic reports from residents of {locality} regarding {category.lower()}.",
                "priority": rec["urgency"],
                "department": dept,
                "count": 0,
                "status": rec["status"],
                "created_at": created_time,
                "updated_at": created_time
            }

        cluster = cluster_map[cluster_key]
        cluster["count"] += 1
        # If any complaint has higher priority, escalate cluster priority
        if rec["urgency"] == "critical":
            cluster["priority"] = "critical"
        elif rec["urgency"] == "high" and cluster["priority"] != "critical":
            cluster["priority"] = "high"

        # Insert Complaint
        cursor.execute("""
        INSERT INTO complaints (
            id, cluster_id, original_text, language_code, translated_text, summary,
            category, department, urgency, urgency_reason, suggested_action,
            normalised_locality, area_landmark, issue_duration, latitude, longitude,
            photo_url, citizen_name, status, is_demo, is_mock_ai, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            complaint_id,
            cluster["id"],
            rec["text"],
            rec["lang"],
            rec["summary"],
            rec["summary"],
            category,
            dept,
            rec["urgency"],
            f"Verified issue impacting public safety in {locality}.",
            f"Municipal field inspection team to visit {rec['landmark']} promptly.",
            locality,
            rec["landmark"],
            rec["duration"],
            lat,
            lng,
            None,
            "Concerned Resident",
            rec["status"],
            1, # is_demo
            0, # not mock_ai, verified seed
            created_time,
            created_time
        ))

        # Insert initial status history
        cursor.execute("""
        INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, officer_note, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            complaint_id,
            None,
            "Submitted",
            "System",
            "Complaint recorded and clustered automatically.",
            created_time
        ))

        if rec["status"] != "Submitted":
            cursor.execute("""
            INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, officer_note, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (
                complaint_id,
                "Submitted",
                rec["status"],
                "Ward Officer",
                f"Status updated to {rec['status']} for active resolution.",
                (now - timedelta(days=max(0, created_days_ago - 1))).strftime("%Y-%m-%d %H:%M:%S")
            ))

    # Insert Clusters into DB
    for clu in cluster_map.values():
        cursor.execute("""
        INSERT INTO issue_clusters (id, normalised_locality, category, title, description, priority, department, report_count, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            clu["id"],
            clu["locality"],
            clu["category"],
            clu["title"],
            clu["description"],
            clu["priority"],
            clu["department"],
            clu["count"],
            clu["status"],
            clu["created_at"],
            clu["updated_at"]
        ))

    conn.commit()
    conn.close()
    print(f"Seeded 30 realistic Pune complaints across {len(cluster_map)} clusters.")

if __name__ == "__main__":
    seed_database()

