const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const Home = require('./models/Home');
const AboutAcademy = require('./models/AboutAcademy');
const AdmissionsPage = require('./models/AdmissionsPage');
const GalleryPage = require('./models/GalleryPage');
const PlaygroundPage = require('./models/PlaygroundPage');
const ProgramsPage = require('./models/ProgramsPage');
const ContactPage = require('./models/ContactPage');
const Footer = require('./models/Footer');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        // 🔹 CRITICAL: DO NOT use dropDatabase() when connected to the main backend.
        // Instead, clear only the collections that this seeding script owns.
        const collectionsToClear = [
            'homes', 'aboutacademies', 'admissionspages', 'gallerypages',
            'playgroundpages', 'programspages', 'contactpages', 'footers'
        ];

        console.log('Clearing Jenil-specific collections...');
        for (const colName of collectionsToClear) {
            await mongoose.connection.db.collection(colName).deleteMany({});
        }

        console.log('Jenil collections cleared. Seeding new data...');

        // 1. Home Data
        await Home.deleteMany({});
        await Home.create({
            hero: {
                title: "GANDHINAGAR SPORTS ACADEMY",
                highlightTitle: "Building Future Cricket Champions",
                subtitle: "Gandhinagar Sports Academy is a professional cricket coaching centre dedicated to developing young talent through structured training, discipline and match exposure. Our mission is to nurture players with modern coaching techniques and professional guidance.",
                primaryButtonText: "Join Now",
                primaryButtonLink: "/admissions",
                secondaryButtonText: "Explore Gallery",
                secondaryButtonLink: "/gallery",
                backgroundImage: "public/home/slide_4.webp"
            },
            about: {
                title: "Welcome to Gandhinagar Sports Academy",
                highlightText: "The Best Sports Academy in Gandhinagar and Gujarat",
                descriptionParagraphs: [
                    "Are you ready to pursue your passion for sports without compromising on academics? We're proud to offer structured training for young athletes with flexible routines that support both learning and performance.",
                    "At Gandhinagar Sports Academy, our coaching programs—residential and non-residential—go beyond physical training. We focus on building a winning mindset, discipline, teamwork, and long-term athletic development with guidance from experienced coaches.",
                    "Our mission is simple: to empower every athlete to excel in their game and build confidence for life. The journey starts here—train smart, stay consistent, and grow into your best self."
                ],
                image: "public/home/join_img.webp"
            },
            programsAndFacilities: {
                sectionTitle: "Our Sports Programs",
                image: "public/home/bg_image.png",
                // trainingCard: {
                //     title: "Personalized Training for Aspiring Cricketers",
                //     description: "At Gandhinagar Sports Academy, our cricket coaching is designed to meet the needs of players at different stages of their journey. Our curriculum covers all essential aspects of cricket:",
                //     features: [
                //         "Batting Skills: Master shot selection, footwork timing, and power hitting techniques.",
                //         "Bowling Techniques: Develop pace, spin, accuracy, and variations to outsmart opponents.",
                //         "Fielding Drills: Improve agility, reflexes, catching, and ground fielding with focused exercises.",
                //         "Fitness & Conditioning: Specialized cricket fitness training to build strength, endurance, and injury resilience.",
                //         "Game Awareness: Tactical sessions to enhance decision-making, game strategy, and situational awareness."
                //     ],
                //     image: "public/programs/cricke.jpg"
                // },
                facilitiesCard: {
                    title: "World-Class Facilities to Elevate Your Game",
                    description: "At Gandhinagar Sports Academy, we provide world-class facilities to support comprehensive cricket coaching.",
                    features: [
                        "Practice Nets",
                        "Match Practice Sessions",
                        "Fitness Training",
                        "Professional Coaching Guidance",
                        "Skill Development Drills",
                        "Safe Practice Environment",
                        "Discipline Focus Training",
                        "Tournament Opportunities"
                    ],
                    image: "public/home/Bowling.jpg",
                    buttonText: "Join Now",
                    buttonLink: "/admissions"
                },
                quoteBlock: {
                    quote: "\"I have failed at times, but I never stop trying.\"",
                    author: "Rahul Dravid",
                    authorTitle: "Former captain of Indian national cricket team.",
                    buttonText: "View Gallery",
                    buttonLink: "/gallery"
                }
            },
            tournamentsSection: {
                smallTitle: "JOIN OUR SPORTS TOURNAMENTS",
                largeTitle: "Tournaments",
                list: []
            },
            socialSection: {
                title: "Latest on our Social",
                subtitle: "Follow for more",
                followUrl: "https://www.instagram.com/gandhinagarsportsacademy/",
                posts: [{
                    "postUrl1": "https://www.instagram.com/p/DKYmJRkqasG/",
                    "postUrl2": "https://www.instagram.com/p/CdJ1Re8vlJl/",
                    "postUrl3": "https://www.instagram.com/reels/CtftqHcNM7Q/",
                    "postUrl4": "https://www.instagram.com/p/DCo8vyQh42G/",
                    "postUrl5": "https://www.instagram.com/p/DT9hCwuimTN/",
                    "postUrl6": "https://www.instagram.com/p/C7OuwK5R2VP/",
                }]
            },
            testimonials: {
                sectionTitle: "What Parents Say",
                list: [
                    {
                        quote: "My son has become more disciplined and confident after joining this academy. The coaches focus on both skills and character.",
                        name: "Rakesh Patel",
                        role: "Father of U-14 player"
                    },
                    {
                        quote: "The training structure is excellent. We can clearly see improvement in technique, fitness, and match temperament.",
                        name: "Neha Shah",
                        role: "Mother of U-16 player"
                    },
                    {
                        quote: "Safe environment, individual attention, and regular match exposure. This is exactly what we were looking for.",
                        name: "Mitesh Desai",
                        role: "Parent of academy trainee"
                    }
                ]
            }
        });

        // Seed Footer
        await Footer.deleteMany({});
        await Footer.create({
            academyName: "Gandhinagar Sports Academy",
            missionDescription: "Professional Cricket Coaching in Gandhinagar focused on developing skills, discipline and sportsmanship.",
            address: "Gandhinagar, Gujarat, India",
            phone1: "+91 9426142342",
            phone2: "+91 9824870000",
            email: "info@gandhinagarsportsacademy.com",
            officeHours: "7 AM - 11 AM, 3 PM - 7:30 PM",
            quickLinks: ["Home", "About Academy", "Programs", "Gallery", "Playground", "Admissions", "Contact"],
            copyright: "© 2026 Gandhinagar Sports Academy. All rights reserved."
        });

        // 2. About Academy Data
        await AboutAcademy.deleteMany({});
        await AboutAcademy.create({
            hero: {
                subtitle: "ABOUT ACADEMY",
                title: "Gandhinagar Sports Academy",
                description: "Why choose Gandhinagar Sports Academy? Because here, dreams take shape without compromise. We help athletes excel in sports while achieving academic success with world-class facilities and expert coaching.",
                backgroundImage: "public/about/about_up.jpg"
            },
            introSection: {
                paragraphs: [
                    "Gandhinagar Sports Academy is committed to promoting cricket and developing young athletes with professional training and proper guidance. Our academy focuses on skill development, physical fitness, discipline and sportsmanship.",
                    "We provide a structured coaching program designed for beginners as well as advanced players. Our goal is not only to improve cricket skills but also to build confidence, leadership and teamwork qualities in every student.",
                    "Through regular practice sessions, match practice and tournaments, we prepare students for competitive cricket."
                ]
            },
            mission: {
                sectionTitle: "Our Mission",
                items: [
                    { type: "Vision", description: "To provide professional cricket coaching and create opportunities for young players to grow into confident and skilled cricketers.", icon: "public/about/our_vision.png" },
                    { type: "Mission", description: "To become one of the most trusted cricket academies in Gujarat for developing future professional players.", icon: "public/about/our_mission.png" },
                    { type: "Goals", description: "To provide a safe and supportive environment for players to grow and excel in cricket.", icon: "public/about/goals.png" }
                ],
                imageCollage: ["public/about/cricke.jpg", "public/about/slide_4.webp", "public/about/playground.png", "public/about/programs.png"]
            },
            directorsMessage: {
                sectionTitle: "Director's Message",
                text: "At Gandhinagar Sports Academy, we believe sports build character. Cricket teaches discipline, patience and teamwork. Our aim is to provide the right platform for young players to develop their skills and confidence.",
                subText: "We welcome all passionate students who want to learn and grow in cricket."
            },
            founders: {
                sectionTitle: "Our Founders",
                sectionSubtitle: "The people behind Gandhinagar Sports Academy",
                list: [
                    { name: "Narendra Modi", role: "FOUNDER", bio: "Narendra Modi is the founder of Gandhinagar Sports Academy, and his background, passion for sports, and vision for Gandhinagar Sports Academy.", image: "public/about/founder.png" },
                    { name: "Amit Shah", role: "CO-FOUNDER", bio: "Amit Shah is the co-founder of Gandhinagar Sports Academy, and his background, passion for sports, and vision for Gandhinagar Sports Academy.", image: "public/about/founder.png" },
                    { name: "Yogi Adityanath", role: "DIRECTOR OF SPORTS", bio: "Yogi Adityanath is the director of Sports of Gandhinagar Sports Academy, and his background, passion for sports, and vision for Gandhinagar Sports Academy.", image: "public/about/founder.png" }
                ]
            },
            whyChooseUs: {
                sectionTitle: "Why Choose Us",
                features: [
                    "Professional coaching environment",
                    "Focus on discipline and fitness",
                    "Regular match practice",
                    "Individual attention",
                    "Safe and positive environment",
                    "Skill development programs",
                    "Tournament exposure"
                ]
            },
            journey: {
                sectionTitle: "Our Journey",
                list: [
                    { year: "2010", title: "Inception", description: "Founded with a vision to revolutionize sports training.", icon: "public/icons/2010.png" },
                    { year: "2012", title: "First State Champions", description: "Our athletes won their first state-level championships, marking the beginning of our legacy of excellence.", icon: "public/icons/2012.png" },
                    { year: "2015", title: "Facility Expansion", description: "Major expansion of facilities including new courts, swimming pool, and modern training equipment to international standards.", icon: "public/icons/2015.png" },
                    { year: "2017", title: "National Recognition", description: "GSA athletes represented India at international competitions, bringing home medals and recognition for the academy.", icon: "public/icons/2017.png" },
                    { year: "2019", title: "Coaching Excellence", description: "Introduced advanced coaching programs with certified international coaches and sports science support.", icon: "public/icons/2019.png" },
                    { year: "2022", title: "Digital Transformation", description: "Launched online training modules and athlete performance tracking systems to enhance training effectiveness.", icon: "public/icons/2022.png" },
                    { year: "2024", title: "Expansion", description: "Extended facilities to include modern cricket nets and fitness centers.", icon: "public/icons/2024.png" }
                ]
            }

        });

        // 3. Programs Data
        await ProgramsPage.deleteMany({});
        await ProgramsPage.create({
            hero: {
                tagline: "Programs",
                title: "Train Better, Play Better",
                description: "Structured cricket pathways for every stage of a player's journey.",
                backgroundImage: "public/Programs/image.png"
            },
            levels: {
                beginner: {
                    title: "Beginner Program",
                    description: "For students starting cricket basics.",
                    features: ["Basic batting techniques", "Bowling action correction", "Fielding basics", "Fitness training", "Game rules understanding"],
                    image: "public/Programs/cricpro.png"
                },
                intermediate: {
                    title: "Intermediate Program",
                    description: "For players with basic cricket knowledge.",
                    features: ["Advanced batting skills", "Bowling variations", "Match strategy", "Fitness improvement", "Match simulations"],
                    image: "public/Programs/footballpro.png"
                },
                advanced: {
                    title: "Advanced Program",
                    description: "For serious players.",
                    features: ["Competitive match preparation", "Performance improvement", "Technique correction", "Professional level practice", "Tournament preparation"],
                    image: "public/home/Bowling.jpg"
                },
                camp: {
                    title: "Seasonal Training",
                    description: "Special seasonal training programs including intensive cricket training, fitness drills, skill competitions, match practice, awards & certificates.",
                    duration: "Seasonal",
                    image: "public/home/programs.png"
                }
            }
        });

        // 4. Gallery Data
        await GalleryPage.deleteMany({});
        await GalleryPage.create({
            hero: {
                tagline: "MOMENTS AT GANDHINAGAR SPORTS ACADEMY",
                title: "Gallery",
                description: "Explore our facilities, training sessions, and academy life through photos.",
                backgroundImage: "public/gallery/gallery_hr.jpg"
            },
            trainingMoments: {
                title: "Our Training Moments",
                description: "Explore glimpses of daily practice sessions, matches, summer camps, achievements, and events that shape every athlete's journey at Gandhinagar Sports Academy.",
                list: [
                    { title: "Match preparation", image: "public/Programs/footballpro.png" },
                    { title: "Ground session", image: "public/playground/playground.png" },
                    { title: "Fitness training", image: "public/Programs/swim.jpg" },
                    { title: "Summer camp session", image: "public/home/programs.png" },
                    { title: "Cricket nets practice", image: "public/home/Bowling.jpg" },
                    { title: "Batting drills", image: "public/Programs/cricpro.png" }
                ]
            },
            categories: ["Practice Sessions", "Matches", "Events", "Summer Camp", "Awards", "Student Achievements"],
            images: [
                // Col 1 & 2
                { image: "public/Programs/cricpro.png", category: "Practice Sessions" },
                { image: "public/home/Bowling.jpg", category: "Practice Sessions" },
                { image: "public/Programs/footballpro.png", category: "Matches" },
                { image: "public/playground/playground.png", category: "Events" },
                { image: "public/home/programs.png", category: "Summer Camp" },
                { image: "public/about/founder.png", category: "Student Achievements" },
                { image: "public/home/swimmer.png", category: "Events" },

                // Matches section 
                { image: "public/Programs/cricpro.png", category: "Matches" },
                { image: "public/Programs/footballpro.png", category: "Matches" },

                // Events Section
                { image: "public/Programs/basketball.png", category: "Events" },
                { image: "public/home/Bowling.jpg", category: "Events" },
                { image: "public/about/founder.png", category: "Events" },

                // Summer Camp
                { image: "public/playground/playground.png", category: "Summer Camp" },
                { image: "public/home/tennis.jpg", category: "Summer Camp" },

                // Awards
                { image: "public/about/founder.png", category: "Awards" },
                { image: "publicPrograms/swimmingpro.jpg", category: "Awards" },

                // Student Achievements
                { image: "public/Programs/tennis.jpg", category: "Student Achievements" },
                { image: "public/home/join_img.webp", category: "Student Achievements" }
            ]
        });

        // 5. Playground Data
        await PlaygroundPage.deleteMany({});
        await PlaygroundPage.create({
            hero: {
                subtitle: "RESERVE YOUR GROUND",
                title: "Playground Booking",
                description: "Reserve our professional grounds for cricket or football at your convenience.",
                backgroundImage: "public/home/h_bg.png"
            },
            formSection: {
                presentation: {
                    title: "Book Your Favorite Ground!",
                    subtitle: "Get Ready for an Epic Game!",
                    description: "Choose your favorite date, pick your ground, and select your playtime to unlock unbeatable pricing. Let's make every moment on the field count and create unforgettable memories together!",
                    mainImage: "public/playground/playground.png"
                },
                config: {
                    sports: [
                        { name: "CRICKET", icon: "🏏" },
                        { name: "FOOTBALL", icon: "⚽" }
                    ],
                    grounds: [
                        { name: "GROUND-A" },
                        { name: "GROUND-B" }
                    ],
                    slots: [
                        { type: "Full-Day" },
                        { type: "Half-Day" }
                    ],
                    pricing: {
                        fullDay: 5000,
                        halfDay: 3000
                    }
                }
            }
        });

        // 6. Admissions Data
        await AdmissionsPage.deleteMany({});
        await AdmissionsPage.create({
            hero: {
                subtitle: "START YOUR JOURNEY",
                title: "Admissions & Enquiry",
                description: "Take the first step towards excellence. Fill out the form below and our team will get back to you with everything you need to begin your sports journey at GSA.",
                backgroundImage: "public/admissions/admissions.png"
            },
            formContent: {
                header: "Admissions & Enquiry",
                subHeader: "Tell us about the athlete and the sport they want to learn—our team will guide you with the next steps.",
                quote: "Excellence in Sports, Excellence in Life."
            },
            infoSection: {
                expectations: {
                    title: "What to Expect",
                    items: [
                        "Response within 24-48 hours",
                        "Personal consultation with our team",
                        "Free trial session to experience our training",
                        "Detailed information about programs and fees"
                    ]
                },
                requirements: {
                    title: "Requirements",
                    items: [
                        "Medical fitness certificate (for certain sports)",
                        "Age-appropriate documentation",
                        "Parent/guardian consent for minors",
                        "Commitment to regular training schedule"
                    ]
                }
            },
            config: {
                sessions: ["Morning", "Evening", "Both"],
                timeSlots: ["6:00 AM - 8:00 AM", "8:00 AM - 10:00 AM", "4:00 PM - 6:00 PM", "6:00 PM - 8:00 PM"]
            }
        });

        // 7. Contact Data
        await ContactPage.deleteMany({});
        await ContactPage.create({
            hero: {
                subtitle: "CONTACT US",
                title: "Get in Touch",
                description: "Have questions? We're here to help you start your sports journey at Gandhinagar Sports Academy.",
                backgroundImage: "public/contact/contact.png"
            },
            contactDetails: {
                address: "Gandhinagar, Gujarat, India",
                phone: "+91 9426142342",
                email: "info@gandhinagarsportsacademy.com",
                officeHours: "7 AM - 11 AM, 3 PM - 7:30 PM"
            },
            formContent: {
                title: "Send us a Message",
                description: "We'll get back to you within 24–48 hours."
            },
            mapIframe: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14666.366224328352!2d72.6369062!3d23.2209425!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395c2b0000000001%3A0x6eac9262e3c03bcb!2sGandhinagar%20Sports%20Academy!5e0!3m2!1sen!2sin!4v1711312000000!5m2!1sen!2sin"
        });

        console.log('Seeding successful!');
        process.exit();
    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
};

seedData();
