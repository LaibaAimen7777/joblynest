import React, { useEffect, useState } from "react";
import "../styles/LandingPage.css";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  MdEmail,
  MdPhone,
  MdDashboard,
  MdHome,
  MdInfo,
  MdPersonAdd,
  MdLogin,
  MdHelpOutline,
} from "react-icons/md";

const supabaseUrl = "https://vrpyjxihstmqrwxtusys.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycHlqeGloc3RtcXJ3eHR1c3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODIxMDQsImV4cCI6MjA2MDY1ODEwNH0.i4HSKh5LRjZQdnRwPQXCisg3izroq8fFYNWkFbDPvkw";
const supabase = createClient(supabaseUrl, supabaseKey);

const images = [
  "/images/img1.jpg",
  "/images/img2.jpg",
  "/images/img3.jpg",
  "/images/img4.png",
];

const HIRE_TITLES = [
  "Grocery Help",
  "Electrical Work",
  "Plumbing Help",
  "Air Conditioner Service and Gas Filling",
  "Carpenter Work",
  "Tutoring",
  "Bill Payment",

  "Laundry and Ironing",
];

const LandingPage = () => {
  const [current, setCurrent] = useState(0);
  const [taskerImages, setTaskerImages] = useState({});
  const navigate = useNavigate();
  const [popularServices, setPopularServices] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [searchOptions, setSearchOptions] = useState([]);
  const hireServices = services.filter((svc) =>
    HIRE_TITLES.includes(svc.title)
  );

  useEffect(() => {
    if (!services || services.length === 0) {
      setSearchOptions([]);
      return;
    }

    const names = [];

    services.forEach((svc) => {
      if (svc.title) names.push(svc.title);

      if (svc.subcategories && Array.isArray(svc.subcategories)) {
        svc.subcategories.forEach((sub) => {
          if (sub && sub.trim()) names.push(sub.trim());
        });
      }
    });

    const unique = Array.from(new Set(names));
    setSearchOptions(unique);
  }, [services]);

  useEffect(() => {
    if (!servicesLoading && services.length > 0) {
      const firstEight = services.slice(0, 8);
      setPopularServices(firstEight);
    }
  }, [servicesLoading, services]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("id, title, description, image_url")
          .order("id", { ascending: true });

        if (servicesError) {
          console.error("Error fetching services:", servicesError);
          return;
        }

        const { data: subcatData, error: subcatError } = await supabase
          .from("service_subcategory_fk")
          .select("service_id, name")
          .order("name", { ascending: true });

        if (subcatError) {
          console.error("Error fetching subcategories:", subcatError);
        }

        
        const subcatMap = {};
        (subcatData || []).forEach((subcat) => {
          if (!subcatMap[subcat.service_id]) {
            subcatMap[subcat.service_id] = [];
          }
          subcatMap[subcat.service_id].push(subcat.name);
        });

      
        const servicesWithSubcats = (servicesData || []).map((svc) => ({
          ...svc,
          subcategories: subcatMap[svc.id] || [],
        }));

        setServices(servicesWithSubcats);
      } catch (err) {
        console.error("Unexpected error fetching services:", err);
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    const fetchTaskerIcons = async () => {
      const imageNames = [
        "cleaning.jpg",
        "yardwork.png",
        "moving.png",
        "furniture.jpg",
        "babycare.png",
        "petcare.png",
        "mounting.png",
        "event.png",
        "grocery.png",
        "delivery.png",
        "housesitting.png",
        "errands.png",
        "quickfixes.png",
        "electrical.png",
        "plumbing.png",
        "car.png",
        "AC.png",
        "carpenter.png",
        "Bill1.jpg",
        "Laundry1.jpg",
      ];

      const urls = {};
      imageNames.forEach((name) => {
        const key = name.split(".")[0];
        urls[
          key
        ] = `${supabaseUrl}/storage/v1/object/public/taskericons/${name}`;
      });
      setTaskerImages(urls);
    };
    fetchTaskerIcons();
  }, []);
  useEffect(() => {
    const timelineItems = document.querySelectorAll(".timeline-item");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
          }
        });
      },
      { threshold: 0.1 }
    );

    timelineItems.forEach((item) => observer.observe(item));

    return () => timelineItems.forEach((item) => observer.unobserve(item));
  }, []);

  const scrollPopular = (direction) => {
    const carousel = document.getElementById("popular-carousel");
    const scrollAmount = 300;
    if (!carousel) return;

    if (direction === 1) {
      carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
    } else {
      carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim() !== "") {
      const formatted = toSlug(searchTerm);
      navigate(`/service/${formatted}`);
      setSearchTerm("");
    }
  };

  const handleServiceClick = (serviceTitle) => {
    const formattedTitle = toSlug(serviceTitle);
    navigate(`/service/${formattedTitle}`);
  };
  const handleSuggestionClick = (name) => {
    if (!name) return;

    const lowerName = name.toLowerCase().trim();

    let matchedService =
      services.find(
        (svc) => svc.title && svc.title.toLowerCase().trim() === lowerName
      ) || null;

    if (!matchedService) {
      matchedService = services.find((svc) => {
        if (!svc.subcategories || !Array.isArray(svc.subcategories))
          return false;
        const subs = svc.subcategories
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        return subs.includes(lowerName);
      });
    }

    const targetName = matchedService ? matchedService.title : name;
    const formatted = toSlug(targetName);

    navigate(`/service/${formatted}`);
    setSearchTerm("");
    setSuggestions([]);
  };

  const toSlug = (text) =>
    text
      .toLowerCase()
      .trim()
      .replace(/\s*&\s*/g, " and ")
      .replace(/\s*\//g, " ")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  return (
    <div>
      {/* --- Navbar --- */}
      <nav className="navbar">
        <div className="logo">JoblyNest</div>

        <div className="navbar-center">
          <input
            type="text"
            className="search-bar"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value;
              setSearchTerm(value);

              if (value.trim() === "") {
                setSuggestions([]);
              } else {
                const filtered = searchOptions.filter((service) =>
                  service.toLowerCase().includes(value.toLowerCase())
                );
                setSuggestions(filtered);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          {suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>

        <ul className="nav-links">
         
          <li className="dropdown">
            <span>Services</span>
            <div className="mega-menu">
              {hireServices.map((svc) => {
                const subs =
                  svc.subcategories && Array.isArray(svc.subcategories)
                    ? svc.subcategories
                    : [];

                return (
                  <div className="menu-column" key={svc.id}>
                    <h4 onClick={() => handleServiceClick(svc.title)}>
                      {svc.title}
                    </h4>
                    <ul>
                      {subs.map((sub, idx) => (
                        <li key={idx} onClick={() => handleServiceClick(sub)}>
                          {sub}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </li>

          <li>
            <a href="/about-us">About Us</a>
          </li>
          <li>
            <a href="/faq">FAQ</a>
          </li>
          <li>
            <a href="/auth-option">Login/Signup</a>
          </li>
        </ul>
      </nav>

     
      <div className="slider">
        <img src={images[current]} alt="slide" />
        <div className="slider-overlay">
          <h1 className="slider-title">JOBLYNEST</h1>

          <h4>
            Reliable Help When You Need It. Flexible Work When You Want It
          </h4>
        </div>
      </div>

      
      <div className="tasker-section">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: false }}
          className="tasker-heading"
        >
          Hire a Tasker
        </motion.h2>

        <div className="tasker-grid">
          {hireServices.map((service) => {
            const subcats =
              service.subcategories && Array.isArray(service.subcategories)
                ? service.subcategories
                : [];

            return (
              <div
                key={service.id}
                className="tasker-box"
                onClick={() => handleServiceClick(service.title)}
              >
                <img src={service.image_url} alt={service.title} />
                <p className="tasker-title">{service.title}</p>
                <p className="tasker-desc">{service.description}</p>

                <ul className="tasker-links">
                  {subcats.map((sub, index) => {
                    const slug = toSlug(sub);

                    return (
                      <li key={index}>
                        <Link to={`/service/${slug}`}>{sub}</Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {servicesLoading && hireServices.length === 0 && (
            <p>Loading services...</p>
          )}
        </div>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: false }}
        className="popular-heading"
      >
        Our Popular Services
      </motion.h2>

      <div className="popular-services-wrapper">
        <button
          className="carousel-arrow left"
          onClick={() => scrollPopular(-1)}
        >
          ❮
        </button>

        <div className="popular-services-carousel" id="popular-carousel">
          {popularServices.map((service) => (
            <div
              className="popular-service-card"
              key={service.id}
              onClick={() => handleServiceClick(service.title)}
            >
              <img src={service.image_url} alt={service.title} />
              <h3>{service.title}</h3>
            </div>
          ))}
        </div>

        <button
          className="carousel-arrow right"
          onClick={() => scrollPopular(1)}
        >
          ❯
        </button>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: false }}
        className="why-choose-us"
      >
        <h2>Why Choose Us? </h2>

        <div className="timeline">
          <div className="timeline-item">
            <div className="timeline-icon-wrapper">
              <div className="timeline-icon">🛡</div>
            </div>
            <div className="timeline-content">
              <h4>Vetted Taskers</h4>
              <p>All professionals are carefully screened.</p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-icon-wrapper">
              <div className="timeline-icon">⚡</div>
            </div>
            <div className="timeline-content">
              <h4>Quick Booking</h4>
              <p>Hire with ease through our platform.</p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-icon-wrapper">
              <div className="timeline-icon">💬</div>
            </div>
            <div className="timeline-content">
              <h4>24/7 Support</h4>
              <p>Our team is available anytime.</p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-icon-wrapper">
              <div className="timeline-icon">💵</div>
            </div>
            <div className="timeline-content">
              <h4>Transparent Pricing</h4>
              <p>Clear, upfront costs with no hidden fees.</p>
            </div>
          </div>
        </div>
      </motion.section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>
              <MdPhone /> Contact Us
            </h3>
            <p>
              <MdEmail /> joblynest@gmail.com
            </p>
          </div>

          <div className="footer-section">
            <h3>
              <MdDashboard /> Quick Links
            </h3>
            <ul>
              <li>
                <a href="/">
                  {" "}
                  <MdHome /> Home
                </a>
              </li>
              <li>
                <a href="/faq">
                  {" "}
                  
                  <MdHelpOutline /> FAQ
                </a>
              </li>
              <li>
                <a href="/login">
                  {" "}
                  <MdLogin /> Login
                </a>
              </li>
              <li>
                <a href="/register">
                  {" "}
                  <MdPersonAdd /> Signup
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>
              <MdInfo /> About JoblyNest
            </h3>
            <p>
              We connect you with trusted taskers for your daily service needs —
              safe, fast, and reliable!
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          © 2025 JoblyNest. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
