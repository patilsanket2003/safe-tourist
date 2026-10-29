/**
 * SafeTrail - Comprehensive 28 Indian States & 8 Union Territories
 * Complete metadata, geographic coordinates, and primary categories.
 */

const ALL_STATES_AND_UTS = [
  // ================= 28 STATES =================
  {
    stateId: 'andhra-pradesh',
    name: 'Andhra Pradesh',
    capital: 'Amaravati',
    region: 'South',
    coverImage: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80',
    description: 'Long coastline along Bay of Bengal, Araku hill ranges, and historic Dravidian temple shrines.',
    popularCategories: ['sea-beaches', 'mountains-nature', 'historic-places']
  },
  {
    stateId: 'arunachal-pradesh',
    name: 'Arunachal Pradesh',
    capital: 'Itanagar',
    region: 'Northeast',
    coverImage: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
    description: 'Land of Dawn-Lit Mountains with Himalayan monasteries, high passes, and pristine alpine valleys.',
    popularCategories: ['mountains-nature', 'historic-places']
  },
  {
    stateId: 'assam',
    name: 'Assam',
    capital: 'Dispur',
    region: 'Northeast',
    coverImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
    description: 'Brahmaputra valley, UNESCO Kaziranga rhino sanctuary, tea gardens, and ancient Kamakhya shrine.',
    popularCategories: ['mountains-nature', 'historic-places']
  },
  {
    stateId: 'bihar',
    name: 'Bihar',
    capital: 'Patna',
    region: 'East',
    coverImage: 'https://images.unsplash.com/photo-1600100397608-f010f443b719?auto=format&fit=crop&w=1200&q=80',
    description: 'Cradle of ancient empires, birthplace of Buddhism at Bodh Gaya, and ancient Nalanda University.',
    popularCategories: ['historic-places']
  },
  {
    stateId: 'chhattisgarh',
    name: 'Chhattisgarh',
    capital: 'Raipur',
    region: 'Central',
    coverImage: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80',
    description: 'Dense deciduous forests, Chitrakote Niagara-style waterfall, and ancient tribal heritage.',
    popularCategories: ['mountains-nature', 'historic-places']
  },
  {
    stateId: 'goa',
    name: 'Goa',
    capital: 'Panaji',
    region: 'West',
    coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    description: 'Sun-drenched beaches, Portuguese colonial architecture, Dudhsagar falls, and lively coastal culture.',
    popularCategories: ['sea-beaches', 'historic-places']
  },
  {
    stateId: 'gujarat',
    name: 'Gujarat',
    capital: 'Gandhinagar',
    region: 'West',
    coverImage: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
    description: 'White desert of Rann of Kutch, Asiatic lions in Gir, coastal Dwarka-Somnath, and Statue of Unity.',
    popularCategories: ['historic-places', 'sea-beaches', 'mountains-nature']
  },
  {
    stateId: 'haryana',
    name: 'Haryana',
    capital: 'Chandigarh',
    region: 'North',
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    description: 'Historic battlegrounds of Kurukshetra, Sultanpur bird sanctuary, and modern millennium city.',
    popularCategories: ['historic-places', 'mountains-nature']
  },
  {
    stateId: 'himachal-pradesh',
    name: 'Himachal Pradesh',
    capital: 'Shimla',
    region: 'North',
    coverImage: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
    description: 'The Land of Gods featuring snow-capped peaks, pine valleys, Rohtang pass, and hill stations.',
    popularCategories: ['mountains-nature', 'historic-places']
  },
  {
    stateId: 'jharkhand',
    name: 'Jharkhand',
    capital: 'Ranchi',
    region: 'East',
    coverImage: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80',
    description: 'Land of waterfalls, Netarhat sunsets, Betla National Park, and sacred Baidyanath temple.',
    popularCategories: ['mountains-nature', 'historic-places']
  },
  {
    stateId: 'karnataka',
    name: 'Karnataka',
    capital: 'Bengaluru',
    region: 'South',
    coverImage: 'https://images.unsplash.com/photo-1600100397608-f010f443b719?auto=format&fit=crop&w=1200&q=80',
    description: 'UNESCO Vijayanagara ruins at Hampi, Gokarna beaches, Coorg coffee hills, and Mysore palaces.',
    popularCategories: ['historic-places', 'sea-beaches', 'mountains-nature']
  },
  {
    stateId: 'kerala',
    name: 'Kerala',
    capital: 'Thiruvananthapuram',
    region: 'South',
    coverImage: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
    description: 'God’s Own Country with serene backwaters, Munnar tea hills, and Arabian Sea beaches.',
    popularCategories: ['sea-beaches', 'mountains-nature']
  },
  {
    stateId: 'madhya-pradesh',
    name: 'Madhya Pradesh',
    capital: 'Bhopal',
    region: 'Central',
    coverImage: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
    description: 'Heart of India with UNESCO Khajuraho temples, Gwalior Fort, tiger reserves, and Sanchi Stupa.',
    popularCategories: ['historic-places', 'mountains-nature']
  },
  {
    stateId: 'maharashtra',
    name: 'Maharashtra',
    capital: 'Mumbai',
    region: 'West',
    coverImage: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80',
    description: 'Western Ghats hill retreats, Konkan coastline, Shivaji Maharaj hill forts, and UNESCO Ajanta-Ellora.',
    popularCategories: ['mountains-nature', 'sea-beaches', 'historic-places']
  },
  {
    stateId: 'manipur',
    name: 'Manipur',
    capital: 'Imphal',
    region: 'Northeast',
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    description: 'Jewel of India featuring floating phumdis on Loktak Lake and Keibul Lamjao National Park.',
    popularCategories: ['mountains-nature', 'historic-places']
  },
  {
    stateId: 'meghalaya',
    name: 'Meghalaya',
    capital: 'Shillong',
    region: 'Northeast',
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    description: 'Abode of Clouds: Living root bridges, Cherrapunji waterfalls, and crystalline Dawki River.',
    popularCategories: ['mountains-nature']
  },
  {
    stateId: 'mizoram',
    name: 'Mizoram',
    capital: 'Aizawl',
    region: 'Northeast',
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    description: 'Land of Rolling Hills, bamboo forests, vibrant tribal music, and tranquil cliff lookouts.',
    popularCategories: ['mountains-nature']
  },
  {
    stateId: 'nagaland',
    name: 'Nagaland',
    capital: 'Kohima',
    region: 'Northeast',
    coverImage: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
    description: 'Land of Festivals, Hornbill celebrations, Dzukou Valley landscapes, and heroic Kohima War Memorial.',
    popularCategories: ['mountains-nature', 'historic-places']
  },
  {
    stateId: 'odisha',
    name: 'Odisha',
    capital: 'Bhubaneswar',
    region: 'East',
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    description: 'Puri Jagannath temple, UNESCO Konark Sun Temple chariot, and Chilika coastal lagoon.',
    popularCategories: ['sea-beaches', 'historic-places']
  },
  {
    stateId: 'punjab',
    name: 'Punjab',
    capital: 'Chandigarh',
    region: 'North',
    coverImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
    description: 'Spiritual splendor of the Golden Temple at Amritsar, Wagah Border ceremony, and rich heritage.',
    popularCategories: ['historic-places']
  },
  {
    stateId: 'rajasthan',
    name: 'Rajasthan',
    capital: 'Jaipur',
    region: 'North',
    coverImage: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80',
    description: 'Land of Kings: Fortresses, palaces of Jaipur and Udaipur, desert sand dunes, and Aravalli hills.',
    popularCategories: ['historic-places', 'mountains-nature']
  },
  {
    stateId: 'sikkim',
    name: 'Sikkim',
    capital: 'Gangtok',
    region: 'Northeast',
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    description: 'Kingdom of Kanchenjunga: Glacial Tsomgo Lake, Rumtek monastery, and alpine rhododendron valleys.',
    popularCategories: ['mountains-nature', 'historic-places']
  },
  {
    stateId: 'tamil-nadu',
    name: 'Tamil Nadu',
    capital: 'Chennai',
    region: 'South',
    coverImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
    description: 'Dravidian monumental gopurams of Madurai, UNESCO Mahabalipuram shores, Ooty hills, and Kanyakumari.',
    popularCategories: ['historic-places', 'sea-beaches', 'mountains-nature']
  },
  {
    stateId: 'telangana',
    name: 'Telangana',
    capital: 'Hyderabad',
    region: 'South',
    coverImage: 'https://images.unsplash.com/photo-1600100397608-f010f443b719?auto=format&fit=crop&w=1200&q=80',
    description: 'Charminar, Golconda fort acoustics, UNESCO Ramappa stone carvings, and Deccan cultural history.',
    popularCategories: ['historic-places']
  },
  {
    stateId: 'tripura',
    name: 'Tripura',
    capital: 'Agartala',
    region: 'Northeast',
    coverImage: 'https://images.unsplash.com/photo-1600100397608-f010f443b719?auto=format&fit=crop&w=1200&q=80',
    description: 'Ujjayanta water palace, rock-carved colossal bas-reliefs at Unakoti, and lush green hills.',
    popularCategories: ['historic-places', 'mountains-nature']
  },
  {
    stateId: 'uttar-pradesh',
    name: 'Uttar Pradesh',
    capital: 'Lucknow',
    region: 'North',
    coverImage: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80',
    description: 'Heartland of Indian civilization: Taj Mahal at Agra, holy Kashi ghats, Ram Janmabhoomi, and Nawabi Lucknow.',
    popularCategories: ['historic-places', 'mountains-nature']
  },
  {
    stateId: 'uttarakhand',
    name: 'Uttarakhand',
    capital: 'Dehradun',
    region: 'North',
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    description: 'Devbhoomi: Yoga capital Rishikesh, sacred Ganga aarti, Jim Corbett tigers, and high Himalayan peaks.',
    popularCategories: ['mountains-nature', 'historic-places']
  },
  {
    stateId: 'west-bengal',
    name: 'West Bengal',
    capital: 'Kolkata',
    region: 'East',
    coverImage: 'https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=1200&q=80',
    description: 'Darjeeling Himalayan hills, Kolkata Victoria Memorial, Digha sea beaches, and Sundarbans delta.',
    popularCategories: ['historic-places', 'mountains-nature', 'sea-beaches']
  },

  // ================= 8 UNION TERRITORIES =================
  {
    stateId: 'andaman-and-nicobar-islands',
    name: 'Andaman and Nicobar Islands',
    capital: 'Port Blair',
    region: 'Island',
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    description: 'Pristine turquoise lagoons, Radhanagar Beach, coral reefs, and historic Cellular Jail.',
    popularCategories: ['sea-beaches', 'historic-places']
  },
  {
    stateId: 'chandigarh',
    name: 'Chandigarh',
    capital: 'Chandigarh',
    region: 'North',
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    description: 'Le Corbusier’s planned modern garden city, famous for the creative Rock Garden and Sukhna Lake.',
    popularCategories: ['mountains-nature', 'historic-places']
  },
  {
    stateId: 'dadra-nagar-haveli-daman-diu',
    name: 'Dadra & Nagar Haveli and Daman & Diu',
    capital: 'Daman',
    region: 'West',
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    description: 'Coastal sea forts, quiet Arabian Sea beaches, Portuguese chapels, and peaceful palm groves.',
    popularCategories: ['sea-beaches', 'historic-places']
  },
  {
    stateId: 'delhi',
    name: 'Delhi (NCT)',
    capital: 'New Delhi',
    region: 'North',
    coverImage: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80',
    description: 'National capital steeped in millennia of history: Red Fort, Qutub Minar, Humayun’s Tomb, and India Gate.',
    popularCategories: ['historic-places']
  },
  {
    stateId: 'jammu-and-kashmir',
    name: 'Jammu and Kashmir',
    capital: 'Srinagar (Summer), Jammu (Winter)',
    region: 'North',
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    description: 'Paradise on Earth: Dal Lake Shikara cruises, snow skiing at Gulmarg, and Vaishno Devi shrine.',
    popularCategories: ['mountains-nature', 'historic-places']
  },
  {
    stateId: 'ladakh',
    name: 'Ladakh',
    capital: 'Leh',
    region: 'North',
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    description: 'Land of High Passes: Pangong Tso lake, Nubra desert sand dunes, and ancient cliffside gompas.',
    popularCategories: ['mountains-nature']
  },
  {
    stateId: 'lakshadweep',
    name: 'Lakshadweep',
    capital: 'Kavaratti',
    region: 'Island',
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    description: 'Pristine coral atolls in the Arabian Sea with crystal blue lagoons, scuba diving, and white sands.',
    popularCategories: ['sea-beaches']
  },
  {
    stateId: 'puducherry',
    name: 'Puducherry',
    capital: 'Puducherry',
    region: 'South',
    coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    description: 'French Riviera of the East: French quarter boulevards, Promenade Beach, and international township Auroville.',
    popularCategories: ['sea-beaches', 'historic-places']
  }
];

// ================= PRIMARY DESTINATION HUBS ACROSS ALL 36 STATES & UTs =================
const ALL_DESTINATIONS = [
  // --- ANDHRA PRADESH ---
  {
    cityId: 'visakhapatnam',
    name: 'Visakhapatnam (Vizag)',
    stateId: 'andhra-pradesh',
    stateName: 'Andhra Pradesh',
    primaryCategory: 'sea-beaches',
    categories: ['sea-beaches', 'mountains-nature'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'The City of Destiny: RK Beach, submarine museum, and scenic Kailasagiri hilltop.',
    fullDescription: 'Nestled between the Eastern Ghats and the Bay of Bengal, Vizag features unspoiled beaches, maritime heritage, and lush green hills.',
    location: { type: 'Point', coordinates: [83.2185, 17.6868] },
    weatherInfo: { avgTemp: '28°C', bestSeason: 'October to March' }
  },
  {
    cityId: 'tirupati',
    name: 'Tirupati & Tirumala',
    stateId: 'andhra-pradesh',
    stateName: 'Andhra Pradesh',
    primaryCategory: 'historic-places',
    categories: ['historic-places'],
    rank: 2,
    coverImage: 'https://images.unsplash.com/photo-1600100397608-f010f443b719?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'World-famous temple shrine of Lord Venkateswara atop the sacred Seshachalam hills.',
    fullDescription: 'One of the most visited pilgrimage destinations in the world, renowned for Dravidian temple architecture, holy waterfalls, and Seshachalam forest.',
    location: { type: 'Point', coordinates: [79.4192, 13.6288] },
    weatherInfo: { avgTemp: '27°C', bestSeason: 'September to March' }
  },

  // --- ARUNACHAL PRADESH ---
  {
    cityId: 'tawang',
    name: 'Tawang',
    stateId: 'arunachal-pradesh',
    stateName: 'Arunachal Pradesh',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature', 'historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'High-altitude Himalayan valley home to India’s largest 400-year-old Buddhist Monastery.',
    fullDescription: 'Surrounded by frozen high-altitude lakes and Sela Pass, Tawang is renowned for Tibetan Buddhist culture, waterfalls, and pristine snow peaks.',
    location: { type: 'Point', coordinates: [91.8687, 27.5861] },
    weatherInfo: { avgTemp: '10°C', bestSeason: 'March to October' }
  },

  // --- ASSAM ---
  {
    cityId: 'kaziranga',
    name: 'Kaziranga National Park',
    stateId: 'assam',
    stateName: 'Assam',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'UNESCO World Heritage home to two-thirds of the world’s Great One-Horned Rhinoceroses.',
    fullDescription: 'Spanning floodplains of the mighty Brahmaputra, Kaziranga provides safari tours amidst elephant grass, wild water buffaloes, and royal tigers.',
    location: { type: 'Point', coordinates: [93.1711, 26.5775] },
    weatherInfo: { avgTemp: '22°C', bestSeason: 'November to April' }
  },
  {
    cityId: 'guwahati',
    name: 'Guwahati',
    stateId: 'assam',
    stateName: 'Assam',
    primaryCategory: 'historic-places',
    categories: ['historic-places', 'mountains-nature'],
    rank: 2,
    coverImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Gateway to Northeast India with ancient Kamakhya Temple and Brahmaputra cruises.',
    fullDescription: 'Guwahati features sacred river islands like Umananda, scenic river ropeways, Kamakhya Shaktipeeth on Nilachal Hill, and Assamese tea culture.',
    location: { type: 'Point', coordinates: [91.7362, 26.1445] },
    weatherInfo: { avgTemp: '24°C', bestSeason: 'October to April' }
  },

  // --- BIHAR ---
  {
    cityId: 'bodh-gaya',
    name: 'Bodh Gaya & Rajgir',
    stateId: 'bihar',
    stateName: 'Bihar',
    primaryCategory: 'historic-places',
    categories: ['historic-places', 'mountains-nature'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1600100397608-f010f443b719?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'UNESCO Mahabodhi Temple where Gautam Buddha attained Enlightenment beneath the Bodhi Tree.',
    fullDescription: 'The supreme international Buddhist spiritual center, boasting the ancient diamond throne, monasteries built by nations worldwide, and nearby Nalanda ruins.',
    location: { type: 'Point', coordinates: [84.9913, 24.6961] },
    weatherInfo: { avgTemp: '25°C', bestSeason: 'October to March' }
  },

  // --- CHHATTISGARH ---
  {
    cityId: 'bastar',
    name: 'Bastar & Chitrakote',
    stateId: 'chhattisgarh',
    stateName: 'Chhattisgarh',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature', 'historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Home to the magnificent Chitrakote Horseshoe Falls, known as the Niagara of India.',
    fullDescription: 'Bastar offers raw forested wilderness, subterranean limestone caves at Kanger Valley, cascading waterfalls, and world-renowned bell metal art.',
    location: { type: 'Point', coordinates: [81.7006, 19.2065] },
    weatherInfo: { avgTemp: '25°C', bestSeason: 'October to March' }
  },

  // --- GUJARAT ---
  {
    cityId: 'kutch',
    name: 'Rann of Kutch & Bhuj',
    stateId: 'gujarat',
    stateName: 'Gujarat',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature', 'historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'The world’s largest white salt desert hosting the vibrant Rann Utsav cultural carnival.',
    fullDescription: 'A stark and beautiful landscape of boundless white salt crust, moonlit desert festivals, historic palaces in Bhuj, and exquisite Kutchi embroidery.',
    location: { type: 'Point', coordinates: [69.6669, 23.242] },
    weatherInfo: { avgTemp: '23°C', bestSeason: 'November to February' }
  },
  {
    cityId: 'gir-somnath',
    name: 'Gir Forest & Somnath',
    stateId: 'gujarat',
    stateName: 'Gujarat',
    primaryCategory: 'historic-places',
    categories: ['historic-places', 'sea-beaches', 'mountains-nature'],
    rank: 2,
    coverImage: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Sole sanctuary of the Asiatic Lion, paired with the legendary seaside Somnath Jyotirlinga.',
    fullDescription: 'Located along the Saurashtra coast, combining rugged teak forest jeep safaris in Sasan Gir with the ancient temple of Somnath right on the Arabian Sea.',
    location: { type: 'Point', coordinates: [70.4013, 20.9009] },
    weatherInfo: { avgTemp: '26°C', bestSeason: 'October to March' }
  },

  // --- HARYANA ---
  {
    cityId: 'kurukshetra',
    name: 'Kurukshetra',
    stateId: 'haryana',
    stateName: 'Haryana',
    primaryCategory: 'historic-places',
    categories: ['historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'The historic setting of the Mahabharata and the sacred birthplace of the Bhagavad Gita.',
    fullDescription: 'A pilgrimage center famous for Brahma Sarovar lake, Jyotisar where Krishna delivered the Gita sermon, and ancient archaeological mounds.',
    location: { type: 'Point', coordinates: [76.8497, 29.9695] },
    weatherInfo: { avgTemp: '23°C', bestSeason: 'October to March' }
  },

  // --- JHARKHAND ---
  {
    cityId: 'ranchi',
    name: 'Ranchi & Hundru Falls',
    stateId: 'jharkhand',
    stateName: 'Jharkhand',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'City of Waterfalls set atop Chota Nagpur plateau with forested scenic vistas.',
    fullDescription: 'Surrounded by roaring cataracts like Hundru, Jonha, and Dassam falls, cool breezes, and lush sal forests of Jharkhand.',
    location: { type: 'Point', coordinates: [85.3096, 23.3441] },
    weatherInfo: { avgTemp: '22°C', bestSeason: 'October to March' }
  },

  // --- KARNATAKA ---
  {
    cityId: 'mysuru',
    name: 'Mysuru (Mysore)',
    stateId: 'karnataka',
    stateName: 'Karnataka',
    primaryCategory: 'historic-places',
    categories: ['historic-places'],
    rank: 3,
    coverImage: 'https://images.unsplash.com/photo-1600100397608-f010f443b719?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'The Heritage City: Grand illuminated Mysore Palace, Chamundi Hills, and silk markets.',
    fullDescription: 'Former capital of the Kingdom of Mysore, famous worldwide for Indo-Saracenic palace architecture, Dasara festivities, and sandalwood craftsmanship.',
    location: { type: 'Point', coordinates: [76.6552, 12.2958] },
    weatherInfo: { avgTemp: '25°C', bestSeason: 'September to March' }
  },
  {
    cityId: 'coorg',
    name: 'Coorg (Madikeri)',
    stateId: 'karnataka',
    stateName: 'Karnataka',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature'],
    rank: 4,
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Scotland of India: Misty coffee estates, Abbey Falls, and Western Ghats hiking trails.',
    fullDescription: 'A serene mountain district blanketed with spice plantations, Abbey and Iruppu waterfalls, Dubare Elephant Camp, and Raja’s Seat lookouts.',
    location: { type: 'Point', coordinates: [75.7382, 12.4244] },
    weatherInfo: { avgTemp: '20°C', bestSeason: 'October to April' }
  },

  // --- KERALA ---
  {
    cityId: 'alleppey',
    name: 'Alleppey (Alappuzha)',
    stateId: 'kerala',
    stateName: 'Kerala',
    primaryCategory: 'sea-beaches',
    categories: ['sea-beaches', 'mountains-nature'],
    rank: 3,
    coverImage: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Venice of the East: World-famous houseboat cruises through palm-fringed backwaters.',
    fullDescription: 'Celebrated for its network of tranquil canals, lagoons, Vembanad Lake, annual Nehru Trophy snake boat races, and historic Marari beach.',
    location: { type: 'Point', coordinates: [76.3388, 9.4981] },
    weatherInfo: { avgTemp: '27°C', bestSeason: 'October to March' }
  },

  // --- MADHYA PRADESH ---
  {
    cityId: 'khajuraho',
    name: 'Khajuraho',
    stateId: 'madhya-pradesh',
    stateName: 'Madhya Pradesh',
    primaryCategory: 'historic-places',
    categories: ['historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'UNESCO World Heritage group of monuments renowned for intricate Nagara stone carvings.',
    fullDescription: 'Built by the Chandela dynasty between 950 and 1050 AD, celebrated worldwide for the Western Group of Temples, Kandariya Mahadeva, and architectural mastery.',
    location: { type: 'Point', coordinates: [79.9199, 24.8318] },
    weatherInfo: { avgTemp: '24°C', bestSeason: 'October to March' }
  },
  {
    cityId: 'gwalior',
    name: 'Gwalior',
    stateId: 'madhya-pradesh',
    stateName: 'Madhya Pradesh',
    primaryCategory: 'historic-places',
    categories: ['historic-places'],
    rank: 2,
    coverImage: 'https://images.unsplash.com/photo-1600100397608-f010f443b719?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'The Pearl in the necklace of India’s castles: High sandstone citadel and Jai Vilas Palace.',
    fullDescription: 'Dominated by the formidable 8th-century hilltop Gwalior Fort, Saas Bahu temples, Tansen’s tomb, and the Scindia royal museum.',
    location: { type: 'Point', coordinates: [78.1828, 26.2183] },
    weatherInfo: { avgTemp: '25°C', bestSeason: 'October to March' }
  },

  // --- MANIPUR ---
  {
    cityId: 'imphal',
    name: 'Imphal & Loktak Lake',
    stateId: 'manipur',
    stateName: 'Manipur',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature', 'historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'The world’s only floating national park on Loktak Lake and historic Kangla Fort.',
    fullDescription: 'A serene valley surrounded by verdant hills, featuring Keibul Lamjao (home of the dancing Sangai deer), ancient Kangla Palace, and Ima Keithel women’s market.',
    location: { type: 'Point', coordinates: [93.9368, 24.817] },
    weatherInfo: { avgTemp: '19°C', bestSeason: 'October to March' }
  },

  // --- MEGHALAYA ---
  {
    cityId: 'shillong',
    name: 'Shillong & Cherrapunji',
    stateId: 'meghalaya',
    stateName: 'Meghalaya',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Scotland of the East: Misty hill station, living root bridges, and Nohkalikai Falls.',
    fullDescription: 'Perched on the Shillong Plateau with pine hills, double-decker root bridges engineered by Khasi tribes, Elephant Falls, and dramatic canyon drops.',
    location: { type: 'Point', coordinates: [91.8933, 25.5788] },
    weatherInfo: { avgTemp: '16°C', bestSeason: 'September to May' }
  },

  // --- MIZORAM ---
  {
    cityId: 'aizawl',
    name: 'Aizawl & Reiek',
    stateId: 'mizoram',
    stateName: 'Mizoram',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Hilltop capital overlooking Tlawng river valley, cliff summits, and traditional Mizo heritage.',
    fullDescription: 'Set on high mountain ridges, Aizawl features the dramatic Reiek peak viewpoints, Solomon’s Temple, and tranquil trails through cloud-covered peaks.',
    location: { type: 'Point', coordinates: [92.7176, 23.7271] },
    weatherInfo: { avgTemp: '18°C', bestSeason: 'October to March' }
  },

  // --- NAGALAND ---
  {
    cityId: 'kohima',
    name: 'Kohima & Dzukou Valley',
    stateId: 'nagaland',
    stateName: 'Nagaland',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature', 'historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'High-altitude mountain valley of wildflowers, Angami heritage, and WWII War Memorial.',
    fullDescription: 'Renowned for the rolling emerald cushions of Dzukou Valley, the annual Hornbill Festival at Kisama Heritage Village, and panoramic ridge views.',
    location: { type: 'Point', coordinates: [94.1086, 25.6751] },
    weatherInfo: { avgTemp: '16°C', bestSeason: 'October to May' }
  },

  // --- PUNJAB ---
  {
    cityId: 'amritsar',
    name: 'Amritsar',
    stateId: 'punjab',
    stateName: 'Punjab',
    primaryCategory: 'historic-places',
    categories: ['historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'The Golden Temple (Sri Harmandir Sahib), Jallianwala Bagh, and Wagah Border ceremony.',
    fullDescription: 'Spiritual and cultural heart of Sikhism, famous for the gilded Golden Temple reflected in the sacred Amrit Sarovar, free community kitchen, and patriotic fervor.',
    location: { type: 'Point', coordinates: [74.8723, 31.62] },
    weatherInfo: { avgTemp: '22°C', bestSeason: 'October to March' }
  },

  // --- SIKKIM ---
  {
    cityId: 'gangtok',
    name: 'Gangtok & Tsomgo Lake',
    stateId: 'sikkim',
    stateName: 'Sikkim',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature', 'historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Himalayan sanctuary facing Mt. Kanchenjunga with glacial lakes and Buddhist monasteries.',
    fullDescription: 'Capital of Sikkim situated at 1,650 meters, featuring Rumtek Monastery, cable car rides, MG Marg promenade, and Nathula Pass on the Indo-China border.',
    location: { type: 'Point', coordinates: [88.6138, 27.3314] },
    weatherInfo: { avgTemp: '14°C', bestSeason: 'March to June, September to December' }
  },

  // --- TAMIL NADU ---
  {
    cityId: 'chennai',
    name: 'Chennai & Mahabalipuram',
    stateId: 'tamil-nadu',
    stateName: 'Tamil Nadu',
    primaryCategory: 'historic-places',
    categories: ['historic-places', 'sea-beaches'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'UNESCO Shore Temple, monolithic rock chariots, and Marina Beach on Coromandel Coast.',
    fullDescription: 'Combining Chennai’s Marina Beach (one of the world’s longest natural urban beaches) with the 7th-century Pallava coastal monuments of Mahabalipuram.',
    location: { type: 'Point', coordinates: [80.2707, 13.0827] },
    weatherInfo: { avgTemp: '29°C', bestSeason: 'November to February' }
  },
  {
    cityId: 'ooty',
    name: 'Ooty (Nilgiris)',
    stateId: 'tamil-nadu',
    stateName: 'Tamil Nadu',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature'],
    rank: 2,
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Queen of Hill Stations in the Blue Mountains: Nilgiri Mountain Railway and tea gardens.',
    fullDescription: 'Nestled in the Nilgiri Hills, Ooty features UNESCO toy train journeys, Doddabetta Peak, botanical rose gardens, and Pykara lake waterfalls.',
    location: { type: 'Point', coordinates: [76.6932, 11.4102] },
    weatherInfo: { avgTemp: '15°C', bestSeason: 'October to June' }
  },
  {
    cityId: 'madurai',
    name: 'Madurai',
    stateId: 'tamil-nadu',
    stateName: 'Tamil Nadu',
    primaryCategory: 'historic-places',
    categories: ['historic-places'],
    rank: 3,
    coverImage: 'https://images.unsplash.com/photo-1600100397608-f010f443b719?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'The Athens of the East: Celebrated for the towering gopurams of Meenakshi Amman Temple.',
    fullDescription: 'One of the oldest continuously inhabited cities in the world, dominated by the 14 multi-tiered rainbow gopurams of Meenakshi Temple and Thirumalai Nayak Palace.',
    location: { type: 'Point', coordinates: [78.1198, 9.9252] },
    weatherInfo: { avgTemp: '28°C', bestSeason: 'October to March' }
  },

  // --- TELANGANA ---
  {
    cityId: 'hyderabad',
    name: 'Hyderabad',
    stateId: 'telangana',
    stateName: 'Telangana',
    primaryCategory: 'historic-places',
    categories: ['historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1600100397608-f010f443b719?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'The City of Pearls: 400-year-old Charminar, Golconda Fort, and Chowmahalla Palace.',
    fullDescription: 'A historic capital of the Qutb Shahi and Nizam dynasties, famous for Golconda acoustic ramparts, Hussain Sagar lake Buddha statue, and royal cuisine.',
    location: { type: 'Point', coordinates: [78.4867, 17.385] },
    weatherInfo: { avgTemp: '26°C', bestSeason: 'October to March' }
  },

  // --- TRIPURA ---
  {
    cityId: 'agartala',
    name: 'Agartala & Unakoti',
    stateId: 'tripura',
    stateName: 'Tripura',
    primaryCategory: 'historic-places',
    categories: ['historic-places', 'mountains-nature'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1600100397608-f010f443b719?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Ujjayanta Royal Palace, Neermahal lake palace, and mystical rock reliefs of Unakoti.',
    fullDescription: 'Capital of Tripura showcasing white neoclassical palaces, royal water pavilions at Rudrasagar Lake, and the colossal rock carvings of Shiva at Unakoti.',
    location: { type: 'Point', coordinates: [91.2868, 23.8315] },
    weatherInfo: { avgTemp: '24°C', bestSeason: 'October to March' }
  },

  // --- UTTARAKHAND ---
  {
    cityId: 'rishikesh',
    name: 'Rishikesh & Haridwar',
    stateId: 'uttarakhand',
    stateName: 'Uttarakhand',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature', 'historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Yoga Capital of the World: White-water rafting on the Ganga, ashrams, and Har Ki Pauri.',
    fullDescription: 'Located where the sacred Ganges emerges from the Himalayan foothills, famous for Ram Jhula suspension bridges, river rafting, and evening Ganga Aarti.',
    location: { type: 'Point', coordinates: [78.2676, 30.0869] },
    weatherInfo: { avgTemp: '20°C', bestSeason: 'September to May' }
  },
  {
    cityId: 'nainital',
    name: 'Nainital & Mussoorie',
    stateId: 'uttarakhand',
    stateName: 'Uttarakhand',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature'],
    rank: 2,
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'The Lake District of India: Emerald Naini Lake boating and panoramic Kumaon peaks.',
    fullDescription: 'Surrounded by seven green hills, Nainital offers scenic boat rides on Naini Lake, snow viewpoints, Mall Road strolls, and high-altitude Himalayan zoo.',
    location: { type: 'Point', coordinates: [79.4636, 29.3919] },
    weatherInfo: { avgTemp: '15°C', bestSeason: 'March to June, September to December' }
  },

  // --- 8 UNION TERRITORIES DESTINATIONS ---
  {
    cityId: 'port-blair',
    name: 'Port Blair & Havelock Island',
    stateId: 'andaman-and-nicobar-islands',
    stateName: 'Andaman and Nicobar Islands',
    primaryCategory: 'sea-beaches',
    categories: ['sea-beaches', 'historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Radhanagar Beach, Elephant Beach snorkeling, coral reefs, and Cellular Jail memorial.',
    fullDescription: 'Tropical island paradise in the Bay of Bengal, famous for crystal-clear turquoise waters, mangrove kayaking, and India’s colonial freedom memorial.',
    location: { type: 'Point', coordinates: [92.7265, 11.6234] },
    weatherInfo: { avgTemp: '27°C', bestSeason: 'October to May' }
  },
  {
    cityId: 'chandigarh',
    name: 'Chandigarh',
    stateId: 'chandigarh',
    stateName: 'Chandigarh',
    primaryCategory: 'historic-places',
    categories: ['historic-places', 'mountains-nature'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'The City Beautiful: Nek Chand’s fantasy Rock Garden, Sukhna Lake, and Rose Garden.',
    fullDescription: 'Designed by legendary architect Le Corbusier, featuring the world-famous open-air sculpture garden built entirely from industrial and domestic waste.',
    location: { type: 'Point', coordinates: [76.7794, 30.7333] },
    weatherInfo: { avgTemp: '22°C', bestSeason: 'October to March' }
  },
  {
    cityId: 'daman-diu',
    name: 'Daman & Diu',
    stateId: 'dadra-nagar-haveli-daman-diu',
    stateName: 'Dadra & Nagar Haveli and Daman & Diu',
    primaryCategory: 'sea-beaches',
    categories: ['sea-beaches', 'historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Portuguese sea fortresses, Nagoa Beach crescent, and peaceful coastal waters.',
    fullDescription: 'Located on the southern tip of Gujarat’s Saurashtra coast, Diu features sea-facing ramparts, St. Paul’s church, and palm-lined watersports beaches.',
    location: { type: 'Point', coordinates: [70.9874, 20.7144] },
    weatherInfo: { avgTemp: '26°C', bestSeason: 'October to April' }
  },
  {
    cityId: 'delhi',
    name: 'Delhi (NCT)',
    stateId: 'delhi',
    stateName: 'Delhi (NCT)',
    primaryCategory: 'historic-places',
    categories: ['historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Capital of India: Red Fort, Qutub Minar, Humayun’s Tomb, India Gate, and Jama Masjid.',
    fullDescription: 'A historic metropolis spanning Mughal and British imperial history, world-famous monuments, bustling Chandni Chowk bazaars, and modern arts.',
    location: { type: 'Point', coordinates: [77.209, 28.6139] },
    weatherInfo: { avgTemp: '24°C', bestSeason: 'October to March' }
  },
  {
    cityId: 'srinagar',
    name: 'Srinagar & Gulmarg',
    stateId: 'jammu-and-kashmir',
    stateName: 'Jammu and Kashmir',
    primaryCategory: 'mountains-nature',
    categories: ['mountains-nature', 'historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Dal Lake houseboats, Mughal gardens, and world-class ski slopes of Apharwat peak.',
    fullDescription: 'The summer capital of Jammu and Kashmir, celebrated for floating vegetable markets, Nishat and Shalimar gardens, and the highest ski cable car in Asia.',
    location: { type: 'Point', coordinates: [74.7973, 34.0837] },
    weatherInfo: { avgTemp: '12°C', bestSeason: 'April to October (Winter snow: Dec - Feb)' }
  },
  {
    cityId: 'lakshadweep-islands',
    name: 'Lakshadweep (Agatti & Kavaratti)',
    stateId: 'lakshadweep',
    stateName: 'Lakshadweep',
    primaryCategory: 'sea-beaches',
    categories: ['sea-beaches'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'Secluded coral atolls, turquoise lagoons, scuba diving, and white sandy shores.',
    fullDescription: 'India’s smallest Union Territory, comprising 36 coral islands in the Arabian Sea, celebrated for unspoiled marine life, coral reefs, and water sports.',
    location: { type: 'Point', coordinates: [72.1962, 10.8533] },
    weatherInfo: { avgTemp: '28°C', bestSeason: 'October to May' }
  },
  {
    cityId: 'puducherry',
    name: 'Puducherry & Auroville',
    stateId: 'puducherry',
    stateName: 'Puducherry',
    primaryCategory: 'sea-beaches',
    categories: ['sea-beaches', 'historic-places'],
    rank: 1,
    coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    shortDescription: 'French colonial quarters, seaside Promenade, Matrimandir golden globe, and Paradise Beach.',
    fullDescription: 'A picturesque seaside town blending Tamil and French cultures, featuring pastel heritage villas, seaside cafes, and the experimental township of Auroville.',
    location: { type: 'Point', coordinates: [79.8083, 11.9416] },
    weatherInfo: { avgTemp: '28°C', bestSeason: 'October to March' }
  }
];

module.exports = {
  ALL_STATES_AND_UTS,
  ALL_DESTINATIONS
};
