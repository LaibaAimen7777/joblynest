import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import "../styles/ServiceDetail.css";
import {
  MdEmail,
  MdPhone,
  MdDashboard,
  MdHome,
  MdInfo,
  MdPersonAdd,
  MdLogin,
} from "react-icons/md";
import supabase from "../supabaseClient.js";
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


const buildPatternFromSlugOrName = (input) => {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/\s*&\s*/g, " ") 
    .replace(/\//g, " "); 

  const words = normalized
    .split(/[\s-]+/) 
    .filter((w) => w && w !== "and");

  if (words.length === 0) return "%";
  return `%${words.join("%")}%`;
};

function humanizeFromSlug(slug) {
  if (!slug) return "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}


const toSlug = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s*&\s*/g, " and ") 
    .replace(/\s*\//g, " ") 
    .replace(/\s+/g, "-") 
    .replace(/-+/g, "-"); 

const ServiceDetail = () => {
  const { serviceName } = useParams();
  const navigate = useNavigate();

  const [serviceData, setServiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [allLabels, setAllLabels] = useState([]); 

  const [services, setServices] = useState([]);
  const [subcategoriesByService, setSubcategoriesByService] = useState({});
  const hireServices = services.filter((svc) =>
  HIRE_TITLES.includes(svc.title)
);


  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("id, title");

        if (servicesError) {
          console.error("Error fetching services list:", servicesError.message);
          return;
        }

        setServices(servicesData || []);

        const { data: subcatData, error: subcatError } = await supabase
          .from("service_subcategory_fk")
          .select("service_id, name")
          .order("name", { ascending: true });

        if (subcatError) {
          console.error("Error fetching subcategories:", subcatError.message);
        }

        const subcatMap = {};
        (subcatData || []).forEach((subcat) => {
          if (!subcatMap[subcat.service_id]) {
            subcatMap[subcat.service_id] = [];
          }
          subcatMap[subcat.service_id].push(subcat.name);
        });
        setSubcategoriesByService(subcatMap);

        const labelSet = new Set();
        (servicesData || []).forEach((row) => {
          if (row.title) labelSet.add(row.title.trim());
        });

        (subcatData || []).forEach((subcat) => {
          if (subcat.name) labelSet.add(subcat.name.trim());
        });

        setAllLabels(Array.from(labelSet));
      } catch (err) {
        console.error("Unexpected error fetching services list:", err);
      }
    };

    fetchAll();
  }, []);

  useEffect(() => {
    const fetchServiceData = async () => {
      setLoading(true);
      setErrorMsg("");
      setServiceData(null);

      const slug = (serviceName || "").toLowerCase();
      const exactTitle = humanizeFromSlug(slug);
      const pattern = buildPatternFromSlugOrName(slug); 

      try {
        const { data: exactRows, error: exactError } = await supabase
          .from("services")
          .select("*")
          .ilike("title", exactTitle)
          .limit(1);

        if (exactError) {
          console.error("Error fetching by exact title:", exactError.message);
        }

        if (exactRows && exactRows.length > 0) {
          setServiceData(exactRows[0]);
          setLoading(false);
          return;
        }

        
        const { data: titleRows, error: titleError } = await supabase
          .from("services")
          .select("*")
          .ilike("title", pattern)
          .order("id", { ascending: true });

        if (titleError) {
          console.error("Error fetching by title pattern:", titleError.message);
        }

        if (titleRows && titleRows.length > 0) {
          setServiceData(titleRows[0]);
          setLoading(false);
          return;
        }

        const { data: subcatRows, error: subcatError } = await supabase
          .from("service_subcategory_fk")
          .select("service_id")
          .ilike("name", pattern);

        let subRows = null;
        if (!subcatError && subcatRows && subcatRows.length > 0) {
          const serviceIds = [...new Set(subcatRows.map(r => r.service_id))];
          const { data: servicesBySubcat, error: servicesError } = await supabase
            .from("services")
            .select("*")
            .in("id", serviceIds)
            .order("id", { ascending: true });
          
          if (!servicesError) {
            subRows = servicesBySubcat;
          }
        }

        if (subRows && subRows.length > 0) {
          setServiceData(subRows[0]);
          setLoading(false);
          return;
        }

        console.warn("No service matched for slug:", slug, "pattern:", pattern);
        setErrorMsg("Service not found.");
        setLoading(false);
        navigate("/");
      } catch (err) {
        console.error("Unexpected error fetching service:", err);
        setErrorMsg("Service not found.");
        setLoading(false);
        navigate("/");
      }
    };

    fetchServiceData();
  }, [serviceName, navigate]);

  const handleSearch = () => {
    if (!searchTerm.trim()) return;

    const formatted = toSlug(searchTerm);
    navigate(`/service/${formatted}`);
    setSearchTerm("");
    setSuggestions([]);
  };

  const handleSuggestionClick = (label) => {
    if (!label) return;
    const formatted = toSlug(label);
    navigate(`/service/${formatted}`);
    setSearchTerm("");
    setSuggestions([]);
  };

  const handleServiceClick = (title) => {
    const formatted = toSlug(title);
    navigate(`/service/${formatted}`);
  };

  useEffect(() => {
    if (!serviceData) return;

    const listItems = document.querySelectorAll(".service-includes li");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.7 }
    );

    listItems.forEach((item) => observer.observe(item));

    return () => {
      listItems.forEach((item) => observer.unobserve(item));
    };
  }, [serviceData]);

  return (
    <div className="page-wrapper">
      <nav className="navbar">
        <div className="logo" onClick={() => navigate("/")}>
          JoblyNest
        </div>

        <div className="navbar-center">
          <input
            type="text"
            className="search-bar"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value;
              setSearchTerm(value);

              if (!value.trim()) {
                setSuggestions([]);
              } else {
                const filtered = allLabels.filter((lbl) =>
                  lbl.toLowerCase().includes(value.toLowerCase())
                );
                setSuggestions(filtered);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
          {suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((s, i) => (
                <li key={i} onClick={() => handleSuggestionClick(s)}>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        <ul className="nav-links">
          <li>
            <span onClick={() => navigate("/")}>Home</span>
          </li>

         <li className="dropdown">
  <span>Services</span>
  <div className="mega-menu">
    {hireServices.map((svc) => {
                const subs = subcategoriesByService[svc.id] || [];

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
            <span onClick={() => navigate("/auth-option")}>Login/Signup</span>
          </li>
          <li>
            <a href="/about-us">About Us</a>
          </li>
        </ul>
      </nav>

      {loading && (
        <div className="service-detail-container">
          <p>Loading service...</p>
        </div>
      )}

      {!loading && errorMsg && (
        <div className="service-detail-container">
          <p>{errorMsg}</p>
        </div>
      )}

      {!loading && serviceData && (
        <div className="service-detail-container">
          <div className="service-image">
            <img src={serviceData.image_url} alt={serviceData.title} />
            <button
              className="book-now-button"
              onClick={() => navigate("/auth-option")}
            >
              Book Now
            </button>
          </div>

          <div className="service-info">
            <h1>{serviceData.title}</h1>
            <div className="underline"></div>

            <p className="service-description">{serviceData.description}</p>
            <p className="price-tag">{serviceData.price_range}</p>

            <h3>What's Included:</h3>
            <ul className="service-includes">
              <li>Professional Service Providers</li>
              <li>On-Time Arrival</li>
              <li>Customized To Your Needs</li>
              <li>Safe & Trusted Taskers</li>
              <li>Affordable Pricing</li>
              <li>All Tools & Equipment Provided</li>
              <li>Flexible Scheduling Options</li>
            </ul>
          </div>

          <div className="your-journey-section">
            <h2>Your Journey with Us</h2>
            <div className="journey-steps">
              <div className="journey-step" data-step="1">
                <div className="step-icon">📅</div>
                <h3>Book Your Service</h3>
                <p>Select your service and preferred time.</p>
              </div>

              <div className="journey-step" data-step="2">
                <div className="step-icon">🛠️</div>
                <h3>We Get to Work</h3>
                <p>Our expert team arrives fully prepared.</p>
              </div>

              <div className="journey-step" data-step="3">
                <div className="step-icon">🏡</div>
                <h3>Relax and Enjoy</h3>
                <p>Sit back while we handle everything!</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <MdHome /> Home
                </a>
              </li>
              <li>
                <a href="/login">
                  <MdLogin /> Login
                </a>
              </li>
              <li>
                <a href="/register">
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

export default ServiceDetail;
